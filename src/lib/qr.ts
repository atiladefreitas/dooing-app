/** The fixed port the Neovim plugin's share server binds to (server.lua). */
export const DOOING_PORT = 7283;

export interface ParsedShare {
  /** Origin only, e.g. "http://192.168.1.20:7283". */
  host: string;
  /** Full endpoint, e.g. "http://192.168.1.20:7283/todos". */
  url: string;
}

// The plugin's QR encodes exactly `http://<ip>:7283/todos` (server.lua). Accept
// an optional trailing slash and ignore any query/fragment; anything else fails.
const SHARE_RE = /^http:\/\/([^\s/:]+):(\d+)\/todos\/?(?:[?#].*)?$/i;

/**
 * Validate a scanned string as a Dooing share URL and extract its host.
 * Returns null when it doesn't match `http://<ip>:7283/todos`.
 */
export function parseShareUrl(raw: string): ParsedShare | null {
  const match = raw.trim().match(SHARE_RE);
  if (!match) return null;
  const [, hostname, portStr] = match;
  if (Number(portStr) !== DOOING_PORT) return null;
  const host = `http://${hostname}:${DOOING_PORT}`;
  return { host, url: `${host}/todos` };
}

/** Build the todos endpoint from a stored host origin (for re-sync). */
export function todosUrl(host: string): string {
  return `${host.replace(/\/+$/, '')}/todos`;
}
