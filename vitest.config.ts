import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/__tests__/**/*.test.ts', 'src/__tests__/**/*.test.ts', 'src/**/__tests__/**/*.test.tsx'],
    fileParallelism: false, // Ensure test files run serially to avoid database singleton conflicts
    env: {
      DATABASE_PATH: ':memory:', // Never touch the real database during tests
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
