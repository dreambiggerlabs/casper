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
        description: [
          "Create a new project. Optionally include a `repositoryUrl` and `credential` so workers can clone private repositories.",
          "",
          "**Sending SSH keys via curl:** SSH private keys are multi-line and must be JSON-escaped (newlines → `\\n`).",
          "Use `jq` to handle the escaping automatically:",
          "```bash",
          'jq -n --arg key "$(cat ~/.ssh/id_ed25519)" \'{',
          '  title: "My Project",',
          '  repositoryUrl: "git@github.com:org/private-repo.git",',
          '  credential: { type: "ssh_key", privateKey: $key }',
          "}' | curl -X POST http://localhost:3000/projects \\",
          '  -H "Content-Type: application/json" -d @-',
          "```",
        ].join("\n"),
        operationId: "createProject",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateProject" },
              examples: {
                "Public repo (no credential)": {
                  summary: "Public repository",
                  value: {
                    title: "My Open-Source Project",
                    repositoryUrl: "https://github.com/org/public-repo.git",
                  },
                },
                "HTTPS with token": {
                  summary: "Private repo with HTTPS token",
                  value: {
                    title: "My Private Project",
                    repositoryUrl: "https://github.com/org/private-repo.git",
                    credential: {
                      type: "https_token",
                      username: "git",
                      token: "ghp_xxxxxxxxxxxxxxxxxxxx",
                    },
                  },
                },
                "SSH with key": {
                  summary: "Private repo with SSH key",
                  value: {
                    title: "My Private Project",
                    repositoryUrl: "git@github.com:org/private-repo.git",
                    credential: {
                      type: "ssh_key",
                      privateKey:
                        "-----BEGIN OPENSSH PRIVATE KEY-----\n...\n-----END OPENSSH PRIVATE KEY-----",
                      passphrase: "optional-key-passphrase",
                    },
                  },
                },
              },
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
        description: [
          "Update project fields. Set `credential` to a new credential object to replace it, or `null` to clear it. Omit `credential` to leave it unchanged.",
          "",
          "**Sending SSH keys via curl:** See the POST endpoint for the `jq` one-liner to handle JSON escaping of private keys.",
        ].join("\n"),
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
              examples: {
                "Update title": {
                  summary: "Rename a project",
                  value: { title: "New Project Name" },
                },
                "Add HTTPS credential": {
                  summary: "Add an HTTPS token to an existing project",
                  value: {
                    credential: {
                      type: "https_token",
                      username: "git",
                      token: "ghp_xxxxxxxxxxxxxxxxxxxx",
                    },
                  },
                },
                "Add SSH credential": {
                  summary: "Add an SSH key to an existing project",
                  value: {
                    credential: {
                      type: "ssh_key",
                      privateKey:
                        "-----BEGIN OPENSSH PRIVATE KEY-----\n...\n-----END OPENSSH PRIVATE KEY-----",
                    },
                  },
                },
                "Clear credential": {
                  summary: "Remove credentials from a project",
                  value: { credential: null },
                },
              },
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
    "/projects/{uuid}/credential": {
      get: {
        tags: ["Projects"],
        summary: "Fetch a project credential (worker-only)",
        description:
          "Returns the decrypted credential for a project so a worker can clone a private repository. Requires a worker bearer token. The credential is never returned by the public project endpoints.",
        operationId: "getProjectCredential",
        security: [{ WorkerToken: [] }],
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
            description: "Decrypted credential",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ProjectCredential" },
                examples: {
                  "HTTPS token": {
                    summary: "HTTPS token credential",
                    value: {
                      type: "https_token",
                      username: "git",
                      token: "ghp_xxxxxxxxxxxxxxxxxxxx",
                    },
                  },
                  "SSH key": {
                    summary: "SSH key credential",
                    value: {
                      type: "ssh_key",
                      privateKey:
                        "-----BEGIN OPENSSH PRIVATE KEY-----\n...\n-----END OPENSSH PRIVATE KEY-----",
                      passphrase: "optional-key-passphrase",
                    },
                  },
                },
              },
            },
          },
          "401": {
            description: "Missing or invalid worker token",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "404": {
            description: "Project not found or no credential set",
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
    "/users": {
      post: {
        tags: ["Users"],
        summary: "Create a user",
        operationId: "createUser",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateUser" },
            },
          },
        },
        responses: {
          "201": {
            description: "User created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/User" },
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
        tags: ["Users"],
        summary: "List all users",
        operationId: "listUsers",
        parameters: [
          { $ref: "#/components/parameters/page" },
          { $ref: "#/components/parameters/itemsPerPage" },
        ],
        responses: {
          "200": {
            description: "Paginated collection of users",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HydraCollection" },
              },
            },
          },
        },
      },
    },
    "/users/{uuid}": {
      get: {
        tags: ["Users"],
        summary: "Get a user by UUID",
        operationId: "getUser",
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
            description: "User found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/User" },
              },
            },
          },
          "404": {
            description: "User not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
      patch: {
        tags: ["Users"],
        summary: "Update a user",
        operationId: "updateUser",
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
              schema: { $ref: "#/components/schemas/UpdateUser" },
            },
          },
        },
        responses: {
          "200": {
            description: "User updated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/User" },
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
            description: "User not found",
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
            name: "assignee",
            in: "query",
            required: false,
            description:
              "Filter by assignee IRI (e.g. /agents/{uuid} or /users/{uuid})",
            schema: {
              type: "string",
              description:
                "Assignee IRI in the format /agents/{uuid} or /users/{uuid}",
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
        summary: "Assign a task to an agent or user",
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
            description: "Task, agent, or user not found",
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
    securitySchemes: {
      WorkerToken: {
        type: "http",
        scheme: "bearer",
        description:
          "Bearer token issued to a worker at registration. Used to authenticate worker-only endpoints.",
      },
    },
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
        required: [
          "@id",
          "uuid",
          "title",
          "description",
          "repositoryUrl",
          "credentialType",
          "createdAt",
          "updatedAt",
        ],
        properties: {
          "@id": {
            type: "string",
            description: "Resource IRI (e.g. /projects/{uuid})",
          },
          uuid: { type: "string", format: "uuid" },
          title: { type: "string", maxLength: 255 },
          description: { type: ["string", "null"] },
          repositoryUrl: {
            type: ["string", "null"],
            format: "uri",
            maxLength: 2048,
          },
          credentialType: {
            type: ["string", "null"],
            enum: ["https_token", "ssh_key", null],
            description:
              "Type of credential stored for this project, or null when no credential is set. The credential value itself is never returned by this endpoint.",
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: ["string", "null"], format: "date-time" },
        },
      },
      ProjectCredential: {
        oneOf: [
          { $ref: "#/components/schemas/HttpsTokenCredential" },
          { $ref: "#/components/schemas/SshKeyCredential" },
        ],
        discriminator: {
          propertyName: "type",
          mapping: {
            https_token: "#/components/schemas/HttpsTokenCredential",
            ssh_key: "#/components/schemas/SshKeyCredential",
          },
        },
      },
      HttpsTokenCredential: {
        type: "object",
        required: ["type", "token"],
        description:
          "HTTPS token credential. Use for private repos accessible via HTTP(S) URLs (GitHub PAT, GitLab token, Bitbucket app password, etc.).",
        properties: {
          type: { type: "string", enum: ["https_token"] },
          username: {
            type: "string",
            maxLength: 255,
            description: "Optional username (e.g. 'git' for GitHub).",
          },
          token: {
            type: "string",
            minLength: 1,
            maxLength: 4096,
            description: "Personal access token or deploy token.",
          },
        },
        example: {
          type: "https_token",
          username: "git",
          token: "ghp_xxxxxxxxxxxxxxxxxxxx",
        },
      },
      SshKeyCredential: {
        type: "object",
        required: ["type", "privateKey"],
        description:
          "SSH key credential. Use for private repos accessible via SSH URLs (git@host:org/repo.git).",
        properties: {
          type: { type: "string", enum: ["ssh_key"] },
          privateKey: {
            type: "string",
            minLength: 1,
            maxLength: 16384,
            description:
              "Full PEM-encoded private key (OpenSSH or PEM format). Newlines must be JSON-escaped as \\n. Use `jq` to handle escaping: `jq -n --arg key \"$(cat ~/.ssh/id_ed25519)\" '{privateKey: $key}'`.",
          },
          passphrase: {
            type: "string",
            maxLength: 1024,
            description: "Passphrase if the private key is encrypted.",
          },
        },
        example: {
          type: "ssh_key",
          privateKey:
            "-----BEGIN OPENSSH PRIVATE KEY-----\n...\n-----END OPENSSH PRIVATE KEY-----",
          passphrase: "optional-key-passphrase",
        },
      },
      CreateProject: {
        type: "object",
        required: ["title"],
        properties: {
          title: { type: "string", minLength: 1, maxLength: 255 },
          description: { type: ["string", "null"] },
          repositoryUrl: {
            type: ["string", "null"],
            format: "uri",
            maxLength: 2048,
            description:
              "Git repository URL. Use HTTPS for token auth (https://github.com/org/repo.git) or SSH for key auth (git@github.com:org/repo.git).",
          },
          credential: {
            oneOf: [
              { $ref: "#/components/schemas/ProjectCredential" },
              { type: "null" },
            ],
            description:
              "Optional credential used by workers to clone this project. Write-only; never returned in responses. Use `https_token` for HTTP(S) URLs and `ssh_key` for SSH URLs.",
          },
        },
      },
      UpdateProject: {
        type: "object",
        properties: {
          title: { type: "string", minLength: 1, maxLength: 255 },
          description: { type: ["string", "null"] },
          repositoryUrl: {
            type: ["string", "null"],
            format: "uri",
            maxLength: 2048,
          },
          credential: {
            oneOf: [
              { $ref: "#/components/schemas/ProjectCredential" },
              { type: "null" },
            ],
            description:
              "Set to a credential object to add or replace, or null to clear. Omit to leave unchanged. Write-only — never returned in responses.",
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
      User: {
        type: "object",
        required: ["@id", "uuid", "name", "email", "createdAt", "updatedAt"],
        properties: {
          "@id": {
            type: "string",
            description: "Resource IRI (e.g. /users/{uuid})",
          },
          uuid: { type: "string", format: "uuid" },
          name: { type: "string", maxLength: 255 },
          email: { type: "string", format: "email", maxLength: 255 },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      CreateUser: {
        type: "object",
        required: ["name", "email"],
        properties: {
          name: {
            type: "string",
            minLength: 1,
            maxLength: 255,
          },
          email: {
            type: "string",
            format: "email",
            maxLength: 255,
          },
        },
      },
      UpdateUser: {
        type: "object",
        properties: {
          name: {
            type: "string",
            minLength: 1,
            maxLength: 255,
          },
          email: {
            type: "string",
            format: "email",
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
          assignee: {
            type: ["string", "null"],
            description:
              "Assignee IRI — /agents/{uuid} or /users/{uuid}, or null",
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
        required: ["assignee"],
        properties: {
          assignee: {
            type: "string",
            description:
              "Assignee IRI — either /agents/{uuid} or /users/{uuid}",
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
