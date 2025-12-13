import type { BenchItem } from './types';

const lcg = (seed: number) => {
  let state = seed >>> 0 || 1; // avoid zero state
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state;
  };
};

export const createItems = (count: number, seed = 1): BenchItem[] => {
  const next = lcg(seed);
  return Array.from({ length: count }, (_, index) => ({
    id: index,
    label: `Row ${index + 1}`,
    value: next() % 1000,
  }));
};

/**
 * Create a deterministic mutator that yields the same update sequence
 * when called with the same seed, regardless of wall clock time.
 */
export const createMutator = (mutateCount: number, seed = 1) => {
  const next = lcg(seed);
  return (items: BenchItem[]): BenchItem[] => {
    const output = [...items];
    const len = Math.max(1, Math.min(mutateCount, items.length));
    for (let i = 0; i < len; i += 1) {
      const idx = next() % items.length;
      const target = output[idx];
      output[idx] = { ...target, value: (target.value + 17) % 1000 };
    }
    return output;
  };
};
