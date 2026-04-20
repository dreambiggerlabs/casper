import { RESOURCE_PATHS, type ResourceType } from "./resource-paths.js";

export class IriBuilder {
  build(resource: ResourceType, uuid: string): string {
    return `${RESOURCE_PATHS[resource]}/${uuid}`;
  }
}
