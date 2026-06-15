import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/user':         { target: 'http://localhost:3000', changeOrigin: true },
      '/problem':      { target: 'http://localhost:3000', changeOrigin: true },
      '/submission':   { target: 'http://localhost:3000', changeOrigin: true },
      '/ai':           { target: 'http://localhost:3000', changeOrigin: true },
      '/video':        { target: 'http://localhost:3000', changeOrigin: true },
      '/profile':      { target: 'http://localhost:3000', changeOrigin: true },
      '/duel':         { target: 'http://localhost:3000', changeOrigin: true },
      '/agent':        { target: 'http://localhost:3000', changeOrigin: true },
      '/hint':         { target: 'http://localhost:3000', changeOrigin: true },
      '/api':          { target: 'http://localhost:3000', changeOrigin: true }, // ← interview (now merged)
      '/ats':          { target: 'http://localhost:3000', changeOrigin: true }, // ← ATS analyzer
      '/socket.io':    { target: 'http://localhost:3000', changeOrigin: true, ws: true },
    }
  }
})