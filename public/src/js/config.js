export const SEARCH_API_URL = "https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*"
export const LINKS_API_URL = `${SEARCH_API_URL}&prop=links&pllimit=max`

// get last week's date range (7 days ending yesterday)
// subtract one day for yesterday and then 6 more days for the start date
function getLastWeekDateRange() {
  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000) // subtract one day
  const startDate = new Date(yesterday.getTime() - 6 * 24 * 60 * 60 * 1000) // 6 days before yesterday

  // format date as yyyymmdd
  const formatDate = date =>
    date.getFullYear().toString() +
    (date.getMonth() + 1).toString().padStart(2, "0") +
    date.getDate().toString().padStart(2, "0")

  return { start: formatDate(startDate), end: formatDate(yesterday) }
}

const { start, end } = getLastWeekDateRange()

// update the pageviews api url to use last week's date range
export const PAGEVIEWS_API_URL = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/all-agents/{title}/daily/${start}/${end}`