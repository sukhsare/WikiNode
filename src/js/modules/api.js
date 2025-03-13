import { SEARCH_API_URL, LINKS_API_URL, PAGEVIEWS_API_URL } from '../config.js'

// caches for pageviews, link counts, page ids and all links
const pageviewsCache = new Map()
const linkCountCache = new Map()
const pageIdCache = {}  // key is lowercased title
const allLinksCache = new Map()

// helper function to sleep for ms milliseconds
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// get total pageviews for a given title
export async function getPageviews(title) {
  if (pageviewsCache.has(title)) return pageviewsCache.get(title)
  const formattedTitle = title.replace(/ /g, "_")
  const url = PAGEVIEWS_API_URL.replace("{title}", encodeURIComponent(formattedTitle))
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error("http error " + response.status)
    const data = await response.json()
    const totalViews = data.items ? data.items.reduce((sum, item) => sum + item.views, 0) : 0
    pageviewsCache.set(title, totalViews)
    return totalViews
  } catch (error) {
    console.error("error fetching pageviews for", title, error)
    return 0
  }
}

// get link count for a given title
export async function getLinkCount(title) {
  if (linkCountCache.has(title)) return linkCountCache.get(title)
  const formattedTitle = title.replace(/ /g, "_")
  const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=info&inprop=linkcount&titles=${encodeURIComponent(formattedTitle)}&origin=*`
  let retries = 3
  while (retries > 0) {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        if (response.status === 429) {
          console.warn(`too many requests for ${title} retrying`)
          await sleep(1000)
          retries--
          continue
        }
        throw new Error("http error " + response.status)
      }
      const data = await response.json()
      const pages = data.query.pages
      const firstPageKey = Object.keys(pages)[0]
      let count = pages[firstPageKey].linkcount
      if (typeof count !== 'number' || count === 0) {
        const pageid = pages[firstPageKey].pageid
        if (pageid) {
          const links = await getAllLinks(pageid)
          count = links.length
        }
      }
      console.log(`link count for ${title} is ${count}`)
      linkCountCache.set(title, count)
      return count
    } catch (error) {
      console.error(`error fetching link count for ${title}`, error)
      retries--
      if (retries === 0) return 0
      await sleep(1000)
    }
  }
  return 0
}

// get page ids for a list of titles
export async function getPageIdsForTitles(titles) {
  const uniqueTitles = Array.from(new Set(titles.map(t => t.trim())))
  if (uniqueTitles.length === 0) return {}
  const joinedTitles = uniqueTitles.join("|")
  const url = `${SEARCH_API_URL}&titles=${encodeURIComponent(joinedTitles)}&prop=pageids`
  const maxRetries = 3
  let attempt = 0
  while (attempt < maxRetries) {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        if (response.status === 429) {
          await sleep(1000 * (attempt + 1))
          attempt++
          continue
        }
        throw new Error("http error " + response.status)
      }
      const data = await response.json()
      if (!data.query || !data.query.pages) throw new Error("missing pages in response")
      const pages = data.query.pages
      const result = {}
      Object.keys(pages).forEach(key => {
        const page = pages[key]
        result[page.title.toLowerCase()] = page.pageid
        pageIdCache[page.title.toLowerCase()] = page.pageid
      })
      return result
    } catch (error) {
      attempt++
      if (attempt >= maxRetries) {
        console.error("error fetching batch page ids for", uniqueTitles, error)
        return {}
      }
      await sleep(1000 * attempt)
    }
  }
  return {}
}

// get page id for a single title
export async function getPageIdByTitle(title) {
  const key = title.toLowerCase()
  if (pageIdCache[key]) return pageIdCache[key]
  const result = await getPageIdsForTitles([title])
  return result[key] || null
}

// get all links for a given page id
export async function getAllLinks(pageid) {
  if (allLinksCache.has(pageid)) return allLinksCache.get(pageid)
  let allLinks = []
  let plcontinue = null
  do {
    const url = `${LINKS_API_URL}&pageids=${pageid}${plcontinue ? `&plcontinue=${encodeURIComponent(plcontinue)}` : ""}`
    const response = await fetch(url)
    const data = await response.json()
    if (!data.query || !data.query.pages || !data.query.pages[pageid]) {
      console.warn("unexpected response structure in getAllLinks", data)
      return allLinks
    }
    const page = data.query.pages[pageid]
    if (page.links) allLinks = allLinks.concat(page.links)
    plcontinue = data.continue ? data.continue.plcontinue : null
  } while (plcontinue)
  allLinksCache.set(pageid, allLinks)
  return allLinks
}

// fetch trending articles from Wikipedia pageviews API
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

// fetch a random article (main namespace only, rnnamespace=0)
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

// fetch related articles using the search API
export async function getRelatedArticles(title) {
  // build the url to get related pages using srsearch
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(title)}&srlimit=10&format=json&origin=*`
  try {
    const response = await fetch(url, { mode: "cors" })
    if (!response.ok) {
      throw new Error(`http error ${response.status}`)
    }
    const data = await response.json()
    console.debug("search response for", title, data)
    // map the results to an array of objects with title and snippet
    const relatedArticles = data.query.search.map(result => ({
      title: result.title,
      snippet: result.snippet || ""
    }))
    return relatedArticles
  } catch (error) {
    console.error("error in getRelatedArticles for", title, error)
    return []
  }
}
