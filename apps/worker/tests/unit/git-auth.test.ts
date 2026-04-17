import { describe, it, expect, vi, beforeEach } from "vitest";
import { mkdir, rm, writeFile } from "fs/promises";

import { prepareAuthEnv } from "../../src/git-auth.js";

vi.mock("fs/promises", () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  rm: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
}));

const SCRATCH = "/tmp/casper-test/proj-1/.creds";

describe("prepareAuthEnv", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ssh_key", () => {
    it("writes the key file with mode 0600 and sets GIT_SSH_COMMAND", async () => {
      const { env, cleanup } = await prepareAuthEnv(
        {
          type: "ssh_key",
          privateKey: "-----BEGIN OPENSSH PRIVATE KEY-----\nkey\n",
        },
        SCRATCH,
      );

      expect(mkdir).toHaveBeenCalledWith(SCRATCH, {
        recursive: true,
        mode: 0o700,
      });
      expect(writeFile).toHaveBeenCalledWith(
        `${SCRATCH}/id_credential`,
        "-----BEGIN OPENSSH PRIVATE KEY-----\nkey\n",
        { mode: 0o600 },
      );
      expect(writeFile).toHaveBeenCalledWith(`${SCRATCH}/known_hosts`, "", {
        mode: 0o600,
      });
      expect(env["GIT_SSH_COMMAND"]).toContain(`-i ${SCRATCH}/id_credential`);
      expect(env["GIT_SSH_COMMAND"]).toContain("IdentitiesOnly=yes");
      expect(env["GIT_SSH_COMMAND"]).toContain(
        "StrictHostKeyChecking=accept-new",
      );
      expect(env["GIT_SSH_COMMAND"]).toContain(
        `UserKnownHostsFile=${SCRATCH}/known_hosts`,
      );

      await cleanup();
      expect(rm).toHaveBeenCalledWith(SCRATCH, {
        recursive: true,
        force: true,
      });
    });

    it("appends a trailing newline to the key when missing", async () => {
      await prepareAuthEnv(
        {
          type: "ssh_key",
          privateKey: "-----BEGIN OPENSSH PRIVATE KEY-----\nkey",
        },
        SCRATCH,
      );

      expect(writeFile).toHaveBeenCalledWith(
        `${SCRATCH}/id_credential`,
        "-----BEGIN OPENSSH PRIVATE KEY-----\nkey\n",
        { mode: 0o600 },
      );
    });
  });

  describe("https_token", () => {
    it("writes askpass script and exposes token via env", async () => {
      const { env, cleanup } = await prepareAuthEnv(
        { type: "https_token", token: "ghp_secret" },
        SCRATCH,
      );

      expect(writeFile).toHaveBeenCalledWith(
        `${SCRATCH}/askpass.sh`,
        expect.stringContaining("CASPER_GIT_TOKEN"),
        { mode: 0o700 },
      );
      expect(env["GIT_ASKPASS"]).toBe(`${SCRATCH}/askpass.sh`);
      expect(env["GIT_TERMINAL_PROMPT"]).toBe("0");
      expect(env["CASPER_GIT_TOKEN"]).toBe("ghp_secret");
      expect(env["CASPER_GIT_USERNAME"]).toBeUndefined();

      await cleanup();
      expect(rm).toHaveBeenCalled();
    });

    it("includes username when provided", async () => {
      const { env } = await prepareAuthEnv(
        { type: "https_token", username: "octocat", token: "ghp_x" },
        SCRATCH,
      );

      expect(env["CASPER_GIT_USERNAME"]).toBe("octocat");
    });
  });

  it("cleans up scratch dir if env preparation throws", async () => {
    vi.mocked(writeFile).mockRejectedValueOnce(new Error("disk full"));

    await expect(
      prepareAuthEnv(
        { type: "https_token", token: "x" },
        SCRATCH,
      ),
    ).rejects.toThrow("disk full");

    expect(rm).toHaveBeenCalledWith(SCRATCH, {
      recursive: true,
      force: true,
    });
  });
});
