import { z } from "zod";

import {
  RESOURCE_PATHS,
  type PolymorphicIri,
  type ResourceType,
} from "./resource-paths.js";

export class IriParser {
  parse(iri: string, resource: ResourceType): string {
    const prefix = `${RESOURCE_PATHS[resource]}/`;
    if (!iri.startsWith(prefix)) {
      throw new Error(
        `Invalid IRI: expected ${RESOURCE_PATHS[resource]}/{{uuid}}, got ${iri}`,
      );
    }
    const uuid = iri.slice(prefix.length);
    if (!z.string().uuid().safeParse(uuid).success) {
      throw new Error(
        `Invalid IRI: UUID segment is not a valid UUID in ${iri}`,
      );
    }

    return uuid;
  }

  parsePolymorphic<R extends ResourceType>(
    iri: string,
    resources: readonly R[],
  ): PolymorphicIri<R> {
    for (const resource of resources) {
      const prefix = `${RESOURCE_PATHS[resource]}/`;
      if (!iri.startsWith(prefix)) continue;
      const uuid = iri.slice(prefix.length);
      if (!z.string().uuid().safeParse(uuid).success) continue;

      return { resource, uuid };
    }

    const allowed = resources
      .map((r) => `${RESOURCE_PATHS[r]}/{uuid}`)
      .join(" | ");
    throw new Error(`Invalid IRI: expected one of ${allowed}, got ${iri}`);
  }
}
