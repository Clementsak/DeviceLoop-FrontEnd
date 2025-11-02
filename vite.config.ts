import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import mkcert from 'vite-plugin-mkcert'
import fs from 'node:fs'
import path from 'node:path'

export default defineConfig({
  plugins: [react(), mkcert()],
  server: {
    https: {
      cert: fs.readFileSync(path.resolve(__dirname, 'certs/localhost+2.pem')),
      key:  fs.readFileSync(path.resolve(__dirname, 'certs/localhost+2-key.pem')),
    },
    port: 5173,
    // if you proxy /api:
    proxy: {
      '/api': {
        target: 'https://localhost:5000',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
