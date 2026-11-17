import test from 'node:test'
import assert from 'node:assert/strict'
import { getGames, getGameDetails, getSpotlightGames } from '../src/api/igdb.js'

test('a successful HTML response is reported as a catalog error', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response('<html>Fallback</html>'))
  await assert.rejects(getGames(), /unexpected response/)
})

test('game list and Spotlight reject missing result arrays', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({}))
  await assert.rejects(getGames(), /unexpected response/)
  await assert.rejects(() => getSpotlightGames(20774), /unexpected response/)
})

test('valid empty results and details still work', async t => {
  t.mock.method(globalThis, 'fetch', async url => Response.json(
    url.endsWith('/10') ? { id: 10 } : { results: [] },
  ))
  assert.deepEqual(await getGames(), { results: [] })
  assert.deepEqual(await getGameDetails(10), { id: 10 })
})

test('preserves the server error message for a failed request', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ error: 'Unavailable' }, { status: 503 }))
  await assert.rejects(getGames(), /Unavailable/)
})
