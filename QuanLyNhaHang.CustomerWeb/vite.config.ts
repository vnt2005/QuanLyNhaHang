import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // Development dùng URL tương đối để browser chỉ gọi cùng origin 5174.
  // Vite proxy chuyển /api và /hubs sang API Gateway 8080.
  define: mode === 'development'
    ? {
        'import.meta.env.VITE_API_BASE_URL': JSON.stringify(''),
      }
    : undefined,
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/hubs': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  preview: {
    port: 4174,
    strictPort: true,
  },
}))
