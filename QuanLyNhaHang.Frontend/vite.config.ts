import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // Development dùng URL tương đối để browser chỉ gọi cùng origin 5173.
  // Vite proxy sẽ chuyển /api và /hubs sang API Gateway 8080, loại bỏ CORS.
  define: mode === 'development'
    ? {
        'import.meta.env.VITE_API_BASE_URL': JSON.stringify(''),
        'import.meta.env.VITE_CUSTOMER_APP_URL': JSON.stringify('http://localhost:5174'),
      }
    : undefined,
  server: {
    port: 5173,
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
}))
