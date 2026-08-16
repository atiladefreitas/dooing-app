/** The default port of dooing's share/sync server (server.lua). */
export const DOOING_PORT = 7283;

export interface ParsedShare {
  /** Origin only, e.g. "http://192.168.1.20:7283". */
  host: string;
  /** Full todos endpoint, e.g. "http://192.168.1.20:7283/todos". */
  url: string;
  /** 1 = bare URL (read-only import), 2 = pairing payload. */
  version: 1 | 2;
  /** Which product's bus this QR belongs to ("dooing" | "bloocky"). */
  product: string;
  /** v2 only: the single-use pairing token to exchange at POST /v2/pair. */
  pairToken?: string;
}

// v1: the plugin's QR encoded exactly `http://<ip>:7283/todos`. Accept an
// optional trailing slash and ignore any query/fragment; anything else fails.
const V1_SHARE_RE = /^http:\/\/([^\s/:]+):(\d+)\/todos\/?(?:[?#].*)?$/i;

// Hosts must be plain-HTTP IP literals on the LAN — the same rule the server
// enforces on its side via the Host header (docs/SYNC-PROTOCOL.md).
const HOST_RE = /^http:\/\/((?:\d{1,3}\.){3}\d{1,3}|localhost|\[[0-9a-f:]+\]):(\d{1,5})$/i;

function parseV2(raw: string): ParsedShare | null {
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as Record<string, unknown>;
  if (p.v !== 2) return null;
  if (typeof p.host !== 'string' || !HOST_RE.test(p.host)) return null;
  if (typeof p.t !== 'string' || !/^[0-9a-f]{16,}$/i.test(p.t)) return null;

  const host = p.host.replace(/\/+$/, '');
  return {
    host,
    url: `${host}/todos`,
    version: 2,
    product: typeof p.p === 'string' ? p.p : 'dooing',
    pairToken: p.t,
  };
}

function parseV1(raw: string): ParsedShare | null {
  const match = raw.trim().match(V1_SHARE_RE);
  if (!match) return null;
  const [, hostname, portStr] = match;
  if (Number(portStr) !== DOOING_PORT) return null;
  const host = `http://${hostname}:${DOOING_PORT}`;
  return { host, url: `${host}/todos`, version: 1, product: 'dooing' };
}

/**
 * Validate a scanned string as a Dooing/Bloocky share QR. v2 payloads carry a
 * pairing token; the v1 bare URL still works read-only against older plugins.
 * Returns null for anything else (the scanner keeps scanning).
 */
export function parseShareUrl(raw: string): ParsedShare | null {
  return parseV2(raw.trim()) ?? parseV1(raw);
}

/** Build the todos endpoint from a stored host origin (for re-sync). */
export function todosUrl(host: string): string {
  return `${host.replace(/\/+$/, '')}/todos`;
}

/** Build the time-blocks endpoint (bloocky's file, served by server.lua). */
export function blocksUrl(host: string): string {
  return `${host.replace(/\/+$/, '')}/blocks`;
}

/** The pairing endpoint (docs/SYNC-PROTOCOL.md). */
export function pairUrl(host: string): string {
  return `${host.replace(/\/+$/, '')}/v2/pair`;
}
