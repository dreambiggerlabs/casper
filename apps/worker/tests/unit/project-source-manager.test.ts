import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { access, mkdir, open, unlink } from "fs/promises";
import { simpleGit } from "simple-git";
import type { Logger } from "pino";

import { ProjectSourceManager } from "../../src/project-source-manager.js";
import type { CredentialFetcher } from "../../src/project-source-manager.js";
import type { ProjectCredential } from "../../src/types.js";

vi.mock("fs/promises", () => ({
  access: vi.fn(),
  mkdir: vi.fn().mockResolvedValue(undefined),
  open: vi.fn(),
  unlink: vi.fn().mockResolvedValue(undefined),
  rm: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
}));

const mockGitInstance = {
  init: vi.fn().mockResolvedValue(undefined),
  clone: vi.fn().mockResolvedValue(undefined),
  pull: vi.fn().mockResolvedValue(undefined),
  push: vi.fn().mockResolvedValue(undefined),
  getRemotes: vi.fn().mockResolvedValue([]),
  addRemote: vi.fn().mockResolvedValue(undefined),
  env: vi.fn().mockReturnThis(),
};

vi.mock("simple-git", () => ({
  simpleGit: vi.fn(() => mockGitInstance),
}));

function createMockLogger(): Logger {
  return {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    fatal: vi.fn(),
    trace: vi.fn(),
    child: vi.fn(),
  } as unknown as Logger;
}

function createNullFetcher(): CredentialFetcher {
  return {
    getProjectCredential: vi.fn().mockResolvedValue(null),
  };
}

const BASE_PATH = "/tmp/test-casper/projects";

describe("ProjectSourceManager", () => {
  let manager: ProjectSourceManager;
  let mockLockHandle: { close: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new ProjectSourceManager(
      BASE_PATH,
      createMockLogger(),
      createNullFetcher(),
    );
    mockLockHandle = { close: vi.fn().mockResolvedValue(undefined) };
    vi.mocked(open).mockResolvedValue(mockLockHandle as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should clone a remote repository when directory does not exist", async () => {
    vi.mocked(access).mockRejectedValue(new Error("ENOENT"));

    const result = await manager.ensureSource({
      uuid: "proj-1",
      repositoryUrl: "https://github.com/org/repo.git",
      credentialType: null,
    });

    expect(result).toBe(`${BASE_PATH}/proj-1/source`);
    expect(simpleGit).toHaveBeenCalled();
    expect(mockGitInstance.clone).toHaveBeenCalledWith(
      "https://github.com/org/repo.git",
      `${BASE_PATH}/proj-1/source`,
    );
  });

  it("should git init a local repository when directory does not exist and no URL", async () => {
    vi.mocked(access).mockRejectedValue(new Error("ENOENT"));

    const result = await manager.ensureSource({
      uuid: "proj-2",
      repositoryUrl: null,
      credentialType: null,
    });

    expect(result).toBe(`${BASE_PATH}/proj-2/source`);
    expect(mkdir).toHaveBeenCalledWith(`${BASE_PATH}/proj-2/source`, {
      recursive: true,
    });
    expect(mockGitInstance.init).toHaveBeenCalled();
  });

  it("should pull when remote repo directory already exists", async () => {
    vi.mocked(access).mockResolvedValue(undefined);
    mockGitInstance.getRemotes.mockResolvedValue([{ name: "origin", refs: {} }]);

    const result = await manager.ensureSource({
      uuid: "proj-3",
      repositoryUrl: "https://github.com/org/repo.git",
      credentialType: null,
    });

    expect(result).toBe(`${BASE_PATH}/proj-3/source`);
    expect(mockGitInstance.pull).toHaveBeenCalledWith("origin", undefined, [
      "--rebase",
    ]);
  });

  it("should do nothing when local repo directory already exists and no URL", async () => {
    vi.mocked(access).mockResolvedValue(undefined);

    const result = await manager.ensureSource({
      uuid: "proj-4",
      repositoryUrl: null,
      credentialType: null,
    });

    expect(result).toBe(`${BASE_PATH}/proj-4/source`);
    expect(mockGitInstance.clone).not.toHaveBeenCalled();
    expect(mockGitInstance.init).not.toHaveBeenCalled();
    expect(mockGitInstance.pull).not.toHaveBeenCalled();
  });

  it("should add remote and push when upgrading local repo to remote", async () => {
    vi.mocked(access).mockResolvedValue(undefined);
    mockGitInstance.getRemotes.mockResolvedValue([]);

    const result = await manager.ensureSource({
      uuid: "proj-5",
      repositoryUrl: "https://github.com/org/repo.git",
      credentialType: null,
    });

    expect(result).toBe(`${BASE_PATH}/proj-5/source`);
    expect(mockGitInstance.addRemote).toHaveBeenCalledWith(
      "origin",
      "https://github.com/org/repo.git",
    );
    expect(mockGitInstance.push).toHaveBeenCalledWith("origin", "HEAD", ["-u"]);
  });

  it("fetches credential and applies env to git when credentialType is set on clone", async () => {
    vi.mocked(access).mockRejectedValue(new Error("ENOENT"));

    const credential: ProjectCredential = {
      type: "https_token",
      token: "ghp_abc",
    };
    const fetcher: CredentialFetcher = {
      getProjectCredential: vi.fn().mockResolvedValue(credential),
    };
    manager = new ProjectSourceManager(BASE_PATH, createMockLogger(), fetcher);

    await manager.ensureSource({
      uuid: "proj-auth",
      repositoryUrl: "https://github.com/org/private.git",
      credentialType: "https_token",
    });

    expect(fetcher.getProjectCredential).toHaveBeenCalledWith("proj-auth");
    expect(mockGitInstance.env).toHaveBeenCalled();
    const envArg = mockGitInstance.env.mock.calls[0]![0] as Record<
      string,
      string
    >;
    expect(envArg["GIT_ASKPASS"]).toContain("askpass.sh");
    expect(envArg["CASPER_GIT_TOKEN"]).toBe("ghp_abc");
  });

  it("cleans up auth scratch dir even when clone throws", async () => {
    vi.mocked(access).mockRejectedValue(new Error("ENOENT"));
    const fsPromises = await import("fs/promises");
    const rmMock = vi.mocked(fsPromises.rm);

    const credential: ProjectCredential = {
      type: "ssh_key",
      privateKey: "-----BEGIN-----\nkey\n",
    };
    const fetcher: CredentialFetcher = {
      getProjectCredential: vi.fn().mockResolvedValue(credential),
    };
    manager = new ProjectSourceManager(BASE_PATH, createMockLogger(), fetcher);

    mockGitInstance.clone.mockRejectedValueOnce(new Error("clone failed"));

    await expect(
      manager.ensureSource({
        uuid: "proj-fail",
        repositoryUrl: "git@github.com:org/private.git",
        credentialType: "ssh_key",
      }),
    ).rejects.toThrow("clone failed");

    expect(rmMock).toHaveBeenCalledWith(
      `${BASE_PATH}/proj-fail/.creds`,
      expect.objectContaining({ recursive: true, force: true }),
    );
  });

  it("does not fetch credential when credentialType is null", async () => {
    vi.mocked(access).mockRejectedValue(new Error("ENOENT"));
    const fetcher = createNullFetcher();
    manager = new ProjectSourceManager(BASE_PATH, createMockLogger(), fetcher);

    await manager.ensureSource({
      uuid: "proj-no-cred",
      repositoryUrl: "https://github.com/org/public.git",
      credentialType: null,
    });

    expect(fetcher.getProjectCredential).not.toHaveBeenCalled();
    expect(mockGitInstance.env).not.toHaveBeenCalled();
  });
});
