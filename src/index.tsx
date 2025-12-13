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
