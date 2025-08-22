import {z} from "zod";

/**
 * =========================
 *  Types & Schemas
 * =========================
 */
import {simplifyObservation} from "./observation.mjs";
import {adminJwt} from "./config.mjs";

/** 1) Define the Zod *shape* (ZodRawShape) */
export const searchObsArgs = {
  patientId: z.string().min(1, "patientId is required"),
  code: z.string().min(1, "code is required"),
  since: z.string().datetime().optional(),
  until: z.string().datetime().optional(),
  count: z.number().int().min(1).max(1000).default(100).optional(),
  maxItems: z.number().int().min(1).max(5000).default(200).optional()
} as const;

/** 2) (Recommended) Build a schema for inference & reuse */
const searchObsSchema = z.object(searchObsArgs);
export type SearchObservationsInput = z.infer<typeof searchObsSchema>;

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

export function createHeaders(): Record<string, string> {
  return {Accept: "application/fhir+json", Authorization: `Bearer ${adminJwt.get()}`};
}

export function buildObservationUrl(
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

export async function collectObservations(
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
      items.push(...simplifyObservation(o));
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
