import { createVaporApp } from 'vue';
import Counter from './Counter';

const el = document.getElementById('counter-island');
if (el) {
  createVaporApp(Counter).mount(el);
}
