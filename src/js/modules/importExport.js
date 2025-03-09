/**
 * importExport.js
 * 
 * Provides functionality to import and export the WikiGraph as JSON, CSV, or PNG.
 * This version aims to address issues with partial exports, odd coloring,
 * and missing node titles, as well as ensuring PNG exports include all nodes.
 */

// Example imports if needed (uncomment if your code references them):
// import { getPageIdByTitle } from './api.js'
// import { createCentralNode } from './graph.js'

export function initImportExport() {
  // Grab references to HTML elements in the modal
  const importExportToggle = document.getElementById('import-export-toggle')
  const modal = document.getElementById('import-export-modal')
  const closeModalBtn = document.getElementById('close-import-export-modal')
  
  // Tabs for switching between export and import views
  const exportTab = document.getElementById('export-tab')
  const importTab = document.getElementById('import-tab')
  const exportSection = document.getElementById('export-section')
  const importSection = document.getElementById('import-section')
  
  // Export buttons for JSON, CSV, and PNG
  const exportJSONBtn = document.getElementById('export-json')
  const exportCSVBtn = document.getElementById('export-csv')
  const exportPNGBtn = document.getElementById('export-png')
  
  // Import-related elements
  const importFileInput = document.getElementById('import-file')
  const importGraphBtn = document.getElementById('import-graph')
  
  // Show the modal when the user clicks "Import/Export"
  importExportToggle.addEventListener('click', (e) => {
    e.preventDefault()
    modal.style.display = 'block'
  })
  
  // Close modal when user clicks the X
  closeModalBtn.addEventListener('click', () => {
    modal.style.display = 'none'
  })
  
  // Also close modal if user clicks outside its content
  window.addEventListener('click', (event) => {
    if (event.target === modal) {
      modal.style.display = 'none'
    }
  })
  
  // Switch tabs: Export vs. Import
  exportTab.addEventListener('click', () => {
    exportTab.classList.add('active')
    importTab.classList.remove('active')
    exportSection.style.display = 'block'
    importSection.style.display = 'none'
  })
  
  importTab.addEventListener('click', () => {
    importTab.classList.add('active')
    exportTab.classList.remove('active')
    importSection.style.display = 'block'
    exportSection.style.display = 'none'
  })
  
  // Attach event listeners for each export format
  exportJSONBtn.addEventListener('click', () => {
    exportGraphAsJSON()
    modal.style.display = 'none'
  })
  exportCSVBtn.addEventListener('click', () => {
    exportGraphAsCSV()
    modal.style.display = 'none'
  })
  exportPNGBtn.addEventListener('click', async () => {
    await exportGraphAsPNG()
    modal.style.display = 'none'
  })
  
  // Import button
  importGraphBtn.addEventListener('click', () => {
    const file = importFileInput.files[0]
    if (!file) {
      alert('Please select a file to import.')
      return
    }
    importGraphFromFile(file)
    modal.style.display = 'none'
  })
}

/**
 * Checks if the global graph is initialized and non-empty.
 * Returns true if ready for export, false otherwise.
 */
function canExportGraph() {
  if (!window.nodes || !window.edges) {
    alert('Graph is not initialized.')
    return false
  }
  const allNodes = window.nodes.get()
  if (!allNodes || allNodes.length === 0) {
    alert('Graph is empty. Please add nodes before exporting.')
    return false
  }
  return true
}

/**
 * Exports the current graph as JSON.
 * This preserves all node/edge data (including color).
 */
function exportGraphAsJSON() {
  // Check if the graph can be exported
  if (!canExportGraph()) return
  
  // Get node and edge data
  const nodesData = window.nodes.get()
  const edgesData = window.edges.get()
  
  // Prepare an object with both
  const data = { nodes: nodesData, edges: edgesData }
  
  // Convert to a JSON blob for download
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  triggerDownload(url, 'wikigraph.json')
}

/**
 * Exports the current graph as CSV.
 * Converts color objects to JSON strings for safe storage.
 */
function exportGraphAsCSV() {
  // Check if the graph can be exported
  if (!canExportGraph()) return
  
  const nodesData = window.nodes.get()
  const edgesData = window.edges.get()
  
  // Define columns we want to keep for nodes
  const nodeColumns = [
    'id',
    'label',
    'x',
    'y',
    'size',
    'color',
    'popularity',
    'linkCount',
    'parent',
    'computedColor'
  ]
  
  // Define columns for edges
  const edgeColumns = [
    'id',
    'from',
    'to',
    'label',
    'arrows',
    'color',
    'dashes',
    'width'
  ]
  
  // Start building the CSV content
  let csvContent = 'Nodes\n'
  csvContent += nodeColumns.join(',') + '\n'
  
  // Convert each node to a row in the CSV
  nodesData.forEach((node) => {
    const row = nodeColumns.map((col) => {
      let value = node[col] !== undefined ? node[col] : ''
      // Convert color objects to JSON strings
      if (col === 'color' && typeof value === 'object') {
        value = JSON.stringify(value)
      }
      return `"${value}"`
    }).join(',')
    csvContent += row + '\n'
  })
  
  // Separate the sections
  csvContent += '\nEdges\n'
  csvContent += edgeColumns.join(',') + '\n'
  
  // Convert each edge to a row in the CSV
  edgesData.forEach((edge) => {
    const row = edgeColumns.map((col) => {
      let value = edge[col] !== undefined ? edge[col] : ''
      // Convert color objects to JSON strings
      if (col === 'color' && typeof value === 'object') {
        value = JSON.stringify(value)
      }
      return `"${value}"`
    }).join(',')
    csvContent += row + '\n'
  })
  
  // Download the CSV file
  const blob = new Blob([csvContent], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  triggerDownload(url, 'wikigraph.csv')
}

/**
 * Exports the current graph as a PNG, ensuring the entire graph is visible.
 * This approach uses a fixed container size to reduce the chance of nodes
 * falling off the edges.
 */
async function exportGraphAsPNG() {
  // Check if the graph can be exported
  if (!canExportGraph()) return
  
  const container = document.getElementById('graph-container')
  if (!container) {
    alert('Graph container not found.')
    return
  }
  
  // Fit the graph so all nodes are in view
  window.network.fit({ animation: false })
  
  // Temporarily enlarge the container to avoid clipping large graphs
  const originalWidth = container.style.width
  const originalHeight = container.style.height
  
  // We set a larger, fixed size for capturing. Adjust if needed.
  container.style.width = '2000px'
  container.style.height = '2000px'
  window.network.redraw()
  
  // Wait briefly for the UI to settle (so the graph is fully rendered)
  await new Promise(resolve => setTimeout(resolve, 300))
  
  // Capture the container using html2canvas
  try {
    const canvas = await html2canvas(container, {
      backgroundColor: '#ffffff',  // White background
      useCORS: true
    })
    
    // Convert canvas to a Blob and trigger download
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob)
        triggerDownload(url, 'wikigraph.png')
      } else {
        console.error('Failed to create PNG blob.')
      }
    })
  } catch (error) {
    console.error('Error exporting graph as PNG:', error)
  } finally {
    // Restore original container dimensions
    container.style.width = originalWidth
    container.style.height = originalHeight
    window.network.redraw()
  }
}

/**
 * Triggers a file download from a blob URL.
 */
function triggerDownload(url, filename) {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Imports a file (JSON or CSV) and loads it into the global graph.
 */
function importGraphFromFile(file) {
  const reader = new FileReader()
  
  reader.onload = (event) => {
    const content = event.target.result
    if (file.name.toLowerCase().endsWith('.json')) {
      try {
        const data = JSON.parse(content)
        loadGraphData(data)
      } catch (err) {
        alert('Error parsing JSON file.')
        console.error(err)
      }
    } else if (file.name.toLowerCase().endsWith('.csv')) {
      try {
        const data = parseCSVGraph(content)
        loadGraphData(data)
      } catch (err) {
        alert('Error parsing CSV file.')
        console.error(err)
      }
    } else {
      alert('Unsupported file format. Please use .json or .csv.')
    }
  }
  
  reader.readAsText(file)
}

/**
 * Loads the node/edge data into the existing vis.js network.
 */
function loadGraphData(data) {
  if (!window.nodes || !window.edges) {
    alert('Graph is not initialized.')
    return
  }
  
  // Clear the current graph
  window.nodes.clear()
  window.edges.clear()
  
  // Load new nodes (parsing color if needed)
  if (data.nodes && Array.isArray(data.nodes)) {
    data.nodes.forEach((node) => {
      // If color is stored as a string of JSON, parse it
      if (typeof node.color === 'string') {
        try {
          node.color = JSON.parse(node.color)
        } catch (e) {
          console.warn('Could not parse node color as JSON:', node.color)
        }
      }
      window.nodes.add(node)
    })
  }
  
  // Load new edges (parsing color if needed)
  if (data.edges && Array.isArray(data.edges)) {
    data.edges.forEach((edge) => {
      if (typeof edge.color === 'string') {
        try {
          edge.color = JSON.parse(edge.color)
        } catch (e) {
          console.warn('Could not parse edge color as JSON:', edge.color)
        }
      }
      window.edges.add(edge)
    })
  }
  
  // Fit the view to the newly loaded graph
  if (window.network) {
    window.network.fit({ animation: { duration: 500, easingFunction: 'easeInOutQuad' } })
  }
}

/**
 * Parses CSV text into a data object with 'nodes' and 'edges' arrays.
 */
function parseCSVGraph(csvContent) {
  // Split lines, trim whitespace, and remove empties
  const lines = csvContent.split('\n').map(line => line.trim()).filter(line => line !== '')
  
  let section = null  // 'nodes' or 'edges'
  let headers = []
  
  const nodes = []
  const edges = []
  
  // Process each line
  for (const line of lines) {
    // Detect section
    if (line.toLowerCase() === 'nodes') {
      section = 'nodes'
      headers = []
      continue
    } else if (line.toLowerCase() === 'edges') {
      section = 'edges'
      headers = []
      continue
    }
    
    // If we don't have headers yet, this line is the header row
    if (headers.length === 0) {
      headers = line.split(',').map(h => h.trim())
      continue
    }
    
    // Otherwise, parse a data row
    const values = line.split(',').map(v => v.replace(/^"|"$/g, '').trim())
    const obj = {}
    headers.forEach((header, idx) => {
      obj[header] = values[idx] || ''
    })
    
    // Push into correct array
    if (section === 'nodes') {
      nodes.push(obj)
    } else if (section === 'edges') {
      edges.push(obj)
    }
  }
  
  return { nodes, edges }
}
