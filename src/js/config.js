export const SEARCH_API_URL = "https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*"
export const LINKS_API_URL = `${SEARCH_API_URL}&prop=links&pllimit=max`

/* function to get date range for the last full week
    (7 day period ending with yesterday) */
function getLastWeekDateRange() {
  const now = new Date()
  // use yesterday as the end date so we get a full day of data
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  // the start date is 6 days before yesterday to make a 7 day period
  const startDate = new Date(yesterday.getTime() - 6 * 24 * 60 * 60 * 1000)

  //format dates as yyyymmdd
  const formatDate = date =>
    date.getFullYear().toString() +
    (date.getMonth() + 1).toString().padStart(2, "0") +
    date.getDate().toString().padStart(2, "0")

  return { start: formatDate(startDate), end: formatDate(yesterday) }
}

const { start, end } = getLastWeekDateRange()

//update the pageviews api url to use the last week date range
export const PAGEVIEWS_API_URL = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/all-agents/{title}/daily/${start}/${end}`
