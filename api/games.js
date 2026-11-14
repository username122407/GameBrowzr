import { json, searchGames } from '../lib/igdb.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed.' })
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.slice(0, 100) : ''
    const ordering = ['-rating', '-released', 'name'].includes(req.query.ordering) ? req.query.ordering : '-rating'
    const results = await searchGames({ search, ordering })
    return json(res, 200, { results })
  } catch (error) {
    return json(res, error.status || 500, { error: error.message || 'Unable to load games.' })
  }
}
