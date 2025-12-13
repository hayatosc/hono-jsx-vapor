/** @jsxImportSource hono/jsx/dom */
import { render, useState } from 'hono/jsx/dom';
import { mutateItems } from './data';
import type { BenchItem, RunOutcome } from './types';

type SetState<T> = (value: T | ((current: T) => T)) => void;

export const runHonoDom = async (
  target: HTMLElement,
  items: BenchItem[],
  options: { updates: number; mutateCount: number }
): Promise<RunOutcome> => {
  target.replaceChildren();
  const mountPoint = document.createElement('div');
  target.appendChild(mountPoint);

  const { updates, mutateCount } = options;

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

  render(<HonoBenchApp />, mountPoint);
  await Promise.resolve();

  // setItems が null でないことを確認
  if (!setItems) {
    throw new Error('Failed to initialize Hono component state');
  }

  const durations: number[] = [];
  let current = items;
  const setState = setItems as SetState<BenchItem[]>;
  for (let i = 0; i < updates; i += 1) {
    current = mutateItems(current, mutateCount);
    const start = performance.now();
    setState(current);
    await Promise.resolve();
    durations.push(performance.now() - start);
  }

  const average = durations.reduce((sum, value) => sum + value, 0) / durations.length;
  return {
    duration: average,
    cleanup: () => {
      mountPoint.remove();
      target.textContent = '';
    },
  };
};
