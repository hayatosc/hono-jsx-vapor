/** @jsxImportSource vue-jsx-vapor */
// @ts-nocheck - v-for syntax is not recognized by TypeScript but processed by Vue JSX Vapor compiler
import { createVaporApp, nextTick, ref, type Ref } from 'vue';
import { createMutator, createSpliceMutator } from './data';
import type { BenchItem, RunOutcome, RunnerOptions } from './types';

const nextPaint = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

export const runVapor = async (target: HTMLElement, items: BenchItem[], options: RunnerOptions): Promise<RunOutcome> => {
  target.replaceChildren();
  const mountPoint = document.createElement('div');
  target.appendChild(mountPoint);

  const { updates, mutateCount, seed, warmup = 1 } = options;
  const runCase = options.case ?? 'update';
  const mutate = runCase === 'splice' ? createSpliceMutator(seed, items.length) : createMutator(mutateCount, seed);

  // コンポーネント外部から更新できるようにrefを保持
  let itemsRef: Ref<BenchItem[]> | null = null;

  const VaporBenchApp = () => {
    const state = ref(items);
    itemsRef = state; // 外部から参照できるようにする

    return (
      <ul class="list-none p-0 m-0 grid grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-1.5">
        <li
          class="grid grid-cols-[56px_1fr_auto] items-center gap-2 p-2.5 rounded-lg bg-slate-900/5"
          v-for={(item, index) in state.value}
          key={item.id}
        >
          <span class="text-slate-400 text-[13px]">#{item.id + 1}</span>
          <span class="font-semibold">{item.label}</span>
          <span class="font-mono tabular-nums text-cyan-500">{item.value}</span>
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
        // vue-jsx-vapor may throw if unmount is called after the container is detached
        if (mountPoint.parentNode) {
          app.unmount();
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        // Known noisy failure (observed with Vue alpha + vapor): "Cannot read properties of null (reading 'parent')"
        // Ignore it to keep benchmark output clean.
        if (!message.includes("reading 'parent'")) {
          console.warn('Vapor unmount failed', error);
        }
      }
      target.replaceChildren();
    },
  };
};
