// main app file – sets everything up when the page loads

import { initThemeToggle } from './modules/theme.js';
import { initSearch } from './modules/search.js';
import { initGraph, updateGraphTheme, createCentralNode, createOrExpandNode, setColourNodesEnabled } from './modules/graph.js';
import { fetchRandomArticle } from './modules/api.js';
import { SEARCH_API_URL } from './config.js';
import { initTooltip } from './modules/tooltip.js';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize dark/light theme toggle
  initThemeToggle();

  // Add custom NProgress styles
  const nprogressStyle = document.createElement('style');
  nprogressStyle.innerHTML = `
    #nprogress .bar {
      background: var(--accent-color) !important;
      z-index: 500;
    }
    #nprogress .peg {
      box-shadow: 0 0 10px var(--accent-color), 0 0 5px var(--accent-color) !important;
    }
  `;
  document.head.appendChild(nprogressStyle);

  // Configure NProgress to show in the graph container
  NProgress.configure({ parent: '#graph-container', showSpinner: false });

  // Initialize the graph
  const container = document.getElementById('graph-container');
  const isDarkGraph = document.body.classList.contains("dark-mode");
  const { network, nodes, edges } = initGraph(container, isDarkGraph);

  // Initialize tooltip functionality (for hover summaries)
  initTooltip(network);

  // Update graph theme on dark mode toggle
  document.getElementById('theme-toggle').addEventListener('click', () => {
    updateGraphTheme();
  });

  // Initialize search functionality
  initSearch();

  // Graph control buttons
  document.getElementById('zoom-in').addEventListener('click', () => {
    const currentScale = network.getScale();
    network.moveTo({ scale: currentScale * 1.2 });
  });
  
  document.getElementById('zoom-out').addEventListener('click', () => {
    const currentScale = network.getScale();
    network.moveTo({ scale: currentScale / 1.2 });
  });
  
  document.getElementById('clear-graph').addEventListener('click', () => {
    nodes.clear();
    edges.clear();
  });
  
  document.getElementById('center-graph').addEventListener('click', () => {
    network.fit({ animation: { duration: 500, easingFunction: 'easeInOutQuad' } });
  });
    
  // Toggle node colouring by popularity
  const colorToggle = document.getElementById('color-toggle');
  if (colorToggle) {
    colorToggle.addEventListener('click', () => {
      const currentState = colorToggle.textContent.includes("On");
      setColourNodesEnabled(!currentState);
      colorToggle.textContent = `Colour Nodes: ${!currentState ? "On" : "Off"}`;
    });
  }
    
  // Show intro modal on page load
  const introModal = document.getElementById('intro-modal');
  if (introModal) {
    introModal.style.display = 'block';
  }
  const closeModalBtn = document.getElementById('close-modal');
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
      introModal.style.display = 'none';
    });
  }
  if (introModal) {
    introModal.addEventListener('click', (event) => {
      if (event.target === introModal) {
        introModal.style.display = 'none';
      }
    });
  }
    
  // Random article button
  const randomiseButton = document.getElementById('randomise-button');
  if (randomiseButton) {
    randomiseButton.addEventListener('click', async () => {
      const randomArticle = await fetchRandomArticle();
      if (randomArticle) {
        const title = randomArticle.title;
        const pageid = randomArticle.id;
        document.getElementById('search-bar').value = '';
        document.getElementById('suggestions').innerHTML = '';
        document.getElementById('suggestions').style.display = 'none';
        createCentralNode(title, pageid);
      }
    });
  }

  // Node click event – expand node or open in new tab (if ctrl/meta is held)
  network.on('click', async params => {
    if (params.nodes.length > 0) {
      const event = params.event && params.event.srcEvent ? params.event.srcEvent : params.event;
      if (event.ctrlKey || event.metaKey) {
        const nodeId = params.nodes[0];
        const node = nodes.get(nodeId);
        if (node && node.label) {
          const articleURL = `https://en.wikipedia.org/wiki/${encodeURIComponent(node.label)}`;
          window.open(articleURL, '_blank');
        }
        return;
      }
      const nodeId = params.nodes[0];
      const node = nodes.get(nodeId);
      if (node && node.label) {
        try {
          const response = await fetch(`${SEARCH_API_URL}&titles=${encodeURIComponent(node.label)}&prop=pageids`);
          const data = await response.json();
          const pageid = Object.keys(data.query.pages)[0];
          if (pageid) {
            await createOrExpandNode(nodeId, node.label, pageid);
          }
        } catch (error) {
          console.error("Error expanding node on click:", error);
        }
      }
    }
  });
});
