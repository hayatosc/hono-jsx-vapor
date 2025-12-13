/** @jsxImportSource vue-jsx-vapor */
// @ts-nocheck - v-for syntax is not recognized by TypeScript but processed by Vue JSX Vapor compiler
import { createVaporApp, ref, type Ref } from 'vue';
import { mutateItems } from './data';
import type { BenchItem, RunOutcome } from './types';

export const runVapor = async (
  target: HTMLElement,
  items: BenchItem[],
  options: { updates: number; mutateCount: number }
): Promise<RunOutcome> => {
  target.replaceChildren();
  const mountPoint = document.createElement('div');
  target.appendChild(mountPoint);

  const { updates, mutateCount } = options;

  // コンポーネント外部から更新できるようにrefを保持
  let itemsRef: Ref<BenchItem[]> | null = null;

  const VaporBenchApp = () => {
    const state = ref(items);
    itemsRef = state; // 外部から参照できるようにする

    return (
      <ul class="bench-list">
        <li class="bench-row" v-for={(item, index) in state.value} key={item.id}>
          <span class="muted">#{item.id + 1}</span>
          <span class="label">{item.label}</span>
          <span class="value">{item.value}</span>
        </li>
      </ul>
    );
  };

  const app = createVaporApp(VaporBenchApp);
  app.mount(mountPoint);
  await Promise.resolve();

  // itemsRef が null でないことを確認
  if (!itemsRef) {
    throw new Error('Failed to initialize Vapor component state');
  }

  const durations: number[] = [];
  let current = items;
  const stateRef = itemsRef as Ref<BenchItem[]>;
  for (let i = 0; i < updates; i += 1) {
    current = mutateItems(current, mutateCount);
    const start = performance.now();
    stateRef.value = current;
    await Promise.resolve();
    durations.push(performance.now() - start);
  }

  const average = durations.reduce((sum, value) => sum + value, 0) / durations.length;
  return {
    duration: average,
    cleanup: () => {
      try {
        app.unmount();
      } catch (error) {
        console.warn('Vapor unmount failed', error);
      }
      mountPoint.remove();
      target.textContent = '';
    },
  };
};
