async function request(url) {
  const response = await fetch(url)
  let data = {}
  try { data = await response.json() } catch { /* Keep the fallback error below. */ }
  if (!response.ok) throw new Error(data.error || `Game database request failed (${response.status}).`)
  return data
}

// Requests go through Vercel serverless functions so Twitch credentials stay on the server.
export const apiProxyEnabled = true

export async function getGames({ search = '', ordering = '-rating' } = {}) {
  const params = new URLSearchParams({ search, ordering })
  return request(`/api/games?${params.toString()}`)
}

export function getGameDetails(id) {
  return request(`/api/games/${encodeURIComponent(id)}`)
}
