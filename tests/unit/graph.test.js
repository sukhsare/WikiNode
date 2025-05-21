import { logNormalize, getNodeColor, getEffectivePopularity, setTrendingSetForTests } from '../../src/js/modules/graph.js';

// basic test for log scale function
test('logNormalize calculates correct normalised values', () => {
  expect(logNormalize(3000)).toBeCloseTo(0);
  expect(logNormalize(10000000)).toBeCloseTo(1);
  expect(logNormalize(500000)).toBeGreaterThan(0);
  expect(logNormalize(0)).toBe(0);
});

// check if trending articles get popularity boost
test('getEffectivePopularity correctly adjusts popularity if trending', () => {
  setTrendingSetForTests(['JavaScript']);  // hack to set up test data
  const boostedPopularity = getEffectivePopularity('JavaScript', 10000);
  const normalPopularity = getEffectivePopularity('Python', 10000);

  expect(boostedPopularity).toBeGreaterThan(normalPopularity);
  expect(boostedPopularity).toBe(11000);
  expect(normalPopularity).toBe(10000);
});

// make sure our color generator works
test('getNodeColor generates correct HSL colour strings', () => {
  const color = getNodeColor('JavaScript', 500000);
  expect(color).toMatch(/^hsl\(\d+, 70%, 50%\)$/);
});