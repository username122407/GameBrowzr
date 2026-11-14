import { json, searchGames } from '../lib/igdb.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed.' })
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.slice(0, 100) : ''
    const ordering = ['-rating', '-released', 'name'].includes(req.query.ordering) ? req.query.ordering : '-rating'
    const offset = Math.max(0, Number(req.query.offset) || 0)
    const platform = typeof req.query.platform === 'string' ? req.query.platform : 'All platforms'
    const genre = typeof req.query.genre === 'string' ? req.query.genre : 'All genres'
    const page = await searchGames({ search, ordering, offset, platform, genre })
    return json(res, 200, page)
  } catch (error) {
    return json(res, error.status || 500, { error: error.message || 'Unable to load games.' })
  }
}
