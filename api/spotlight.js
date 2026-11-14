import { json, getSpotlightFeed } from '../lib/igdb.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed.' })
  try { return json(res, 200, { results: await getSpotlightFeed() }) }
  catch (error) { return json(res, error.status || 500, { error: error.message || 'Unable to load spotlight games.' }) }
}
