import { Router } from "express";

import type { UserController } from "@/user/presentation/controller/user.controller.js";

export class UserRouter {
  constructor(private readonly controller: UserController) {}

  build(): Router {
    const router = Router();

    router.post("/users", (req, res) => this.controller.create(req, res));
    router.get("/users", (req, res) => this.controller.list(req, res));
    router.get("/users/:uuid", (req, res) => this.controller.get(req, res));
    router.patch("/users/:uuid", (req, res) =>
      this.controller.update(req, res),
    );

    return router;
  }
}
