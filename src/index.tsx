/** @jsxImportSource hono/jsx */
import { Hono } from 'hono';
import { Script } from 'vite-ssr-components/hono';
import { renderer } from './renderer';

const app = new Hono();

app.use(renderer);

app.get('/', (c) => {
  return c.render(
    <>
      <header class="hero">
        <p class="eyebrow">Hono + Vue JSX Vapor</p>
        <h1>SSR by hono/jsx</h1>
        <p class="lead">島（island）として Vue JSX Vapor をマウントしたサンプル。レンダラーの差を見るベンチマークもあります。</p>
        <nav class="links">
          <a href="/benchmark">レンダリング速度を試す →</a>
        </nav>
      </header>
      <section class="island-card">
        <p class="section-title">Vue JSX Vapor island</p>
        <div id="counter-island" data-initial="0"></div>
      </section>
      <Script type="module" src="/src/client/index.tsx" />
    </>
  );
});

app.get('/benchmark', (c) => {
  return c.render(
    <main id="benchmark-page">
      <header class="hero">
        <p class="eyebrow">Renderer benchmark</p>
        <h1>Vue JSX Vapor vs hono/jsx/dom</h1>
        <p class="lead">
          同じ1000件超のリストをそれぞれのレンダラーで生成し、ブラウザの performance.now() を用いてクライアント側の描画時間を測定します。
        </p>
        <nav class="links">
          <a href="/">← トップに戻る</a>
        </nav>
      </header>

      <section class="controls" id="benchmark-controls" data-default-count="1000" data-default-runs="5" data-default-updates="20">
        <div class="field">
          <label for="bench-count">要素数</label>
          <input id="bench-count" name="bench-count" type="number" min="100" max="20000" step="100" />
        </div>
        <div class="field">
          <label for="bench-runs">試行回数</label>
          <input id="bench-runs" name="bench-runs" type="number" min="1" max="10" />
        </div>
        <div class="field">
          <label for="bench-updates">状態更新回数</label>
          <input id="bench-updates" name="bench-updates" type="number" min="1" max="100" step="1" />
        </div>
        <button type="button" id="bench-run-all">
          両方を計測する
        </button>
        <button type="button" id="bench-reset">
          結果をリセット
        </button>
        <p class="hint">client-only の軽量比較です。計測値は端末・ブラウザに依存します。</p>
      </section>

      <section class="bench-grid">
        <article class="bench-card" data-runner="vapor">
          <header>
            <p class="eyebrow">Client</p>
            <h2>Vue JSX Vapor</h2>
          </header>
          <div class="bench-stats">
            <div id="vapor-stats-update">状態更新: まだ計測していません</div>
          </div>
          <div class="bench-target" id="vapor-target" aria-live="polite"></div>
          <div class="bench-actions">
            <button type="button" class="bench-runner" data-runner="vapor">
              Vapor (状態更新を計測)
            </button>
          </div>
        </article>

        <article class="bench-card" data-runner="hono">
          <header>
            <p class="eyebrow">Client</p>
            <h2>hono/jsx/dom</h2>
          </header>
          <div class="bench-stats">
            <div id="hono-stats-update">状態更新: まだ計測していません</div>
          </div>
          <div class="bench-target" id="hono-target" aria-live="polite"></div>
          <div class="bench-actions">
            <button type="button" class="bench-runner" data-runner="hono">
              hono/jsx/dom (状態更新を計測)
            </button>
          </div>
        </article>
      </section>
      <Script type="module" src="/src/client/benchmark/entry.tsx" />
    </main>
  );
});

export default app;
