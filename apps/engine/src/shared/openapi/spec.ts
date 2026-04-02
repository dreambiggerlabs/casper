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
        responses: {
          "200": {
            description: "List of projects",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Project" },
                },
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
        responses: {
          "200": {
            description: "List of agents",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Agent" },
                },
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
        responses: {
          "200": {
            description: "List of workers",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Worker" },
                },
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
            name: "workerId",
            in: "query",
            required: true,
            description: "Filter by worker UUID",
            schema: { type: "string", format: "uuid" },
          },
          {
            name: "status",
            in: "query",
            required: false,
            description: "Filter by job status",
            schema: {
              type: "string",
              enum: ["pending", "in_progress", "completed", "failed"],
            },
          },
        ],
        responses: {
          "200": {
            description: "List of jobs",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/WorkerJob" },
                },
              },
            },
          },
          "400": {
            description: "Missing workerId parameter",
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
              enum: [
                "pending",
                "assigned",
                "processing",
                "in_progress",
                "completed",
              ],
            },
          },
          {
            name: "agentId",
            in: "query",
            required: false,
            description: "Filter by agent UUID",
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description: "List of tasks",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Task" },
                },
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
        ],
        responses: {
          "200": {
            description: "List of tasks for the project",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Task" },
                },
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
    schemas: {
      Project: {
        type: "object",
        required: ["uuid", "title", "createdAt", "updatedAt"],
        properties: {
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
        required: ["uuid", "name", "createdAt", "updatedAt"],
        properties: {
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
        required: ["uuid", "name", "token", "status", "createdAt", "updatedAt"],
        properties: {
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
          "uuid",
          "workerId",
          "type",
          "status",
          "createdAt",
          "updatedAt",
        ],
        properties: {
          uuid: { type: "string", format: "uuid" },
          workerId: { type: "string", format: "uuid" },
          type: {
            type: "string",
            enum: ["execute_task", "cleanup", "start_preview", "stop_preview"],
          },
          status: {
            type: "string",
            enum: ["pending", "in_progress", "completed", "failed"],
          },
          taskId: {
            type: ["string", "null"],
            format: "uuid",
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      CreateJob: {
        type: "object",
        required: ["workerId", "type"],
        properties: {
          workerId: {
            type: "string",
            format: "uuid",
            description: "Worker UUID to assign the job to",
          },
          type: {
            type: "string",
            enum: ["execute_task", "cleanup", "start_preview", "stop_preview"],
          },
          taskId: {
            type: "string",
            format: "uuid",
            description: "Task UUID (required for execute_task type)",
          },
        },
      },
      UpdateJobStatus: {
        type: "object",
        required: ["status"],
        properties: {
          status: {
            type: "string",
            enum: ["pending", "in_progress", "completed", "failed"],
          },
        },
      },
      Task: {
        type: "object",
        required: [
          "uuid",
          "title",
          "projectId",
          "status",
          "createdAt",
          "updatedAt",
        ],
        properties: {
          uuid: { type: "string", format: "uuid" },
          title: { type: "string", maxLength: 255 },
          projectId: { type: "string", format: "uuid" },
          parentId: {
            type: ["string", "null"],
            format: "uuid",
          },
          status: {
            type: "string",
            enum: [
              "pending",
              "assigned",
              "processing",
              "in_progress",
              "completed",
            ],
          },
          agentId: {
            type: ["string", "null"],
            format: "uuid",
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      CreateTask: {
        type: "object",
        required: ["title", "projectId"],
        properties: {
          title: {
            type: "string",
            minLength: 1,
            maxLength: 255,
          },
          projectId: {
            type: "string",
            format: "uuid",
          },
          parentId: {
            type: "string",
            format: "uuid",
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
          projectId: {
            type: "string",
            format: "uuid",
          },
          parentId: {
            type: ["string", "null"],
            format: "uuid",
          },
        },
      },
      AssignTask: {
        type: "object",
        required: ["agentId"],
        properties: {
          agentId: {
            type: "string",
            format: "uuid",
          },
        },
      },
      UpdateTaskStatus: {
        type: "object",
        required: ["status"],
        properties: {
          status: {
            type: "string",
            enum: [
              "pending",
              "assigned",
              "processing",
              "in_progress",
              "completed",
            ],
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
