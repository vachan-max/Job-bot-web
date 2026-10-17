import api from '../api'

export async function interpretSearch(message, searchId = null) {
  const { data } = await api.post('/jobs/finder/interpret', { message, search_id: searchId })
  return data
}

export async function runSearch(searchId, filters, sendEmail = false) {
  const { data } = await api.post(`/jobs/finder/searches/${searchId}/run`, { filters, send_email: sendEmail })
  return data
}

export async function getSearches() {
  const { data } = await api.get('/jobs/finder/searches')
  return data.searches || []
}

export async function getSearchResults(searchId) {
  // A search can save up to 30 results; request enough to load them all.
  const { data } = await api.get(`/jobs/finder/searches/${searchId}/results`, { params: { limit: 50 } })
  return data.results || []
}
