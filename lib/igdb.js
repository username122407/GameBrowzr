const IGDB_BASE = 'https://api.igdb.com/v4'

let cachedToken = null
let tokenExpiresAt = 0

function json(res, status, payload) {
  res.status(status).setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
  return res.end(JSON.stringify(payload))
}

async function getAccessToken() {
  const clientId = process.env.TWITCH_CLIENT_ID
  const clientSecret = process.env.TWITCH_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    const error = new Error('IGDB is not configured yet. Add TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET in Vercel Environment Variables.')
    error.status = 503
    throw error
  }

  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) return cachedToken

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'client_credentials',
  })
  const response = await fetch(`https://id.twitch.tv/oauth2/token?${params}`, { method: 'POST' })
  if (!response.ok) {
    const error = new Error(`Twitch authentication failed (${response.status}). Check your Twitch application credentials.`)
    error.status = 502
    throw error
  }
  const data = await response.json()
  cachedToken = data.access_token
  tokenExpiresAt = Date.now() + (Number(data.expires_in) || 3600) * 1000
  return cachedToken
}

async function igdbRequest(endpoint, query) {
  const clientId = process.env.TWITCH_CLIENT_ID
  const token = await getAccessToken()
  const response = await fetch(`${IGDB_BASE}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Client-ID': clientId,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'text/plain',
      Accept: 'application/json',
    },
    body: query,
  })

  if (!response.ok) {
    const error = new Error(`IGDB request failed (${response.status}). Please try again later.`)
    error.status = response.status === 429 ? 429 : 502
    throw error
  }
  return response.json()
}

function platformGroup(name = '') {
  const value = name.toLowerCase()
  if (value.includes('playstation') || /^ps[1-5]/.test(value)) return 'PlayStation'
  if (value.includes('xbox')) return 'Xbox'
  if (value.includes('nintendo') || value.includes('switch') || value.includes('wii') || value.includes('game boy')) return 'Nintendo'
  if (value.includes('ios') || value.includes('iphone') || value.includes('ipad')) return 'iOS'
  if (value.includes('android')) return 'Android'
  if (value.includes('windows') || value.includes('pc') || value.includes('linux') || value.includes('mac')) return 'PC'
  return null
}

function imageUrl(imageId, size = 't_cover_big') {
  return imageId ? `https://images.igdb.com/igdb/image/upload/${size}/${imageId}.jpg` : ''
}

export function normalizeGame(game) {
  const platforms = (game.platforms || []).map(platform => platform.name).filter(Boolean)
  const groups = [...new Set(platforms.map(platformGroup).filter(Boolean))]
  return {
    id: game.id,
    name: game.name || 'Untitled game',
    slug: game.slug || '',
    background_image: imageUrl(game.cover?.image_id, 't_cover_big'),
    rating: typeof game.rating === 'number' ? Number((game.rating / 20).toFixed(1)) : 0,
    released: game.first_release_date ? new Date(game.first_release_date * 1000).toISOString().slice(0, 10) : '',
    genres: (game.genres || []).map(genre => ({ name: genre.name })),
    parent_platforms: groups.map(name => ({ platform: { name } })),
    platforms: platforms,
    description_raw: game.summary || game.storyline || '',
  }
}

export async function searchGames({ search = '', ordering = '-rating' } = {}) {
  const sort = ordering === '-released'
    ? 'sort first_release_date desc;'
    : ordering === 'name'
      ? 'sort name asc;'
      : 'sort rating desc;'
  const escaped = search.trim().replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  const searchClause = escaped ? `search "${escaped}";` : ''
  const query = `${searchClause}fields id,name,slug,summary,storyline,cover.image_id,first_release_date,rating,genres.name,platforms.name; where game_type = 0; ${sort} limit 40;`
  const games = await igdbRequest('games', query)
  return games.map(normalizeGame)
}

export async function getGame(id) {
  const query = `fields id,name,slug,summary,storyline,cover.image_id,first_release_date,rating,genres.name,platforms.name; where id = ${Number(id)}; limit 1;`
  const games = await igdbRequest('games', query)
  return games[0] ? normalizeGame(games[0]) : null
}

export { json }
