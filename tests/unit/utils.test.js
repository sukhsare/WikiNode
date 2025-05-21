import { asyncPool } from '../../src/js/modules/utils.js';

// tests the async pool utility with delayed tasks
test('asyncPool processes tasks with correct concurrency', async () => {
  // some dummy tasks with different delays
  const tasks = [
    () => new Promise(resolve => setTimeout(() => resolve(1), 100)),
    () => new Promise(resolve => setTimeout(() => resolve(2), 50)),
    () => new Promise(resolve => setTimeout(() => resolve(3), 25))
  ];

  const results = await asyncPool(2, tasks, task => task());
  expect(results).toEqual([1, 2, 3]);
});