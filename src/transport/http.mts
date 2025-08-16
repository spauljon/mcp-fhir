import express, {Request, Response} from "express";
import cors from "cors";
import {randomUUID} from "node:crypto";
import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {StreamableHTTPServerTransport} from "@modelcontextprotocol/sdk/server/streamableHttp.js"; // <-- camel H
import {isInitializeRequest} from "@modelcontextprotocol/sdk/types.js";

/**
 * Session-managed Streamable HTTP endpoint at /mcp
 * - POST: client->server messages (init + subsequent)
 * - GET:  server->client notifications (SSE)
 * - DELETE: close session
 *
 * CORS exposes Mcp-Session-Id for browser clients, per SDK docs.
 */
export async function startHttp(server: McpServer) {
  const app = express();
  app.use(express.json());

  // CORS: configure for your domains in prod
  app.use(
    cors({
      origin: "*",
      exposedHeaders: ["Mcp-Session-Id"],
      allowedHeaders: ["Content-Type", "mcp-session-id", "x-api-key"],
      methods: ["GET", "POST", "DELETE", "OPTIONS"]
    })
  );

  // Optional: simple API key guard
  const API_KEY = process.env.MCP_API_KEY;
  if (API_KEY) {
    app.use("/mcp", (req, res, next) => {
      const k = req.header("x-api-key");
      if (k !== API_KEY) return res.status(403).send("forbidden");
      next();
    });
  }

  // Keep transports (and servers) by session id
  const transports: Record<string, StreamableHTTPServerTransport> = {};
  const servers: Record<string, McpServer> = {};

  // POST /mcp — initialize or reuse a session, then handle the request body
  app.post("/mcp", async (req: Request, res: Response) => {
    try {
      const sessHeader = (req.headers["mcp-session-id"] as string | undefined) ?? undefined;

      let transport: StreamableHTTPServerTransport | undefined;

      if (sessHeader && transports[sessHeader]) {
        // Reuse existing session
        transport = transports[sessHeader];
      } else if (!sessHeader && isInitializeRequest(req.body)) {
        // Start a new session
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sessionId) => {
            transports[sessionId] = transport!;
          },
          onsessionclosed: (sessionId) => {
            transports[sessionId]?.close();
            delete transports[sessionId];
            servers[sessionId]?.close();
            delete servers[sessionId];
          },
          // Optional hardening:
          enableDnsRebindingProtection: process.env.MCP_DNS_PROTECT === "true",
          allowedHosts: process.env.MCP_ALLOWED_HOSTS?.split(",").map(s => s.trim()).filter(Boolean),
          allowedOrigins: process.env.MCP_ALLOWED_ORIGINS?.split(",").map(s => s.trim()).filter(Boolean),
          enableJsonResponse: process.env.MCP_ENABLE_JSON === "true"
        });

        servers[transport.sessionId!] = server;

        // Clean up if the transport itself closes
        transport.onclose = () => {
          const id = transport!.sessionId;
          if (!id) return;
          delete transports[id];
          servers[id]?.close();
          delete servers[id];
        };

        await server.connect(transport);
      } else {
        // Not an init, and no known session
        return res.status(400).json({
          jsonrpc: "2.0",
          error: { code: -32000, message: "Bad Request: No valid session ID provided" },
          id: null
        });
      }

      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      console.error("Error handling POST /mcp:", err);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null
        });
      }
    }
  });

  // GET /mcp — notifications (SSE) for an existing session
  app.get("/mcp", async (req: Request, res: Response) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    const transport = sessionId ? transports[sessionId] : undefined;
    if (!transport) return res.status(400).send("Invalid or missing session ID");
    await transport.handleRequest(req, res);
  });

  // DELETE /mcp — close an existing session
  app.delete("/mcp", async (req: Request, res: Response) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    const transport = sessionId ? transports[sessionId] : undefined;
    if (!transport) return res.status(400).send("Invalid or missing session ID");
    await transport.handleRequest(req, res);
  });

  const port = Number(process.env.PORT ?? 8080);
  app.listen(port, () => {
    console.log(`MCP (Streamable HTTP) listening on http://0.0.0.0:${port}/mcp`);
  });
}
