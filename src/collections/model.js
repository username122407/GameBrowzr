export const defaultPreferences = { spotlightAutoplay: true }
export const emptyCollections = { wishlist: [], library: {} }
export const guestKeys = {
  wishlist: 'gamebrowzr-wishlist',
  library: 'gamebrowzr-library',
  preferences: 'gamebrowzr-preferences',
}

export const isLibraryStatus = status => status === 'playing' || status === 'completed'
const validId = id => (Number.isSafeInteger(id) && id > 0) ||
  (typeof id === 'string' && /^(?:[1-9][0-9]{0,15}|demo-[0-9]{1,10})$/.test(id))

function validGame(game) {
  return game && validId(game.id) && typeof game.name === 'string' && game.name.trim()
}

function read(storage, key) {
  try { return JSON.parse(storage.getItem(key)) } catch { return null }
}

export function readGuest(storage) {
  const saved = read(storage, guestKeys.wishlist)
  const tracked = read(storage, guestKeys.library)
  const wishlist = Array.isArray(saved) ? [...new Map(saved.filter(validGame).map(game => [String(game.id), game])).values()] : []
  const library = Object.fromEntries(Object.values(tracked || {})
    .filter(entry => isLibraryStatus(entry?.status) && validGame(entry.game))
    .map(entry => [String(entry.game.id), entry]))
  return { wishlist, library }
}

export function readGuestPreferences(storage) {
  const preferences = read(storage, guestKeys.preferences)
  return { spotlightAutoplay: preferences?.spotlightAutoplay !== false }
}

export function hasWishlistGame(wishlist, id) {
  return wishlist.some(game => String(game.id) === String(id))
}

export function updateCollections(collections, kind, game, status) {
  if (kind === 'wishlist') {
    const others = collections.wishlist.filter(item => String(item.id) !== String(game.id))
    return { ...collections, wishlist: status ? [...others, game] : others }
  }
  const library = { ...collections.library }
  if (isLibraryStatus(status)) library[game.id] = { game, status }
  else delete library[game.id]
  return { ...collections, library }
}

function safeArtwork(value) {
  if (typeof value !== 'string') return ''
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password &&
      ['images.igdb.com', 'images.unsplash.com'].includes(url.hostname) ? url.href : ''
  } catch { return '' }
}

export function collectionRow(userId, kind, game, status) {
  if (!validGame(game)) throw new Error('This game cannot be saved.')
  const labels = items => Array.isArray(items) ? items.filter(value => typeof value === 'string').slice(0, 32).map(value => value.slice(0, 120)) : []
  const image = safeArtwork(game.background_image)
  return {
    user_id: userId,
    game_id: String(game.id),
    kind,
    status: kind === 'library' ? status : null,
    game: {
      id: /^\d+$/.test(String(game.id)) ? Number(game.id) : game.id,
      name: game.name.trim().slice(0, 256),
      background_image: image.length <= 2048 ? image : '',
      released: /^\d{4}-\d{2}-\d{2}$/.test(game.released) ? game.released : '',
      rating: typeof game.rating === 'number' && game.rating > 0 && game.rating <= 5 ? game.rating : null,
      genres: labels(Array.isArray(game.genres) ? game.genres.map(genre => genre?.name) : []).map(name => ({ name })),
      platforms: labels(game.platforms),
      parent_platforms: labels(Array.isArray(game.parent_platforms) ? game.parent_platforms.map(item => item?.platform?.name) : []).map(name => ({ platform: { name } })),
    },
  }
}

export function decodeCollections(rows) {
  const wishlist = []
  const library = {}
  for (const row of rows) {
    try {
      const game = collectionRow(row.user_id, row.kind, row.game, row.status).game
      if (String(game.id) !== row.game_id) continue
      if (row.kind === 'wishlist') wishlist.push(game)
      if (row.kind === 'library' && isLibraryStatus(row.status)) library[game.id] = { game, status: row.status }
    } catch { /* Skip malformed snapshots. */ }
  }
  return { wishlist, library }
}

export function guestImportRows(guest, userId) {
  return [
    ...guest.wishlist.map(game => collectionRow(userId, 'wishlist', game, null)),
    ...Object.values(guest.library).map(({ game, status }) => collectionRow(userId, 'library', game, status)),
  ]
}
