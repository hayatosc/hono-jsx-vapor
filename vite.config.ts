import { cloudflare } from '@cloudflare/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import ssrPlugin from 'vite-ssr-components/plugin'
import VueJsxVapor from 'vue-jsx-vapor/vite'

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'hono/jsx',
  },
  plugins: [
    tailwindcss(),
    VueJsxVapor({
      macros: true,
      include: [/src\/client\/.*\.[tj]sx$/],
      exclude: /hono-dom/,
    }),
    cloudflare(),
    ssrPlugin(),
  ],
})
