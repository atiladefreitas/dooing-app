import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Pure-logic tests only (src/lib/**): the merge engine, wire normalization,
// QR parsing. Nothing here may import React Native or an Expo native module —
// that is why api.ts reaches pairing.ts through a dynamic import.
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    environment: 'node',
    include: ['src/lib/**/*.test.ts'],
  },
});
