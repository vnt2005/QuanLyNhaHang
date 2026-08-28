import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // Local development uses the same canonical API endpoint as Admin Web.
  define: mode === 'development'
    ? {
        'import.meta.env.VITE_API_BASE_URL': JSON.stringify('http://localhost:8080'),
      }
    : undefined,
  server: {
    port: 5174,
    strictPort: true,
  },
  preview: {
    port: 4174,
    strictPort: true,
  },
}))
