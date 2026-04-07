import "dotenv/config";

import { db } from "./shared/database/index.js";
import { logger } from "./shared/logging/logger.js";
import { createApp } from "./app.js";

const app = createApp(db);
const port = process.env["PORT"] ?? 3000;

app.listen(port, () => {
  logger.info({ port }, "Casper Engine listening");
});
