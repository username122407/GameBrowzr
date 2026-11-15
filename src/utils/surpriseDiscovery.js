/** Weighted discovery outside the six visible recommendation cards. */
export function pickSurpriseGame({ games = [], recommendations = [], wishlist = [], library = {}, spotlightIds = new Set(), recentIds = [], random = Math.random }) {
  const saved = [...wishlist, ...Object.values(library).map(entry => entry.game).filter(Boolean)]
  const excluded = new Set([...recommendations.slice(0, 6).map(g => g.id), ...saved.map(g => g.id), ...spotlightIds])
  const interests = new Map()
  for (const game of saved) for (const genre of game.genres || []) {
    const name = genre.name?.toLowerCase()
    if (name) interests.set(name, (interests.get(name) || 0) + 1)
  }
  const eligible = games.filter(g => g?.id != null && g.background_image && !excluded.has(g.id))
  const fresh = eligible.filter(g => !recentIds.includes(g.id))
  const pool = fresh.length ? fresh : eligible
  if (!pool.length) return null
  const matching = pool.filter(g => (g.genres || []).some(genre => interests.has(genre.name?.toLowerCase())))
  const candidates = matching.length ? matching : pool
  const weights = candidates.map(g => {
    const affinity = (g.genres || []).reduce((sum, genre) => sum + (interests.get(genre.name?.toLowerCase()) || 0), 0)
    const rating = Number(g.rating)
    return 1 + affinity * 2 + (Number.isFinite(rating) && rating > 0 ? Math.min(rating / 100, 1) * 0.5 : 0)
  })
  let draw = Math.max(0, Math.min(0.999999999, random())) * weights.reduce((a,b) => a+b, 0)
  for (let i=0; i<candidates.length; i++) { draw -= weights[i]; if (draw < 0) return candidates[i] }
  return candidates[candidates.length-1]
}
