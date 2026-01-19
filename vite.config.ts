import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    svgr(),
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
    // Force Vite to pre-bundle these CommonJS packages
    include: ['collaboratif-client-api', 'axios', 'crypto-js'],
  },
  build: {
    commonjsOptions: {
      // Transform CommonJS modules to ESM, including mixed ES/CJS modules
      include: [/collaboratif-client-api/, /node_modules/],
      transformMixedEsModules: true,
    },
  },
})
