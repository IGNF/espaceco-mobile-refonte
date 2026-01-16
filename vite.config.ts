import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    svgr()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Polyfill process.env for packages that use it (collaboratif-client-api)
  define: {
    'process.env': {
      SECRET: JSON.stringify(process.env.VITE_SECRET || 'default-secret'),
    },
  },
  optimizeDeps: {
    // Include the package so Vite transforms CommonJS ("require") to ESM
    include: ['collaboratif-client-api'],
  },
  build: {
    commonjsOptions: {
      // Transform CommonJS modules to ESM
      include: [/collaboratif-client-api/, /node_modules/],
    },
  },
})
