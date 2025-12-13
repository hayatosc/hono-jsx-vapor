import { createVaporApp } from 'vue';
import Counter from './Counter';

const el = document.getElementById('counter-island');
if (el) {
  // SSRから初期値を渡したければ dataset を読む
  // const initial = Number(el.dataset.initial ?? 0)
  createVaporApp(Counter).mount(el);
}
