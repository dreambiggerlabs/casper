import { access, mkdir, open, unlink } from "fs/promises";
import { join } from "path";

import type { Logger } from "pino";
import { simpleGit, type SimpleGitOptions } from "simple-git";

import { prepareAuthEnv, type GitAuthEnv } from "./git-auth.js";
import type { Project, ProjectCredential } from "./types.js";

export interface CredentialFetcher {
  getProjectCredential(projectUuid: string): Promise<ProjectCredential | null>;
}

const AUTH_UNSAFE: Partial<SimpleGitOptions> = {
  unsafe: {
    allowUnsafeAskPass: true,
    allowUnsafeSshCommand: true,
  },
};

export class ProjectSourceManager {
  constructor(
    private readonly basePath: string,
    private readonly logger: Logger,
    private readonly credentialFetcher: CredentialFetcher,
  ) {}

  async ensureSource(project: Project): Promise<string> {
    const sourcePath = this.sourcePathFor(project.uuid);
    const lockPath = join(this.basePath, project.uuid, ".lock");

    await mkdir(join(this.basePath, project.uuid), { recursive: true });

    const lockHandle = await open(lockPath, "wx").catch(async (err) => {
      if ((err as NodeJS.ErrnoException).code === "EEXIST") {
        await this.waitForLock(lockPath);

        return null;
      }
      throw err;
    });

    try {
      if (await this.hasGitDir(sourcePath)) {
        await this.handleExistingRepo(project, sourcePath);
      } else {
        await this.initializeSource(project, sourcePath);
      }
    } finally {
      if (lockHandle) {
        await lockHandle.close();
        await unlink(lockPath).catch(() => undefined);
      }
    }

    return sourcePath;
  }

  private sourcePathFor(projectUuid: string): string {
    return join(this.basePath, projectUuid, "source");
  }

  private async hasGitDir(sourcePath: string): Promise<boolean> {
    try {
      await access(join(sourcePath, ".git"));

      return true;
    } catch {
      return false;
    }
  }

  private async handleExistingRepo(
    project: Project,
    sourcePath: string,
  ): Promise<void> {
    if (!project.repositoryUrl) {
      this.logger.debug(
        { projectId: project.uuid },
        "Local repository already initialized",
      );

      return;
    }

    const auth = await this.acquireAuth(project);
    try {
      const git = simpleGit(sourcePath, auth ? AUTH_UNSAFE : undefined);
      if (auth) git.env(auth.env as Record<string, string>);
      const remotes = await git.getRemotes();

      if (remotes.length > 0) {
        this.logger.info(
          {
            projectId: project.uuid,
            credentialType: project.credentialType,
          },
          "Pulling latest changes",
        );
        await git.pull("origin", undefined, ["--rebase"]);
      } else {
        this.logger.info(
          {
            projectId: project.uuid,
            repositoryUrl: project.repositoryUrl,
            credentialType: project.credentialType,
          },
          "Adding remote origin to local repository",
        );
        await git.addRemote("origin", project.repositoryUrl);
        await git.push("origin", "HEAD", ["-u"]);
      }
    } finally {
      await auth?.cleanup();
    }
  }

  private async initializeSource(
    project: Project,
    sourcePath: string,
  ): Promise<void> {
    if (!project.repositoryUrl) {
      this.logger.info(
        { projectId: project.uuid },
        "Initializing local git repository",
      );
      await mkdir(sourcePath, { recursive: true });
      await simpleGit(sourcePath).init();

      return;
    }

    const auth = await this.acquireAuth(project);
    try {
      this.logger.info(
        {
          projectId: project.uuid,
          repositoryUrl: project.repositoryUrl,
          credentialType: project.credentialType,
        },
        "Cloning repository",
      );
      const git = simpleGit(auth ? AUTH_UNSAFE : {});
      if (auth) git.env(auth.env as Record<string, string>);
      await git.clone(project.repositoryUrl, sourcePath);
    } finally {
      await auth?.cleanup();
    }
  }

  private async acquireAuth(project: Project): Promise<GitAuthEnv | null> {
    if (!project.credentialType) return null;
    const credential = await this.credentialFetcher.getProjectCredential(
      project.uuid,
    );
    if (!credential) return null;
    const scratchDir = join(this.basePath, project.uuid, ".creds");

    return prepareAuthEnv(credential, scratchDir);
  }

  private async waitForLock(lockPath: string): Promise<void> {
    const maxWait = 120_000;
    const interval = 500;
    const start = Date.now();

    while (Date.now() - start < maxWait) {
      try {
        await access(lockPath);
        await new Promise((resolve) => setTimeout(resolve, interval));
      } catch {
        return;
      }
    }

    throw new Error(`Timed out waiting for lock: ${lockPath}`);
  }
}
