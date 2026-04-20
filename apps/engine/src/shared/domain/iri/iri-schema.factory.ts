import { z } from "zod";

import { IriParser } from "./iri-parser.js";
import { RESOURCE_PATHS, type ResourceType } from "./resource-paths.js";

export class IriSchemaFactory {
  constructor(private readonly parser: IriParser = new IriParser()) {}

  iri(resource: ResourceType) {
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

  nullableIri(resource: ResourceType) {
    return this.iri(resource).nullable();
  }

  polymorphicIri<R extends ResourceType>(resources: readonly R[]) {
    const allowed = resources
      .map((r) => `${RESOURCE_PATHS[r]}/{uuid}`)
      .join(" | ");
    const parser = this.parser;

    return z.string().transform((val, ctx) => {
      try {
        return parser.parsePolymorphic(val, resources);
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Must be a valid IRI in the format ${allowed}`,
        });

        return z.NEVER;
      }
    });
  }
}
