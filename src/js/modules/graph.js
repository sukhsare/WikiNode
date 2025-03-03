// FINAL PROJECT/src/js/modules/graph.js
import { getPageviews, getAllLinks, getPageIdByTitle } from './api.js';
import { asyncPool } from './utils.js';

// Global variables for the graph and our data sets
let network;
let nodes;
let edges;
let colourNodesEnabled = false;

export function initGraph(container, isDarkMode) {
  nodes = new vis.DataSet([]);
  edges = new vis.DataSet([]);
  const data = { nodes, edges };

  const options = {
    nodes: {
      // Subtle hover and highlight colors for a cohesive look
      color: {
        background: isDarkMode ? "#222" : "#fff",
        border: isDarkMode ? "#fff" : "#2C3E50",
        highlight: {
          background: isDarkMode ? "#444" : "#f0f0f0",
          border: isDarkMode ? "#fff" : "#2C3E50"
        },
        hover: {
          background: isDarkMode ? "#444" : "#f0f0f0",
          border: isDarkMode ? "#fff" : "#2C3E50"
        }
      },
      font: { color: isDarkMode ? "#fff" : "#333" },
      shape: "dot"
    },
    edges: { color: isDarkMode ? "#fff" : "#2C3E50", width: 2 },
    physics: { enabled: true },
    interaction: {
      dragNodes: true,
      dragView: true,
      selectable: true,
      hover: true // Enable hover events
    }
  };

  network = new vis.Network(container, data, options);
  network.once("stabilizationIterationsDone", () => {
    setTimeout(() => {
      network.fit({ animation: false });
    }, 1000);
  });

  window.network = network;
  window.nodes = nodes;
  window.edges = edges;
  return { network, nodes, edges };
}

export function setColourNodesEnabled(enabled) {
  colourNodesEnabled = enabled;
  updateGraphTheme();
}

export function updateGraphTheme() {
  const isDark = document.body.classList.contains("dark-mode");
  nodes.forEach(node => {
    let newColor;
    if (colourNodesEnabled) {
      newColor = node.computedColor || getNodeColor(node.pageviews, node.maxPageviews || node.pageviews);
    } else {
      newColor = isDark ? "#222" : "#fff";
    }
    nodes.update({
      id: node.id,
      color: {
        background: newColor,
        border: isDark ? "#fff" : "#2C3E50",
        highlight: { background: newColor, border: isDark ? "#fff" : "#2C3E50" },
        hover: { background: newColor, border: isDark ? "#fff" : "#2C3E50" }
      },
      font: { color: isDark ? "#fff" : "#333" }
    });
  });
  if (network) {
    network.setOptions({
      nodes: { font: { color: document.body.classList.contains("dark-mode") ? "#fff" : "#333" } },
      edges: { color: document.body.classList.contains("dark-mode") ? "#fff" : "#2C3E50" }
    });
    network.redraw();
  }
}

export function getNodeColor(views, maxViews) {
  let normalized = views / maxViews;
  normalized = Math.round(Math.min(Math.max(normalized, 0), 1) * 100) / 100;
  const hue = Math.round(240 + normalized * 120); // from blue (240) to red (360)
  return `hsl(${hue}, 70%, 50%)`;
}

export function updateAllNodeSizes() {
  const allNodes = nodes.get();
  if (!allNodes.length) return;
  const globalMax = Math.max(...allNodes.map(n => n.pageviews));
  const minSize = 12;  // Adjusted min size
  const maxSize = 30;  // Adjusted max size to reduce overlap
  allNodes.forEach(node => {
    const newSize = minSize + (node.pageviews / globalMax) * (maxSize - minSize);
    nodes.update({ id: node.id, size: newSize });
    const computedColor = getNodeColor(node.pageviews, globalMax);
    nodes.update({ id: node.id, computedColor });
    nodes.update({ id: node.id, maxPageviews: globalMax });
  });
}

export async function createCentralNode(title, pageid) {
  const existing = nodes.get({ filter: node => node.label === title })[0];
  if (existing) return;
  if (!pageid) {
    pageid = await getPageIdByTitle(title);
    if (!pageid) pageid = title;
  }
  const views = await getPageviews(title);
  const effectiveViews = views || 1;
  const isDark = document.body.classList.contains("dark-mode");
  const defaultColor = isDark ? "#222" : "#fff";
  const computedColor = colourNodesEnabled ? getNodeColor(effectiveViews, effectiveViews) : defaultColor;
  const newId = nodes.length + 1;
  nodes.add({
    id: newId,
    label: title,
    size: 30,
    pageviews: effectiveViews,
    maxPageviews: effectiveViews,
    computedColor,
    color: isDark
      ? { background: computedColor, border: "#fff", highlight: { background: computedColor, border: "#fff" }, hover: { background: computedColor, border: "#fff" } }
      : { background: computedColor, border: "#2C3E50", highlight: { background: computedColor, border: "#2C3E50" }, hover: { background: computedColor, border: "#2C3E50" } },
    font: { color: isDark ? "#fff" : "#333" }
  });
  await createOrExpandNode(newId, title, pageid);
  addClusteringCoefficients();
  updateAllNodeSizes();
  network.fit({ animation: { duration: 500, easingFunction: "easeInOutQuad" } });
}

export async function createOrExpandNode(nodeId, title, pageid) {
  try {
    const links = await getAllLinks(pageid);
    if (!links.length) {
      console.warn("no linked articles found");
      return;
    }
    
    NProgress.start();
    const totalItems = links.length;
    let progressCount = 0;
    const progressCallback = () => { NProgress.set(++progressCount / totalItems); };
    
    // Get pageviews for each link (limit to 10 concurrent requests)
    let rankedLinks = await asyncPool(10, links, async link => {
      const views = await getPageviews(link.title);
      return { title: link.title, views };
    }, progressCallback);
    
    NProgress.done();
    
    // Filter out unwanted pages
    rankedLinks = rankedLinks.filter(link => {
      const lower = link.title.toLowerCase();
      return !lower.includes("citation needed") &&
             !lower.startsWith("help:") &&
             !lower.startsWith("special:") &&
             !lower.startsWith("user:") &&
             !lower.startsWith("wikipedia:") &&
             !lower.startsWith("category:") &&
             !lower.startsWith("template:") &&
             !lower.includes("isbn") &&
             !lower.includes("template talk:");
    });
    // Remove links with zero views and sort by views (highest first)
    rankedLinks = rankedLinks.filter(link => link.views > 0);
    rankedLinks.sort((a, b) => b.views - a.views);
    
    // For the first layer, select top candidates (e.g., top 10)
    const linksToAdd = rankedLinks.slice(0, 10);
    
    linksToAdd.forEach(link => {
      const existingNode = nodes.get({ filter: node => node.label === link.title })[0];
      if (existingNode) {
        if (link.views > existingNode.pageviews) {
          nodes.update({ id: existingNode.id, pageviews: link.views });
        }
        if (!edges.get({ filter: edge => edge.from === nodeId && edge.to === existingNode.id }).length) {
          edges.add({ from: nodeId, to: existingNode.id });
        }
      } else {
        const nodeSize = Math.max(5, 20);
        const newColor = colourNodesEnabled 
          ? getNodeColor(link.views, link.views)
          : (document.body.classList.contains("dark-mode") ? "#222" : "#fff");
        const newNodeId = nodes.length + 1;
        nodes.add({
          id: newNodeId,
          label: link.title,
          size: nodeSize,
          pageviews: link.views,
          maxPageviews: link.views,
          computedColor: colourNodesEnabled ? newColor : undefined,
          color: document.body.classList.contains("dark-mode")
            ? { background: newColor, border: "#fff", highlight: { background: newColor, border: "#fff" }, hover: { background: newColor, border: "#fff" } }
            : { background: newColor, border: "#2C3E50", highlight: { background: newColor, border: "#2C3E50" }, hover: { background: newColor, border: "#2C3E50" } },
          font: { color: document.body.classList.contains("dark-mode") ? "#fff" : "#333" }
        });
        edges.add({ from: nodeId, to: newNodeId });
      }
    });
    
    addClusteringCoefficients();
    updateAllNodeSizes();
    
    const idealNodes = filterFirstLayerNodesByLCC(nodeId, 0.3, 0.5);
    console.log("Ideal first-layer nodes for further expansion:", idealNodes);
    
  } catch (error) {
    console.error("error during node expansion:", error);
  }
}

function addClusteringCoefficients() {
  nodes.forEach(node => {
    const coeff = computeLocalClusteringCoefficient(node.id);
    nodes.update({ id: node.id, clusteringCoefficient: coeff });
    console.log(`node "${node.label}" (id: ${node.id}) clustering coeff: ${coeff.toFixed(2)}`);
  });
}

function computeLocalClusteringCoefficient(nodeId) {
  const neighbourIds = new Set();
  edges.forEach(edge => {
    if (edge.from === nodeId) neighbourIds.add(edge.to);
    if (edge.to === nodeId) neighbourIds.add(edge.from);
  });
  const neighbours = Array.from(neighbourIds);
  const k = neighbours.length;
  if (k < 2) return 0;
  let linksBetween = 0;
  for (let i = 0; i < neighbours.length; i++) {
    for (let j = i + 1; j < neighbours.length; j++) {
      const conns = edges.get({
        filter: edge =>
          (edge.from === neighbours[i] && edge.to === neighbours[j]) ||
          (edge.from === neighbours[j] && edge.to === neighbours[i])
      });
      if (conns.length > 0) linksBetween++;
    }
  }
  const possible = (k * (k - 1)) / 2;
  return possible ? linksBetween / possible : 0;
}

export function filterFirstLayerNodesByLCC(centralNodeId, idealMin = 0.3, idealMax = 0.5) {
  let firstLayerNodeIds = edges.get({
    filter: edge => edge.from === centralNodeId || edge.to === centralNodeId
  }).map(edge => (edge.from === centralNodeId ? edge.to : edge.from));
  firstLayerNodeIds = [...new Set(firstLayerNodeIds)];
  const nodesToExpand = [];
  firstLayerNodeIds.forEach(nodeId => {
    const node = nodes.get(nodeId);
    if (node && node.clusteringCoefficient !== undefined &&
        node.clusteringCoefficient >= idealMin && node.clusteringCoefficient <= idealMax) {
      nodesToExpand.push(node);
    }
  });
  return nodesToExpand;
}
