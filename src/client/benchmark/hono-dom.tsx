/** @jsxImportSource hono/jsx/dom */
import { render, useState } from 'hono/jsx/dom';
import { createMutator } from './data';
import type { BenchItem, RunOutcome, RunnerOptions } from './types';

type SetState<T> = (value: T | ((current: T) => T)) => void;

const nextPaint = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

export const runHonoDom = async (
  target: HTMLElement,
  items: BenchItem[],
  options: RunnerOptions
): Promise<RunOutcome> => {
  target.replaceChildren();
  const mountPoint = document.createElement('div');
  target.appendChild(mountPoint);

  const { updates, mutateCount, seed, warmup = 1 } = options;
  const mutate = createMutator(mutateCount, seed);

  // コンポーネント外部から更新できるようにsetStateを保持
  let setItems: SetState<BenchItem[]> | null = null;

  const HonoBenchApp = () => {
    const [state, setState] = useState(items);
    setItems = setState; // 外部から参照できるようにする

    return (
      <ul class="bench-list">
        {state.map((item) => (
          <li class="bench-row" key={item.id}>
            <span class="muted">#{item.id + 1}</span>
            <span class="label">{item.label}</span>
            <span class="value">{item.value}</span>
          </li>
        ))}
      </ul>
    );
  };

  const mountStart = performance.now();
  render(<HonoBenchApp />, mountPoint);
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
      mountPoint.remove();
      target.textContent = '';
    },
  };
};
