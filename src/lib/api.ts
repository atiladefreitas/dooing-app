import { useBlocks } from '@/store/blocks';
import { useTodos } from '@/store/todos';

import { blocksUrl, todosUrl } from './qr';

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
 * Fetch the blocks array. Returns null when the plugin doesn't serve /blocks
 * (older server.lua, or bloocky.nvim not installed) so todo import still works.
 */
export async function fetchBlocks(url: string): Promise<unknown[] | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export interface ImportSummary {
  imported: number;
  updated: number;
  blocksImported: number;
  blocksUpdated: number;
  blocksAvailable: boolean;
}

/**
 * Fetch from a host origin and merge into the stores. Todos are required;
 * blocks are best-effort. Reused by the scanner and Settings re-sync.
 */
export async function importFromHost(host: string): Promise<ImportSummary> {
  const rawTodos = await fetchTodos(todosUrl(host));
  const { imported, updated } = useTodos.getState().mergeServerTodos(rawTodos, host);

  const rawBlocks = await fetchBlocks(blocksUrl(host));
  if (!rawBlocks) {
    return { imported, updated, blocksImported: 0, blocksUpdated: 0, blocksAvailable: false };
  }

  const blocks = useBlocks.getState().mergeServerBlocks(rawBlocks);
  return {
    imported,
    updated,
    blocksImported: blocks.imported,
    blocksUpdated: blocks.updated,
    blocksAvailable: true,
  };
}
