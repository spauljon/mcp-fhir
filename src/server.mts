import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {z} from "zod";
import {adminJwt, config} from "./config.mjs";

/**
 * =========================
 *  Types & Schemas
 * =========================
 */
/** 1) Define the Zod *shape* (ZodRawShape) */
const searchObsArgs = {
  patientId: z.string().min(1, "patientId is required"),
  code: z.string().min(1, "code is required"),
  since: z.string().datetime().optional(),
  until: z.string().datetime().optional(),
  count: z.number().int().min(1).max(1000).default(100).optional(),
  maxItems: z.number().int().min(1).max(5000).default(200).optional()
} as const;

/** 2) (Recommended) Build a schema for inference & reuse */
const searchObsSchema = z.object(searchObsArgs);
type SearchObservationsInput = z.infer<typeof searchObsSchema>;

type FhirBundle = {
  resourceType: "Bundle";
  link?: { relation: string; url: string }[];
  entry?: { resource?: any }[];
};

/**
 * =========================
 *  Small Helpers
 * =========================
 */
const toIso = (v?: string) => (v ? new Date(v).toISOString() : undefined);

function createHeaders(): Record<string, string> {
  return {Accept: "application/fhir+json", Authorization: `Bearer ${adminJwt.get()}`};
}

function buildObservationUrl(
  baseUrl: string,
  q: Required<Pick<SearchObservationsInput, "patientId" | "code">> &
    Pick<SearchObservationsInput, "since" | "until" | "count">
): string {
  const u = new URL(`${baseUrl}/Observation`);
  u.searchParams.set("patient", q.patientId);
  u.searchParams.set("combo-code", q.code);
  if (q.count) {
    u.searchParams.set("_count", String(q.count));
  }
  if (q.since) {
    u.searchParams.append("date", `ge${toIso(q.since)}`);
  }
  if (q.until) {
    u.searchParams.append("date", `le${toIso(q.until)}`);
  }
  return u.toString();
}

async function assertOk(res: Response): Promise<void> {
  if (res.ok) {
    return;
  }
  let body = "";
  try {
    body = await res.text();
  } catch { /* ignore */
  }
  throw new Error(
    `FHIR request failed: ${res.status} ${res.statusText}${body ? " — " + body : ""}`);
}

function nextLink(bundle: FhirBundle): string | undefined {
  return bundle.link?.find(l => l.relation === "next")?.url;
}

function extractObservationEntries(bundle: FhirBundle): any[] {
  const entries = bundle.entry ?? [];
  const items: any[] = [];
  for (const e of entries) {
    const r = e.resource;
    if (r?.resourceType === "Observation") {
      items.push(r);
    }
  }
  return items;
}

function simplifyObservation(obs: any) {
  const code = obs?.code?.coding?.[0];
  const value =
    obs?.valueQuantity?.value ??
    obs?.valueCodeableConcept?.coding?.[0]?.code ??
    obs?.valueString ??
    obs?.valueInteger ??
    obs?.valueBoolean ??
    null;

  const unit =
    obs?.valueQuantity?.unit ??
    obs?.valueQuantity?.code ??
    obs?.valueCodeableConcept?.coding?.[0]?.display ??
    null;

  const when =
    obs?.effectiveDateTime ??
    obs?.effectivePeriod?.end ??
    obs?.effectiveInstant ??
    obs?.issued ??
    null;

  return {
    id: obs?.id,
    loinc: code?.system?.includes("loinc") ? code?.code : undefined,
    code: {system: code?.system, code: code?.code, display: code?.display},
    value,
    unit,
    when,
    status: obs?.status,
    category: obs?.category?.[0]?.coding?.[0]?.code
  };
}

/**
 * Async iterator to paginate through Bundles.
 * Counts Observation entries toward the maxItems cap.
 */
async function* paginateBundles(
  startUrl: string,
  headers: Record<string, string>,
  maxItems: number
): AsyncGenerator<FhirBundle> {
  let url: string | undefined = startUrl;
  let fetched = 0;

  while (url && fetched < maxItems) {
    const res = await fetch(url, {headers});
    await assertOk(res);
    const bundle = (await res.json()) as FhirBundle;

    fetched += extractObservationEntries(bundle).length;
    yield bundle;

    url = fetched < maxItems ? nextLink(bundle) : undefined;
  }
}

async function collectObservations(
  startUrl: string,
  headers: Record<string, string>,
  maxItems: number
): Promise<{ pages: FhirBundle[]; items: any[] }> {
  const pages: FhirBundle[] = [];
  const items: any[] = [];

  for await (const bundle of paginateBundles(startUrl, headers, maxItems)) {
    pages.push(bundle);
    const obs = extractObservationEntries(bundle);
    for (const o of obs) {
      items.push(simplifyObservation(o));
      if (items.length >= maxItems) {
        break;
      }
    }
    if (items.length >= maxItems) {
      break;
    }
  }
  return {pages, items};
}

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

// Optional: simple health check
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
