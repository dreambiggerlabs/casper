import { z } from "zod";

const RESOURCE_PATHS = {
  projects: "/projects",
  tasks: "/tasks",
  agents: "/agents",
  workers: "/workers",
  jobs: "/jobs",
} as const;

export type ResourceType = keyof typeof RESOURCE_PATHS;

export function toIri(resource: ResourceType, uuid: string): string {
  return `${RESOURCE_PATHS[resource]}/${uuid}`;
}

export function parseIri(iri: string, resource: ResourceType): string {
  const prefix = `${RESOURCE_PATHS[resource]}/`;
  if (!iri.startsWith(prefix)) {
    throw new Error(
      `Invalid IRI: expected ${RESOURCE_PATHS[resource]}/{{uuid}}, got ${iri}`,
    );
  }
  const uuid = iri.slice(prefix.length);
  if (!z.string().uuid().safeParse(uuid).success) {
    throw new Error(`Invalid IRI: UUID segment is not a valid UUID in ${iri}`);
  }

  return uuid;
}

export function iriSchema(resource: ResourceType) {
  const prefix = RESOURCE_PATHS[resource];

  return z
    .string()
    .refine(
      (val) => {
        if (!val.startsWith(`${prefix}/`)) return false;
        const uuid = val.slice(prefix.length + 1);

        return z.string().uuid().safeParse(uuid).success;
      },
      { message: `Must be a valid IRI in the format ${prefix}/{uuid}` },
    )
    .transform((val) => val.slice(prefix.length + 1));
}

export function nullableIriSchema(resource: ResourceType) {
  return iriSchema(resource).nullable();
}
