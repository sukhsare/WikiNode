const summaryCache = new Map()
let tipDiv = null
let showTipTimeout = null
let hideTipTimeout = null

const MAX_CHARS = 300 // max chars to show in tooltip

export function initTooltip(network) {
  // create a tooltip div and style it
  tipDiv = document.createElement('div')
  tipDiv.id = 'tooltip'
  tipDiv.style.position = 'fixed'
  tipDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.8)'
  tipDiv.style.color = '#fff'
  tipDiv.style.padding = '8px 10px'
  tipDiv.style.borderRadius = '5px'
  tipDiv.style.border = '1px solid rgba(255,255,255,0.3)'
  tipDiv.style.display = 'none'
  tipDiv.style.maxWidth = '250px'
  tipDiv.style.zIndex = '9999'
  tipDiv.style.wordWrap = 'break-word'
  tipDiv.style.fontSize = '14px'
  // set line clamping for 4 lines
  tipDiv.style.display = '-webkit-box'
  tipDiv.style.webkitBoxOrient = 'vertical'
  tipDiv.style.overflow = 'hidden'
  tipDiv.style.webkitLineClamp = '4'
  // fade in/out transition
  tipDiv.style.transition = 'opacity 0.3s ease-in-out'
  tipDiv.style.opacity = '0'
  // allow pointer events so tooltip can be hovered over
  tipDiv.style.pointerEvents = 'auto'
  document.body.appendChild(tipDiv)

  // if mouse enters the tooltip, cancel hiding
  tipDiv.addEventListener('mouseenter', () => {
    if (hideTipTimeout) {
      clearTimeout(hideTipTimeout)
      hideTipTimeout = null
    }
  })
  tipDiv.addEventListener('mouseleave', () => {
    hideTooltip()
  })

  // when hovering over a node, wait a bit then show tooltip
  network.on('hoverNode', async (params) => {
    if (showTipTimeout) clearTimeout(showTipTimeout)
    showTipTimeout = setTimeout(async () => {
      const nodeId = params.node
      const node = network.body.data.nodes.get(nodeId)
      if (!node || !node.label) return
      // set position near the mouse cursor
      const x = params.event.clientX + 10
      const y = params.event.clientY + 10
      tipDiv.style.left = x + 'px'
      tipDiv.style.top = y + 'px'
      
      const title = node.label
      let summary
      if (summaryCache.has(title)) {
        summary = summaryCache.get(title)
      } else {
        summary = await fetchArticleSummary(title)
        summaryCache.set(title, summary)
      }
      if (!summary) summary = "no summary available"
      // truncate if too long
      if (summary.length > MAX_CHARS) {
        summary = summary.substring(0, MAX_CHARS).trim() + "..."
      }
      tipDiv.innerHTML = `<strong>${title}</strong><br>${summary}`
      tipDiv.style.display = 'block'
      setTimeout(() => {
        tipDiv.style.opacity = '1'
      }, 10)
    }, 300)
  })

  network.on('blurNode', () => {
    if (showTipTimeout) {
      clearTimeout(showTipTimeout)
      showTipTimeout = null
    }
    hideTooltip()
  })

  // update tooltip position when mouse moves over the graph
  network.on('mousemove', (params) => {
    if (tipDiv.style.display === 'block') {
      const x = params.event.clientX + 10
      const y = params.event.clientY + 10
      tipDiv.style.left = x + 'px'
      tipDiv.style.top = y + 'px'
    }
  })
}

// hide the tooltip with a fade out
function hideTooltip() {
  tipDiv.style.opacity = '0'
  hideTipTimeout = setTimeout(() => {
    tipDiv.style.display = 'none'
  }, 200)
}

// fetch article summary from Wikipedia API
async function fetchArticleSummary(title) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
  try {
    const response = await fetch(url)
    if (!response.ok) {
      return "error fetching summary"
    }
    const data = await response.json()
    return data.extract || "no summary available"
  } catch (err) {
    return "error fetching summary"
  }
}
