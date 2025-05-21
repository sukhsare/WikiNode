import { jest } from '@jest/globals';

// mock vis-network so we don't need a real DOM
await jest.unstable_mockModule('vis-network/standalone/esm/vis-network', () => ({
  Network: jest.fn().mockImplementation(() => ({
    once: jest.fn(),
    fit: jest.fn(),
    on: jest.fn(),
    unselectAll: jest.fn(),
    cluster: jest.fn(),
    openCluster: jest.fn(),
    redraw: jest.fn(),
  })),
  DataSet: jest.fn().mockImplementation(() => ({
    add: jest.fn(),
    clear: jest.fn(),
    update: jest.fn(),
    get: jest.fn().mockReturnValue([]),
    forEach: jest.fn(),
    remove: jest.fn(),
  })),
  DataView: jest.fn(),
}));

// fake api responses
await jest.unstable_mockModule('../../src/js/modules/api.js', () => ({
  getPageIdByTitle: jest.fn(() => Promise.resolve(12345)),
  getLinkCount: jest.fn(() => Promise.resolve(100)),
  fetchTrendingArticles: jest.fn(() => Promise.resolve([])),
  getAllLinks: jest.fn(() => Promise.resolve([])),
  getPageviews: jest.fn(() => Promise.resolve(500)),
  getRelatedArticles: jest.fn(() => Promise.resolve([
    { title: 'Related Article 1' }, 
  ])),
}));

// fake progress bar for testing
global.NProgress = {
  start: jest.fn(),
  done: jest.fn(),
  set: jest.fn(),
};

// import our mocked stuff
const { Network } = await import('vis-network/standalone/esm/vis-network');
const api = await import('../../src/js/modules/api.js');
const {
  initGraph,
  createOrExpandNode: expandNode,
} = await import('../../src/js/modules/graph.js');

describe('WikiNode Integration Tests', () => {
  beforeEach(() => {
    // create a fake element for testing
    document.body.innerHTML = '<div id="mynetwork"></div>';
  });

  // check if graph initialisation works
  test('Search Integration', async () => {
    const container = document.getElementById('mynetwork');
    await initGraph(container, false);
    expect(Network).toHaveBeenCalled();
  });

  // check if node expansion calls the right API functions
  test('Node Expansion Integration', async () => {
    await expandNode(12345, 'Node Title', 12345);
    expect(api.getLinkCount).toHaveBeenCalledWith('Related Article 1');
    expect(api.getRelatedArticles).toHaveBeenCalledWith('Node Title', 20);
  });
});