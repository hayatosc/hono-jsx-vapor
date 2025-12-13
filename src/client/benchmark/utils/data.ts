import type { BenchItem } from '../types';

// Linear Congruential Generator (LCG) constants
// Based on Numerical Recipes implementation
const LCG_MULTIPLIER = 1664525;
const LCG_INCREMENT = 1013904223;

// Value range constants
const VALUE_MODULO = 1000;
const VALUE_INCREMENT = 17;

/**
 * Linear Congruential Generator for deterministic random numbers.
 * Uses parameters from Numerical Recipes.
 */
const lcg = (seed: number) => {
  let state = seed >>> 0 || 1; // Avoid zero state
  return () => {
    state = (state * LCG_MULTIPLIER + LCG_INCREMENT) >>> 0;
    return state;
  };
};

/**
 * Create an array of benchmark items with deterministic values.
 */
export const createItems = (count: number, seed = 1): BenchItem[] => {
  const next = lcg(seed);
  return Array.from({ length: count }, (_, index) => ({
    id: index,
    label: `Row ${index + 1}`,
    value: next() % VALUE_MODULO,
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
    for (let i = 0; i < len; i++) {
      const idx = next() % items.length;
      const target = output[idx];
      output[idx] = { ...target, value: (target.value + VALUE_INCREMENT) % VALUE_MODULO };
    }
    return output;
  };
};

/**
 * Create a deterministic mutator that alternates insert/remove operations.
 * Each call performs exactly one operation (either insert or remove).
 * Keys are stable via monotonically increasing `id`.
 */
export const createSpliceMutator = (seed = 1, initialNextId = 0) => {
  const next = lcg(seed);
  let nextId = Math.max(0, initialNextId);
  let insertNext = true;

  return (items: BenchItem[]): BenchItem[] => {
    const len = items.length;
    if (len === 0) {
      const id = nextId++;
      insertNext = false;
      return [{ id, label: `Row ${id + 1}`, value: next() % VALUE_MODULO }];
    }

    if (insertNext) {
      const id = nextId++;
      const idx = next() % (len + 1);
      const value = next() % VALUE_MODULO;
      const item: BenchItem = { id, label: `Row ${id + 1}`, value };
      insertNext = false;
      return [...items.slice(0, idx), item, ...items.slice(idx)];
    }

    const idx = next() % len;
    insertNext = true;
    return [...items.slice(0, idx), ...items.slice(idx + 1)];
  };
};
