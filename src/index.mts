import {startHttp} from "./transport/http.mjs";
import {startStdio} from "./transport/stdio.mjs";
import {buildServer} from "./server.mjs";

type Mode = "http" | "stdio";

const mode: Mode = (process.argv[2] ?? process.env.MCP_MODE ?? "http").toLowerCase() as Mode;

const mcpServer = buildServer();

if (mode === "http") {
  await startHttp(mcpServer);
} else if (mode === "stdio") {
  await startStdio(mcpServer); // unchanged from earlier
} else {
  console.error(`Unknown mode: ${mode}. Use "http" or "stdio".`);
  process.exit(1);
}

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));