import type { Server } from "http";
import type { AddressInfo } from "net";

import { EnvConfig } from "../../src/shared/infrastructure/config/env-config.js";
import { Application } from "../../src/application.js";

export interface TestServer {
  baseUrl: string;
  server: Server;
  close: () => Promise<void>;
}

export async function startTestServer(dbUrl: string): Promise<TestServer> {
  const env = EnvConfig.load({
    ...process.env,
    DATABASE_URL: dbUrl,
    ENCRYPTION_KEY:
      process.env["ENCRYPTION_KEY"] ??
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    NODE_ENV: "test",
  });

  const app = new Application(env);

  return new Promise((resolve) => {
    const server = app.httpServer.listen(0, () => {
      const { port } = server.address() as AddressInfo;
      const baseUrl = `http://localhost:${port}`;
      resolve({
        baseUrl,
        server,
        close: () =>
          new Promise<void>((res, rej) => {
            server.close((err) => (err ? rej(err) : res()));
          }),
      });
    });
  });
}