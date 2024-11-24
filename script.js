// Wikipedia API URLs
const SEARCH_API_URL = "https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*";
const LINKS_API_URL = `${SEARCH_API_URL}&prop=links&pllimit=max`; // Fetch links
const PAGEVIEWS_API_URL = `${SEARCH_API_URL}&prop=pageviews`;

// Get elements
const searchBar = document.getElementById('search-bar');
const suggestionsContainer = document.getElementById('suggestions');
const container = document.getElementById('graph-container');

// Initialize graph data
const nodes = new vis.DataSet([]);
const edges = new vis.DataSet([]);
const data = { nodes, edges };
const options = {
  nodes: {
    shape: 'dot',
    font: { size: 15 },
    borderWidth: 2,
  },
  edges: {
    width: 2,
  },
  physics: {
    enabled: true,
  },
};
const network = new vis.Network(container, data, options);

// Search for suggestions
searchBar.addEventListener('input', async () => {
  const query = searchBar.value.trim();

  if (query.length === 0) {
    suggestionsContainer.innerHTML = '';
    return;
  }

  try {
    const response = await fetch(`${SEARCH_API_URL}&list=search&srsearch=${encodeURIComponent(query)}`);
    const data = await response.json();

    const suggestions = data.query.search.map(item => ({
      title: item.title,
      pageid: item.pageid,
    }));

    // Clear old suggestions
    suggestionsContainer.innerHTML = '';

    // Populate suggestions
    suggestions.forEach(suggestion => {
      const li = document.createElement('li');
      li.textContent = suggestion.title;
      li.dataset.pageid = suggestion.pageid;
      suggestionsContainer.appendChild(li);
    });

    // Add click event to suggestions
    Array.from(suggestionsContainer.children).forEach(li => {
      li.addEventListener('click', () => {
        const title = li.textContent;
        const pageid = li.dataset.pageid;

        // Create a central node
        createCentralNode(title, pageid);

        // Clear search bar and suggestions
        searchBar.value = '';
        suggestionsContainer.innerHTML = '';
      });
    });
  } catch (error) {
    console.error('Error fetching Wikipedia suggestions:', error);
  }
});

// Create central node and linked nodes
async function createCentralNode(title, pageid) {
  const centralNodeId = nodes.length + 1;

  // Add the central node
  nodes.add({ id: centralNodeId, label: title, size: 30 }); // Central node is larger

  // Center and zoom in on the newly created node
  network.fit({ nodes: [centralNodeId], animation: true });

  try {
    // Fetch linked articles
    const response = await fetch(`${LINKS_API_URL}&pageids=${pageid}`);
    const data = await response.json();

    const links = data.query.pages[pageid]?.links || [];
    if (!links.length) {
      console.warn("No linked articles found for this page.");
      return;
    }

    // Process links for ranking by pageviews
    const BATCH_SIZE = 50;
    const batches = [];
    for (let i = 0; i < links.length; i += BATCH_SIZE) {
      batches.push(links.slice(i, i + BATCH_SIZE));
    }

    const rankedLinks = [];
    for (const batch of batches) {
      const titles = batch.map(link => encodeURIComponent(link.title)).join('|');
      const pageviewsResponse = await fetch(`${PAGEVIEWS_API_URL}&titles=${titles}`);
      const pageviewsData = await pageviewsResponse.json();

      const batchPageviews = Object.values(pageviewsData.query.pages).map(page => ({
        title: page.title,
        pageviews: Object.values(page.pageviews || {}).reduce((a, b) => a + b, 0),
      }));

      rankedLinks.push(...batchPageviews);
    }

    const topLinks = rankedLinks.sort((a, b) => b.pageviews - a.pageviews).slice(0, 10);
    const maxPageviews = Math.max(...topLinks.map(link => link.pageviews)) || 1;

    topLinks.forEach((link, index) => {
      const linkedNodeId = centralNodeId * 100 + index;
      const relativeSize = (link.pageviews / maxPageviews) * 20;
      const nodeSize = Math.max(5, relativeSize);

      nodes.add({ id: linkedNodeId, label: link.title, size: nodeSize });
      edges.add({ from: centralNodeId, to: linkedNodeId });
    });
  } catch (error) {
    console.error('Error fetching linked articles or pageviews:', error);
  }
}

// Expand a node on click
network.on('click', params => {
  if (params.nodes.length > 0) {
    const nodeId = params.nodes[0];
    const node = nodes.get(nodeId);

    if (node && node.label) {
      // Expand the clicked node by fetching its related articles
      const title = node.label;
      fetch(`${SEARCH_API_URL}&titles=${encodeURIComponent(title)}&prop=pageids`)
        .then(response => response.json())
        .then(data => {
          const pageid = Object.keys(data.query.pages)[0];
          if (pageid) {
            createCentralNode(title, pageid); // Use the createCentralNode function
            network.focus(nodeId, { scale: 1.5, animation: true }); // Focus and zoom in
          }
        })
        .catch(error => console.error('Error expanding node:', error));
    }
  }
});
