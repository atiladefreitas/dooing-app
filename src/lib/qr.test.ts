import { describe, expect, it } from 'vitest';

import { parseShareUrl } from './qr';

describe('parseShareUrl v1', () => {
  it('accepts the bare v1 URL', () => {
    const share = parseShareUrl('http://192.168.1.20:7283/todos');
    expect(share).not.toBeNull();
    expect(share!.version).toBe(1);
    expect(share!.host).toBe('http://192.168.1.20:7283');
    expect(share!.url).toBe('http://192.168.1.20:7283/todos');
    expect(share!.pairToken).toBeUndefined();
  });

  it('rejects the wrong port on v1', () => {
    expect(parseShareUrl('http://192.168.1.20:9999/todos')).toBeNull();
  });

  it('rejects random text', () => {
    expect(parseShareUrl('https://example.com')).toBeNull();
    expect(parseShareUrl('WIFI:S:MyNetwork;;')).toBeNull();
  });
});

describe('parseShareUrl v2', () => {
  const payload = {
    v: 2,
    p: 'dooing',
    host: 'http://192.168.1.20:7283',
    t: 'a'.repeat(32),
  };

  it('accepts a v2 pairing payload', () => {
    const share = parseShareUrl(JSON.stringify(payload));
    expect(share).not.toBeNull();
    expect(share!.version).toBe(2);
    expect(share!.product).toBe('dooing');
    expect(share!.host).toBe('http://192.168.1.20:7283');
    expect(share!.pairToken).toBe('a'.repeat(32));
  });

  it('accepts bloocky on its own port', () => {
    const share = parseShareUrl(
      JSON.stringify({ ...payload, p: 'bloocky', host: 'http://192.168.1.20:7284' })
    );
    expect(share).not.toBeNull();
    expect(share!.product).toBe('bloocky');
    expect(share!.host).toBe('http://192.168.1.20:7284');
  });

  it('rejects an https or DNS-name host — LAN IP literals only', () => {
    expect(
      parseShareUrl(JSON.stringify({ ...payload, host: 'https://192.168.1.20:7283' }))
    ).toBeNull();
    expect(
      parseShareUrl(JSON.stringify({ ...payload, host: 'http://evil.example.com:7283' }))
    ).toBeNull();
  });

  it('rejects a missing or malformed pairing token', () => {
    expect(parseShareUrl(JSON.stringify({ ...payload, t: undefined }))).toBeNull();
    expect(parseShareUrl(JSON.stringify({ ...payload, t: 'short' }))).toBeNull();
  });

  it('rejects other JSON QR codes', () => {
    expect(parseShareUrl('{"some":"other qr"}')).toBeNull();
    expect(parseShareUrl(JSON.stringify({ ...payload, v: 3 }))).toBeNull();
  });
});
