import { getLinkCount, getAllLinks, getPageIdByTitle, getPageviews, fetchTrendingArticles, getRelatedArticles } from './api.js'
import { asyncPool } from './utils.js'

let network
let nodes
let edges
let colourNodesEnabled = false
let centralNodeId = null  // holds id of our central node

const minPop = 3000
const maxPop = 10000000
const BOOST_FACTOR = 1.1
let trendingSet = new Set()

// Set trending data by fetching trending articles and storing their titles in lowercase
async function setTrendingData() {
  try {
    const trending = await fetchTrendingArticles()
    if (trending && trending.length > 0) {
      trending.forEach(article => {
        trendingSet.add(article.article.toLowerCase())
      })
    }
  } catch (error) {
    console.error("error fetching trending articles", error)
  }
}

// Logarithmic normalization for scaling popularity
function logNormalize(rawPopularity) {
  const value = Math.max(rawPopularity, minPop)
  const normalized = (Math.log(value + 1) - Math.log(minPop + 1)) / (Math.log(maxPop + 1) - Math.log(minPop + 1))
  return Math.min(normalized, 1)
}

// If the article is trending, apply a boost factor
function getEffectivePopularity(title, rawPopularity) {
  return trendingSet.has(title.toLowerCase()) ? rawPopularity * BOOST_FACTOR : rawPopularity
}

// Compute node color based on effective popularity using a hue gradient
export function getNodeColor(title, rawPopularity) {
  const effectivePopularity = getEffectivePopularity(title, rawPopularity)
  const normalized = logNormalize(effectivePopularity)
  const hue = Math.round(240 + normalized * 120)
  return `hsl(${hue}, 70%, 50%)`
}

// Update all node sizes based on popularity and update computed color
export function updateAllNodeSizes() {
  const allNodes = nodes.get()
  if (!allNodes.length) return

  const minSize = 12
  const maxSize = 30
  const centralOffset = 0.1

  allNodes.forEach(node => {
    const rawPopularity = node.popularity || node.linkCount
    let normalized = logNormalize(getEffectivePopularity(node.label, rawPopularity))
    if (node.id === centralNodeId) {
      normalized = Math.min(normalized + centralOffset, 1)
    }
    const newSize = minSize + normalized * (maxSize - minSize)
    nodes.update({ id: node.id, size: newSize })

    const computedColor = getNodeColor(node.label, rawPopularity)
    nodes.update({ id: node.id, computedColor })
  })
}

// Toggle node color mode
export function setColourNodesEnabled(enabled) {
  colourNodesEnabled = enabled
  updateGraphTheme()
}

// Update the graph theme based on dark mode setting and node computed color
export function updateGraphTheme() {
  const isDark = document.body.classList.contains("dark-mode")
  nodes.forEach(node => {
    let newColor
    if (colourNodesEnabled) {
      newColor = node.computedColor || getNodeColor(node.label, node.popularity || node.linkCount)
    } else {
      newColor = isDark ? "#222" : "#fff"
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
    })
  })
  if (network) {
    network.setOptions({
      nodes: { font: { color: document.body.classList.contains("dark-mode") ? "#fff" : "#333" } },
      edges: { color: document.body.classList.contains("dark-mode") ? "#fff" : "#2C3E50" }
    })
    network.redraw()
  }
}

// Center the graph with an animation
export function centerGraph() {
  if (network) {
    setTimeout(() => {
      network.fit({ animation: { duration: 500, easingFunction: 'easeInOutQuad' } })
    }, 500)
  }
}

// Initialize the vis network graph with nodes, edges, and event listeners
export function initGraph(container, isDarkMode) {
  nodes = new vis.DataSet([])
  edges = new vis.DataSet([])
  const data = { nodes, edges }

  const options = {
    nodes: {
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
      hover: true
    }
  }

  network = new vis.Network(container, data, options)
  network.once("stabilizationIterationsDone", () => {
    network.fit({ animation: false })
    centerGraph()
  })

  // --- ALT-CLICK TO TOGGLE COLLAPSE/EXPAND ---
  network.on("click", (params) => {
    if (params.nodes.length > 0 && params.event.srcEvent.altKey) {
      // Clear selection immediately to remove outline.
      network.unselectAll();
      const clickedId = params.nodes[0];
      // If the clicked node is a cluster node, open it.
      if (String(clickedId).startsWith("cluster-")) {
        network.openCluster(clickedId);
      } else {
        const clusterId = "cluster-" + clickedId;
        const clusterNode = nodes.get(clusterId);
        if (clusterNode) {
          expandChildren(clickedId);
        } else {
          const children = nodes.get({ filter: n => n.parent === clickedId });
          if (children.length > 0) {
            collapseChildren(clickedId);
          }
        }
      }
      params.event.srcEvent.preventDefault();
      setTimeout(() => { network.redraw(); }, 1000);
    }
  });
  // --- END ALT-CLICK LISTENER ---

  window.network = network
  window.nodes = nodes
  window.edges = edges
  setTrendingData()
  return { network, nodes, edges }
}

// Collapse the children of a node into a cluster
export function collapseChildren(parentId) {
  if (!network) return;
  const children = nodes.get({ filter: node => node.parent === parentId });
  if (children.length === 0) {
    console.warn("No children to collapse for node", parentId);
    return;
  }
  network.cluster({
    joinCondition: function(childOptions) {
      return childOptions.parent === parentId;
    },
    clusterNodeProperties: {
      id: "cluster-" + parentId,
      label: "Collapsed (" + children.length + ")"
    }
  });
  network.redraw();
}

// Expand a collapsed cluster of children for a node
export function expandChildren(parentId) {
  if (!network) return;
  const clusterId = "cluster-" + parentId;
  const clusterNode = nodes.get(clusterId);
  if (clusterNode) {
    network.openCluster(clusterId);
    network.redraw();
  } else {
    console.warn("No collapsed cluster found for node", parentId);
  }
}

// Modify createOrExpandNode to add a 'parent' property to child nodes
export async function createOrExpandNode(nodeId, title, pageid) {
  try {
    console.debug("expanding node for article", title);
    const relatedArticles = await getRelatedArticles(title, 20);
    console.debug("related articles returned", relatedArticles);
    if (!relatedArticles.length) {
      console.warn("no related articles found for", title);
      return;
    }
    
    NProgress.start();
    const totalItems = relatedArticles.length;
    let progressCount = 0;
    const progressCallback = () => { NProgress.set(++progressCount / totalItems); }
    
    let candidates = await asyncPool(8, relatedArticles, async article => {
      const popularity = await getPageviews(article.title);
      const linkCount = await getLinkCount(article.title);
      return { title: article.title, popularity, linkCount };
    }, progressCallback);
    
    const prunedCandidates = await pruneCandidates(candidates);
    console.debug("pruned candidate articles", prunedCandidates);
    
    for (const candidate of prunedCandidates) {
      if (candidate.title.toLowerCase() === title.toLowerCase()) continue;
      const existingNode = nodes.get({ filter: node => node.label.toLowerCase() === candidate.title.toLowerCase() })[0];
      if (existingNode) {
        if (candidate.popularity > existingNode.popularity) {
          nodes.update({ id: existingNode.id, popularity: candidate.popularity });
        }
        if (edges.get({ filter: e => e.from === nodeId && e.to === existingNode.id }).length === 0) {
          edges.add({ from: nodeId, to: existingNode.id });
        }
      } else {
        const nodeSize = Math.max(5, 20);
        const newColor = colourNodesEnabled ? getNodeColor(candidate.title, candidate.popularity) : (document.body.classList.contains("dark-mode") ? "#222" : "#fff");
        const newNodeId = nodes.length + 1;
        nodes.add({
          id: newNodeId,
          label: candidate.title,
          size: nodeSize,
          popularity: candidate.popularity,
          linkCount: candidate.linkCount,
          parent: nodeId,  // new property for collapse/expand
          color: document.body.classList.contains("dark-mode")
            ? { background: newColor, border: "#fff", highlight: { background: newColor, border: "#fff" }, hover: { background: newColor, border: "#fff" } }
            : { background: newColor, border: "#2C3E50", highlight: { background: newColor, border: "#2C3E50" }, hover: { background: newColor, border: "#2C3E50" } },
          font: { color: document.body.classList.contains("dark-mode") ? "#fff" : "#333" }
        });
        // Check if the edge already exists before adding.
        if (edges.get({ filter: e => e.from === nodeId && e.to === newNodeId }).length === 0) {
          edges.add({ from: nodeId, to: newNodeId });
        }
      }
    }
    
    updateAllNodeSizes();
    NProgress.done();
  } catch (error) {
    console.error("error during node expansion", error);
  }
}

// Create the central node if it doesn't exist, else zoom in on it
export async function createCentralNode(title, pageid) {
  const existing = nodes.get({ filter: node => node.label.toLowerCase() === title.toLowerCase() })[0];
  if (existing) {
    network.focus(existing.id, { scale: 1.1, animation: { duration: 1500, easingFunction: 'easeInOutQuad' } });
    return;
  }
  
  if (!pageid) {
    pageid = await getPageIdByTitle(title);
    if (!pageid) pageid = title;
  }
  
  const count = await getLinkCount(title);
  const effectiveCount = count || 1;
  const popularity = await getPageviews(title);
  const isDark = document.body.classList.contains("dark-mode");
  const defaultColor = isDark ? "#222" : "#fff";
  const computedColor = colourNodesEnabled ? getNodeColor(title, popularity || effectiveCount) : defaultColor;
  const newId = nodes.length + 1;
  
  centralNodeId = newId;
  nodes.add({
    id: newId,
    label: title,
    size: 30,
    linkCount: effectiveCount,
    popularity,
    computedColor,
    color: isDark
      ? { background: computedColor, border: "#fff", highlight: { background: computedColor, border: "#fff" }, hover: { background: computedColor, border: "#fff" } }
      : { background: computedColor, border: "#2C3E50", highlight: { background: computedColor, border: "#2C3E50" }, hover: { background: computedColor, border: "#2C3E50" } },
    font: { color: isDark ? "#fff" : "#333" }
  });
  
  await createOrExpandNode(newId, title, pageid);
  updateAllNodeSizes();
  setTimeout(() => {
    network.fit({ animation: { duration: 2500, easingFunction: 'easeInOutQuad' } });
  }, 1000);
}

// Helper function to prune candidate articles (unchanged from your original implementation)
async function pruneCandidates(candidates) {
  const enriched = await asyncPool(8, candidates, async candidate => {
    candidate.normalizedTitle = candidate.title.toLowerCase();
    candidate.linkCount = candidate.linkCount || await getLinkCount(candidate.title);
    const pageid = await getPageIdByTitle(candidate.title);
    candidate.pageid = pageid;
    const links = await getAllLinks(pageid);
    candidate.allLinkTitles = links.map(l => l.title.toLowerCase());
    return candidate;
  });

  const candidateSet = enriched;

  for (const candidate of candidateSet) {
    const neighbors = candidateSet.filter(c =>
      c.normalizedTitle !== candidate.normalizedTitle &&
      (candidate.allLinkTitles.includes(c.normalizedTitle) ||
       (c.allLinkTitles && c.allLinkTitles.includes(candidate.normalizedTitle)))
    );
    candidate.candidateDegree = neighbors.length;
    let neighborEdges = 0;
    for (let i = 0; i < neighbors.length; i++) {
      for (let j = i + 1; j < neighbors.length; j++) {
        const ni = neighbors[i];
        const nj = neighbors[j];
        if (ni.allLinkTitles.includes(nj.normalizedTitle) || nj.allLinkTitles.includes(ni.normalizedTitle)) {
          neighborEdges++;
        }
      }
    }
    candidate.LCC = candidate.candidateDegree < 2 ? 0 : neighborEdges / (candidate.candidateDegree * (candidate.candidateDegree - 1) / 2);
  }

  const degrees = candidateSet.map(c => c.candidateDegree);
  const lccs = candidateSet.map(c => c.LCC);
  const minDegree = Math.min(...degrees);
  const maxDegree = Math.max(...degrees);
  const minLCC = Math.min(...lccs);
  const maxLCC = Math.max(...lccs);

  candidateSet.forEach(candidate => {
    candidate.normDegree = maxDegree > minDegree ? (candidate.candidateDegree - minDegree) / (maxDegree - minDegree) : 0;
    candidate.normLCC = maxLCC > minLCC ? (candidate.LCC - minLCC) / (maxLCC - minLCC) : 0;
    candidate.score = candidate.normDegree - candidate.normLCC;
  });

  candidateSet.sort((a, b) => b.score - a.score);
  return candidateSet.slice(0, 10);
}
