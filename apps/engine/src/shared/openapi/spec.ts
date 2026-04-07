export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "Casper Engine API",
    version: "0.1.0",
    description:
      "Agentic coding engine that receives tasks, dispatches them to LLM agents, and delivers validated pull requests.",
  },
  servers: [{ url: "http://localhost:3000" }],
  paths: {
    "/projects": {
      post: {
        tags: ["Projects"],
        summary: "Create a project",
        operationId: "createProject",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateProject" },
            },
          },
        },
        responses: {
          "201": {
            description: "Project created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Project" },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
      get: {
        tags: ["Projects"],
        summary: "List all projects",
        operationId: "listProjects",
        parameters: [
          { $ref: "#/components/parameters/page" },
          { $ref: "#/components/parameters/itemsPerPage" },
        ],
        responses: {
          "200": {
            description: "Paginated collection of projects",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HydraCollection" },
              },
            },
          },
        },
      },
    },
    "/projects/{uuid}": {
      get: {
        tags: ["Projects"],
        summary: "Get a project by UUID",
        operationId: "getProject",
        parameters: [
          {
            name: "uuid",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description: "Project found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Project" },
              },
            },
          },
          "404": {
            description: "Project not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
      patch: {
        tags: ["Projects"],
        summary: "Update a project",
        operationId: "updateProject",
        parameters: [
          {
            name: "uuid",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateProject" },
            },
          },
        },
        responses: {
          "200": {
            description: "Project updated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Project" },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "404": {
            description: "Project not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/agents": {
      post: {
        tags: ["Agents"],
        summary: "Create an agent",
        operationId: "createAgent",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateAgent" },
            },
          },
        },
        responses: {
          "201": {
            description: "Agent created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Agent" },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
      get: {
        tags: ["Agents"],
        summary: "List all agents",
        operationId: "listAgents",
        parameters: [
          { $ref: "#/components/parameters/page" },
          { $ref: "#/components/parameters/itemsPerPage" },
        ],
        responses: {
          "200": {
            description: "Paginated collection of agents",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HydraCollection" },
              },
            },
          },
        },
      },
    },
    "/agents/{uuid}": {
      get: {
        tags: ["Agents"],
        summary: "Get an agent by UUID",
        operationId: "getAgent",
        parameters: [
          {
            name: "uuid",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description: "Agent found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Agent" },
              },
            },
          },
          "404": {
            description: "Agent not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/workers": {
      post: {
        tags: ["Workers"],
        summary: "Register a new worker",
        operationId: "registerWorker",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateWorker" },
            },
          },
        },
        responses: {
          "201": {
            description: "Worker registered",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Worker" },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
      get: {
        tags: ["Workers"],
        summary: "List all workers",
        operationId: "listWorkers",
        parameters: [
          { $ref: "#/components/parameters/page" },
          { $ref: "#/components/parameters/itemsPerPage" },
        ],
        responses: {
          "200": {
            description: "Paginated collection of workers",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HydraCollection" },
              },
            },
          },
        },
      },
    },
    "/workers/{uuid}": {
      get: {
        tags: ["Workers"],
        summary: "Get a worker by UUID",
        operationId: "getWorker",
        parameters: [
          {
            name: "uuid",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description: "Worker found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Worker" },
              },
            },
          },
          "404": {
            description: "Worker not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/workers/{uuid}/heartbeat": {
      put: {
        tags: ["Workers"],
        summary: "Update worker heartbeat",
        operationId: "workerHeartbeat",
        parameters: [
          {
            name: "uuid",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/WorkerHeartbeat" },
            },
          },
        },
        responses: {
          "200": {
            description: "Worker heartbeat updated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Worker" },
              },
            },
          },
          "404": {
            description: "Worker not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/jobs": {
      post: {
        tags: ["Jobs"],
        summary: "Create a new job",
        operationId: "createJob",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateJob" },
            },
          },
        },
        responses: {
          "201": {
            description: "Job created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/WorkerJob" },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
      get: {
        tags: ["Jobs"],
        summary: "List jobs for a worker",
        operationId: "listJobs",
        parameters: [
          {
            name: "worker",
            in: "query",
            required: true,
            description: "Filter by worker IRI (e.g. /workers/{uuid})",
            schema: {
              type: "string",
              description: "Worker IRI in the format /workers/{uuid}",
            },
          },
          {
            name: "status",
            in: "query",
            required: false,
            description: "Filter by job status",
            schema: {
              type: "string",
              enum: ["ready", "in_progress", "completed", "failed"],
            },
          },
          { $ref: "#/components/parameters/page" },
          { $ref: "#/components/parameters/itemsPerPage" },
        ],
        responses: {
          "200": {
            description: "Paginated collection of jobs",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HydraCollection" },
              },
            },
          },
          "400": {
            description: "Missing worker parameter",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/jobs/{uuid}": {
      get: {
        tags: ["Jobs"],
        summary: "Get a job by UUID",
        operationId: "getJob",
        parameters: [
          {
            name: "uuid",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description: "Job found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/WorkerJob" },
              },
            },
          },
          "404": {
            description: "Job not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/jobs/{uuid}/status": {
      patch: {
        tags: ["Jobs"],
        summary: "Update job status",
        operationId: "updateJobStatus",
        parameters: [
          {
            name: "uuid",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateJobStatus" },
            },
          },
        },
        responses: {
          "200": {
            description: "Job status updated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/WorkerJob" },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "404": {
            description: "Job not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/tasks": {
      post: {
        tags: ["Tasks"],
        summary: "Create a task",
        operationId: "createTask",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateTask" },
            },
          },
        },
        responses: {
          "201": {
            description: "Task created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Task" },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "404": {
            description: "Project or parent task not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
      get: {
        tags: ["Tasks"],
        summary: "List all tasks",
        operationId: "listTasks",
        parameters: [
          {
            name: "status",
            in: "query",
            required: false,
            description: "Filter by task status",
            schema: {
              type: "string",
              enum: ["backlog", "ready", "in_progress", "review", "completed"],
            },
          },
          {
            name: "agent",
            in: "query",
            required: false,
            description: "Filter by agent IRI (e.g. /agents/{uuid})",
            schema: {
              type: "string",
              description: "Agent IRI in the format /agents/{uuid}",
            },
          },
          { $ref: "#/components/parameters/page" },
          { $ref: "#/components/parameters/itemsPerPage" },
        ],
        responses: {
          "200": {
            description: "Paginated collection of tasks",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HydraCollection" },
              },
            },
          },
        },
      },
    },
    "/tasks/{uuid}": {
      get: {
        tags: ["Tasks"],
        summary: "Get a task by UUID",
        operationId: "getTask",
        parameters: [
          {
            name: "uuid",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description: "Task found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Task" },
              },
            },
          },
          "404": {
            description: "Task not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
      patch: {
        tags: ["Tasks"],
        summary: "Update a task",
        operationId: "updateTask",
        parameters: [
          {
            name: "uuid",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateTask" },
            },
          },
        },
        responses: {
          "200": {
            description: "Task updated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Task" },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "404": {
            description: "Task, project, or parent task not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/tasks/{uuid}/assign": {
      post: {
        tags: ["Tasks"],
        summary: "Assign an agent to a task",
        operationId: "assignTask",
        parameters: [
          {
            name: "uuid",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AssignTask" },
            },
          },
        },
        responses: {
          "200": {
            description: "Task assigned",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Task" },
              },
            },
          },
          "400": {
            description: "Validation error or task not in pending status",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "404": {
            description: "Task or agent not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/tasks/{uuid}/status": {
      patch: {
        tags: ["Tasks"],
        summary: "Update task status",
        operationId: "updateTaskStatus",
        parameters: [
          {
            name: "uuid",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateTaskStatus" },
            },
          },
        },
        responses: {
          "200": {
            description: "Task status updated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Task" },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "404": {
            description: "Task not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/projects/{projectId}/tasks": {
      get: {
        tags: ["Tasks"],
        summary: "List tasks by project",
        operationId: "listTasksByProject",
        parameters: [
          {
            name: "projectId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
          { $ref: "#/components/parameters/page" },
          { $ref: "#/components/parameters/itemsPerPage" },
        ],
        responses: {
          "200": {
            description: "Paginated collection of tasks for the project",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HydraCollection" },
              },
            },
          },
          "404": {
            description: "Project not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
  },
  components: {
    parameters: {
      page: {
        name: "page",
        in: "query",
        required: false,
        description: "Page number (1-indexed, defaults to 1)",
        schema: { type: "integer", minimum: 1, default: 1 },
      },
      itemsPerPage: {
        name: "itemsPerPage",
        in: "query",
        required: false,
        description: "Number of items per page (defaults to 30, max 100)",
        schema: { type: "integer", minimum: 1, maximum: 100, default: 30 },
      },
    },
    schemas: {
      HydraCollection: {
        type: "object",
        required: ["@context", "@id", "@type", "totalItems", "member"],
        description: "A Hydra Collection with optional pagination view",
        properties: {
          "@context": { type: "string" },
          "@id": { type: "string" },
          "@type": { type: "string", enum: ["Collection"] },
          totalItems: { type: "integer", minimum: 0 },
          member: { type: "array", items: {} },
          view: { $ref: "#/components/schemas/PartialCollectionView" },
        },
      },
      PartialCollectionView: {
        type: "object",
        required: ["@id", "@type", "first", "last"],
        description:
          "Pagination view with navigation links for a Hydra Collection",
        properties: {
          "@id": { type: "string" },
          "@type": {
            type: "string",
            enum: ["PartialCollectionView"],
          },
          first: { type: "string" },
          last: { type: "string" },
          next: { type: "string" },
          previous: { type: "string" },
        },
      },
      Project: {
        type: "object",
        required: ["@id", "uuid", "title", "createdAt", "updatedAt"],
        properties: {
          "@id": {
            type: "string",
            description: "Resource IRI (e.g. /projects/{uuid})",
          },
          uuid: { type: "string", format: "uuid" },
          title: { type: "string", maxLength: 255 },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      CreateProject: {
        type: "object",
        required: ["title"],
        properties: {
          title: {
            type: "string",
            minLength: 1,
            maxLength: 255,
          },
        },
      },
      UpdateProject: {
        type: "object",
        properties: {
          title: {
            type: "string",
            minLength: 1,
            maxLength: 255,
          },
        },
      },
      Agent: {
        type: "object",
        required: ["@id", "uuid", "name", "createdAt", "updatedAt"],
        properties: {
          "@id": {
            type: "string",
            description: "Resource IRI (e.g. /agents/{uuid})",
          },
          uuid: { type: "string", format: "uuid" },
          name: { type: "string", maxLength: 255 },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      CreateAgent: {
        type: "object",
        required: ["name"],
        properties: {
          name: {
            type: "string",
            minLength: 1,
            maxLength: 255,
          },
        },
      },
      Worker: {
        type: "object",
        required: [
          "@id",
          "uuid",
          "name",
          "token",
          "status",
          "createdAt",
          "updatedAt",
        ],
        properties: {
          "@id": {
            type: "string",
            description: "Resource IRI (e.g. /workers/{uuid})",
          },
          uuid: { type: "string", format: "uuid" },
          name: { type: "string", maxLength: 255 },
          token: { type: "string", description: "Worker authentication token" },
          status: {
            type: "string",
            enum: ["active", "inactive"],
          },
          lastHeartbeatAt: {
            type: ["string", "null"],
            format: "date-time",
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      CreateWorker: {
        type: "object",
        properties: {
          name: {
            type: "string",
            minLength: 1,
            maxLength: 255,
            description: "Worker name (auto-generated if not provided)",
          },
        },
      },
      WorkerHeartbeat: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["active", "inactive"],
          },
        },
      },
      WorkerJob: {
        type: "object",
        required: [
          "@id",
          "uuid",
          "worker",
          "type",
          "status",
          "createdAt",
          "updatedAt",
        ],
        properties: {
          "@id": {
            type: "string",
            description: "Resource IRI (e.g. /jobs/{uuid})",
          },
          uuid: { type: "string", format: "uuid" },
          worker: {
            type: "string",
            description: "Worker IRI (e.g. /workers/{uuid})",
          },
          type: {
            type: "string",
            enum: ["execute_task", "cleanup", "start_preview", "stop_preview"],
          },
          status: {
            type: "string",
            enum: ["ready", "in_progress", "completed", "failed"],
          },
          task: {
            type: ["string", "null"],
            description: "Task IRI (e.g. /tasks/{uuid}) or null",
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      CreateJob: {
        type: "object",
        required: ["worker", "type"],
        properties: {
          worker: {
            type: "string",
            description: "Worker IRI (e.g. /workers/{uuid})",
          },
          type: {
            type: "string",
            enum: ["execute_task", "cleanup", "start_preview", "stop_preview"],
          },
          task: {
            type: "string",
            description: "Task IRI (e.g. /tasks/{uuid})",
          },
        },
      },
      UpdateJobStatus: {
        type: "object",
        required: ["status"],
        properties: {
          status: {
            type: "string",
            enum: ["ready", "in_progress", "completed", "failed"],
          },
        },
      },
      Task: {
        type: "object",
        required: [
          "@id",
          "uuid",
          "title",
          "project",
          "status",
          "createdAt",
          "updatedAt",
        ],
        properties: {
          "@id": {
            type: "string",
            description: "Resource IRI (e.g. /tasks/{uuid})",
          },
          uuid: { type: "string", format: "uuid" },
          title: { type: "string", maxLength: 255 },
          project: {
            type: "string",
            description: "Project IRI (e.g. /projects/{uuid})",
          },
          parent: {
            type: ["string", "null"],
            description: "Parent task IRI (e.g. /tasks/{uuid}) or null",
          },
          status: {
            type: "string",
            enum: ["backlog", "ready", "in_progress", "review", "completed"],
          },
          agent: {
            type: ["string", "null"],
            description: "Agent IRI (e.g. /agents/{uuid}) or null",
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      CreateTask: {
        type: "object",
        required: ["title", "project"],
        properties: {
          title: {
            type: "string",
            minLength: 1,
            maxLength: 255,
          },
          project: {
            type: "string",
            description: "Project IRI (e.g. /projects/{uuid})",
          },
          parent: {
            type: "string",
            description: "Parent task IRI (e.g. /tasks/{uuid})",
          },
        },
      },
      UpdateTask: {
        type: "object",
        properties: {
          title: {
            type: "string",
            minLength: 1,
            maxLength: 255,
          },
          project: {
            type: "string",
            description: "Project IRI (e.g. /projects/{uuid})",
          },
          parent: {
            type: ["string", "null"],
            description: "Parent task IRI (e.g. /tasks/{uuid}) or null",
          },
        },
      },
      AssignTask: {
        type: "object",
        required: ["agent"],
        properties: {
          agent: {
            type: "string",
            description: "Agent IRI (e.g. /agents/{uuid})",
          },
        },
      },
      UpdateTaskStatus: {
        type: "object",
        required: ["status"],
        properties: {
          status: {
            type: "string",
            enum: ["backlog", "ready", "in_progress", "review", "completed"],
          },
        },
      },
      Error: {
        type: "object",
        required: ["error"],
        properties: {
          error: { type: "string" },
          violations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                field: { type: "string" },
                message: { type: "string" },
              },
            },
          },
        },
      },
    },
  },
} as const;
