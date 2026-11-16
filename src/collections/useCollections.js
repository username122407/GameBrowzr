import { useCallback, useEffect, useRef, useState } from 'react'
import {
  collectionRow, decodeCollections, defaultPreferences, emptyCollections, guestImportRows, guestKeys,
  hasWishlistGame, isLibraryStatus, readGuest, readGuestPreferences, updateCollections,
} from './model.js'

const collectionTable = 'gamebrowzr_collections'
const profileTable = 'gamebrowzr_profiles'
const conflict = 'user_id,kind,game_id'

async function loadRows(client, owner) {
  const rows = []
  const pageSize = 250
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await client.from(collectionTable)
      .select('user_id,game_id,kind,status,game').eq('user_id', owner)
      .order('kind').order('game_id').range(offset, offset + pageSize - 1)
    if (error) throw error
    rows.push(...data)
    if (data.length < pageSize) return decodeCollections(rows)
  }
}

export function useCollections(client, userId) {
  const [guest, setGuest] = useState(() => readGuest(localStorage))
  const [guestPreferences, setGuestPreferences] = useState(() => readGuestPreferences(localStorage))
  const [cloud, setCloud] = useState(null)
  const [loadingOwner, setLoadingOwner] = useState(null)
  const [writingOwner, setWritingOwner] = useState(null)
  const [failure, setFailure] = useState(null)
  const request = useRef(0)
  const scope = useRef(0)
  const pendingWrite = useRef(null)
  const owner = useRef(null)

  // A previous account's rows are discarded synchronously at the render boundary.
  const currentCloud = cloud?.owner === userId ? cloud : null
  const collections = userId ? currentCloud?.collections || emptyCollections : guest
  const profile = currentCloud?.profile || null
  const preferences = userId
    ? { spotlightAutoplay: profile?.spotlight_autoplay !== false }
    : guestPreferences

  const refresh = useCallback(async (afterWrite = false) => {
    if (!client || !userId || owner.current !== userId || (pendingWrite.current?.owner === userId && afterWrite !== true)) return false
    const ticket = ++request.current
    setLoadingOwner(userId)
    setFailure(null)
    try {
      const [collections, { data: profile, error }] = await Promise.all([
        loadRows(client, userId),
        client.from(profileTable).select('display_name,spotlight_autoplay').eq('user_id', userId).maybeSingle(),
      ])
      if (error) throw error
      if (ticket !== request.current || owner.current !== userId) return false
      setCloud({ owner: userId, collections, profile })
      return true
    } catch {
      if (ticket === request.current && owner.current === userId) {
        setFailure({ owner: userId, message: 'Your cloud collections could not be loaded. Try again.' })
      }
      return false
    } finally {
      if (ticket === request.current) setLoadingOwner(null)
    }
  }, [client, userId])

  useEffect(() => {
    owner.current = userId
    scope.current++
    if (!client || !userId) {
      setCloud(null)
      return
    }
    void refresh()
    const reload = () => { if (document.visibilityState !== 'hidden') void refresh() }
    window.addEventListener('focus', reload)
    window.addEventListener('online', reload)
    document.addEventListener('visibilitychange', reload)
    const timer = window.setInterval(reload, 60_000)
    return () => {
      owner.current = null
      request.current++
      window.removeEventListener('focus', reload)
      window.removeEventListener('online', reload)
      document.removeEventListener('visibilitychange', reload)
      window.clearInterval(timer)
    }
  }, [client, refresh, userId])

  const writeCloud = async (write, message) => {
    if (!client || !userId || !currentCloud || owner.current !== userId || pendingWrite.current?.owner === userId) return false
    const operation = { owner: userId, scope: scope.current }
    pendingWrite.current = operation
    request.current++
    setLoadingOwner(null)
    setWritingOwner(userId)
    setFailure(null)
    try {
      const { error } = await write()
      if (error) throw error
      if (owner.current !== userId || scope.current !== operation.scope) return false
      return await refresh(true)
    } catch {
      if (owner.current === userId && scope.current === operation.scope) setFailure({ owner: userId, message })
      return false
    } finally {
      if (pendingWrite.current === operation) {
        pendingWrite.current = null
        setWritingOwner(null)
      }
    }
  }

  const saveCollection = (kind, game, status) => {
    if (!userId) {
      const next = updateCollections(guest, kind, game, status)
      try {
        localStorage.setItem(guestKeys[kind], JSON.stringify(next[kind]))
        setGuest(next)
        setFailure(null)
        return true
      } catch {
        setFailure({ owner: userId, message: 'This browser could not save your collection.' })
        return false
      }
    }
    if (!currentCloud) return false
    return writeCloud(() => status
      ? client.from(collectionTable).upsert(collectionRow(userId, kind, game, status), { onConflict: conflict })
      : client.from(collectionTable).delete().eq('user_id', userId).eq('kind', kind).eq('game_id', String(game.id)),
    'Your change could not be saved. Try again.')
  }

  const saveProfile = ({ displayName, spotlightAutoplay }) => {
    const fields = {}
    if (typeof displayName === 'string') fields.display_name = displayName.trim().slice(0, 48)
    if (typeof spotlightAutoplay === 'boolean') fields.spotlight_autoplay = spotlightAutoplay
    return writeCloud(() => client.from(profileTable).upsert({ user_id: userId, ...fields }, { onConflict: 'user_id' }),
      'Your settings could not be saved. Try again.')
  }

  const savePreferences = ({ spotlightAutoplay = defaultPreferences.spotlightAutoplay }) => {
    if (userId) return saveProfile({ spotlightAutoplay })
    try {
      localStorage.setItem(guestKeys.preferences, JSON.stringify({ spotlightAutoplay }))
      setGuestPreferences({ spotlightAutoplay })
      setFailure(null)
      return true
    } catch {
      setFailure({ owner: userId, message: 'This browser could not save your preferences.' })
      return false
    }
  }

  const importGuest = () => writeCloud(() => client.from(collectionTable)
    .upsert(guestImportRows(guest, userId), { onConflict: conflict, ignoreDuplicates: true }),
  'Your device collection could not be imported. Try again.')

  return {
    ...collections, profile, preferences,
    loading: Boolean(userId && !currentCloud && (failure?.owner !== userId || loadingOwner === userId)),
    syncing: Boolean(userId && loadingOwner === userId),
    busy: writingOwner === userId && Boolean(userId),
    canEdit: !userId || Boolean(currentCloud && writingOwner !== userId),
    error: failure && failure.owner === userId ? failure.message : '',
    refresh: () => refresh(),
    toggleWishlist: game => saveCollection('wishlist', game, !hasWishlistGame(collections.wishlist, game.id)),
    setLibraryStatus: (game, status) => saveCollection('library', game, isLibraryStatus(status) ? status : null),
    importGuest,
    guestCount: { wishlist: guest.wishlist.length, library: Object.keys(guest.library).length },
    saveProfile, savePreferences,
  }
}
