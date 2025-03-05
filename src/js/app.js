import { initThemeToggle } from './modules/theme.js'
import { initSearch } from './modules/search.js'
import { initGraph, updateGraphTheme, createCentralNode, createOrExpandNode, setColourNodesEnabled, centerGraph } from './modules/graph.js'
import { fetchRandomArticle } from './modules/api.js'
import { SEARCH_API_URL } from './config.js'
import { initTooltip } from './modules/tooltip.js'
import { initImportExport } from './modules/importExport.js'

// When DOM content is loaded, run our setup code.
document.addEventListener('DOMContentLoaded', () => {
  // Initialize theme toggle so user can switch dark mode.
  initThemeToggle()

  // Add custom NProgress styles for our loading bar: set it to black.
  const nprogressStyle = document.createElement('style')
  nprogressStyle.innerHTML = `
    #nprogress .bar {
      background: black !important;
      z-index: 500;
    }
    #nprogress .peg {
      box-shadow: 0 0 10px black, 0 0 5px black !important;
    }
  `
  document.head.appendChild(nprogressStyle)

  // Configure NProgress to show in the graph container without spinner.
  NProgress.configure({ parent: '#graph-container', showSpinner: false })

  // Initialize the graph in our container and check for dark mode.
  const container = document.getElementById('graph-container')
  const isDarkGraph = document.body.classList.contains('dark-mode')
  const { network, nodes, edges } = initGraph(container, isDarkGraph)

  // Initialize tooltip functionality for node hover.
  initTooltip(network)

  // Update graph theme when theme toggle is clicked.
  document.getElementById('theme-toggle').addEventListener('click', () => {
    updateGraphTheme()
  })

  // Initialize search functionality and import/export options.
  initSearch()
  initImportExport()

  // Add event listener to zoom in button.
  document.getElementById('zoom-in').addEventListener('click', () => {
    const currentScale = network.getScale()
    network.moveTo({ scale: currentScale * 1.2, animation: { duration: 150 } })
  })

  // Add event listener to zoom out button.
  document.getElementById('zoom-out').addEventListener('click', () => {
    const currentScale = network.getScale()
    network.moveTo({ scale: currentScale / 1.2, animation: { duration: 150 } })
  })

  // Add event listener to clear graph button.
  document.getElementById('clear-graph').addEventListener('click', () => {
    nodes.clear()
    edges.clear()
  })

  // Add event listener to center graph button.
  document.getElementById('center-graph').addEventListener('click', () => {
    centerGraph()
  })

  // Toggle node colouring when the color toggle button is clicked.
  const colorToggle = document.getElementById('color-toggle')
  if (colorToggle) {
    colorToggle.addEventListener('click', () => {
      const currentState = colorToggle.textContent.includes('On')
      setColourNodesEnabled(!currentState)
      colorToggle.textContent = `Colour Nodes: ${!currentState ? "On" : "Off"}`
    })
  }

  // Show the intro modal on page load.
  const introModal = document.getElementById('intro-modal')
  if (introModal) {
    introModal.style.display = 'block'
  }
  // Add event listener to close the modal.
  const closeModalBtn = document.getElementById('close-modal')
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
      introModal.style.display = 'none'
    })
  }
  // Hide the modal if user clicks outside the modal content.
  if (introModal) {
    introModal.addEventListener('click', event => {
      if (event.target === introModal) {
        introModal.style.display = 'none'
      }
    })
  }

  // Add event listener for random article button.
  const randomiseButton = document.getElementById('randomise-button')
  if (randomiseButton) {
    randomiseButton.addEventListener('click', async () => {
      const randomArticle = await fetchRandomArticle()
      if (randomArticle) {
        const title = randomArticle.title
        const pageid = randomArticle.id
        document.getElementById('search-bar').value = ''
        document.getElementById('suggestions').innerHTML = ''
        document.getElementById('suggestions').style.display = 'none'
        createCentralNode(title, pageid)
      }
    })
  }

  // Add node click event to expand node or open in new tab if ctrl/meta is pressed.
  network.on('click', async params => {
    if (params.nodes.length > 0) {
      const event = params.event && params.event.srcEvent ? params.event.srcEvent : params.event
      if (event.ctrlKey || event.metaKey) {
        const nodeId = params.nodes[0]
        const node = nodes.get(nodeId)
        if (node && node.label) {
          const articleURL = `https://en.wikipedia.org/wiki/${encodeURIComponent(node.label)}`
          window.open(articleURL, '_blank')
        }
        return
      }
      const nodeId = params.nodes[0]
      const node = nodes.get(nodeId)
      if (node && node.label) {
        try {
          const response = await fetch(`${SEARCH_API_URL}&titles=${encodeURIComponent(node.label)}&prop=pageids`)
          const data = await response.json()
          const pageid = Object.keys(data.query.pages)[0]
          if (pageid) {
            await createOrExpandNode(nodeId, node.label, pageid)
          }
        } catch (error) {
          console.error("error expanding node on click", error)
        }
      }
    }
  })

  // --- KEYBOARD CONTROLS FOR SMOOTH NAVIGATION ---
  // Set up an object to track currently pressed keys.
  const keysPressed = {};
  document.addEventListener('keydown', (event) => {
    // Ignore events if an input or textarea is focused.
    if (document.activeElement && 
        (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
      return;
    }
    keysPressed[event.key.toLowerCase()] = true;
    // Prevent default actions for our control keys.
    if (["arrowleft", "arrowright", "arrowup", "arrowdown", "w", "a", "s", "d", "+", "=", "-"].includes(event.key.toLowerCase())) {
      event.preventDefault();
    }
  });
  document.addEventListener('keyup', (event) => {
    keysPressed[event.key.toLowerCase()] = false;
  });

  // Animation loop for smooth panning and zooming.
  let lastTimestamp = null;
  const panSpeed = 150; // pixels per second
  const zoomFactor = 1.01; // multiplicative factor per frame when zoom key is held
  function animate(timestamp) {
    if (!lastTimestamp) lastTimestamp = timestamp;
    const delta = timestamp - lastTimestamp;
    lastTimestamp = timestamp;
    
    // Calculate movement vector for panning.
    let dx = 0, dy = 0;
    if (keysPressed["arrowleft"] || keysPressed["a"]) {
      dx -= 1;
    }
    if (keysPressed["arrowright"] || keysPressed["d"]) {
      dx += 1;
    }
    if (keysPressed["arrowup"] || keysPressed["w"]) {
      dy -= 1;
    }
    if (keysPressed["arrowdown"] || keysPressed["s"]) {
      dy += 1;
    }
    if (dx !== 0 || dy !== 0) {
      // Normalize diagonal movement.
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;
      const distance = (panSpeed * delta) / 1000; // pixels to move this frame
      const currentPos = network.getViewPosition();
      const newPos = { x: currentPos.x + dx * distance, y: currentPos.y + dy * distance };
      network.moveTo({ position: newPos, animation: { duration: 0 } });
    }
    
    // Smooth zooming using +/= and - keys.
    if (keysPressed["+"] || keysPressed["="]) {
      const scale = network.getScale();
      network.moveTo({ scale: scale * zoomFactor, animation: { duration: 0 } });
    }
    if (keysPressed["-"]) {
      const scale = network.getScale();
      network.moveTo({ scale: scale / zoomFactor, animation: { duration: 0 } });
    }
    
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
  // --- END KEYBOARD CONTROLS ---

})
