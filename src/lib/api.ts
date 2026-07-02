import { useTodos } from '@/store/todos';

import { todosUrl } from './qr';

/** Abort the request if the server is slow/unreachable (LAN, so keep it short). */
const TIMEOUT_MS = 8000;

/** A user-facing error whose message is safe to show verbatim. */
export class ImportError extends Error {}

/**
 * Fetch the raw todos array from a running plugin server. Throws an
 * ImportError with a friendly message on timeout, network, or bad-response.
 */
export async function fetchTodos(url: string): Promise<unknown[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ImportError('Timed out. Is the server still running on the same Wi-Fi?');
    }
    throw new ImportError("Couldn't reach the server. Check you're on the same network.");
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    throw new ImportError(`Server responded ${res.status}. Try re-sharing from Neovim.`);
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new ImportError('Server sent an unreadable response.');
  }
  if (!Array.isArray(data)) {
    throw new ImportError('Unexpected response — expected a list of todos.');
  }
  return data;
}

/**
 * Fetch from a host origin and merge into the store. Returns the import
 * summary. Reused by the scanner and Settings re-sync.
 */
export async function importFromHost(
  host: string
): Promise<{ imported: number; updated: number }> {
  const raw = await fetchTodos(todosUrl(host));
  return useTodos.getState().mergeServerTodos(raw, host);
}
