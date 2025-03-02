// -------------------------------
// 1. Theme & Graph Options
// -------------------------------
const theme = "light";

const graphOptions = {
  nodes: {
    color: theme === "light"
      ? { background: "#ffffff", border: "#000000", highlight: { background: "#ffffff", border: "#000000" } }
      : { background: "#000000", border: "#ffffff", highlight: { background: "#000000", border: "#ffffff" } },
    font: {
      color: theme === "light" ? "#000000" : "#ffffff"
    },
    shape: "dot"
  },
  edges: {
    color: theme === "light" ? "#000000" : "#ffffff",
    width: 2
  },
  physics: { enabled: true }
};

// -------------------------------
// 2. Date Range Function
// -------------------------------
function getLastMonthDateRange() {
  const now = new Date();
  const firstDayCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDayPrevMonth = new Date(firstDayCurrentMonth - 1);
  const firstDayPrevMonth = new Date(lastDayPrevMonth.getFullYear(), lastDayPrevMonth.getMonth(), 1);
  const formatDate = date =>
    date.getFullYear().toString() +
    (date.getMonth() + 1).toString().padStart(2, '0') +
    date.getDate().toString().padStart(2, '0');
  return { start: formatDate(firstDayPrevMonth), end: formatDate(lastDayPrevMonth) };
}
const { start, end } = getLastMonthDateRange();

// -------------------------------
// 3. API Endpoints
// -------------------------------
const SEARCH_API_URL = "https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*";
const LINKS_API_URL = `${SEARCH_API_URL}&prop=links&pllimit=max`;
const PAGEVIEWS_API_URL = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/all-agents/{title}/daily/${start}/${end}`;

// -------------------------------
// 4. DOM Elements & Graph Initialisation
// -------------------------------
const searchBar = document.getElementById('search-bar');
const suggestionsContainer = document.getElementById('suggestions');
const container = document.getElementById('graph-container');

const nodes = new vis.DataSet([]);
const edges = new vis.DataSet([]);
const data = { nodes, edges };
const network = new vis.Network(container, data, graphOptions);

// -------------------------------
// 5. Concurrency Helper
// -------------------------------
async function asyncPool(limit, array, iteratorFn) {
  const ret = [];
  const executing = [];
  for (const item of array) {
    const p = Promise.resolve().then(() => iteratorFn(item));
    ret.push(p);
    if (limit <= array.length) {
      const e = p.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);
      if (executing.length >= limit) {
        await Promise.race(executing);
      }
    }
  }
  return Promise.all(ret);
}

// -------------------------------
// 6. Pageviews Caching
// -------------------------------
const pageviewsCache = new Map();

// -------------------------------
// 7. Fetching All Links (Handling Continuation)
// -------------------------------
async function getAllLinks(pageid) {
  let allLinks = [];
  let plcontinue = null;
  do {
    const url = `${LINKS_API_URL}&pageids=${pageid}${plcontinue ? `&plcontinue=${encodeURIComponent(plcontinue)}` : ""}`;
    const response = await fetch(url);
    const data = await response.json();
    if (!data.query || !data.query.pages || !data.query.pages[pageid]) {
      console.warn("Unexpected API response structure in getAllLinks:", data);
      return allLinks;
    }
    const page = data.query.pages[pageid];
    if (page.links) {
      allLinks = allLinks.concat(page.links);
    }
    plcontinue = data.continue ? data.continue.plcontinue : null;
  } while (plcontinue);
  return allLinks;
}

// -------------------------------
// 8. Fetch Pageviews for an Article
// -------------------------------
async function getPageviews(title) {
  if (pageviewsCache.has(title)) {
    return pageviewsCache.get(title);
  }
  const formattedTitle = title.replace(/ /g, "_");
  const url = PAGEVIEWS_API_URL.replace("{title}", encodeURIComponent(formattedTitle));
  console.log(`Fetching pageviews for: ${title} → ${url}`);
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const data = await response.json();
    const totalViews = data.items ? data.items.reduce((sum, item) => sum + item.views, 0) : 0;
    pageviewsCache.set(title, totalViews);
    return totalViews;
  } catch (error) {
    console.error(`Error fetching pageviews for ${title}:`, error);
    return 0;
  }
}

// -------------------------------
// 9. Helper: Get Page ID by Title
// -------------------------------
async function getPageIdByTitle(title) {
  try {
    const response = await fetch(`${SEARCH_API_URL}&titles=${encodeURIComponent(title)}&prop=pageids`);
    const data = await response.json();
    const pageIds = Object.keys(data.query.pages);
    return pageIds.length > 0 ? pageIds[0] : null;
  } catch (error) {
    console.error(`Error fetching pageid for ${title}:`, error);
    return null;
  }
}

// -------------------------------
// 10. Search Suggestions
// -------------------------------
searchBar.addEventListener('input', async () => {
  const query = searchBar.value.trim();
  if (!query) {
    suggestionsContainer.innerHTML = '';
    return;
  }
  try {
    const response = await fetch(`${SEARCH_API_URL}&list=search&srsearch=${encodeURIComponent(query)}`);
    const data = await response.json();
    suggestionsContainer.innerHTML = '';
    if (!data.query?.search?.length) return;
    data.query.search.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item.title;
      li.dataset.pageid = item.pageid;
      suggestionsContainer.appendChild(li);
      li.addEventListener('click', () => {
        createCentralNode(item.title, item.pageid);
        searchBar.value = '';
        suggestionsContainer.innerHTML = '';
      });
    });
  } catch (error) {
    console.error('Error fetching search suggestions:', error);
  }
});

// -------------------------------
// 11. Expand/Build the Graph
// -------------------------------
// Expands a node by fetching its links, obtaining pageviews,
// sorting by popularity, and adding up to 10 new nodes.
// (Auto-expansion beyond the first layer has been removed.)
async function createOrExpandNode(nodeId, title, pageid) {
  try {
    const links = await getAllLinks(pageid);
    if (!links.length) {
      console.warn("No linked articles found.");
      return;
    }
    let rankedLinks = await asyncPool(5, links, async (link) => {
      const views = await getPageviews(link.title);
      return { title: link.title, views };
    });
    rankedLinks = rankedLinks.filter(link => link.views > 0);
    rankedLinks.sort((a, b) => b.views - a.views);
    console.log("Sorted Articles by Popularity:", rankedLinks);
    const maxViews = Math.max(...rankedLinks.map(link => link.views)) || 1;
    const linksToAdd = rankedLinks.slice(0, 10);
    
    linksToAdd.forEach(link => {
      const existingNode = nodes.get({ filter: node => node.label === link.title })[0];
      const nodeSize = Math.max(5, (link.views / maxViews) * 20);
      if (existingNode) {
        if (!edges.get({ filter: edge => edge.from === nodeId && edge.to === existingNode.id }).length) {
          edges.add({ from: nodeId, to: existingNode.id });
        }
      } else {
        const newNodeId = nodes.length + 1;
        nodes.add({ id: newNodeId, label: link.title, size: nodeSize });
        edges.add({ from: nodeId, to: newNodeId });
      }
    });
    addClusteringCoefficients(nodes, edges);
  } catch (error) {
    console.error("Error during node expansion:", error);
  }
}

// -------------------------------
// 12. Create Central Node
// -------------------------------
async function createCentralNode(title, pageid) {
  const existingNode = nodes.get({ filter: node => node.label === title })[0];
  if (existingNode) return;
  const centralNodeId = nodes.length + 1;
  nodes.add({ id: centralNodeId, label: title, size: 30 });
  network.fit({ nodes: [centralNodeId], animation: true });
  await createOrExpandNode(centralNodeId, title, pageid);
}

// -------------------------------
// 13. Local Clustering Coefficient Calculation
// -------------------------------
function computeLocalClusteringCoefficient(nodeId, nodesDataset, edgesDataset) {
  const neighbourIds = new Set();
  edgesDataset.forEach(edge => {
    if (edge.from === nodeId) neighbourIds.add(edge.to);
    if (edge.to === nodeId) neighbourIds.add(edge.from);
  });
  const neighbours = Array.from(neighbourIds);
  const k = neighbours.length;
  if (k < 2) return 0;
  
  let linksBetweenNeighbours = 0;
  for (let i = 0; i < neighbours.length; i++) {
    for (let j = i + 1; j < neighbours.length; j++) {
      const connectingEdges = edgesDataset.get({
        filter: edge =>
          (edge.from === neighbours[i] && edge.to === neighbours[j]) ||
          (edge.from === neighbours[j] && edge.to === neighbours[i])
      });
      if (connectingEdges.length > 0) {
        linksBetweenNeighbours++;
      }
    }
  }
  const possibleLinks = (k * (k - 1)) / 2;
  return linksBetweenNeighbours / possibleLinks;
}

function addClusteringCoefficients(nodesDataset, edgesDataset) {
  nodesDataset.forEach(node => {
    const coeff = computeLocalClusteringCoefficient(node.id, nodesDataset, edgesDataset);
    nodesDataset.update({ id: node.id, clusteringCoefficient: coeff });
    console.log(`Node "${node.label}" (id: ${node.id}) clustering coefficient: ${coeff.toFixed(2)}`);
  });
}

// -------------------------------
// 14. Node Click Event Handler
// -------------------------------
network.on('click', async params => {
  if (params.nodes.length > 0) {
    const nodeId = params.nodes[0];
    const node = nodes.get(nodeId);
    if (node && node.label) {
      try {
        const response = await fetch(`${SEARCH_API_URL}&titles=${encodeURIComponent(node.label)}&prop=pageids`);
        const data = await response.json();
        const pageid = Object.keys(data.query.pages)[0];
        if (pageid) {
          await createOrExpandNode(nodeId, node.label, pageid);
          network.focus(nodeId, { scale: 1.5, animation: true });
        }
      } catch (error) {
        console.error("Error expanding node on click:", error);
      }
    }
  }
});

// -------------------------------
// 15. Graph Control Buttons
// -------------------------------
document.getElementById('zoom-in').addEventListener('click', () => {
  const currentScale = network.getScale();
  network.moveTo({ scale: currentScale * 1.2 });
});

document.getElementById('zoom-out').addEventListener('click', () => {
  const currentScale = network.getScale();
  network.moveTo({ scale: currentScale / 1.2 });
});

document.getElementById('clear-graph').addEventListener('click', () => {
  nodes.clear();
  edges.clear();
});
