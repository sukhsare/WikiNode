import { initThemeToggle } from './modules/theme.js'
import { initSearch } from './modules/search.js'
import { initGraph, updateGraphTheme, createCentralNode, createOrExpandNode, setColourNodesEnabled, centerGraph } from './modules/graph.js'
import { fetchRandomArticle } from './modules/api.js'
import { SEARCH_API_URL } from './config.js'
import { initTooltip } from './modules/tooltip.js'
import { initImportExport } from './modules/importExport.js'
import { undoAction, redoAction } from './modules/undoManager.js'

// when dom is ready, we start our setup
document.addEventListener('DOMContentLoaded', () => {
  // init dark/light toggle for user switching
  initThemeToggle()

  // create a style tag for nprogress (loading bar)
  const npStyle = document.createElement('style')
  const darkMode = document.body.classList.contains('dark-mode')
  const npColor = darkMode ? 'white' : 'black'
  npStyle.innerHTML = `
    #nprogress .bar {
      background: ${npColor} !important;
      z-index: 500;
    }
    #nprogress .peg {
      box-shadow: 0 0 10px ${npColor}, 0 0 5px ${npColor} !important;
    }
  `
  document.head.appendChild(npStyle)

  // setup nprogress to show in our graph container without spinner
  NProgress.configure({ parent: '#graph-container', showSpinner: false })

  // init graph and pass container + dark mode flag
  const container = document.getElementById('graph-container')
  const darkGraph = document.body.classList.contains('dark-mode')
  const { network, nodes, edges } = initGraph(container, darkGraph)

  // init tooltips on the network
  initTooltip(network)

  // update graph theme when theme toggle is clicked
  document.getElementById('theme-toggle').addEventListener('click', () => {
    updateGraphTheme()
    // update nprogress style after theme change
    const updatedDark = document.body.classList.contains('dark-mode')
    const updatedColor = updatedDark ? 'white' : 'black'
    npStyle.innerHTML = `
      #nprogress .bar {
        background: ${updatedColor} !important;
        z-index: 500;
      }
      #nprogress .peg {
        box-shadow: 0 0 10px ${updatedColor}, 0 0 5px ${updatedColor} !important;
      }
    `
  })

  // init search & import/export stuff
  initSearch()
  initImportExport()

  // show intro modal on page load if exists
  const introModal = document.getElementById('intro-modal')
  if (introModal) {
    introModal.style.display = 'block'
  }
  const closeModalBtn = document.getElementById('close-modal')
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
      introModal.style.display = 'none'
    })
  }
  if (introModal) {
    introModal.addEventListener('click', e => {
      if (e.target === introModal) {
        introModal.style.display = 'none'
      }
    })
  }

  // zoom in button
  document.getElementById('zoom-in').addEventListener('click', () => {
    const currentScale = network.getScale()
    network.moveTo({ scale: currentScale * 1.2, animation: { duration: 150 } })
  })

  // zoom out button
  document.getElementById('zoom-out').addEventListener('click', () => {
    const currentScale = network.getScale()
    network.moveTo({ scale: currentScale / 1.2, animation: { duration: 150 } })
  })

  // clear graph button
  document.getElementById('clear-graph').addEventListener('click', () => {
    nodes.clear()
    edges.clear()
  })

  // center graph button
  document.getElementById('center-graph').addEventListener('click', () => {
    centerGraph()
  })

  // toggle node colouring button
  const colorToggle = document.getElementById('color-toggle')
  if (colorToggle) {
    colorToggle.addEventListener('click', () => {
      const currState = colorToggle.textContent.includes('On')
      setColourNodesEnabled(!currState)
      colorToggle.textContent = `Colour Nodes: ${!currState ? "On" : "Off"}`
    })
  }

  // random article button
  const randBtn = document.getElementById('randomise-button')
  if (randBtn) {
    randBtn.addEventListener('click', async () => {
      const randArt = await fetchRandomArticle()
      if (randArt) {
        const title = randArt.title
        const pageid = randArt.id
        document.getElementById('search-bar').value = ''
        document.getElementById('suggestions').innerHTML = ''
        document.getElementById('suggestions').style.display = 'none'
        createCentralNode(title, pageid)
      }
    })
  }

  // handle node clicks - expand or open in new tab if ctrl/meta pressed
  network.on('click', async params => {
    if (params.nodes.length > 0) {
      const evt = params.event && params.event.srcEvent ? params.event.srcEvent : params.event
      if (evt.ctrlKey || evt.metaKey) {
        const nodeId = params.nodes[0]
        const node = nodes.get(nodeId)
        if (node && node.label) {
          const url = `https://en.wikipedia.org/wiki/${encodeURIComponent(node.label)}`
          window.open(url, '_blank')
        }
        return
      }
      const nodeId = params.nodes[0]
      const node = nodes.get(nodeId)
      if (node && node.label) {
        try {
          const res = await fetch(`${SEARCH_API_URL}&titles=${encodeURIComponent(node.label)}&prop=pageids`)
          const data = await res.json()
          const pageid = Object.keys(data.query.pages)[0]
          if (pageid) {
            await createOrExpandNode(nodeId, node.label, pageid)
          }
        } catch (err) {
          console.error('err expanding node on click', err)
        }
      }
    }
  })

  // keyboard controls for smooth nav
  const keys = {}
  document.addEventListener('keydown', ev => {
    if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
      return
    }
    keys[ev.key.toLowerCase()] = true
    if (["arrowleft", "arrowright", "arrowup", "arrowdown", "w", "a", "s", "d", "+", "=", "-"].includes(ev.key.toLowerCase())) {
      ev.preventDefault()
    }
  })
  document.addEventListener('keyup', ev => {
    keys[ev.key.toLowerCase()] = false
  })
  let lastTime = null
  const panSpeed = 150
  const zoomFact = 1.01
  function animate(time) {
    if (!lastTime) lastTime = time
    const delta = time - lastTime
    lastTime = time
    let dx = 0, dy = 0
    if (keys["arrowleft"] || keys["a"]) { dx -= 1 }
    if (keys["arrowright"] || keys["d"]) { dx += 1 }
    if (keys["arrowup"] || keys["w"]) { dy -= 1 }
    if (keys["arrowdown"] || keys["s"]) { dy += 1 }
    if (dx || dy) {
      const len = Math.sqrt(dx * dx + dy * dy)
      dx /= len
      dy /= len
      const dist = (panSpeed * delta) / 1000
      const curPos = network.getViewPosition()
      const newPos = { x: curPos.x + dx * dist, y: curPos.y + dy * dist }
      network.moveTo({ position: newPos, animation: { duration: 0 } })
    }
    if (keys["+"] || keys["="]) {
      const scale = network.getScale()
      network.moveTo({ scale: scale * zoomFact, animation: { duration: 0 } })
    }
    if (keys["-"]) {
      const scale = network.getScale()
      network.moveTo({ scale: scale / zoomFact, animation: { duration: 0 } })
    }
    requestAnimationFrame(animate)
  }
  requestAnimationFrame(animate)

  // undo/redo buttons
  document.getElementById('undo-button').addEventListener('click', () => {
    undoAction()
  })
  document.getElementById('redo-button').addEventListener('click', () => {
    redoAction()
  })
})