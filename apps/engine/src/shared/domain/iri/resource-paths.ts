export const RESOURCE_PATHS = {
  projects: "/projects",
  tasks: "/tasks",
  agents: "/agents",
  users: "/users",
  workers: "/workers",
  jobs: "/jobs",
} as const;

export type ResourceType = keyof typeof RESOURCE_PATHS;

export interface PolymorphicIri<R extends ResourceType = ResourceType> {
  resource: R;
  uuid: string;
}
