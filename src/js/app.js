import { initThemeToggle } from './modules/theme.js'
import { initSearch } from './modules/search.js'
import { initGraph, updateGraphTheme, createCentralNode, createOrExpandNode, setColourNodesEnabled, centerGraph } from './modules/graph.js'
import { fetchRandomArticle } from './modules/api.js'
import { SEARCH_API_URL } from './config.js'
import { initTooltip } from './modules/tooltip.js'
import { initImportExport } from './modules/importExport.js'

// when dom content is loaded we run our setup code
document.addEventListener('DOMContentLoaded', () => {
  // init theme toggle so user can switch dark mode
  initThemeToggle()

  // add custom nprogress styles for our loading bar
  const nprogressStyle = document.createElement('style')
  nprogressStyle.innerHTML = `
    #nprogress .bar {
      background: var(--accent-color) !important
      z-index: 500
    }
    #nprogress .peg {
      box-shadow: 0 0 10px var(--accent-color), 0 0 5px var(--accent-color) !important
    }
  `
  document.head.appendChild(nprogressStyle)

  // configure nprogress to show in the graph container without spinner
  NProgress.configure({ parent: '#graph-container', showSpinner: false })

  // init the graph in our container and check for dark mode
  const container = document.getElementById('graph-container')
  const isDarkGraph = document.body.classList.contains('dark-mode')
  const { network, nodes, edges } = initGraph(container, isDarkGraph)

  // init tooltip functionality for node hover
  initTooltip(network)

  // update graph theme when theme toggle is clicked
  document.getElementById('theme-toggle').addEventListener('click', () => {
    updateGraphTheme()
  })

  // init search functionality and import export options
  initSearch()
  initImportExport()

  // add event listener to zoom in button
  document.getElementById('zoom-in').addEventListener('click', () => {
    const currentScale = network.getScale()
    network.moveTo({ scale: currentScale * 1.2 })
  })

  // add event listener to zoom out button
  document.getElementById('zoom-out').addEventListener('click', () => {
    const currentScale = network.getScale()
    network.moveTo({ scale: currentScale / 1.2 })
  })

  // add event listener to clear graph button
  document.getElementById('clear-graph').addEventListener('click', () => {
    nodes.clear()
    edges.clear()
  })

  // add event listener to center graph button to manually center the graph
  document.getElementById('center-graph').addEventListener('click', () => {
    centerGraph()
  })

  // toggle node colouring when the color toggle button is clicked
  const colorToggle = document.getElementById('color-toggle')
  if (colorToggle) {
    colorToggle.addEventListener('click', () => {
      const currentState = colorToggle.textContent.includes('On')
      setColourNodesEnabled(!currentState)
      colorToggle.textContent = `Colour Nodes: ${!currentState ? "On" : "Off"}`
    })
  }

  // show the intro modal on page load
  const introModal = document.getElementById('intro-modal')
  if (introModal) {
    introModal.style.display = 'block'
  }
  // add event listener to close the modal when close button is clicked
  const closeModalBtn = document.getElementById('close-modal')
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
      introModal.style.display = 'none'
    })
  }
  // hide the modal if user clicks outside the modal content
  if (introModal) {
    introModal.addEventListener('click', event => {
      if (event.target === introModal) {
        introModal.style.display = 'none'
      }
    })
  }

  // add event listener for random article button to fetch a random article
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

  // add node click event to expand node or open in new tab if ctrl or meta key is pressed
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
})
