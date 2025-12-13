# Hono + Vue JSX Vapor Island PoC

Hono（hono/jsx）でSSR、Vue JSX Vapor（vue-jsx-vapor）でクライアントサイドislandをマウントする構成。Cloudflare Workersデプロイ対応。

## セットアップ

```bash
bun install
```

## 開発

```bash
bun run dev
```

http://localhost:5173 でアクセス。

## ビルド & プレビュー

```bash
bun run preview
```

## デプロイ

```bash
bun run deploy
```

## 型チェック

```bash
# server側
bunx tsc -p tsconfig.server.json --noEmit

# client側
bunx tsc -p tsconfig.client.json --noEmit
```

## 型生成

[Cloudflare bindings の型生成](https://developers.cloudflare.com/workers/wrangler/commands/#types):

```bash
bun run cf-typegen
```

`CloudflareBindings` を Hono に渡す:

```ts
const app = new Hono<{ Bindings: CloudflareBindings }>()
```

## 技術スタック

- **SSR**: [Hono](https://hono.dev/) + hono/jsx
- **Client Island**: [Vue JSX Vapor](https://github.com/vuejs/vue-jsx-vapor) (Vue 3.6 alpha)
- **Build**: [Vite](https://vite.dev/) + [@cloudflare/vite-plugin](https://developers.cloudflare.com/workers/vite-plugin/)
- **Runtime**: [Cloudflare Workers](https://workers.cloudflare.com/)

詳細は [CLAUDE.md](./CLAUDE.md) を参照。
