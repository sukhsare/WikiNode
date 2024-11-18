// Get the graph container
const container = document.getElementById('graph-container');

// Define nodes and edges
const nodes = new vis.DataSet([
  { id: 1, label: 'Node 1' },
  { id: 2, label: 'Node 2' },
  { id: 3, label: 'Node 3' }
]);

const edges = new vis.DataSet([
  { from: 1, to: 2 },
  { from: 2, to: 3 },
  { from: 3, to: 1 }
]);

// Create the network
const data = { nodes: nodes, edges: edges };
const options = {
  nodes: {
    shape: 'dot',
    size: 20,
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

// Search functionality
const searchBar = document.getElementById('search-bar');
const searchButton = document.getElementById('search-button');

searchButton.addEventListener('click', () => {
  const searchTerm = searchBar.value.toLowerCase();

  // Find the node with the matching label
  const matchingNode = nodes.get().find(node => node.label.toLowerCase() === searchTerm);

  if (matchingNode) {
    // Focus on the matching node
    network.focus(matchingNode.id, {
      scale: 1.5, // Zoom in
      animation: {
        duration: 500,
        easingFunction: 'easeInOutQuad',
      },
    });
  } else {
    alert('Node not found!');
  }
});
