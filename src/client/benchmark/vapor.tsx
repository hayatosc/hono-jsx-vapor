/** @jsxImportSource vue-jsx-vapor */
// @ts-nocheck - v-for syntax is not recognized by TypeScript but processed by Vue JSX Vapor compiler
import { createVaporApp, nextTick, ref, type Ref } from 'vue';
import { createMutator } from './data';
import type { BenchItem, RunOutcome, RunnerOptions } from './types';

const nextPaint = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

export const runVapor = async (
  target: HTMLElement,
  items: BenchItem[],
  options: RunnerOptions
): Promise<RunOutcome> => {
  target.replaceChildren();
  const mountPoint = document.createElement('div');
  target.appendChild(mountPoint);

  const { updates, mutateCount, seed, warmup = 1 } = options;
  const mutate = createMutator(mutateCount, seed);

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
  const mountStart = performance.now();
  app.mount(mountPoint);
  await nextPaint();
  const mountDuration = performance.now() - mountStart;

  // itemsRef が null でないことを確認
  if (!itemsRef) {
    throw new Error('Failed to initialize Vapor component state');
  }

  const durations: number[] = [];
  let current = items;
  const stateRef = itemsRef as Ref<BenchItem[]>;

  // warmup を挟んで初回コストを計測対象から外す
  for (let i = 0; i < warmup; i += 1) {
    current = mutate(current);
    stateRef.value = current;
    await nextTick();
    await nextPaint();
  }

  for (let i = 0; i < updates; i += 1) {
    current = mutate(current);
    const start = performance.now();
    stateRef.value = current;
    await nextTick();
    await nextPaint();
    durations.push(performance.now() - start);
  }

  return {
    mountDuration,
    updateDurations: durations,
    cleanup: () => {
      try {
        if (mountPoint.isConnected) {
          app.unmount();
        } else {
          // already removed; avoid double-unmount errors
          app.unmount?.();
        }
      } catch (error) {
        console.warn('Vapor unmount failed', error);
      }
      mountPoint.remove();
      target.textContent = '';
    },
  };
};
