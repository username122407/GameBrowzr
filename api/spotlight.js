import { json, getSpotlightFeed } from '../lib/igdb.js'
import { selectSpotlight, spotlightDay, SPOTLIGHT_DAY_MS } from '../lib/spotlightRotation.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed.' }, 'no-store')
  try {
    const candidates = await getSpotlightFeed()
    const now = Date.now()
    const day = spotlightDay(now)
    const seconds = Math.floor(((day + 1) * SPOTLIGHT_DAY_MS - now) / 1000)
    return json(res, 200, { day, results: selectSpotlight(candidates, day) },
      `s-maxage=${Math.min(300, seconds)}`)
  } catch (error) {
    return json(res, error.status || 500, { error: error.message || 'Unable to load spotlight games.' }, 'no-store')
  }
}
