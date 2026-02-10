import path from "path"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    fs: {
      allow: ['.', path.resolve(__dirname, 'node_modules')],
    },
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/rpc": {
        target: "http://localhost:3001",
        changeOrigin: true,
        ws: true,
      },
    },
  },
  css: {
    devSourcemap: false, // Disable CSS sourcemaps in dev
  },
  esbuild: {
    sourcemap: false, // Disable esbuild sourcemaps
  },
  build: {
    target: 'es2020',
    sourcemap: false, // Disable sourcemap warnings
  },
  define: {
    global: 'globalThis',
  },
})
