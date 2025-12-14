/** @jsxImportSource hono/jsx/dom */
import { useState } from 'hono/jsx/dom';
import { createRoot, type Root } from 'hono/jsx/dom/client';
import type { BenchItem, RunOutcome, RunnerOptions } from '../types';
import { createMutator, createSpliceMutator } from '../utils/data';
import { createRunnerContext, measureMount, nextPaint, safeCleanup } from './helpers';

type SetState<T> = (value: T | ((current: T) => T)) => void;

const HonoBenchApp = (initialItems: BenchItem[], setStateRef: { current: SetState<BenchItem[]> | null }) => () => {
  const [state, setState] = useState(initialItems);
  setStateRef.current = setState;

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

export const runHonoDom = async (target: HTMLElement, items: BenchItem[], options: RunnerOptions): Promise<RunOutcome> => {
  const { mountPoint, updates, mutateCount, seed, warmup, runCase } = createRunnerContext(target, items, options);
  const mutate = runCase === 'splice' ? createSpliceMutator(seed, items.length) : createMutator(mutateCount, seed);

  const root: Root = createRoot(mountPoint);
  const setStateRef: { current: SetState<BenchItem[]> | null } = { current: null };
  const AppComponent = HonoBenchApp(items, setStateRef);

  const mountDuration = await measureMount(() => root.render(<AppComponent />));

  if (!setStateRef.current) {
    throw new Error('Failed to initialize Hono component state');
  }

  const setState = setStateRef.current;
  let current = items;

  // Warmup: eliminate initial rendering costs from measurements
  for (let i = 0; i < warmup; i++) {
    current = mutate(current);
    setState(current);
    await nextPaint();
  }

  // Measured updates
  const durations: number[] = [];
  for (let i = 0; i < updates; i++) {
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
      safeCleanup(() => root.unmount());
      target.replaceChildren();
    },
  };
};
