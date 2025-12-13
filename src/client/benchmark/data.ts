import type { BenchItem } from './types';

export const createItems = (count: number): BenchItem[] => {
  const seed = Math.floor(Date.now() % 997);
  return Array.from({ length: count }, (_, index) => ({
    id: index,
    label: `Row ${index + 1}`,
    value: (index * 17 + seed) % 1000,
  }));
};

export const mutateItems = (items: BenchItem[], mutateCount: number): BenchItem[] => {
  const next = [...items];
  const len = Math.max(1, Math.min(mutateCount, items.length));
  for (let i = 0; i < len; i += 1) {
    const idx = (i * 17 + Date.now()) % items.length;
    const target = next[idx];
    next[idx] = { ...target, value: (target.value + 17) % 1000 };
  }
  return next;
};
