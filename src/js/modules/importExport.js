import { getPageIdByTitle } from './api.js'
import { createCentralNode } from './graph.js'

// init import export functionality by setting up event listeners for our modal
export function initImportExport() {
  const importExportToggle = document.getElementById('import-export-toggle')
  const modal = document.getElementById('import-export-modal')
  const closeModalBtn = document.getElementById('close-import-export-modal')
  
  // get tab elements and sections for export and import
  const exportTab = document.getElementById('export-tab')
  const importTab = document.getElementById('import-tab')
  const exportSection = document.getElementById('export-section')
  const importSection = document.getElementById('import-section')
  
  // get modal buttons for export formats
  const exportJSONBtn = document.getElementById('export-json')
  const exportCSVBtn = document.getElementById('export-csv')
  const exportPNGBtn = document.getElementById('export-png')
  
  // get elements for import
  const importFileInput = document.getElementById('import-file')
  const importGraphBtn = document.getElementById('import-graph')
  
  // show modal when toggle is clicked
  importExportToggle.addEventListener('click', e => {
    e.preventDefault()
    modal.style.display = 'block'
  })
  
  // close modal on close button click
  closeModalBtn.addEventListener('click', () => {
    modal.style.display = 'none'
  })
  
  // close modal if click outside modal content
  window.addEventListener('click', event => {
    if (event.target == modal) {
      modal.style.display = 'none'
    }
  })
  
  // tab switching for export and import
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
  
  // export graph as json
  exportJSONBtn.addEventListener('click', () => {
    exportGraphAsJSON()
    modal.style.display = 'none'
  })
  
  // export graph as csv
  exportCSVBtn.addEventListener('click', () => {
    exportGraphAsCSV()
    modal.style.display = 'none'
  })
  
  // export graph as png
  exportPNGBtn.addEventListener('click', () => {
    exportGraphAsPNG()
    modal.style.display = 'none'
  })
  
  // import graph from file
  importGraphBtn.addEventListener('click', () => {
    const file = importFileInput.files[0]
    if (!file) {
      alert('please select a file to import')
      return
    }
    importGraphFromFile(file)
    modal.style.display = 'none'
  })
}

// export graph as json format
function exportGraphAsJSON() {
  const nodesData = window.nodes ? window.nodes.get() : []
  const edgesData = window.edges ? window.edges.get() : []
  const data = { nodes: nodesData, edges: edgesData }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  triggerDownload(url, 'wikigraph.json')
}

// export graph as csv format
function exportGraphAsCSV() {
  const nodesData = window.nodes ? window.nodes.get() : []
  const edgesData = window.edges ? window.edges.get() : []
  let csvContent = ''
  // add nodes header and data
  csvContent += 'Nodes\n'
  if (nodesData.length > 0) {
    const nodeKeys = Object.keys(nodesData[0])
    csvContent += nodeKeys.join(',') + '\n'
    nodesData.forEach(node => {
      const row = nodeKeys.map(key => `"${node[key] !== undefined ? node[key] : ''}"`).join(',')
      csvContent += row + '\n'
    })
  }
  csvContent += '\nEdges\n'
  if (edgesData.length > 0) {
    const edgeKeys = Object.keys(edgesData[0])
    csvContent += edgeKeys.join(',') + '\n'
    edgesData.forEach(edge => {
      const row = edgeKeys.map(key => `"${edge[key] !== undefined ? edge[key] : ''}"`).join(',')
      csvContent += row + '\n'
    })
  }
  const blob = new Blob([csvContent], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  triggerDownload(url, 'wikigraph.csv')
}

// export graph as png using html2canvas
function exportGraphAsPNG() {
  const container = document.getElementById('graph-container')
  if (!container) {
    alert('graph container not found')
    return
  }
  html2canvas(container).then(canvas => {
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob)
      triggerDownload(url, 'wikigraph.png')
    })
  }).catch(error => {
    console.error('error exporting graph as png', error)
  })
}

// helper to trigger download of blob file
function triggerDownload(url, filename) {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// import graph from file
function importGraphFromFile(file) {
  const reader = new FileReader()
  reader.onload = event => {
    const content = event.target.result
    if (file.name.endsWith('.json')) {
      try {
        const data = JSON.parse(content)
        loadGraphData(data)
      } catch (error) {
        alert('error parsing json file')
      }
    } else if (file.name.endsWith('.csv')) {
      try {
        const data = parseCSVGraph(content)
        loadGraphData(data)
      } catch (error) {
        alert('error parsing csv file')
      }
    } else {
      alert('unsupported file format')
    }
  }
  reader.readAsText(file)
}

// helper to load graph data into visjs datasets
function loadGraphData(data) {
  if (!window.nodes || !window.edges) {
    alert('graph is not initialized')
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
  // re-fit network view with animation
  if (window.network) {
    window.network.fit({ animation: { duration: 500, easingFunction: 'easeInOutQuad' } })
  }
}

// helper to parse csv graph file
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
    if (!headers.length) {
      headers = line.split(',').map(h => h.trim())
    } else {
      const values = line.split(',').map(v => v.replace(/^"|"$/g, '').trim())
      const obj = {}
      headers.forEach((header, index) => {
        obj[header] = values[index]
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