/* config.js */
// This file sets up the API URLs we use to get Wikipedia data

export const SEARCH_API_URL = "https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*"
export const LINKS_API_URL = `${SEARCH_API_URL}&prop=links&pllimit=max`

// Function to get date range for the last full week (7 days ending yesterday)
function getLastWeekDateRange() {
  const now = new Date();
  // Use yesterday as the end date to ensure a full day of data
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  // The start date is 6 days before yesterday (making a 7-day period)
  const startDate = new Date(yesterday.getTime() - 6 * 24 * 60 * 60 * 1000);

  // Format dates as YYYYMMDD
  const formatDate = date =>
    date.getFullYear().toString() +
    (date.getMonth() + 1).toString().padStart(2, '0') +
    date.getDate().toString().padStart(2, '0');

  return { start: formatDate(startDate), end: formatDate(yesterday) };
}

const { start, end } = getLastWeekDateRange();

// Update the PAGEVIEWS_API_URL to use the last week date range
export const PAGEVIEWS_API_URL = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/all-agents/{title}/daily/${start}/${end}`
