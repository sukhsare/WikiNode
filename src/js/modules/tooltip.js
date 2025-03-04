const summaryCache = new Map()
let tooltipDiv = null
let showTooltipTimeout = null
let hideTooltipTimeout = null

const MAX_CHARACTERS = 300 // max characters to display in tooltip

export function initTooltip(network) {
  // create tooltip element and set basic styles
  tooltipDiv = document.createElement('div')
  tooltipDiv.id = 'tooltip'
  tooltipDiv.style.position = 'fixed'
  tooltipDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.8)'
  tooltipDiv.style.color = '#fff'
  tooltipDiv.style.padding = '8px 10px'
  tooltipDiv.style.borderRadius = '5px'
  tooltipDiv.style.border = '1px solid rgba(255,255,255,0.3)'
  tooltipDiv.style.display = 'none'
  tooltipDiv.style.maxWidth = '250px'
  tooltipDiv.style.zIndex = '9999'
  tooltipDiv.style.wordWrap = 'break-word'
  tooltipDiv.style.fontSize = '14px'
  // set up line clamp to limit to 4 lines
  tooltipDiv.style.display = '-webkit-box'
  tooltipDiv.style.webkitBoxOrient = 'vertical'
  tooltipDiv.style.overflow = 'hidden'
  tooltipDiv.style.webkitLineClamp = '4'
  // set fade in out transition
  tooltipDiv.style.transition = 'opacity 0.3s ease-in-out'
  tooltipDiv.style.opacity = '0'
  // allow interaction with tooltip so it stays visible on hover
  tooltipDiv.style.pointerEvents = 'auto'
  document.body.appendChild(tooltipDiv)

  // keep tooltip visible if mouse enters tooltip
  tooltipDiv.addEventListener('mouseenter', () => {
    if (hideTooltipTimeout) {
      clearTimeout(hideTooltipTimeout)
      hideTooltipTimeout = null
    }
  })
  tooltipDiv.addEventListener('mouseleave', () => {
    hideTooltip()
  })

  // when a node is hovered wait 300ms then show tooltip
  network.on('hoverNode', async (params) => {
    if (showTooltipTimeout) clearTimeout(showTooltipTimeout)
    showTooltipTimeout = setTimeout(async () => {
      const nodeId = params.node
      const node = network.body.data.nodes.get(nodeId)
      if (!node || !node.label) return
      // set tooltip position near mouse cursor
      const x = params.event.clientX + 10
      const y = params.event.clientY + 10
      tooltipDiv.style.left = x + 'px'
      tooltipDiv.style.top = y + 'px'
      
      const title = node.label
      let summary
      if (summaryCache.has(title)) {
        summary = summaryCache.get(title)
      } else {
        summary = await fetchArticleSummary(title)
        summaryCache.set(title, summary)
      }
      if (!summary) summary = "no summary available"
      // truncate summary if too long
      if (summary.length > MAX_CHARACTERS) {
        summary = summary.substring(0, MAX_CHARACTERS).trim() + "..."
      }
      tooltipDiv.innerHTML = `<strong>${title}</strong><br>${summary}`
      tooltipDiv.style.display = 'block'
      setTimeout(() => {
        tooltipDiv.style.opacity = '1'
      }, 10)
    }, 300)
  })

  network.on('blurNode', () => {
    if (showTooltipTimeout) {
      clearTimeout(showTooltipTimeout)
      showTooltipTimeout = null
    }
    hideTooltip()
  })

  // update tooltip position when mouse moves over graph
  network.on('mousemove', (params) => {
    if (tooltipDiv.style.display === 'block') {
      const x = params.event.clientX + 10
      const y = params.event.clientY + 10
      tooltipDiv.style.left = x + 'px'
      tooltipDiv.style.top = y + 'px'
    }
  })
}

// function to hide tooltip
function hideTooltip() {
  tooltipDiv.style.opacity = '0'
  hideTooltipTimeout = setTimeout(() => {
    tooltipDiv.style.display = 'none'
  }, 200)
}

// fetch article summary from wikipedia api
async function fetchArticleSummary(title) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
  try {
    const response = await fetch(url)
    if (!response.ok) {
      return "error fetching summary"
    }
    const data = await response.json()
    return data.extract || "no summary available"
  } catch (error) {
    return "error fetching summary"
  }
}
