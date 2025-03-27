import { SEARCH_API_URL } from '../config.js'
import { getPageIdByTitle } from './api.js'
import { createCentralNode } from './graph.js'
import { fetchTrendingArticles } from './api.js'

let trendingCache = null

export function initSearch() {
  const searchBar = document.getElementById('search-bar')
  const suggestionsList = document.getElementById('suggestions')

  // when the search bar gets focus or is clicked, show suggestions and handle trending articles
  searchBar.addEventListener('focus', handleTrending)
  searchBar.addEventListener('click', () => {
    suggestionsList.style.display = 'block'
    handleTrending()
  })

  // update suggestions as the user types
  searchBar.addEventListener('input', async () => {
    suggestionsList.style.display = 'block'
    const query = searchBar.value.trim()
    if (!query) {
      handleTrending()
      return
    }
    try {
      // fetch search results from Wikipedia
      const response = await fetch(`${SEARCH_API_URL}&list=search&srsearch=${encodeURIComponent(query)}`)
      const data = await response.json()
      suggestionsList.innerHTML = ''
      if (!data.query?.search?.length) {
        const li = document.createElement('li')
        li.textContent = "no results found"
        suggestionsList.appendChild(li)
        return
      }
      // sort results so titles that start with the query appear first
      const sortedResults = data.query.search.sort((a, b) => {
        const aTitle = a.title.toLowerCase()
        const bTitle = b.title.toLowerCase()
        const q = query.toLowerCase()
        return (aTitle.startsWith(q) ? 0 : 1) - (bTitle.startsWith(q) ? 0 : 1)
      })
      // loop through sorted results and create list items
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
          lowerTitle.includes(".jpg") ||
          lowerTitle.startsWith(".xxx")
        )
          return

        const li = document.createElement('li')
        li.textContent = item.title
        li.dataset.pageid = item.pageid
        suggestionsList.appendChild(li)
        li.addEventListener('click', (e) => {
          e.preventDefault()
          e.stopPropagation()
          searchBar.blur()
          createCentralNode(item.title, item.pageid)
          searchBar.value = ''
          suggestionsList.innerHTML = ''
          suggestionsList.style.display = 'none'
        })
      })
    } catch (err) {
      console.error('error fetching search suggestions', err)
    }
  })

  // hide suggestions if click happens outside the search bar or suggestions
  document.addEventListener('click', (e) => {
    if (!searchBar.contains(e.target) && !suggestionsList.contains(e.target)) {
      suggestionsList.innerHTML = ''
      suggestionsList.style.display = 'none'
    }
  })
}

// when search bar is empty, fetch trending articles to show as suggestions
async function handleTrending() {
  const searchBar = document.getElementById('search-bar')
  const suggestionsList = document.getElementById('suggestions')
  if (searchBar.value.trim() !== "") return
  if (trendingCache) {
    populateTrending(trendingCache)
  } else {
    trendingCache = await fetchTrendingArticles()
    populateTrending(trendingCache)
  }
}

// populate suggestions with trending articles
function populateTrending(articles) {
  const suggestionsList = document.getElementById('suggestions')
  suggestionsList.innerHTML = ''
  suggestionsList.style.display = 'block'
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
    suggestionsList.appendChild(li)
    return
  }
  filtered.slice(0, 10).forEach(article => {
    const li = document.createElement('li')
    li.textContent = article.article.replace(/_/g, ' ')
    li.dataset.article = article.article
    suggestionsList.appendChild(li)
    li.addEventListener('click', async (e) => {
      e.preventDefault()
      e.stopPropagation()
      document.getElementById('search-bar').blur()
      suggestionsList.innerHTML = ''
      suggestionsList.style.display = 'none'
      const displayTitle = li.dataset.article.replace(/_/g, ' ')
      let pageid = await getPageIdByTitle(displayTitle)
      if (!pageid) pageid = displayTitle
      createCentralNode(displayTitle, pageid)
      document.getElementById('search-bar').value = ''
    })
  })
}
