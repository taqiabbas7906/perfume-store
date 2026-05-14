import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    testTimeout: 10_000,
    pool: 'forks',
    coverage: {
      reporter: ['text', 'html'],
      include: ['src/lib/**'],
      exclude: ['src/lib/**/*.d.ts'],
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
})
