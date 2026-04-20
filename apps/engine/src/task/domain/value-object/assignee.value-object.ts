export const ASSIGNEE_TYPE_VALUES = ["agent", "user"] as const;

export type AssigneeType = (typeof ASSIGNEE_TYPE_VALUES)[number];

export interface AssigneeRef {
  type: AssigneeType;
  uuid: string;
}
