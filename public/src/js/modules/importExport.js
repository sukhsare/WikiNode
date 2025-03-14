import { getPageIdByTitle } from './api.js'
import { createCentralNode } from './graph.js'

// setup import/export modal stuff
export function initImportExport() {
  // get the elements for toggling the modal and for the modal itself
  const toggleLink = document.getElementById('import-export-toggle')
  const modal = document.getElementById('import-export-modal')
  const closeBtn = document.getElementById('close-import-export-modal')
  
  // get the tab buttons and the two sections for export and import
  const exportTab = document.getElementById('export-tab')
  const importTab = document.getElementById('import-tab')
  const exportSection = document.getElementById('export-section')
  const importSection = document.getElementById('import-section')
  
  // get the buttons for exporting data
  const exportJSONBtn = document.getElementById('export-json')
  const exportCSVBtn = document.getElementById('export-csv')
  const exportPNGBtn = document.getElementById('export-png')
  
  // elements for importing a file
  const importFileInput = document.getElementById('import-file')
  const importGraphBtn = document.getElementById('import-graph')
  
  // show modal when toggle link is clicked
  toggleLink.addEventListener('click', (e) => {
    e.preventDefault()
    modal.style.display = 'block'
  })
  
  // close modal when close btn is clicked
  closeBtn.addEventListener('click', () => {
    modal.style.display = 'none'
  })
  
  // if user clicks outside the modal, hide it
  window.addEventListener('click', (event) => {
    if (event.target == modal) {
      modal.style.display = 'none'
    }
  })
  
  // switch tabs - export tab
  exportTab.addEventListener('click', () => {
    exportTab.classList.add('active')
    importTab.classList.remove('active')
    exportSection.style.display = 'block'
    importSection.style.display = 'none'
  })
  
  // switch tabs - import tab
  importTab.addEventListener('click', () => {
    importTab.classList.add('active')
    exportTab.classList.remove('active')
    importSection.style.display = 'block'
    exportSection.style.display = 'none'
  })
  
  // export actions
  exportJSONBtn.addEventListener('click', () => {
    exportGraphAsJSON()
    modal.style.display = 'none'
  })
  
  exportCSVBtn.addEventListener('click', () => {
    exportGraphAsCSV()
    modal.style.display = 'none'
  })
  
  exportPNGBtn.addEventListener('click', () => {
    exportGraphAsPNG()
    modal.style.display = 'none'
  })
  
  // import action
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

// --- EXPORT FUNCTIONS ---

// export graph data as JSON file
function exportGraphAsJSON() {
  const nodesData = window.nodes ? window.nodes.get() : []
  const edgesData = window.edges ? window.edges.get() : []
  const data = { nodes: nodesData, edges: edgesData }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  triggerDownload(url, 'wikinode.json')
}

// export graph data as CSV file
function exportGraphAsCSV() {
  const nodesData = window.nodes ? window.nodes.get() : []
  const edgesData = window.edges ? window.edges.get() : []
  let csvContent = ''
  
  // fixed keys for nodes we want to export
  const nodeKeys = ['id', 'label', 'size', 'linkCount', 'popularity', 'parent']
  csvContent += 'Nodes\n'
  csvContent += nodeKeys.join(',') + '\n'
  nodesData.forEach(node => {
    const row = nodeKeys.map(key => {
      let value = node[key]
      if (value === undefined || value === null) {
        value = ''
      }
      return `"${value}"`
    }).join(',')
    csvContent += row + '\n'
  })
  
  csvContent += '\nEdges\n'
  // fixed keys for edges
  const edgeKeys = ['from', 'to']
  csvContent += edgeKeys.join(',') + '\n'
  edgesData.forEach(edge => {
    const row = edgeKeys.map(key => {
      let value = edge[key]
      if (value === undefined || value === null) {
        value = ''
      }
      return `"${value}"`
    }).join(',')
    csvContent += row + '\n'
  })
  
  const blob = new Blob([csvContent], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  triggerDownload(url, 'wikinode.csv')
}

// export graph as a PNG using html2canvas
function exportGraphAsPNG() {
  const container = document.getElementById('graph-container')
  if (!container) {
    alert('Graph container not found.')
    return
  }
  html2canvas(container)
    .then(canvas => {
      canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob)
        triggerDownload(url, 'wikinode.png')
      })
    })
    .catch(error => {
      console.error('Error exporting graph as PNG:', error)
    })
}

// helper to trigger file download
function triggerDownload(url, filename) {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// --- IMPORT FUNCTIONS ---

// import graph data from a file
function importGraphFromFile(file) {
  const reader = new FileReader()
  reader.onload = (event) => {
    const content = event.target.result
    if (file.name.endsWith('.json')) {
      try {
        const data = JSON.parse(content)
        loadGraphData(data)
      } catch (error) {
        alert('Error parsing JSON file.')
      }
    } else if (file.name.endsWith('.csv')) {
      // assume CSV format from our export
      try {
        const data = parseCSVGraph(content)
        loadGraphData(data)
      } catch (error) {
        alert('Error parsing CSV file.')
      }
    } else {
      alert('Unsupported file format.')
    }
  }
  reader.readAsText(file)
}

// load the imported graph data into vis.js datasets
function loadGraphData(data) {
  if (!window.nodes || !window.edges) {
    alert('Graph is not initialized.')
    return
  }
  window.nodes.clear()
  window.edges.clear()
  if (data.nodes && Array.isArray(data.nodes)) {
    window.nodes.add(data.nodes)
  }
  if (data.edges && Array.isArray(data.edges)) {
    window.edges.add(data.edges)
  }
  // refit the network view if possible
  if (window.network) {
    window.network.fit({ animation: { duration: 500, easingFunction: 'easeInOutQuad' } })
  }
}

// parse CSV graph file into nodes and edges
function parseCSVGraph(csvContent) {
  const lines = csvContent.split('\n').map(line => line.trim()).filter(line => line !== '')
  let section = null
  const nodes = []
  const edges = []
  let headers = []
  
  for (const line of lines) {
    if (line.toLowerCase() === 'nodes') {
      section = 'nodes'
      headers = []
      continue
    }
    if (line.toLowerCase() === 'edges') {
      section = 'edges'
      headers = []
      continue
    }
    if (headers.length === 0) {
      headers = parseCSVLine(line)
    } else {
      const values = parseCSVLine(line)
      const obj = {}
      headers.forEach((header, index) => {
        let value = values[index] || ''
        // strip surrounding quotes if any
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1)
        }
        // convert numeric fields for nodes and edges
        if (section === 'nodes' && (header === 'id' || header === 'size' || header === 'linkCount' || header === 'popularity')) {
          value = Number(value)
        }
        if (section === 'edges' && (header === 'from' || header === 'to')) {
          value = Number(value)
        }
        obj[header] = value
      })
      if (section === 'nodes') {
        nodes.push(obj)
      } else if (section === 'edges') {
        edges.push(obj)
      }
    }
  }
  return { nodes, edges }
}

// parse a single CSV line, handling quoted commas
function parseCSVLine(line) {
  const result = []
  let current = ''
  let insideQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (insideQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        insideQuotes = !insideQuotes
      }
    } else if (char === ',' && !insideQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}