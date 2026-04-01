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
      Task: {
        type: "object",
        required: [
          "uuid",
          "title",
          "projectId",
          "parentId",
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
      Error: {
        type: "object",
        required: ["error"],
        properties: {
          error: { type: "string" },
        },
      },
    },
  },
} as const;
