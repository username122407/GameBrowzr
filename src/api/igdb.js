async function request(url, isValid) {
  const response = await fetch(url)
  let data
  try { data = await response.json() } catch { /* Keep the fallback error below. */ }
  if (!response.ok) throw new Error(data?.error || `Game database request failed (${response.status}).`)
  if (!data || !isValid(data)) throw new Error("The game database returned an unexpected response.")
  return data
}

// Requests go through Vercel serverless functions so Twitch credentials stay on the server.
export const apiProxyEnabled = true

const hasResults = data => Array.isArray(data.results)

export async function getGames({ search = '', ordering = '-rating', offset = 0, platform = 'All platforms', genre = 'All genres' } = {}) {
  const params = new URLSearchParams({ search, ordering, offset: String(offset), platform, genre })
  return request(`/api/games?${params.toString()}`, hasResults)
}

export function getGameDetails(id) {
  return request(`/api/games/${encodeURIComponent(id)}`, data => String(data.id) === String(id))
}

export function getSpotlightGames(day) {
  return request(`/api/spotlight?day=${day}`, data => hasResults(data) && Number.isInteger(data.day))
}
