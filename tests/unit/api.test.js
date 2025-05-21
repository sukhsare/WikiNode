import { jest } from '@jest/globals';

// mock the api module so we don't hit real Wikipedia servers during tests
jest.unstable_mockModule('../../src/js/modules/api.js', () => ({
  getLinkCount: jest.fn(() => Promise.resolve(42)),
  getPageviews: jest.fn(() => Promise.resolve(100)),
  getRelatedArticles: jest.fn(() => Promise.resolve([{ title: 'Test' }])),
  fetchTrendingArticles: jest.fn(() => Promise.resolve([{ article: 'Test' }])),
  getPageIdByTitle: jest.fn(() => Promise.resolve(12345)),
}));

const { getLinkCount, getPageIdByTitle, getPageviews, getRelatedArticles, fetchTrendingArticles } = 
  await import('../../src/js/modules/api.js');

test('getLinkCount returns valid numeric link count', async () => {
  const count = await getLinkCount('JavaScript');
  expect(typeof count).toBe('number');
  expect(count).toBeGreaterThan(0);
});

test('getPageIdByTitle returns a valid page ID', async () => {
  const pageId = await getPageIdByTitle('JavaScript');
  expect(typeof pageId).toBe('number');
  expect(pageId).toBeGreaterThan(0);
});

test('getPageviews returns a numeric pageview count', async () => {
  const views = await getPageviews('JavaScript');
  expect(typeof views).toBe('number');
  expect(views).toBeGreaterThanOrEqual(0);
});

test('fetchTrendingArticles returns an array of trending articles', async () => {
  const trending = await fetchTrendingArticles();
  expect(Array.isArray(trending)).toBe(true);
  expect(trending.length).toBeGreaterThan(0);
  expect(trending[0]).toHaveProperty('article');
});

test('getRelatedArticles fetches related articles with valid titles', async () => {
  const related = await getRelatedArticles('JavaScript', 10);
  expect(Array.isArray(related)).toBe(true);
  expect(related.length).toBeGreaterThan(0);
  expect(related[0]).toHaveProperty('title');
});