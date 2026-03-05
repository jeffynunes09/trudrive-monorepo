import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    clearMocks: true,
    typecheck: {
      tsconfig: './tsconfig.test.json',
    },
    setupFiles: ['./src/__tests__/setup-env.ts'],
  },
  resolve: {
    alias: {
      'shared-config': resolve(__dirname, '../../packages/shared-config/src/index.ts'),
      'shared-events': resolve(__dirname, '../../packages/shared-events/src/index.ts'),
      'shared-types': resolve(__dirname, '../../packages/shared-types/src/index.ts'),
    },
  },
})
