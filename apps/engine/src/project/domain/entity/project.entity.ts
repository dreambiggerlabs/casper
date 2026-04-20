import type { CredentialType } from "@/project/domain/value-object/credential-type.value-object.js";

export interface Project {
  "@id": string;
  uuid: string;
  title: string;
  description: string | null;
  repositoryUrl: string | null;
  credentialType: CredentialType | null;
  createdAt: Date;
  updatedAt: Date | null;
}
