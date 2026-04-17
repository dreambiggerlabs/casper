import { mkdir, rm, writeFile } from "fs/promises";
import { join } from "path";

import type { ProjectCredential } from "./types.js";

export interface GitAuthEnv {
  env: NodeJS.ProcessEnv;
  cleanup: () => Promise<void>;
}

const SAFE_ENV_KEYS = ["PATH", "HOME", "USER", "LANG", "LC_ALL", "TMPDIR"];

function baseEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const key of SAFE_ENV_KEYS) {
    const value = process.env[key];
    if (value !== undefined) env[key] = value;
  }

  return env;
}

export async function prepareAuthEnv(
  credential: ProjectCredential,
  scratchDir: string,
): Promise<GitAuthEnv> {
  await mkdir(scratchDir, { recursive: true, mode: 0o700 });

  const cleanup = async (): Promise<void> => {
    await rm(scratchDir, { recursive: true, force: true });
  };

  try {
    if (credential.type === "ssh_key") {
      return {
        env: await prepareSshEnv(credential, scratchDir),
        cleanup,
      };
    }

    return {
      env: await prepareHttpsEnv(credential, scratchDir),
      cleanup,
    };
  } catch (err) {
    await cleanup();
    throw err;
  }
}

async function prepareSshEnv(
  credential: Extract<ProjectCredential, { type: "ssh_key" }>,
  scratchDir: string,
): Promise<NodeJS.ProcessEnv> {
  const keyPath = join(scratchDir, "id_credential");
  const keyContent = credential.privateKey.endsWith("\n")
    ? credential.privateKey
    : `${credential.privateKey}\n`;
  await writeFile(keyPath, keyContent, { mode: 0o600 });

  const knownHostsPath = join(scratchDir, "known_hosts");
  await writeFile(knownHostsPath, "", { mode: 0o600 });

  const sshOptions = [
    `-i ${keyPath}`,
    "-o IdentitiesOnly=yes",
    "-o StrictHostKeyChecking=accept-new",
    `-o UserKnownHostsFile=${knownHostsPath}`,
  ];

  return {
    ...baseEnv(),
    GIT_SSH_COMMAND: `ssh ${sshOptions.join(" ")}`,
  };
}

async function prepareHttpsEnv(
  credential: Extract<ProjectCredential, { type: "https_token" }>,
  scratchDir: string,
): Promise<NodeJS.ProcessEnv> {
  const askpassPath = join(scratchDir, "askpass.sh");
  const askpassScript = `#!/bin/sh
case "$1" in
  Username*) printf '%s' "\${CASPER_GIT_USERNAME:-x-access-token}" ;;
  Password*) printf '%s' "$CASPER_GIT_TOKEN" ;;
esac
`;
  await writeFile(askpassPath, askpassScript, { mode: 0o700 });

  const env: NodeJS.ProcessEnv = {
    ...baseEnv(),
    GIT_ASKPASS: askpassPath,
    GIT_TERMINAL_PROMPT: "0",
    CASPER_GIT_TOKEN: credential.token,
  };
  if (credential.username) {
    env.CASPER_GIT_USERNAME = credential.username;
  }

  return env;
}
