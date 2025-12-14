/** @jsxImportSource hono/jsx */
import { Hono } from 'hono'
import { Script } from 'vite-ssr-components/hono'
import { Button } from './server/components/Button'
import { Input } from './server/components/Input'
import { renderer } from './server/renderer'

const app = new Hono()

app.use(renderer)

app.get('/', (c) => {
  return c.render(
    <main>
      <header class="mx-2">
        <h1>Hono + Vue JSX Vapor</h1>
        <nav>
          <a href="/benchmark">ベンチマーク →</a>
        </nav>
      </header>
      <section class="mx-2 my-4">
        <p>Vue JSX Vapor island</p>
        <div id="counter-island" data-initial="0"></div>
      </section>
      <Script type="module" src="/src/client/index.tsx" />
    </main>,
  )
})

app.get('/benchmark', (c) => {
  return c.render(
    <main
      id="benchmark-page"
      class="max-w-260 mx-auto px-4 sm:px-5 pt-6 sm:pt-8 pb-12 sm:pb-16 space-y-6"
    >
      <header class="bg-white border border-slate-900/10 rounded-[20px] p-7 shadow-[0_30px_60px_rgba(15,23,42,0.05)] space-y-3">
        <p class="text-xs uppercase tracking-widest text-slate-500 mb-1.5 mt-0">
          Renderer benchmark
        </p>
        <h1 class="text-3xl font-bold tracking-[-0.02em] mb-3 mt-0">
          vue-jsx-vapor vs hono/jsx/dom
        </h1>
        <p class="text-slate-600 mt-0">
          同じ複数件のリストをそれぞれのレンダラーで生成し、ブラウザの performance.now()
          を用いてクライアント側の描画時間を測定します。
        </p>
        <nav class="flex items-center gap-3.5 mt-4">
          <a
            href="/"
            class="inline-flex items-center gap-1 font-medium text-slate-900 border-b border-slate-900/20 no-underline hover:border-slate-900/50"
          >
            ← トップに戻る
          </a>
        </nav>
      </header>

      <section
        class="my-6 grid grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3 items-end rounded-xl bg-slate-900 text-slate-200 p-4"
        id="benchmark-controls"
        data-default-count="1000"
        data-default-runs="5"
        data-default-updates="20"
      >
        <div class="space-y-1.5">
          <label class="block text-[13px] text-slate-300" for="bench-count">
            要素数
          </label>
          <Input
            id="bench-count"
            name="bench-count"
            type="number"
            min="100"
            max="20000"
            step="100"
          />
        </div>
        <div class="space-y-1.5">
          <label class="block text-[13px] text-slate-300" for="bench-runs">
            試行回数
          </label>
          <Input id="bench-runs" name="bench-runs" type="number" min="1" max="10" />
        </div>
        <div class="space-y-1.5">
          <label class="block text-[13px] text-slate-300" for="bench-updates">
            状態更新回数
          </label>
          <Input id="bench-updates" name="bench-updates" type="number" min="1" max="100" step="1" />
        </div>
        <Button type="button" id="bench-run-all" class="w-full" variant="ghost">
          両方を計測する
        </Button>
        <Button type="button" id="bench-reset" class="w-full" variant="ghost">
          結果をリセット
        </Button>
        <p class="col-span-full text-[13px] text-slate-300 m-0">
          client-only の軽量比較です。計測値は端末・ブラウザに依存します。
        </p>
      </section>

      <section class="grid grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-4 mt-5">
        <article
          class="bg-white border border-slate-900/10 rounded-xl p-5 flex flex-col gap-3.5 shadow-[0_15px_40px_rgba(15,23,42,0.05)]"
          data-runner="vapor"
        >
          <header>
            <p class="text-xs uppercase tracking-widest text-slate-500 mb-1.5 mt-0">Client</p>
            <h2 class="text-2xl font-semibold tracking-[-0.02em] mb-3 mt-0">vue-jsx-vapor</h2>
          </header>
          <div class="grid gap-1.5 rounded-lg bg-slate-900 p-3 text-slate-200 font-mono text-sm">
            <div id="vapor-stats-update">状態更新: まだ計測していません</div>
            <div id="vapor-stats-splice">追加/削除: まだ計測していません</div>
          </div>
          <div
            class="h-105 overflow-y-auto rounded-lg border border-dashed border-slate-900/10 p-2.5 bg-slate-50"
            id="vapor-target"
            aria-live="polite"
          ></div>
          <div class="flex flex-wrap gap-2">
            <Button
              type="button"
              class="bench-runner self-start"
              variant="primary"
              data-runner="vapor"
              data-case="update"
            >
              Vapor (状態更新)
            </Button>
            <Button
              type="button"
              class="bench-runner self-start"
              variant="secondary"
              data-runner="vapor"
              data-case="splice"
            >
              Vapor (追加/削除)
            </Button>
          </div>
        </article>

        <article
          class="bg-white border border-slate-900/10 rounded-xl p-5 flex flex-col gap-3.5 shadow-[0_15px_40px_rgba(15,23,42,0.05)]"
          data-runner="hono"
        >
          <header>
            <p class="text-xs uppercase tracking-widest text-slate-500 mb-1.5 mt-0">Client</p>
            <h2 class="text-2xl font-semibold tracking-[-0.02em] mb-3 mt-0">hono/jsx/dom</h2>
          </header>
          <div class="grid gap-1.5 rounded-lg bg-slate-900 p-3 text-slate-200 font-mono text-sm">
            <div id="hono-stats-update">状態更新: まだ計測していません</div>
            <div id="hono-stats-splice">追加/削除: まだ計測していません</div>
          </div>
          <div
            class="h-105 overflow-y-auto rounded-lg border border-dashed border-slate-900/10 p-2.5 bg-slate-50"
            id="hono-target"
            aria-live="polite"
          ></div>
          <div class="flex flex-wrap gap-2">
            <Button
              type="button"
              class="bench-runner self-start"
              variant="primary"
              data-runner="hono"
              data-case="update"
            >
              hono/jsx (状態更新)
            </Button>
            <Button
              type="button"
              class="bench-runner self-start"
              variant="secondary"
              data-runner="hono"
              data-case="splice"
            >
              hono/jsx (追加/削除)
            </Button>
          </div>
        </article>
      </section>
      <Script type="module" src="/src/client/benchmark/index.ts" />
    </main>,
  )
})

export default app
