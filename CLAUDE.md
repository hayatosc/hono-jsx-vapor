# Hono + Vue JSX Vapor Island PoC

Hono（hono/jsx）でSSRし、Vue JSX Vapor（vue-jsx-vapor）でクライアントサイドのインタラクティブなislandをマウントする構成。Cloudflare Workers向けにデプロイ可能。

## 前提条件

- Bun >= 1.0
- Vue 3.6 alpha（Vapor Mode対応版）

## ディレクトリ構造

```
.
├── package.json
├── vite.config.ts
├── wrangler.jsonc
├── tsconfig.json
├── tsconfig.server.json
├── tsconfig.client.json
└── src
   ├── index.tsx           # Hono SSR エントリー（hono/jsx）
   ├── renderer.tsx        # jsxRenderer設定
   └── client
      ├── tsconfig.json    # IDE用（tsconfig.client.jsonを継承）
      ├── index.tsx        # island mount エントリー
      └── Counter.tsx      # vue-jsx-vapor コンポーネント
```

## 依存関係

```bash
bun add hono vue@3.6.0-alpha.2 vue-jsx-vapor
bun add -d vite @cloudflare/vite-plugin @cloudflare/workers-types vite-ssr-components wrangler typescript
```

## 設定ファイル

### package.json

```json
{
  "name": "hono-jsx-vapor",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "$npm_execpath run build && vite preview",
    "deploy": "$npm_execpath run build && wrangler deploy",
    "cf-typegen": "wrangler types --env-interface CloudflareBindings"
  },
  "dependencies": {
    "hono": "^4.10.8",
    "vue": "3.6.0-alpha.2",
    "vue-jsx-vapor": "^3.0.4"
  },
  "devDependencies": {
    "@cloudflare/vite-plugin": "^1.2.3",
    "@cloudflare/workers-types": "^4.20251213.0",
    "typescript": "^5.9.3",
    "vite": "^6.3.5",
    "vite-ssr-components": "^0.5.1",
    "wrangler": "^4.17.0"
  }
}
```

### wrangler.jsonc

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "hono-jsx-vapor",
  "compatibility_date": "2025-08-03",
  "main": "./src/index.tsx"
}
```

### vite.config.ts

```ts
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
        target: './src/client/index.tsx',
      },
    }),
  ],
})
```

## TypeScript設定

server側（hono/jsx）とclient側（vue-jsx-vapor）でJSX変換が異なるため、tsconfigを分離。

### tsconfig.json（ベース設定）

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true,
    "lib": ["ESNext", "DOM"],
    "esModuleInterop": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  }
}
```

### tsconfig.server.json（Hono/SSR用）

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "hono/jsx",
    "types": ["vite/client", "@cloudflare/workers-types"]
  },
  "include": ["src/index.tsx", "src/renderer.tsx", "vite.config.ts"]
}
```

### tsconfig.client.json（Vue JSX Vapor用）

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "jsx": "preserve",
    "jsxImportSource": "vue-jsx-vapor",
    "lib": ["ESNext", "DOM"]
  },
  "include": ["src/client/**/*.tsx", "src/client/**/*.ts"]
}
```

### src/client/tsconfig.json（IDE用）

IDEが`src/client/`内のファイルに対して正しいtsconfig（vue-jsx-vapor）を使用するための設定。

```json
{
  "extends": "../../tsconfig.client.json"
}
```

## ソースコード

### src/renderer.tsx（jsxRenderer設定）

```tsx
/** @jsxImportSource hono/jsx */
import { jsxRenderer } from 'hono/jsx-renderer';
import { Link, Script, ViteClient } from 'vite-ssr-components/hono';

export const renderer = jsxRenderer(({ children }) => {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>Hono + Vue JSX Vapor PoC</title>
        <ViteClient />
        <Link href="/src/style.css" rel="stylesheet" />
      </head>
      <body>
        {children}
        <Script type="module" src="/src/client/index.tsx" />
      </body>
    </html>
  );
});
```

### src/index.tsx（Hono SSR）

```tsx
/** @jsxImportSource hono/jsx */
import { Hono } from 'hono';
import { renderer } from './renderer';

const app = new Hono();

app.use(renderer);

app.get('/', (c) => {
  return c.render(
    <>
      <h1>SSR by hono/jsx</h1>
      <div id="counter-island" data-initial="0"></div>
    </>
  );
});

export default app;
```

### src/client/Counter.tsx（Vue JSX Vapor）

VaporComponentは関数コンポーネントとして定義する（Vueの`defineComponent`ではない）。

```tsx
import { ref } from 'vue'

export default function Counter() {
  const count = ref(0)
  return (
    <button type="button" onClick={() => (count.value += 1)}>
      count: {count.value}
    </button>
  )
}
```

### src/client/index.tsx（island mount）

```tsx
import { createVaporApp } from 'vue';
import Counter from './Counter';

const el = document.getElementById('counter-island');
if (el) {
  createVaporApp(Counter).mount(el);
}
```

## コマンド

```bash
# 開発サーバー起動
bun run dev

# ビルド
bun run build

# プレビュー（Workersランタイムで実行）
bun run preview

# Cloudflare Workersへデプロイ
bun run deploy
```

## 型チェック

```bash
# server側の型チェック
bunx tsc -p tsconfig.server.json --noEmit

# client側の型チェック
bunx tsc -p tsconfig.client.json --noEmit
```

## 注意点

1. **Vue 3.6 alpha が必要**: Vapor Modeは Vue 3.6 alpha 以降でのみ利用可能
2. **client-only mount**: 基本構成はSSR hydrationではなく、client-only mount
3. **VaporComponent**: `defineComponent`ではなく関数コンポーネントとして定義
4. **JSX変換の分離**:
   - サーバー側: `esbuild`（vite.config.ts）+ `@jsxImportSource`コメント
   - クライアント側: `vue-jsx-vapor/vite`プラグイン（`include`でフィルタ）
5. **tsconfig分離**: server/clientでtsconfigを分離し、IDEの型チェックを正しく動作させる

## 参考リンク

- [vue-jsx-vapor](https://github.com/vuejs/vue-jsx-vapor)
- [vue-jsx-vapor ドキュメント](https://jsx-vapor.netlify.app/)
- [@cloudflare/vite-plugin](https://developers.cloudflare.com/workers/vite-plugin/)
- [vite-ssr-components](https://github.com/yusukebe/vite-ssr-components)
