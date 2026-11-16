import test from 'node:test'
import assert from 'node:assert/strict'
import { selectSpotlight, spotlightDay } from '../lib/spotlightRotation.js'

test('the Spotlight day changes at midnight UTC', () => {
  const before = Date.parse('2026-11-17T23:59:59.999Z')
  assert.equal(spotlightDay(before + 1), spotlightDay(before) + 1)
})

test('daily lineups are stable and adjacent days use different games with a large pool', () => {
  const pool = Array.from({ length: 30 }, (_, id) => id)
  const lineup = selectSpotlight(pool, 2)
  assert.equal(new Set(lineup).size, 12)
  assert.deepEqual(selectSpotlight(pool, 2), lineup)
  assert.ok(selectSpotlight(pool, 3).every(id => !lineup.includes(id)))
})

test('small pools rotate the lead game and empty pools are safe', () => {
  assert.deepEqual(selectSpotlight([1, 2, 3], 1), [2, 3, 1])
  assert.deepEqual(selectSpotlight([], 1), [])
})
