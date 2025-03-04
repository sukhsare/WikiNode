import { SEARCH_API_URL } from '../config.js'
import { getPageIdByTitle } from './api.js'
import { createCentralNode } from './graph.js'
import { fetchTrendingArticles } from './api.js'

let trendingCache = null

export function initSearch() {
  const searchBar = document.getElementById('search-bar')
  const suggestionsEl = document.getElementById('suggestions')

  // when search bar gets focus or is clicked show suggestions and handle trending
  searchBar.addEventListener('focus', handleTrending)
  searchBar.addEventListener('click', () => {
    suggestionsEl.style.display = 'block'
    handleTrending()
  })

  // on input update suggestions
  searchBar.addEventListener('input', async () => {
    suggestionsEl.style.display = 'block'
    const query = searchBar.value.trim()
    if (!query) {
      handleTrending()
      return
    }
    try {
      // fetch search results from the wikipedia api using the query
      const response = await fetch(`${SEARCH_API_URL}&list=search&srsearch=${encodeURIComponent(query)}`)
      const data = await response.json()
      suggestionsEl.innerHTML = ''
      if (!data.query?.search?.length) {
        const li = document.createElement('li')
        li.textContent = "no results found"
        suggestionsEl.appendChild(li)
        return
      }
      // sort results so that those starting with the query come first
      const sortedResults = data.query.search.sort((a, b) => {
        const aTitle = a.title.toLowerCase()
        const bTitle = b.title.toLowerCase()
        const q = query.toLowerCase()
        const aStarts = aTitle.startsWith(q) ? 0 : 1
        const bStarts = bTitle.startsWith(q) ? 0 : 1
        return aStarts - bStarts
      })
      // loop through sorted results and create suggestion list items
      sortedResults.forEach(item => {
        const lowerTitle = item.title.toLowerCase()
        // filter out unwanted pages
        if (
          lowerTitle.includes("citation needed") ||
          lowerTitle.startsWith("help:") ||
          lowerTitle.startsWith("special:") ||
          lowerTitle.startsWith("user:") ||
          lowerTitle.startsWith("wikipedia:") ||
          lowerTitle.startsWith("category:") ||
          lowerTitle.startsWith("template:") ||
          lowerTitle.includes(".jpg")
        ) return

        const li = document.createElement('li')
        li.textContent = item.title
        li.dataset.pageid = item.pageid
        suggestionsEl.appendChild(li)
        li.addEventListener('click', (e) => {
          e.preventDefault()
          e.stopPropagation()
          searchBar.blur()
          createCentralNode(item.title, item.pageid)
          searchBar.value = ''
          suggestionsEl.innerHTML = ''
          suggestionsEl.style.display = 'none'
        })
      })
    } catch (error) {
      console.error('error fetching search suggestions', error)
    }
  })

  // hide suggestions if user clicks outside search bar and suggestions list
  document.addEventListener('click', (e) => {
    if (!searchBar.contains(e.target) && !suggestionsEl.contains(e.target)) {
      suggestionsEl.innerHTML = ''
      suggestionsEl.style.display = 'none'
    }
  })
}

// handle trending articles when search bar is empty
async function handleTrending() {
  const searchBar = document.getElementById('search-bar')
  const suggestionsEl = document.getElementById('suggestions')
  if (searchBar.value.trim() !== "") return
  if (trendingCache) {
    populateSuggestions(trendingCache)
  } else {
    trendingCache = await fetchTrendingArticles()
    populateSuggestions(trendingCache)
  }
}

// populate suggestions with trending articles
function populateSuggestions(articles) {
  const suggestionsEl = document.getElementById('suggestions')
  suggestionsEl.innerHTML = ''
  suggestionsEl.style.display = 'block'
  const filtered = articles.filter(article => {
    const title = article.article.trim().toLowerCase()
    return title !== "main_page" &&
           title !== "main page" &&
           !title.startsWith("special:") &&
           !title.startsWith("user:") &&
           !title.startsWith("wikipedia:") &&
           !title.startsWith("help:") &&
           !title.startsWith("category:") &&
           !title.startsWith("template:") &&
           !title.includes("citation needed") &&
           !title.includes(".jpg")
  })
  if (filtered.length === 0) {
    const li = document.createElement('li')
    li.textContent = "no trending articles found"
    suggestionsEl.appendChild(li)
    return
  }
  filtered.slice(0, 10).forEach(article => {
    const li = document.createElement('li')
    li.textContent = article.article.replace(/_/g, ' ')
    li.dataset.article = article.article
    suggestionsEl.appendChild(li)
    li.addEventListener('click', async (e) => {
      e.preventDefault()
      e.stopPropagation()
      document.getElementById('search-bar').blur()
      suggestionsEl.innerHTML = ''
      suggestionsEl.style.display = 'none'
      const displayTitle = li.dataset.article.replace(/_/g, ' ')
      let pageid = await getPageIdByTitle(displayTitle)
      if (!pageid) pageid = displayTitle
      createCentralNode(displayTitle, pageid)
      document.getElementById('search-bar').value = ''
    })
  })
}