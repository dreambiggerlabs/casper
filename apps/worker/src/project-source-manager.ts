import { access, mkdir, open, unlink } from "fs/promises";
import { join } from "path";

import type { Logger } from "pino";
import { simpleGit } from "simple-git";

import type { Project } from "./types.js";

export class ProjectSourceManager {
  constructor(
    private readonly basePath: string,
    private readonly logger: Logger,
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
        await unlink(lockPath).catch(() => {});
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
    if (project.repositoryUrl) {
      const git = simpleGit(sourcePath);
      const remotes = await git.getRemotes();

      if (remotes.length > 0) {
        this.logger.info(
          { projectId: project.uuid },
          "Pulling latest changes",
        );
        await git.pull("origin", undefined, ["--rebase"]);
      } else {
        this.logger.info(
          { projectId: project.uuid, repositoryUrl: project.repositoryUrl },
          "Adding remote origin to local repository",
        );
        await git.addRemote("origin", project.repositoryUrl);
        await git.push("origin", "HEAD", ["-u"]);
      }
    } else {
      this.logger.debug(
        { projectId: project.uuid },
        "Local repository already initialized",
      );
    }
  }

  private async initializeSource(
    project: Project,
    sourcePath: string,
  ): Promise<void> {
    if (project.repositoryUrl) {
      this.logger.info(
        { projectId: project.uuid, repositoryUrl: project.repositoryUrl },
        "Cloning repository",
      );
      await simpleGit().clone(project.repositoryUrl, sourcePath);
    } else {
      this.logger.info(
        { projectId: project.uuid },
        "Initializing local git repository",
      );
      await mkdir(sourcePath, { recursive: true });
      await simpleGit(sourcePath).init();
    }
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
