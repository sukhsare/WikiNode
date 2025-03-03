// this file has functions to talk to wikipedia's apis

import { SEARCH_API_URL, LINKS_API_URL, PAGEVIEWS_API_URL } from '../config.js'

// a simple cache so we don't fetch pageviews for the same article twice
const pageviewsCache = new Map()

// gets the total pageviews for an article title
export async function getPageviews(title) {
  // if we've already got the views, just return them
  if (pageviewsCache.has(title)) {
    return pageviewsCache.get(title)
  }
  // replace spaces with underscores for the api
  const formattedTitle = title.replace(/ /g, "_")
  const url = PAGEVIEWS_API_URL.replace("{title}", encodeURIComponent(formattedTitle))
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error("HTTP error: " + response.status)
    const data = await response.json()
    // sum up all the views from the items, or default to 0 if none
    const totalViews = data.items ? data.items.reduce((sum, item) => sum + item.views, 0) : 0
    pageviewsCache.set(title, totalViews)
    return totalViews
  } catch (error) {
    console.error("error fetching pageviews for", title, error)
    return 0
  }
}

// gets the page id for a given article title
export async function getPageIdByTitle(title) {
  try {
    const response = await fetch(`${SEARCH_API_URL}&titles=${encodeURIComponent(title)}&prop=pageids`)
    const data = await response.json()
    const pageIds = Object.keys(data.query.pages)
    return pageIds.length > 0 ? pageIds[0] : null
  } catch (error) {
    console.error("error fetching page id for", title, error)
    return null
  }
}

// gets all the linked articles for a given page id
export async function getAllLinks(pageid) {
  let allLinks = []
  let plcontinue = null
  do {
    const url = `${LINKS_API_URL}&pageids=${pageid}${plcontinue ? `&plcontinue=${encodeURIComponent(plcontinue)}` : ""}`
    const response = await fetch(url)
    const data = await response.json()
    if (!data.query || !data.query.pages || !data.query.pages[pageid]) {
      console.warn("unexpected response structure in getAllLinks:", data)
      return allLinks
    }
    const page = data.query.pages[pageid]
    if (page.links) {
      allLinks = allLinks.concat(page.links)
    }
    plcontinue = data.continue ? data.continue.plcontinue : null
  } while (plcontinue)
  return allLinks
}

// gets trending articles using yesterday's data
export async function fetchTrendingArticles() {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const year = yesterday.getFullYear()
  const month = (yesterday.getMonth() + 1).toString().padStart(2, "0")
  const day = yesterday.getDate().toString().padStart(2, "0")
  const endpoint = `https://wikimedia.org/api/rest_v1/metrics/pageviews/top/en.wikipedia/all-access/${year}/${month}/${day}`
  try {
    const response = await fetch(endpoint)
    const data = await response.json()
    if (data.items && data.items.length > 0) {
      return data.items[0].articles
    } else {
      console.warn("no trending data available for", endpoint)
      return []
    }
  } catch (error) {
    console.error("error fetching trending articles", error)
    return []
  }
}

// gets a random article from wikipedia
export async function fetchRandomArticle() {
  try {
    const randomEndpoint = "https://en.wikipedia.org/w/api.php?action=query&list=random&rnnamespace=0&rnlimit=1&format=json&origin=*"
    const response = await fetch(randomEndpoint)
    const data = await response.json()
    if (data.query && data.query.random && data.query.random.length > 0) {
      return data.query.random[0]
    }
    return null
  } catch (error) {
    console.error("error fetching random article", error)
    return null
  }
}
