import { getGame, json } from '../../lib/igdb.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed.' })
  try {
    const id = Number(req.query.id)
    if (!Number.isSafeInteger(id) || id <= 0) return json(res, 400, { error: 'A valid game ID is required.' })
    const game = await getGame(id)
    if (!game) return json(res, 404, { error: 'Game not found.' })
    return json(res, 200, game)
  } catch (error) {
    return json(res, error.status || 500, { error: error.message || 'Unable to load game details.' })
  }
}
