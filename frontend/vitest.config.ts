import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    env: { VITE_API_URL: '/api/v1' },
    environmentOptions: { jsdom: { url: 'http://localhost:5173' } },
    restoreMocks: true,
  },
})
