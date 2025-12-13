import { cloudflare } from '@cloudflare/vite-plugin';
import { defineConfig } from 'vite';
import ssrPlugin from 'vite-ssr-components/plugin';
import VueJsxVapor from 'vue-jsx-vapor/vite';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'hono/jsx',
  },
  plugins: [
    // Vue JSX Vapor（client側JSXのみトランスパイル）
    VueJsxVapor({
      macros: true,
      // TSX/JSXだけを対象にし、純TSユーティリティではHMR用のVue依存コードが入らないようにする
      include: [/src\/client\/.*\.[tj]sx$/],
      // hono/jsx/dom を使うベンチマーク用ファイルは変換対象から外す
      exclude: /hono-dom/,
    }),
    cloudflare(),
    // auto-detect Script/Link in SSR output to add client entries
    ssrPlugin(),
  ],
});
