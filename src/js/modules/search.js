/* search.js */
// this file handles the search box and its suggestion list

import { SEARCH_API_URL } from '../config.js'
import { getPageIdByTitle } from './api.js'
import { createCentralNode } from './graph.js'
import { fetchTrendingArticles } from './api.js'

// cache trending articles so we don't keep refetching
let trendingCache = null

export function initSearch() {
  const searchBar = document.getElementById('search-bar')
  const suggestionsEl = document.getElementById('suggestions')

  // when the search box gets focus or is clicked, show trending suggestions
  searchBar.addEventListener('focus', handleTrending)
  searchBar.addEventListener('click', () => {
    suggestionsEl.style.display = 'block'
    handleTrending()
  })

  // on typing, fetch and display matching suggestions
  searchBar.addEventListener('input', async () => {
    suggestionsEl.style.display = 'block'
    const query = searchBar.value.trim()
    if (!query) {
      handleTrending()
      return
    }
    try {
      const response = await fetch(`${SEARCH_API_URL}&list=search&srsearch=${encodeURIComponent(query)}`)
      const data = await response.json()
      suggestionsEl.innerHTML = ''
      if (!data.query?.search?.length) {
        const li = document.createElement('li')
        li.textContent = "No results found."
        suggestionsEl.appendChild(li)
        return
      }
      // sort results so those that start with the query come first
      const sortedResults = data.query.search.sort((a, b) => {
        const aTitle = a.title.toLowerCase()
        const bTitle = b.title.toLowerCase()
        const q = query.toLowerCase()
        const aStarts = aTitle.startsWith(q) ? 0 : 1
        const bStarts = bTitle.startsWith(q) ? 0 : 1
        return aStarts - bStarts
      })
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
          lowerTitle.startsWith("template:")
        ) return

        const li = document.createElement('li')
        li.textContent = item.title
        li.dataset.pageid = item.pageid
        suggestionsEl.appendChild(li)
        // when a suggestion is clicked, add the node and hide the suggestion list
        li.addEventListener('click', (e) => {
          e.preventDefault()
          e.stopPropagation()
          // remove focus so suggestions don't reappear
          searchBar.blur()
          createCentralNode(item.title, item.pageid)
          searchBar.value = ''
          suggestionsEl.innerHTML = ''
          suggestionsEl.style.display = 'none'
        })
      })
    } catch (error) {
      console.error('Error fetching search suggestions:', error)
    }
  })

  // hide suggestions if clicking outside the search area
  document.addEventListener('click', (e) => {
    if (!searchBar.contains(e.target) && !suggestionsEl.contains(e.target)) {
      suggestionsEl.innerHTML = ''
      suggestionsEl.style.display = 'none'
    }
  })
}

// if no query, show trending articles as suggestions
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

// show a list of trending articles in the suggestions list
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
           !title.includes("citation needed")
  })
  if (filtered.length === 0) {
    const li = document.createElement('li')
    li.textContent = "No trending articles found."
    suggestionsEl.appendChild(li)
    return
  }
  filtered.slice(0, 10).forEach(article => {
    const li = document.createElement('li')
    li.textContent = article.article.replace(/_/g, ' ')
    li.dataset.article = article.article
    suggestionsEl.appendChild(li)
    // when a trending suggestion is clicked, add the node and hide suggestions
    li.addEventListener('click', async (e) => {
      e.preventDefault()
      e.stopPropagation()
      // remove focus so suggestions don't reappear
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
