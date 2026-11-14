const IGDB_BASE = 'https://api.igdb.com/v4'

let cachedToken = null
let tokenExpiresAt = 0
const responseCache = new Map()
const CACHE_TTL = 4 * 60 * 1000
const CACHE_MAX = 70

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
  const cacheKey = `${endpoint}:${query}`
  const hit = responseCache.get(cacheKey)
  if (hit && Date.now() - hit.time < CACHE_TTL) return hit.value
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
  const value = await response.json()
  if (responseCache.size >= CACHE_MAX) responseCache.delete(responseCache.keys().next().value)
  responseCache.set(cacheKey, { value, time: Date.now() })
  return value
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
    // Landscape artwork only for the wide spotlight; never stretch portrait covers.
    spotlight_image: imageUrl(game.artworks?.[0]?.image_id || game.screenshots?.[0]?.image_id, 't_1080p'),
    rating: typeof game.rating === 'number' ? Number((game.rating / 20).toFixed(1)) : 0,
    released: game.first_release_date ? new Date(game.first_release_date * 1000).toISOString().slice(0, 10) : '',
    genres: (game.genres || []).map(genre => ({ name: genre.name })),
    parent_platforms: groups.map(name => ({ platform: { name } })),
    platforms: platforms,
    description_raw: game.summary || game.storyline || '',
    screenshots: (game.screenshots || []).slice(0, 6).map(item => imageUrl(item.image_id, 't_screenshot_big')),
    game_type: game.game_type,
    videos: (game.videos || []).filter(v => v.video_id).slice(0, 3).map(v => ({ id: v.video_id, name: v.name || 'Trailer' })),
    developers: (game.involved_companies || []).filter(c => c.developer).map(c => c.company?.name).filter(Boolean),
  }
}

export async function searchGames({ search = '', ordering = '-rating', offset = 0, limit = 60, platform = 'All platforms', genre = 'All genres' } = {}) {
  const safeOffset = Math.max(0, Math.min(100000, Math.floor(Number(offset) || 0)))
  const safeLimit = Math.max(1, Math.min(500, Math.floor(Number(limit) || 60)))
  const escaped = String(search).trim().slice(0, 100).replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  const searchClause = escaped ? `search "${escaped}";` : ''
  // Searching IGDB is server-side. Avoid excluding editions, unrated games, or games without artwork.
  const conditions = ['game_type = (0,8,9)']
  // Main games, remakes and remasters only; DLC, expansions, bundles and editions are excluded.
  const platformIds = {
    'PC': [6, 14, 3], 'PlayStation': [7, 8, 9, 48, 167, 38, 46],
    'Xbox': [11, 12, 49, 169], 'Nintendo': [130, 137, 4, 18, 19, 21, 37, 41, 5, 20, 159],
    'Mobile': [34, 39], 'iOS': [39], 'Android': [34]
  }
  if (platformIds[platform]) conditions.push(`platforms = (${platformIds[platform].join(',')})`)
  // Genre filtering uses IGDB genre IDs; client requests a stable catalog of genre names.
  const genreIds = {
    'Action': 25, 'Adventure': 31, 'Arcade': 33, 'Fighting': 4,
    'Indie': 32, 'Music': 7, 'Platform': 8, 'Puzzle': 9,
    'Racing': 10, 'Role-playing (RPG)': 12, 'Shooter': 5,
    'Simulator': 13, 'Sport': 14, 'Strategy': 15, 'Tactical': 24,
    'Turn-based strategy (TBS)': 16, 'Visual Novel': 34
  }
  if (genreIds[genre]) conditions.push(`genres = (${genreIds[genre]})`)
  const whereClause = conditions.length ? `where ${conditions.join(' & ')};` : ''
  // Search relevance is prioritized for text searches; sorting is for discovery browsing.
  const sort = escaped ? '' : ordering === '-released' ? 'sort first_release_date desc;' : ordering === 'name' ? 'sort name asc;' : 'sort rating desc;'
  const fields = 'fields id,name,slug,summary,storyline,cover.image_id,first_release_date,rating,genres.name,platforms.name,screenshots.image_id,artworks.image_id,game_type;' 
  const query = `${searchClause} ${fields} ${whereClause} ${sort} limit ${safeLimit}; offset ${safeOffset};`
  const games = await igdbRequest('games', query)
  return { results: games.map(normalizeGame), hasMore: games.length === safeLimit, nextOffset: safeOffset + games.length }
}

// Independent, high-quality editorial spotlight feed. Prefer landscape artwork
// with source dimensions suitable for wide displays; never use portrait covers.
export async function getSpotlightFeed() {
  const query = `fields id,name,slug,summary,cover.image_id,first_release_date,rating,genres.name,platforms.name,artworks.image_id,artworks.width,artworks.height,screenshots.image_id,screenshots.width,screenshots.height,game_type,total_rating_count;
    where game_type = (0,8,9) & total_rating_count > 150 & (artworks != null | screenshots != null);
    sort total_rating_count desc; limit 100;`
  const results = await igdbRequest('games', query)
  return results.map(game => {
    const media = [...(game.artworks || []), ...(game.screenshots || [])]
      .filter(item => item.image_id && item.width >= 1280 && item.height >= 720 && item.width / item.height >= 1.5)
      .sort((a,b) => (b.width * b.height) - (a.width * a.height))
    if (!media.length) return null
    return { ...normalizeGame(game), spotlight_image: imageUrl(media[0].image_id, 't_1080p') }
  }).filter(Boolean).slice(0, 12)
}

// Only publish direct product URLs returned by IGDB. Never infer a product URL
// from the game's title or claim that a platform guarantees a store listing.
const STORE_HOSTS = [
  { label: 'Steam', hosts: ['store.steampowered.com'], path: /^\/app\/\d+(?:\/|$)/i },
  { label: 'GOG', hosts: ['gog.com', 'www.gog.com'], path: /^\/(?:[a-z]{2}\/)?game\/[^/]+/i },
  { label: 'Epic Games Store', hosts: ['store.epicgames.com'], path: /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?p\/[^/]+/i },
  { label: 'PlayStation Store', hosts: ['store.playstation.com'], path: /^\/[^/]+\/product\/[^/]+/i },
  { label: 'Xbox Store', hosts: ['xbox.com', 'www.xbox.com', 'microsoft.com', 'www.microsoft.com', 'apps.microsoft.com'], path: /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?(?:games\/store\/|store\/productid\/|p\/|store\/apps\/|detail\/)/i },
  { label: 'Nintendo', hosts: ['nintendo.com', 'www.nintendo.com'], path: /^\/(?:[a-z]{2}\/)?store\/products\/[^/]+/i },
  { label: 'Apple App Store', hosts: ['apps.apple.com'], path: /^\/[^/]+\/app\/[^/]+\/id\d+/i },
  { label: 'Google Play', hosts: ['play.google.com'], path: /^\/store\/apps\/details/i },
  { label: 'itch.io', hosts: ['itch.io'], subdomain: true, path: /^\/[^/]+/i },
]

function directStore(urlString) {
  if (typeof urlString !== 'string' || urlString.length > 2048) return null
  try {
    const url = new URL(urlString)
    if (url.protocol !== 'https:' || url.username || url.password) return null
    const host = url.hostname.toLowerCase()
    const store = STORE_HOSTS.find(item => item.hosts
      ? item.hosts.includes(host)
      : item.subdomain && host.endsWith('.' + item.label.toLowerCase()))
    if (!store || !store.path.test(url.pathname)) return null
    if (store.label === 'Google Play' && !url.searchParams.has('id')) return null
    return { label: store.label, url: url.href, type: 'direct' }
  } catch { return null }
}

async function getStoreLinks(gameId) {
  // IGDB's external_games and websites datasets are complementary; either may
  // have a store listing missing from the other. Failure is non-fatal to details.
  const [external, websites] = await Promise.allSettled([
    igdbRequest('external_games', `fields url,uid,external_game_source.name; where game = ${gameId}; limit 100;`),
    igdbRequest('websites', `fields url,type.name; where game = ${gameId}; limit 100;`),
  ])
  const rows = [
    ...(external.status === 'fulfilled' ? external.value : []),
    ...(websites.status === 'fulfilled' ? websites.value : []),
  ]
  // Exactly one verified direct product listing per storefront.
  // Prefer the first valid listing; never show duplicate Steam (or other store) buttons.
  const byStore = new Map()
  for (const row of rows) {
    const store = directStore(row.url)
    if (store && !byStore.has(store.label)) byStore.set(store.label, store)
  }
  return [...byStore.values()]
}

export async function getGame(id) {
  const safeId = Number(id)
  if (!Number.isSafeInteger(safeId) || safeId < 1) return null
  const query = `fields id,name,slug,summary,storyline,cover.image_id,first_release_date,rating,genres.name,platforms.name,screenshots.image_id,artworks.image_id,videos.video_id,videos.name,involved_companies.developer,involved_companies.company.name,game_type; where id = ${safeId}; limit 1;`
  const games = await igdbRequest('games', query)
  if (!games[0]) return null
  const game = normalizeGame(games[0])
  game.storeLinks = await getStoreLinks(safeId)
  return game
}

export { json }
