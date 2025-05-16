import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist', 
    sourcemap: false, 
  },
  server: {
    host: 'localhost', 
    port: 8081, 
    https: {
      key: fs.readFileSync('key.pem'),
      cert: fs.readFileSync('cert.pem'), 
    },
  },
  preview: {
    host: 'localhost', 
    port: 5000, 
    https: {
      key: fs.readFileSync('key.pem'), 
      cert: fs.readFileSync('cert.pem'), 
    },
  },
})