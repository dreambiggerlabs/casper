import { NotFoundError } from "@/shared/domain/error/not-found.error.js";
import { IriParser } from "@/shared/domain/iri/iri-parser.js";
import type {
  PolymorphicIri,
  ResourceType,
} from "@/shared/domain/iri/resource-paths.js";

export interface UuidLookup {
  findByUuid(uuid: string): Promise<{ uuid: string } | undefined>;
}

export type ReaderMap<R extends ResourceType> = Record<R, UuidLookup>;

const RESOURCE_LABELS: Record<ResourceType, string> = {
  projects: "Project",
  tasks: "Task",
  agents: "Agent",
  users: "User",
  workers: "Worker",
  jobs: "Job",
};

export class ReferenceResolver<R extends ResourceType> {
  constructor(
    private readonly readers: ReaderMap<R>,
    private readonly parser: IriParser = new IriParser(),
  ) {}

  async resolve(iri: string): Promise<PolymorphicIri<R>> {
    const resources = Object.keys(this.readers) as R[];
    const parsed = this.parser.parsePolymorphic(iri, resources);
    const reader = this.readers[parsed.resource];
    const found = await reader.findByUuid(parsed.uuid);
    if (!found) {
      throw new NotFoundError(RESOURCE_LABELS[parsed.resource], parsed.uuid);
    }

    return parsed;
  }

  async assertExists(resource: R, uuid: string): Promise<void> {
    const reader = this.readers[resource];
    const found = await reader.findByUuid(uuid);
    if (!found) {
      throw new NotFoundError(RESOURCE_LABELS[resource], uuid);
    }
  }
}
