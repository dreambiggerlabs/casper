import { IriBuilder } from "@/shared/domain/iri/iri-builder.js";
import type { Task } from "@/task/domain/entity/task.entity.js";
import type { AssigneeType } from "@/task/domain/value-object/assignee.value-object.js";
import type { TaskStatus } from "@/task/domain/value-object/task-status.value-object.js";

export interface TaskRow {
  uuid: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  createdAt: Date;
  updatedAt: Date | null;
  projectUuid: string;
  parentUuid: string | null;
  assigneeType: AssigneeType | null;
  agentUuid: string | null;
  userUuid: string | null;
}

export class TaskMapper {
  constructor(private readonly iri: IriBuilder = new IriBuilder()) {}

  toEntity(row: TaskRow): Task {
    let assignee: string | null = null;
    if (row.assigneeType === "agent" && row.agentUuid) {
      assignee = this.iri.build("agents", row.agentUuid);
    } else if (row.assigneeType === "user" && row.userUuid) {
      assignee = this.iri.build("users", row.userUuid);
    }

    return {
      "@id": this.iri.build("tasks", row.uuid),
      uuid: row.uuid,
      title: row.title,
      description: row.description,
      project: this.iri.build("projects", row.projectUuid),
      parent: row.parentUuid ? this.iri.build("tasks", row.parentUuid) : null,
      status: row.status,
      assignee,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
