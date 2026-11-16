import AuroraSelect from './AuroraSelect'
import { useCallback, useEffect, useRef, useState } from 'react'
import { X, ExternalLink, Star, CalendarDays, Monitor, Heart, PlayCircle, Building2, Search, GitCompareArrows } from 'lucide-react'
import { getGameDetails } from '../api/igdb'
import { prefersReducedMotion } from '../utils/viewMotion.js'

const storeSearch = {
  PC: [
    ['Steam', name => `https://store.steampowered.com/search/?term=${encodeURIComponent(name)}`],
    ['Epic Games Store', name => `https://store.epicgames.com/en-US/browse?q=${encodeURIComponent(name)}`],
    ['GOG', name => `https://www.gog.com/en/games?query=${encodeURIComponent(name)}`],
  ],
  PlayStation: [['PlayStation Store', name => `https://store.playstation.com/en-us/search/${encodeURIComponent(name)}`]],
  Xbox: [['Xbox Store', name => `https://www.xbox.com/en-US/search?q=${encodeURIComponent(name)}`]],
  Nintendo: [['Nintendo eShop', name => `https://www.nintendo.com/us/search/#q=${encodeURIComponent(name)}`]],
  iOS: [['Apple App Store', name => `https://www.apple.com/app-store/`]],
  Android: [['Google Play', name => `https://play.google.com/store/search?q=${encodeURIComponent(name)}&c=apps`]],
}

export default function GameModal({ game, saved, onClose, onToggleSave, libraryStatus, onLibraryStatus, collectionDisabled, onCompare, comparing, compareFull }) {
  const [details, setDetails] = useState(game)
  const [loading, setLoading] = useState(false)
  const [viewer, setViewer] = useState(null)
  const detailsPanel = useRef(null)
  const closing = useRef(false)
  const mediaPanel = useRef(null)
  const mediaOpen = Boolean(viewer)

  const dismiss = useCallback(() => {
    if (closing.current) return
    const panel = detailsPanel.current
    if (!panel?.animate || prefersReducedMotion()) {
      onClose()
      return
    }
    closing.current = true
    const transition = panel.animate(
      [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(8px) scale(.985)' }],
      { duration: 140, easing: 'ease-in', fill: 'forwards' },
    )
    void transition.finished.then(onClose, onClose)
  }, [onClose])

  useEffect(() => {
    let active = true
    if (typeof game.id === 'number') {
      setLoading(true)
      getGameDetails(game.id)
        .then(data => { if (active) setDetails(data) })
        .catch(() => {})
        .finally(() => { if (active) setLoading(false) })
    }
    return () => { active = false }
  }, [game.id])

  useEffect(() => {
    const returnFocus = document.activeElement
    const panel = mediaOpen ? mediaPanel.current : detailsPanel.current
    const focusable = () => [...panel.querySelectorAll('button:not([disabled]), a[href], iframe, [tabindex="0"]')]
      .filter(element => element.tabIndex >= 0 && element.getClientRects().length)
    panel.querySelector('button')?.focus()
    const trapTab = event => {
      if (event.key !== 'Tab') return
      const items = focusable()
      const first = items[0]
      const last = items.at(-1)
      const active = document.activeElement
      if (!panel.contains(active) || (event.shiftKey ? active === first : active === last)) {
        event.preventDefault()
        ;(event.shiftKey ? last : first)?.focus()
      }
    }
    window.addEventListener('keydown', trapTab)
    return () => {
      window.removeEventListener('keydown', trapTab)
      if (returnFocus?.isConnected) returnFocus.focus()
    }
  }, [mediaOpen])

  useEffect(() => {
    const onKey = event => { if (event.key === 'Escape') { if (viewer) setViewer(null); else dismiss() } }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [dismiss, viewer])

  const platforms = (details.parent_platforms || game.parent_platforms || []).map(item => item.platform?.name).filter(Boolean)
  const directStores = Array.isArray(details.storeLinks) ? details.storeLinks : []
  const uniqueDirectStores = [...new Map(directStores.map(store => [store.label, store])).values()]
  const directLabels = new Set(uniqueDirectStores.map(store => store.label))
  const searchStores = [...new Set(platforms)]
    .flatMap(platform => (storeSearch[platform] || []).map(([label, makeUrl]) => ({ label, url: makeUrl(game.name) })))
    .filter((store, index, all) => !directLabels.has(store.label) && all.findIndex(item => item.label === store.label) === index)
  const description = (details.description_raw || '').trim()
  const screenshots = Array.isArray(details.screenshots) ? details.screenshots : []
  const highResScreenshot = url => typeof url === 'string' ? url.replace(/\/t_screenshot_big\//, '/t_1080p/').replace(/\/t_screenshot_med\//, '/t_1080p/') : ''
  const openScreenshot = index => setViewer({ type: 'image', index })
  const navigateScreenshot = delta => setViewer(current => current?.type === 'image' ? { type: 'image', index: (current.index + delta + screenshots.length) % screenshots.length } : current)
  const youtubeId = id => /^[a-zA-Z0-9_-]{11}$/.test(String(id || '')) ? String(id) : null

  const videos = (details.videos || []).filter(video => youtubeId(video.id))

  return (
    <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && dismiss()}>
      <section ref={detailsPanel} inert={mediaOpen} className="game-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <button className="modal-close" onClick={dismiss} aria-label="Close details"><X size={20} /></button>
        <div className="gb-detail-layout">
        {(details.background_image || game.background_image) && <img className="gb-detail-poster" src={details.background_image || game.background_image} alt="" />}
        <div className="gb-detail-content">
        <div className="modal-hero" style={{ backgroundImage: `linear-gradient(90deg, rgba(10,10,16,.96), rgba(10,10,16,.35)), url("${details.background_image || game.background_image || ''}")` }}>
          <div className="modal-hero-content">
            <div className="gb-detail-crumb">Games <span aria-hidden="true">/</span> {game.name}</div>
            <h2 id="modal-title">{game.name}</h2>
            <div className="modal-stats">
              <span className="gb-detail-rating"><Star size={15} fill="currentColor" aria-hidden="true" /> {game.rating > 0 ? Number(game.rating).toFixed(1) + ' / 5' : 'Not rated'}</span>
              {game.released && <span><CalendarDays size={15} /> {game.released}</span>}
              {!!game.genres?.length && <span>{game.genres.slice(0, 2).map(genre => genre.name).join(' / ')}</span>}
            </div>
            <p className="gb-detail-description">{loading ? 'Loading description…' : description || 'A description is not available for this game.'}</p>
          </div>
        </div>
        <div className="modal-body">
          <div className="modal-section">
            <div className="section-heading"><Monitor size={17} /><h3>Platform support</h3></div>
            <div className="chip-row">
              {platforms.length ? platforms.map(platform => <span className="platform-chip" key={platform}>{platform}</span>) : <span className="muted">Platform data not available.</span>}
            </div>
          </div>
          {(videos.length > 0 || screenshots.length > 0) && <div className="gb-detail-media">
            {videos.length > 0 && <div className="modal-section gb-trailers">
              <div className="section-heading"><h3>Trailers</h3></div>
              <div className="gb-trailer-strip">{videos.map(video =>
                <button type="button" className="gb-trailer-card" key={video.id}
                  onClick={() => setViewer({ type: 'video', id: video.id, name: video.name })} aria-label={'Play ' + (video.name || 'trailer')}>
                  <img src={'https://img.youtube.com/vi/' + video.id + '/hqdefault.jpg'} loading="lazy" alt="" />
                  <PlayCircle className="gb-trailer-play" size={38} aria-hidden="true" />
                  <span>{video.name || 'Trailer'}</span>
                </button>
              )}</div>
            </div>}
          {screenshots.length > 0 && <div className="modal-section"><div className="section-heading"><h3>Screenshots ({screenshots.length})</h3></div><div className="screenshot-strip">{screenshots.map((url, i) => <button type="button" className="media-screenshot-button" key={url} onClick={() => openScreenshot(i)} aria-label={`Enlarge screenshot ${i + 1}`}><img src={url} alt={`${game.name} screenshot ${i + 1}`} loading="lazy" /></button>)}</div></div>}
          </div>}
          <div className="gb-detail-actions">
            <a className="primary-button" href="#gb-detail-stores" onClick={event => {
              event.preventDefault()
              detailsPanel.current?.querySelector('#gb-detail-stores')?.scrollIntoView({ block: 'start' })
            }}><ExternalLink size={16} aria-hidden="true" /> Where to play</a>
          <button className={`primary-button modal-wishlist ${saved ? 'saved' : ''}`} disabled={collectionDisabled} onClick={() => onToggleSave(game)}>
            <Heart size={17} fill={saved ? 'currentColor' : 'none'} /> {saved ? 'Saved to wishlist' : 'Add to wishlist'}
          </button>
            <button type="button" className="secondary-button" aria-pressed={comparing} disabled={!comparing && compareFull} onClick={() => onCompare(game)}><GitCompareArrows size={16} aria-hidden="true" /> {comparing ? 'Remove from compare' : 'Compare'}</button>
          </div>
          {details.developers?.length > 0 && <div className="modal-section"><div className="section-heading"><Building2 size={17}/><h3>Developers</h3></div><p className="helper-text">{details.developers.join(' · ')}</p></div>}
          <div className="modal-section"><div className="section-heading"><h3>Track your progress</h3></div><AuroraSelect disabled={collectionDisabled} className="modal-status-menu" label="Track your progress" value={libraryStatus || ''} onChange={value => onLibraryStatus(game, value)} options={[{value:'',label:'Not in my library'},{value:'playing',label:'Playing'},{value:'completed',label:'Completed'}]} /></div>
          <div className="modal-section gb-detail-stores" id="gb-detail-stores">
            <div className="section-heading"><ExternalLink size={17} /><h3>Where to play & buy</h3></div>
            <p className="helper-text">Direct links below come from IGDB's game-specific external listings. Check the store page for the correct edition, region, price, and availability.</p>
            {loading && <p className="muted" role="status">Checking direct storefront listings…</p>}
            {!loading && <div className="store-grid">
              {uniqueDirectStores.map(store => <a className="store-link" href={store.url} target="_blank" rel="noopener noreferrer" key={store.label} title={`Open ${store.label} game page`}>
                <span>{store.label}<small className="store-link-kind">Game page</small></span><ExternalLink size={15}/>
              </a>)}
              {searchStores.map(store => <a className="store-link" href={store.url} target="_blank" rel="noopener noreferrer" key={store.label} title={`Search ${store.label} for ${game.name}`}>
                <span>{store.label}<small className="store-link-kind">{store.label === "Apple App Store" ? "Store homepage" : "Store search"}</small></span><Search size={15}/>
              </a>)}
            </div>}
            {!loading && uniqueDirectStores.length === 0 && searchStores.length === 0 && <p className="muted">No storefront links are available for this title.</p>}
            <p className="helper-text">Game page opens a game-specific listing supplied by IGDB. Store search opens a search result, not a confirmed product page.</p>
          </div>
          <p className="data-credit">Game information and artwork provided by <a href="https://www.igdb.com/" target="_blank" rel="noreferrer">IGDB</a>.</p>
        </div>
        </div>
        </div>
      </section>
      {viewer && <div className="media-viewer-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setViewer(null) }}>
        <section ref={mediaPanel} className="media-viewer" role="dialog" aria-modal="true" aria-label={viewer.type === 'video' ? `Trailer: ${viewer.name || game.name}` : `Screenshot ${viewer.index + 1} of ${screenshots.length}`}>
          <div className="media-viewer-header"><span>{viewer.type === 'video' ? (viewer.name || `${game.name} trailer`) : `${game.name} · ${viewer.index + 1} / ${screenshots.length}`}</span><button type="button" onClick={() => setViewer(null)} aria-label="Close media viewer"><X size={22}/></button></div>
          {viewer.type === 'video' ? <div className="media-video-frame"><iframe key={viewer.id} src={`https://www.youtube-nocookie.com/embed/${viewer.id}?rel=0`} title={viewer.name || `${game.name} trailer`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /></div> : <div className="media-image-frame"><img src={highResScreenshot(screenshots[viewer.index])} alt={`${game.name} screenshot ${viewer.index + 1}`} />{screenshots.length > 1 && <><button type="button" className="media-viewer-prev" onClick={() => navigateScreenshot(-1)} aria-label="Previous screenshot">‹</button><button type="button" className="media-viewer-next" onClick={() => navigateScreenshot(1)} aria-label="Next screenshot">›</button></>}</div>}
          {viewer.type === 'video' && <p className="media-viewer-note">Video playback depends on the uploader's embedding permissions.</p>}
        </section>
      </div>}
    </div>
  )
}
