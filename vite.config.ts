import { cloudflare } from '@cloudflare/vite-plugin'
import { defineConfig } from 'vite'
import ssrPlugin from 'vite-ssr-components/plugin'
import VueJsxVapor from 'vue-jsx-vapor/vite'

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'hono/jsx',
  },
  plugins: [
    // Vue JSX Vapor（client側JSXのみトランスパイル）
    VueJsxVapor({
      macros: true,
      include: /src\/client\//,
    }),
    // Cloudflare Workers環境
    cloudflare(),
    // vite-ssr-componentsのScript/Linkコンポーネントでclientエントリーを自動検出
    ssrPlugin({
      entry: {
        // Scriptコンポーネントで指定するsrcを検出対象に追加
        target: './src/client/index.tsx',
      },
    }),
  ],
})
