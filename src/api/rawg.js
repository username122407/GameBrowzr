const API_BASE = 'https://api.rawg.io/api'
const API_KEY = import.meta.env.VITE_RAWG_API_KEY

export const hasApiKey = Boolean(API_KEY && API_KEY !== 'your_rawg_api_key_here')

async function request(path, params = {}) {
  if (!hasApiKey) throw new Error('RAWG API key is not configured.')
  const url = new URL(`${API_BASE}${path}`)
  url.search = new URLSearchParams({ key: API_KEY, ...params }).toString()
  const response = await fetch(url)
  if (!response.ok) {
    if (response.status === 401) throw new Error('RAWG rejected the API key. Check your .env.local file.')
    if (response.status === 429) throw new Error('RAWG request limit reached. Please try again later.')
    throw new Error(`RAWG request failed (${response.status}).`)
  }
  return response.json()
}

export function getGames({ search = '', page = 1, ordering = '-rating' } = {}) {
  const data = await request('/games', {
    page: String(page),
    page_size: '40',
    ordering,
    ...(search.trim() ? { search: search.trim() } : {}),
  })
  // Keep adult-only and mature-rated titles out of the default student project catalog.
  data.results = (data.results || []).filter(game => {
    const rating = game.esrb_rating?.name?.toLowerCase() || ''
    return rating !== 'mature' && rating !== 'adults only'
  }).slice(0, 24)
  return data
}

export function getGameDetails(id) {
  return request(`/games/${id}`)
}