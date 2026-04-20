export const CREDENTIAL_TYPE_VALUES = ["https_token", "ssh_key"] as const;

export type CredentialType = (typeof CREDENTIAL_TYPE_VALUES)[number];

export interface HttpsTokenCredential {
  type: "https_token";
  username?: string;
  token: string;
}

export interface SshKeyCredential {
  type: "ssh_key";
  privateKey: string;
  passphrase?: string;
}

export type ProjectCredential = HttpsTokenCredential | SshKeyCredential;
