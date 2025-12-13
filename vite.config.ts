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
      include: /src\/client\//,
    }),
    cloudflare(),
    // auto-detect Script/Link in SSR output to add client entries
    ssrPlugin(),
  ],
});
