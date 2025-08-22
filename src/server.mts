import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {z} from "zod";
import {config} from "./config.mjs";
import {
  buildObservationUrl,
  collectObservations,
  createHeaders,
  searchObsArgs,
  SearchObservationsInput
} from "./search.mjs";


const buildServer = () => {
  /**
   * =========================
   *  MCP Server (High-level)
   * =========================
   */
  const server = new McpServer({name: "mcp-fhir", version: "0.2.0"});

  server.registerTool(
    "fhir.search_observations",
    {
      title: "Search FHIR Observations",
      description: `Search FHIR Observations for a patient by LOINC or system codes,
with optional date range (since/until) and result count.
Returns simplified observation data and raw FHIR Bundle.`,
      inputSchema: searchObsArgs
    },
    async (args: SearchObservationsInput) => {
      const {patientId, code, since, until, count = 100, maxItems = 200} = args;

      const headers = createHeaders();
      const url = buildObservationUrl(config.fhirBaseUrl, {patientId, code, since, until, count});
      console.log(`searching fhir: ${url}`);
      const {pages, items} = await collectObservations(url, headers, maxItems);

      const payload = {
        query: {patientId, code, since, until, count, maxItems},
        totalReturned: items.length,
        items,
        rawPages: pages
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(payload, null, 2)
          }
        ]
      };
    }
  );

  server.registerTool(
    "health.ping",
    {
      title: "Ping",
      description: "Simple liveness check",
      inputSchema: {message: z.string().default("pong").optional()}
    },
    async ({message = "pong"}: { message?: string }) => ({
      content: [{type: "text", text: message}]
    })
  );

  return server;
}

export {buildServer};
