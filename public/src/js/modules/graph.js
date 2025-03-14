import { getLinkCount, getAllLinks, getPageIdByTitle, getPageviews, fetchTrendingArticles, getRelatedArticles } from './api.js'
import { asyncPool } from './utils.js'
import { recordCommand } from './undoManager.js'

// global variables for our network stuff
let network
let nodes
let edges
let colourNodesEnabled = false
let centralNodeId = null  // id for our central node

// set to avoid expanding a node twice
const expandingNodes = new Set()

// popularity constants
const minPop = 3000
const maxPop = 10000000
const BOOST_FACTOR = 1.1
let trendingSet = new Set()

// a command class for undo/redo of node expansions or additions
class ExpandCommand {
  constructor(parentNodeId, addedNodes, addedEdges) {
    this.parentNodeId = parentNodeId
    this.addedNodes = addedNodes
    this.addedEdges = addedEdges
  }
  do() {
    window.nodes.add(this.addedNodes)
    window.edges.add(this.addedEdges)
    updateAllNodeSizes()  // make sure node sizes are recalculated on redo
  }
  undo() {
    const nodeIds = this.addedNodes.map(n => n.id)
    const edgeIds = this.addedEdges.map(e => e.id)
    window.nodes.remove(nodeIds)
    window.edges.remove(edgeIds)
  }
}

// fetch trending articles and store their titles in lowercase
async function setTrendingData() {
  try {
    const trending = await fetchTrendingArticles()
    if (trending && trending.length > 0) {
      trending.forEach(article => {
        trendingSet.add(article.article.toLowerCase())
      })
    }
  } catch (err) {
    console.error("error fetching trending articles", err)
  }
}

// use logarithmic scaling to normalize popularity value
function logNormalize(rawPopularity) {
  const value = Math.max(rawPopularity, minPop)
  const norm = (Math.log(value + 1) - Math.log(minPop + 1)) / (Math.log(maxPop + 1) - Math.log(minPop + 1))
  return Math.min(norm, 1)
}

// adjust popularity if the article is trending
function getEffectivePopularity(title, rawPopularity) {
  return trendingSet.has(title.toLowerCase()) ? rawPopularity * BOOST_FACTOR : rawPopularity
}

// calculates a node's color based on its popularity (using HSL)
export function getNodeColor(title, rawPopularity) {
  const effective = getEffectivePopularity(title, rawPopularity)
  const norm = logNormalize(effective)
  const hue = Math.round(240 + norm * 120)  // hue from 240 to 360
  return `hsl(${hue}, 70%, 50%)`
}

// update sizes (and computed color) for all nodes based on popularity
export function updateAllNodeSizes() {
  const allNodes = nodes.get()
  if (!allNodes.length) return
  const minSize = 12
  const maxSize = 30
  const centralOffset = 0.1
  allNodes.forEach(node => {
    const rawPop = node.popularity || node.linkCount
    let norm = logNormalize(getEffectivePopularity(node.label, rawPop))
    if (node.id === centralNodeId) {
      norm = Math.min(norm + centralOffset, 1)
    }
    const newSize = minSize + norm * (maxSize - minSize)
    nodes.update({ id: node.id, size: newSize })
    const compColor = getNodeColor(node.label, rawPop)
    nodes.update({ id: node.id, computedColor: compColor })
  })
}

// toggles colour nodes setting and then updates the theme
export function setColourNodesEnabled(enabled) {
  colourNodesEnabled = enabled
  updateGraphTheme()
}

// update colors of all nodes & edges based on theme & setting
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

// centers the graph view after a short delay
export function centerGraph() {
  if (network) {
    setTimeout(() => {
      network.fit({ animation: { duration: 500, easingFunction: 'easeInOutQuad' } })
    }, 500)
  }
}

// init the graph using vis.js, set up basic options and events
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
  // if alt key is held when clicking, handle cluster expand/collapse
  network.on("click", (params) => {
    if (params.nodes.length > 0 && params.event.srcEvent.altKey) {
      network.unselectAll()
      const clickedId = params.nodes[0]
      if (String(clickedId).startsWith("cluster-")) {
        network.openCluster(clickedId)
      } else {
        const clusterId = "cluster-" + clickedId
        const clusterNode = nodes.get(clusterId)
        if (clusterNode) {
          expandChildren(clickedId)
        } else {
          const children = nodes.get({ filter: n => n.parent === clickedId })
          if (children.length > 0) {
            collapseChildren(clickedId)
          }
        }
      }
      params.event.srcEvent.preventDefault()
      setTimeout(() => { network.redraw() }, 1000)
    }
  })
  window.network = network
  window.nodes = nodes
  window.edges = edges
  setTrendingData()
  return { network, nodes, edges }
}

// collapse all children nodes of a given parent into a cluster
export function collapseChildren(parentId) {
  if (!network) return
  const children = nodes.get({ filter: node => node.parent === parentId })
  if (children.length === 0) {
    console.warn("no children to collapse for node", parentId)
    return
  }
  network.cluster({
    joinCondition: function(childOpts) {
      return childOpts.parent === parentId
    },
    clusterNodeProperties: {
      id: "cluster-" + parentId,
      label: "Collapsed (" + children.length + ")"
    }
  })
  network.redraw()
}

// expand a cluster if it exists for a given parent
export function expandChildren(parentId) {
  if (!network) return
  const clusterId = "cluster-" + parentId
  const clusterNode = nodes.get(clusterId)
  if (clusterNode) {
    network.openCluster(clusterId)
    network.redraw()
  } else {
    console.warn("no collapsed cluster found for node", parentId)
  }
}

// expand a node (or create new nodes) based on related articles
//  always record undo command for expansion regardless of central node status.
export async function createOrExpandNode(nodeId, title, pageid) {
  if (expandingNodes.has(nodeId)) {
    console.warn("expansion already in progress for node", nodeId)
    return null
  }
  expandingNodes.add(nodeId)
  let command = null
  try {
    console.debug("expanding node for article", title)
    const relatedArticles = await getRelatedArticles(title, 20)
    console.debug("related articles returned", relatedArticles)
    if (!relatedArticles.length) {
      console.warn("no related articles found for", title)
      return null
    }
    NProgress.start()
    const totalItems = relatedArticles.length
    let progressCount = 0
    const progressCallback = () => { NProgress.set(++progressCount / totalItems) }
    
    let candidates = await asyncPool(8, relatedArticles, async article => {
      const popularity = await getPageviews(article.title)
      const linkCount = await getLinkCount(article.title)
      return { title: article.title, popularity, linkCount }
    }, progressCallback)
    
    const prunedCandidates = await pruneCandidates(candidates)
    console.debug("pruned candidate articles", prunedCandidates)
    
    // arrays to track new nodes and edges
    const addedNodes = []
    const addedEdges = []
    
    for (const candidate of prunedCandidates) {
      if (candidate.title.toLowerCase() === title.toLowerCase()) continue
      const existingNode = nodes.get({ filter: n => n.label.toLowerCase() === candidate.title.toLowerCase() })[0]
      if (existingNode) {
        if (candidate.popularity > existingNode.popularity) {
          nodes.update({ id: existingNode.id, popularity: candidate.popularity })
        }
        // avoid duplicate edges by checking both directions
        if (edges.get({ filter: e => (e.from === nodeId && e.to === existingNode.id) || (e.from === existingNode.id && e.to === nodeId) }).length === 0) {
          const newEdge = { from: nodeId, to: existingNode.id }
          edges.add(newEdge)
          addedEdges.push(newEdge)
        }
      } else {
        const nodeSize = Math.max(5, 20)
        const newColor = colourNodesEnabled 
          ? getNodeColor(candidate.title, candidate.popularity) 
          : (document.body.classList.contains("dark-mode") ? "#222" : "#fff")
        const newNodeId = nodes.length + 1
        const newNode = {
          id: newNodeId,
          label: candidate.title,
          size: nodeSize,
          popularity: candidate.popularity,
          linkCount: candidate.linkCount,
          parent: nodeId,
          color: document.body.classList.contains("dark-mode")
            ? { background: newColor, border: "#fff", highlight: { background: newColor, border: "#fff" }, hover: { background: newColor, border: "#fff" } }
            : { background: newColor, border: "#2C3E50", highlight: { background: newColor, border: "#2C3E50" }, hover: { background: newColor, border: "#2C3E50" } },
          font: { color: document.body.classList.contains("dark-mode") ? "#fff" : "#333" }
        }
        nodes.add(newNode)
        addedNodes.push(newNode)
        const newEdge = { from: nodeId, to: newNodeId }
        edges.add(newEdge)
        addedEdges.push(newEdge)
      }
    }
    
    updateAllNodeSizes()
    NProgress.done()
    
    // always record undo command if any nodes/edges were added
    if (addedNodes.length || addedEdges.length) {
      command = new ExpandCommand(nodeId, addedNodes, addedEdges)
      recordCommand(command)
    }
    
  } catch (err) {
    console.error("error during node expansion", err)
  } finally {
    expandingNodes.delete(nodeId)
  }
  return command
}

// create a central node for the searched article and expand it
export async function createCentralNode(title, pageid) {
  const existing = nodes.get({ filter: n => n.label.toLowerCase() === title.toLowerCase() })[0]
  if (existing) {
    network.focus(existing.id, { scale: 1.1, animation: { duration: 1500, easingFunction: 'easeInOutQuad' } })
    return
  }
  
  if (!pageid) {
    pageid = await getPageIdByTitle(title)
    if (!pageid) pageid = title
  }
  
  const count = await getLinkCount(title)
  const effectiveCount = count || 1
  const popularity = await getPageviews(title)
  const isDark = document.body.classList.contains("dark-mode")
  const defaultColor = isDark ? "#222" : "#fff"
  const computedColor = colourNodesEnabled ? getNodeColor(title, popularity || effectiveCount) : defaultColor
  const newId = nodes.length + 1
  
  centralNodeId = newId
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
  })
  
  // record an undo command for central node creation regardless of expansion
  const centralNode = nodes.get(newId)
  const centralCommand = new ExpandCommand(newId, [centralNode], [])
  recordCommand(centralCommand)
  
  // call expansion and record its undo command if any nodes/edges were added
  await createOrExpandNode(newId, title, pageid)
  
  updateAllNodeSizes()
  setTimeout(() => {
    network.fit({ animation: { duration: 2500, easingFunction: 'easeInOutQuad' } })
  }, 1000)
}

// helper function to prune candidate nodes based on their connectivity
async function pruneCandidates(candidates) {
  const enriched = await asyncPool(8, candidates, async candidate => {
    candidate.normalizedTitle = candidate.title.toLowerCase()
    candidate.linkCount = candidate.linkCount || await getLinkCount(candidate.title)
    const pageid = await getPageIdByTitle(candidate.title)
    candidate.pageid = pageid
    const links = await getAllLinks(pageid)
    candidate.allLinkTitles = links.map(l => l.title.toLowerCase())
    return candidate
  })
  const candidateSet = enriched
  for (const candidate of candidateSet) {
    const neighbors = candidateSet.filter(c =>
      c.normalizedTitle !== candidate.normalizedTitle &&
      (candidate.allLinkTitles.includes(c.normalizedTitle) ||
       (c.allLinkTitles && c.allLinkTitles.includes(candidate.normalizedTitle)))
    )
    candidate.candidateDegree = neighbors.length
    let neighborEdges = 0
    for (let i = 0; i < neighbors.length; i++) {
      for (let j = i + 1; j < neighbors.length; j++) {
        const ni = neighbors[i]
        const nj = neighbors[j]
        if (ni.allLinkTitles.includes(nj.normalizedTitle) || nj.allLinkTitles.includes(ni.normalizedTitle)) {
          neighborEdges++
        }
      }
    }
    candidate.LCC = candidate.candidateDegree < 2 ? 0 : neighborEdges / (candidate.candidateDegree * (candidate.candidateDegree - 1) / 2)
  }
  const degrees = candidateSet.map(c => c.candidateDegree)
  const lccs = candidateSet.map(c => c.LCC)
  const minDegree = Math.min(...degrees)
  const maxDegree = Math.max(...degrees)
  const minLCC = Math.min(...lccs)
  const maxLCC = Math.max(...lccs)
  candidateSet.forEach(candidate => {
    candidate.normDegree = maxDegree > minDegree ? (candidate.candidateDegree - minDegree) / (maxDegree - minDegree) : 0
    candidate.normLCC = maxLCC > minLCC ? (candidate.LCC - minLCC) / (maxLCC - minLCC) : 0
    candidate.score = candidate.normDegree - candidate.normLCC
  })
  candidateSet.sort((a, b) => b.score - a.score)
  return candidateSet.slice(0, 10)
}