# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

Hono（hono/jsx）でSSR、Vue JSX Vapor（vue-jsx-vapor）でクライアントサイドislandをマウントする構成。Cloudflare Workers向けにデプロイ可能。vue-jsx-vapor と hono/jsx/dom の性能を比較するベンチマーク機能を含む。

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

# Cloudflare bindings の型生成
bun run cf-typegen

# 型チェック（server + client）
bun run typecheck

# server側のみ型チェック
bunx tsc -p tsconfig.server.json --noEmit

# client側のみ型チェック
bunx tsc -p tsconfig.client.json --noEmit
```

## アーキテクチャ

### ディレクトリ構造

```
src/
├── index.tsx                      # Hono app エントリー（hono/jsx SSR）
├── server/
│   ├── renderer.tsx               # jsxRenderer設定（HTML shell）
│   └── components/                # SSR用コンポーネント（hono/jsx）
└── client/
    ├── tsconfig.json              # IDE用（tsconfig.client.json継承）
    ├── index.tsx                  # トップページ用 island mount
    ├── Counter.tsx                # Vue JSX Vapor island コンポーネント
    └── benchmark/
        ├── index.ts               # ベンチマークエントリー
        ├── setup.ts               # ベンチマーク初期化・制御ロジック
        ├── types.ts               # 型定義
        ├── runners/
        │   ├── vapor.tsx          # Vue JSX Vapor レンダラー
        │   ├── hono-dom.tsx       # hono/jsx/dom レンダラー
        │   └── helpers.ts         # 共通ヘルパー
        └── utils/
            ├── data.ts            # テストデータ生成
            ├── stats.ts           # 統計計算（中央値、p95、標準偏差）
            └── ui.ts              # UI更新ヘルパー
```

### JSX変換の分離

**重要**: server側（hono/jsx）とclient側（vue-jsx-vapor）でJSX変換が異なるため、tsconfigとvite設定で分離している。

- **server側**: `esbuild`（vite.config.ts）+ ファイル先頭の`@jsxImportSource hono/jsx`コメント
- **client側**: `vue-jsx-vapor/vite`プラグイン（`include: [/src\/client\/.*\.[tj]sx$/]`でフィルタ）
- `hono/jsx/dom`を使うファイルは`exclude: /hono-dom/`で vue-jsx-vapor の処理から除外

### TypeScript設定

- `tsconfig.server.json`: server側（`jsxImportSource: "hono/jsx"`）
- `tsconfig.client.json`: client側（`jsxImportSource: "vue-jsx-vapor"`, `jsx: "preserve"`）
- `src/client/tsconfig.json`: IDEが自動的にclient側設定を使用するための継承ファイル

### 依存バージョン

- Vue: `3.6.0-alpha.7`（Vapor Mode対応）
- vue-jsx-vapor: `^3.0.4`
- Vite: `^7.2.7`
- Tailwind CSS: `^4.1.18`（`@tailwindcss/vite`プラグイン使用）

## ベンチマーク機能

`/benchmark`ページで vue-jsx-vapor と hono/jsx/dom の性能を比較。

### 計測内容

- **初回マウント**: コンポーネント生成からDOM挿入まで
- **状態更新**: 既存要素のプロパティ変更（`performance.now()`、`requestAnimationFrame`×2で paint まで含む）
- **追加/削除**: 配列への要素追加と一部削除
- **アンマウント**: cleanup 関数実行時間

### 統計値

- 平均（mean）
- 中央値（median）
- p95（95パーセンタイル）
- 標準偏差（std dev）

### 実装のポイント

- 両レンダラーに同じシード値で生成したデータを渡し、公平性を確保
- `run-all`ボタンは実行順を毎回交互に切り替え、キャッシュ効果の偏りを低減
- 各試行の前に必ず前回の cleanup を実行し、DOM を初期化
- `setupBenchmark()` が各ボタンにイベントリスナーを設定し、`runSuite()` で計測を実行

## Vue JSX Vapor コンポーネント作成

VaporComponent は**関数コンポーネント**として定義する（Vueの`defineComponent`ではない）。

```tsx
import { ref } from 'vue'

export default function MyComponent() {
  const count = ref(0)
  return (
    <button onClick={() => (count.value += 1)}>
      count: {count.value}
    </button>
  )
}
```

## SSR + island パターン

1. `src/index.tsx`（Hono app）でHTMLをSSR
2. `src/server/renderer.tsx`で`<Script>`タグを使ってclientエントリーを挿入
3. client側で`createVaporApp().mount()`してislandを初期化

```tsx
// server: src/index.tsx
app.get('/', (c) => {
  return c.render(
    <>
      <div id="my-island"></div>
      <Script type="module" src="/src/client/index.tsx" />
    </>
  );
});

// client: src/client/index.tsx
import { createVaporApp } from 'vue';
import MyComponent from './MyComponent';

const el = document.getElementById('my-island');
if (el) {
  createVaporApp(MyComponent).mount(el);
}
```

## Cloudflare Workers型生成

```bash
bun run cf-typegen
```

生成された`CloudflareBindings`をHonoに渡す:

```ts
const app = new Hono<{ Bindings: CloudflareBindings }>()
```

## 参考リンク

- [vue-jsx-vapor](https://github.com/vuejs/vue-jsx-vapor)
- [vue-jsx-vapor ドキュメント](https://jsx-vapor.netlify.app/)
- [@cloudflare/vite-plugin](https://developers.cloudflare.com/workers/vite-plugin/)
- [vite-ssr-components](https://github.com/yusukebe/vite-ssr-components)
