import test from 'node:test'
import assert from 'node:assert/strict'
import { collectionRow, decodeCollections, guestImportRows, readGuest, updateCollections } from '../src/collections/model.js'

const title = { id: 23, name: 'Example Game', rating: 4.5, genres: [{ name: 'Puzzle' }] }

test('reads 5.0.11 device data and drops invalid or obsolete entries', () => {
  const fixture = {
    'gamebrowzr-wishlist': '[{"id":23,"name":"Example Game"},{"id":"23","name":"Example Game"},null]',
    'gamebrowzr-library': '{"23":{"game":{"id":23,"name":"Example Game"},"status":"playing"},"24":{"game":{"id":24,"name":"Unused"},"status":"want"}}',
  }
  const guest = readGuest({ getItem: key => fixture[key] || null })
  assert.equal(guest.wishlist.length, 1)
  assert.deepEqual(Object.keys(guest.library), ['23'])
  assert.deepEqual(readGuest({ getItem() { throw new Error('Blocked') } }), { wishlist: [], library: {} })
})

test('Wishlist and Library stay independent and device snapshots are immutable', () => {
  const original = { wishlist: [title], library: {} }
  const tracked = updateCollections(original, 'library', title, 'completed')
  const removed = updateCollections(tracked, 'wishlist', title, false)
  assert.deepEqual(original, { wishlist: [title], library: {} })
  assert.deepEqual(removed, { wishlist: [], library: { 23: { game: title, status: 'completed' } } })
})

test('device import creates a distinct cloud row for each collection and sanitizes snapshots', () => {
  const game = { ...title, background_image: 'https://example.test/tracking', extra: 'discard' }
  const guest = { wishlist: [game], library: { 23: { game, status: 'playing' } } }
  const rows = guestImportRows(guest, 'account')
  assert.deepEqual(rows.map(row => [row.user_id, row.kind, row.game_id, row.status]),
    [['account', 'wishlist', '23', null], ['account', 'library', '23', 'playing']])
  assert.equal(rows[0].game.background_image, '')
  assert.equal(rows[0].game.extra, undefined)
  assert.equal(decodeCollections(rows).library[23].status, 'playing')
  assert.deepEqual(decodeCollections([{ ...rows[1], game_id: '24' }]), { wishlist: [], library: {} })
  assert.throws(() => collectionRow('account', 'wishlist', { id: '__proto__', name: 'Bad' }))
})
