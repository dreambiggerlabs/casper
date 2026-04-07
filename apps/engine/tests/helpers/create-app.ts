import type { Server } from "http";
import type { AddressInfo } from "net";

import { createApp } from "../../src/app.js";
import type { Database } from "../../src/shared/database/index.js";

export interface TestServer {
  baseUrl: string;
  server: Server;
  close: () => Promise<void>;
}

export async function startTestServer(db: Database): Promise<TestServer> {
  const app = createApp(db);

  return new Promise((resolve) => {
    const server = app.listen(0, () => {
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
