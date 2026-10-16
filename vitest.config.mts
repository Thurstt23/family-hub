import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    include: ['lib/**/*.test.ts'],
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname),
      // server-only throws outside a React Server environment; unit tests
      // import pure helpers that happen to live next to server code.
      'server-only': path.resolve(import.meta.dirname, 'lib/test/server-only-stub.ts'),
    },
  },
})
