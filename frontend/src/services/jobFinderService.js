import api from '../api'

export async function interpretSearch(message, searchId = null) {
  const { data } = await api.post('/jobs/finder/interpret', { message, search_id: searchId })
  return data
}

export async function runSearch(searchId, filters, sendEmail = false) {
  const { data } = await api.post(`/jobs/finder/searches/${searchId}/run`, { filters, send_email: sendEmail })
  return data
}

export async function getSearches(limit = 20, offset = 0) {
  const { data } = await api.get('/jobs/finder/searches', { params: { limit, offset } })
  return Array.isArray(data?.searches) ? data.searches : []
}

export async function getSearchResults(searchId) {
  // A search can save up to 30 results; request enough to load them all.
  const { data } = await api.get(`/jobs/finder/searches/${searchId}/results`, { params: { limit: 50 } })
  return data.results || []
}

export async function generateCoverLetter(searchId, resultId) {
  const { data } = await api.post(`/jobs/finder/searches/${searchId}/results/${resultId}/cover-letter`)
  return data
}

export async function deleteSearchResult(searchId, resultId) {
  const { data } = await api.delete(`/jobs/finder/searches/${searchId}/results/${resultId}`)
  return data
}

export async function getSearchSchedule(searchId) {
  const { data } = await api.get(`/jobs/finder/searches/${searchId}/schedule`)
  return data.schedule
}

export async function saveSearchSchedule(searchId, schedule) {
  const { data } = await api.patch(`/saved-searches/${searchId}/schedule`, schedule)
  return data.schedule
}

export async function runSavedSearchNow(searchId) {
  const { data } = await api.post(`/saved-searches/${searchId}/run-now`)
  return data
}

export async function pauseSearchSchedule(searchId) {
  const { data } = await api.delete(`/jobs/finder/searches/${searchId}/schedule`)
  return data
}
