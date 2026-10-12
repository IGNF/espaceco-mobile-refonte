import { defineConfig, loadEnv, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import path from 'path'

const oauthDevProxyPrefix = '/__sso'

function stripOauthBrowserOriginPlugin(mount: string) {
  return {
    name: 'strip-oauth-origin',
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req, _res, next) => {
        const url = req.url ?? ''
        if (url === mount || url.startsWith(`${mount}/`)) {
          delete req.headers.origin
          delete req.headers.referer
        }
        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const oauthSsoTarget = (env.VITE_OAUTH_BASE_URL || '').trim().replace(/\/+$/, '')
  const oauthProxyMount = oauthDevProxyPrefix

  return {
    plugins: [
      react(),
      svgr(),
      ...(oauthSsoTarget ? [stripOauthBrowserOriginPlugin(oauthProxyMount)] : []),
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
    server: oauthSsoTarget
      ? {
          proxy: {
            [oauthProxyMount]: {
              target: oauthSsoTarget,
              changeOrigin: true,
              secure: true,
              rewrite: (requestPath) => requestPath.replace(new RegExp(`^${oauthProxyMount}`), ''),
            },
          },
        }
      : undefined,
  }
})
