/** @jsxImportSource hono/jsx/dom */
import { useState } from 'hono/jsx/dom';
import { createRoot, type Root } from 'hono/jsx/dom/client';
import { createMutator, createSpliceMutator } from './data';
import type { BenchItem, RunOutcome, RunnerOptions } from './types';

type SetState<T> = (value: T | ((current: T) => T)) => void;

const nextPaint = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

export const runHonoDom = async (target: HTMLElement, items: BenchItem[], options: RunnerOptions): Promise<RunOutcome> => {
  target.replaceChildren();
  const mountPoint = document.createElement('div');
  target.appendChild(mountPoint);

  const root: Root = createRoot(mountPoint);

  const { updates, mutateCount, seed, warmup = 1 } = options;
  const runCase = options.case ?? 'update';
  const mutate = runCase === 'splice' ? createSpliceMutator(seed, items.length) : createMutator(mutateCount, seed);

  // コンポーネント外部から更新できるようにsetStateを保持
  let setItems: SetState<BenchItem[]> | null = null;

  const HonoBenchApp = () => {
    const [state, setState] = useState(items);
    setItems = setState; // 外部から参照できるようにする

    return (
      <ul class="list-none p-0 m-0 grid grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-1.5">
        {state.map((item) => (
          <li class="grid grid-cols-[56px_1fr_auto] items-center gap-2 p-2.5 rounded-lg bg-slate-900/5" key={item.id}>
            <span class="text-slate-400 text-[13px]">#{item.id + 1}</span>
            <span class="font-semibold">{item.label}</span>
            <span class="font-mono tabular-nums text-cyan-500">{item.value}</span>
          </li>
        ))}
      </ul>
    );
  };

  const mountStart = performance.now();
  root.render(<HonoBenchApp />);
  await nextPaint();
  const mountDuration = performance.now() - mountStart;

  // setItems が null でないことを確認
  if (!setItems) {
    throw new Error('Failed to initialize Hono component state');
  }

  const durations: number[] = [];
  let current = items;
  const setState = setItems as SetState<BenchItem[]>;

  // warmup を挟んで初回コストを計測対象から外す
  for (let i = 0; i < warmup; i += 1) {
    current = mutate(current);
    setState(current);
    await nextPaint();
  }

  for (let i = 0; i < updates; i += 1) {
    current = mutate(current);
    const start = performance.now();
    setState(current);
    await nextPaint();
    durations.push(performance.now() - start);
  }

  return {
    mountDuration,
    updateDurations: durations,
    cleanup: () => {
      try {
        root.unmount();
      } catch (error) {
        console.warn('Hono root unmount failed', error);
      }
      target.replaceChildren();
    },
  };
};
