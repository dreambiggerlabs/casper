import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { access, mkdir, open, unlink } from "fs/promises";
import { simpleGit } from "simple-git";
import type { Logger } from "pino";

import { ProjectSourceManager } from "../../src/project-source-manager.js";

vi.mock("fs/promises", () => ({
  access: vi.fn(),
  mkdir: vi.fn().mockResolvedValue(undefined),
  open: vi.fn(),
  unlink: vi.fn().mockResolvedValue(undefined),
}));

const mockGitInstance = {
  init: vi.fn().mockResolvedValue(undefined),
  clone: vi.fn().mockResolvedValue(undefined),
  pull: vi.fn().mockResolvedValue(undefined),
  push: vi.fn().mockResolvedValue(undefined),
  getRemotes: vi.fn().mockResolvedValue([]),
  addRemote: vi.fn().mockResolvedValue(undefined),
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

const BASE_PATH = "/tmp/test-casper/projects";

describe("ProjectSourceManager", () => {
  let manager: ProjectSourceManager;
  let mockLockHandle: { close: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new ProjectSourceManager(BASE_PATH, createMockLogger());
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
    });

    expect(result).toBe(`${BASE_PATH}/proj-5/source`);
    expect(mockGitInstance.addRemote).toHaveBeenCalledWith(
      "origin",
      "https://github.com/org/repo.git",
    );
    expect(mockGitInstance.push).toHaveBeenCalledWith("origin", "HEAD", ["-u"]);
  });
});
