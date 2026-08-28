import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // Local development uses one canonical API endpoint. This deliberately
  // overrides stale VITE_API_BASE_URL values from old local .env files.
  define: mode === 'development'
    ? {
        'import.meta.env.VITE_API_BASE_URL': JSON.stringify('http://localhost:8080'),
        'import.meta.env.VITE_CUSTOMER_APP_URL': JSON.stringify('http://localhost:5174'),
      }
    : undefined,
  server: {
    port: 5173,
    strictPort: true,
  },
}))
