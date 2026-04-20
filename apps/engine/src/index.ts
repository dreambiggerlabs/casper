import "dotenv/config";

import { EnvConfig } from "@/shared/infrastructure/config/env-config.js";
import { Application } from "./application.js";

const env = EnvConfig.load();
const app = new Application(env);

app.listen(env.port);
