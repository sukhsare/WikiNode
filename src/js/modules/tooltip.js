// FINAL PROJECT/src/js/modules/tooltip.js
// This module adds an interactive tooltip on node hover to show a brief Wikipedia article summary.
// It combines JavaScript truncation and CSS line clamping with a slight delay and fade effects.

const summaryCache = new Map();
let tooltipDiv = null;
let showTooltipTimeout = null;
let hideTooltipTimeout = null;

const MAX_CHARACTERS = 300; // Maximum number of characters to display

export function initTooltip(network) {
  // Create and style the tooltip element
  tooltipDiv = document.createElement('div');
  tooltipDiv.id = 'tooltip';
  tooltipDiv.style.position = 'fixed';
  tooltipDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
  tooltipDiv.style.color = '#fff';
  tooltipDiv.style.padding = '8px 10px';
  tooltipDiv.style.borderRadius = '5px';
  tooltipDiv.style.border = '1px solid rgba(255,255,255,0.3)';
  tooltipDiv.style.display = 'none';
  tooltipDiv.style.maxWidth = '250px'; // Reduced width
  tooltipDiv.style.zIndex = '9999';
  tooltipDiv.style.wordWrap = 'break-word';
  tooltipDiv.style.fontSize = '14px';
  // CSS line clamp for maximum 4 lines
  tooltipDiv.style.display = '-webkit-box';
  tooltipDiv.style.webkitBoxOrient = 'vertical';
  tooltipDiv.style.overflow = 'hidden';
  tooltipDiv.style.webkitLineClamp = '4';
  // Transition for smooth fade in/out
  tooltipDiv.style.transition = 'opacity 0.2s ease-in-out';
  tooltipDiv.style.opacity = '0';
  // Allow tooltip to be interactive so that it stays visible on hover
  tooltipDiv.style.pointerEvents = 'auto';
  document.body.appendChild(tooltipDiv);

  // Add event listeners to keep tooltip visible when hovered
  tooltipDiv.addEventListener('mouseenter', () => {
    if (hideTooltipTimeout) {
      clearTimeout(hideTooltipTimeout);
      hideTooltipTimeout = null;
    }
  });
  tooltipDiv.addEventListener('mouseleave', () => {
    hideTooltip();
  });

  // When a node is hovered, wait 300ms before showing the tooltip
  network.on('hoverNode', async (params) => {
    console.log("hoverNode fired:", params);
    if (showTooltipTimeout) clearTimeout(showTooltipTimeout);
    showTooltipTimeout = setTimeout(async () => {
      const nodeId = params.node;
      const node = network.body.data.nodes.get(nodeId);
      if (!node || !node.label) {
        console.warn("No node or label for nodeId:", nodeId);
        return;
      }
      // Set tooltip position based on current mouse event
      const x = params.event.clientX + 10;
      const y = params.event.clientY + 10;
      tooltipDiv.style.left = x + 'px';
      tooltipDiv.style.top = y + 'px';
      console.log("Initial tooltip position:", x, y);
      
      const title = node.label;
      let summary;
      if (summaryCache.has(title)) {
        summary = summaryCache.get(title);
        console.log("Using cached summary for", title);
      } else {
        summary = await fetchArticleSummary(title);
        console.log("Fetched summary for", title);
        summaryCache.set(title, summary);
      }
      if (!summary) {
        summary = "No summary available.";
      }
      // Truncate the summary if it's too long
      if (summary.length > MAX_CHARACTERS) {
        summary = summary.substring(0, MAX_CHARACTERS).trim() + "...";
      }
      
      // Build the tooltip content (without the "Read more" link)
      tooltipDiv.innerHTML = `<strong>${title}</strong><br>${summary}`;
      // Show tooltip with fade-in
      tooltipDiv.style.display = 'block';
      setTimeout(() => {
        tooltipDiv.style.opacity = '1';
      }, 10);
    }, 300); // 300ms delay
  });

  // When the node is no longer hovered, schedule the tooltip to hide
  network.on('blurNode', () => {
    if (showTooltipTimeout) {
      clearTimeout(showTooltipTimeout);
      showTooltipTimeout = null;
    }
    hideTooltip();
  });

  // Update tooltip position as the mouse moves over the graph
  network.on('mousemove', (params) => {
    if (tooltipDiv.style.display === 'block') {
      const x = params.event.clientX + 10;
      const y = params.event.clientY + 10;
      tooltipDiv.style.left = x + 'px';
      tooltipDiv.style.top = y + 'px';
      console.log("Updated tooltip position:", x, y);
    }
  });
}

function hideTooltip() {
  tooltipDiv.style.opacity = '0';
  hideTooltipTimeout = setTimeout(() => {
    tooltipDiv.style.display = 'none';
  }, 200);
}

async function fetchArticleSummary(title) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error("HTTP error fetching summary for", title, response.status);
      return "Error fetching summary.";
    }
    const data = await response.json();
    return data.extract || "No summary available.";
  } catch (error) {
    console.error("Error fetching summary for", title, error);
    return "Error fetching summary.";
  }
}
