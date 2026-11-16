export const SPOTLIGHT_DAY_MS = 86_400_000

export function spotlightDay(now = Date.now()) {
  return Math.floor(now / SPOTLIGHT_DAY_MS)
}

export function selectSpotlight(pool, day) {
  if (!pool.length) return []
  const count = Math.min(12, pool.length)
  const step = pool.length > count ? count : 1
  const start = (day * step) % pool.length
  return Array.from({ length: count }, (_, index) => pool[(start + index) % pool.length])
}
