import buildPages from '@hono/vite-build/cloudflare-pages'
import buildWorkers from '@hono/vite-build/cloudflare-workers'
import devServer from '@hono/vite-dev-server'
import adapter from '@hono/vite-dev-server/cloudflare'
import { defineConfig } from 'vite'

// BUILD_TARGET=pages → gera _worker.js para Cloudflare Pages (rotaposto.com.br)
// BUILD_TARGET=workers (default) → gera index.js para Workers for Platform (hosted)
const target = process.env.BUILD_TARGET || 'workers'

export default defineConfig({
  plugins: [
    target === 'pages'
      ? buildPages()
      : buildWorkers({ entry: 'src/index.tsx' }),
    devServer({
      adapter,
      entry: 'src/index.tsx'
    })
  ]
})
