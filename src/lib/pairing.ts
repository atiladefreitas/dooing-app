import * as Device from 'expo-device';

import { ImportError } from './api';
import { ParsedShare, pairUrl } from './qr';

/**
 * Device tokens live in the platform keychain (SecureStore), never in
 * AsyncStorage — AsyncStorage is a plaintext file on a rooted device, and a
 * device token reads someone's entire todo list.
 *
 * SecureStore is a NATIVE module, and a dev client built before it was added
 * throws at import time ("Cannot find native module 'ExpoSecureStore'") —
 * which, through expo-router's route validation, would crash the whole app at
 * boot. So it is required lazily and guarded: on an old build the app still
 * boots, v1 import still works, and only pairing reports it needs a rebuild.
 */
type SecureStoreModule = typeof import('expo-secure-store');

let secureStoreCache: SecureStoreModule | null | undefined;

function getSecureStore(): SecureStoreModule | null {
  if (secureStoreCache !== undefined) return secureStoreCache;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    secureStoreCache = require('expo-secure-store') as SecureStoreModule;
  } catch {
    secureStoreCache = null;
  }
  return secureStoreCache;
}

// SecureStore keys allow only [A-Za-z0-9._-]; a host like
// "http://192.168.1.20:7283" does not qualify, so it is flattened.
function tokenKey(host: string): string {
  return 'dooing.device_token.' + host.replace(/[^A-Za-z0-9._-]/g, '_');
}

export async function getDeviceToken(host: string): Promise<string | null> {
  const store = getSecureStore();
  if (!store) return null;
  try {
    return await store.getItemAsync(tokenKey(host));
  } catch {
    return null;
  }
}

export async function forgetDeviceToken(host: string): Promise<void> {
  const store = getSecureStore();
  if (!store) return;
  try {
    await store.deleteItemAsync(tokenKey(host));
  } catch {
    // Nothing to do: worst case the token idles in the keychain.
  }
}

/** Authorization headers for a host, or {} when it was never paired. */
export async function authHeaders(host: string): Promise<Record<string, string>> {
  const token = await getDeviceToken(host);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Exchange the QR's single-use pairing token for a long-lived device token
 * and store it. Throws ImportError with a user-facing message on failure.
 */
export async function pairWithHost(share: ParsedShare): Promise<void> {
  if (share.version !== 2 || !share.pairToken) return; // v1 QR: nothing to pair

  const store = getSecureStore();
  if (!store) {
    throw new ImportError(
      'This build predates pairing. Rebuild the dev client (npm run ios / android), then scan again.'
    );
  }

  let res: Response;
  try {
    res = await fetch(pairUrl(share.host), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: share.pairToken,
        device_name: Device.deviceName ?? 'phone',
      }),
    });
  } catch {
    throw new ImportError("Couldn't reach the server to pair. Same Wi-Fi?");
  }

  if (res.status === 401) {
    throw new ImportError('That QR code expired. Reopen the share page in Neovim and scan again.');
  }
  if (!res.ok) {
    throw new ImportError(`Pairing failed (server said ${res.status}).`);
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new ImportError('Pairing failed: unreadable response.');
  }
  const token = (body as { device_token?: unknown }).device_token;
  if (typeof token !== 'string' || !token) {
    throw new ImportError('Pairing failed: no device token in the response.');
  }
  await store.setItemAsync(tokenKey(share.host), token);
}
