import AuroraSelect from './AuroraSelect'
import { useEffect, useState } from 'react'
import { X, ExternalLink, Star, CalendarDays, Monitor, Heart, PlayCircle, Building2, Search } from 'lucide-react'
import { getGameDetails } from '../api/igdb'

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

export default function GameModal({ game, saved, onClose, onToggleSave, libraryStatus, onLibraryStatus }) {
  const [details, setDetails] = useState(game)
  const [loading, setLoading] = useState(false)
  const [viewer, setViewer] = useState(null)

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
    const onKey = event => { if (event.key === 'Escape') { if (viewer) setViewer(null); else onClose() } }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose, viewer])

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

  return (
    <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <section className="game-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <button className="modal-close" onClick={onClose} aria-label="Close details"><X size={20} /></button>
        <div className="modal-hero" style={{ backgroundImage: `linear-gradient(90deg, rgba(10,10,16,.96), rgba(10,10,16,.35)), url("${details.background_image || game.background_image || ''}")` }}>
          <div className="modal-hero-content">
            <span className="eyebrow">GAME DETAILS</span>
            <h2 id="modal-title">{game.name}</h2>
            <div className="modal-stats">
              <span><Star size={15} fill="currentColor" /> {Number(game.rating || 0).toFixed(1)} rating</span>
              {game.released && <span><CalendarDays size={15} /> {game.released}</span>}
            </div>
          </div>
        </div>
        <div className="modal-body">
          <div className="modal-section">
            <div className="section-heading"><Monitor size={17} /><h3>Available platforms</h3></div>
            <div className="chip-row">
              {platforms.length ? platforms.map(platform => <span className="platform-chip" key={platform}>{platform}</span>) : <span className="muted">Platform data not available.</span>}
            </div>
          </div>
          <div className="modal-section">
            <div className="section-heading"><ExternalLink size={17} /><h3>Where to play & buy</h3></div>
            <p className="helper-text">Direct links below come from IGDB's game-specific external listings. Check the store page for the correct edition, region, price, and availability.</p>
            {loading && <p className="muted" role="status">Checking direct storefront listings…</p>}
            {!loading && <div className="store-grid">
              {uniqueDirectStores.map(store => <a className="store-link" href={store.url} target="_blank" rel="noopener noreferrer" key={store.label} title={`Open ${store.label} game page`}>
                <span>{store.label}<small className="store-link-kind">Game page</small></span><ExternalLink size={15}/>
              </a>)}
              {searchStores.map(store => <a className="store-link" href={store.url} target="_blank" rel="noopener noreferrer" key={store.label} title={`Search ${store.label} for ${game.name}`}>
                <span>{store.label}<small className="store-link-kind">Store search</small></span><Search size={15}/>
              </a>)}
            </div>}
            {!loading && uniqueDirectStores.length === 0 && searchStores.length === 0 && <p className="muted">No storefront links are available for this title.</p>}
            <p className="helper-text">Game page opens a game-specific listing supplied by IGDB. Store search opens a search result, not a confirmed product page.</p>
          </div>
          <div className="modal-section">
            <div className="section-heading"><span className="description-dot" /><h3>About the game</h3></div>
            {loading ? <p className="muted">Loading game description…</p> : <p className="description-text">{description || 'A description is not available for this game.'}</p>}
          </div>
          {details.developers?.length > 0 && <div className="modal-section"><div className="section-heading"><Building2 size={17}/><h3>Developers</h3></div><p className="helper-text">{details.developers.join(' · ')}</p></div>}
          {details.videos?.length > 0 && <div className="modal-section"><div className="section-heading"><PlayCircle size={17}/><h3>Game videos</h3></div><div className="video-grid">{details.videos.filter(video => youtubeId(video.id)).map(video => <button type="button" className="media-video-button" onClick={() => setViewer({ type: 'video', id: youtubeId(video.id), name: video.name })} key={video.id} aria-label={`Play ${video.name || 'game trailer'} here`}><img src={`https://img.youtube.com/vi/${youtubeId(video.id)}/hqdefault.jpg`} loading="lazy" alt=""/><span><PlayCircle size={15}/> {video.name}</span></button>)}</div></div>}
          {screenshots.length > 0 && <div className="modal-section"><div className="section-heading"><h3>Screenshots</h3></div><div className="screenshot-strip">{screenshots.map((url, i) => <button type="button" className="media-screenshot-button" key={url} onClick={() => openScreenshot(i)} aria-label={`Enlarge screenshot ${i + 1}`}><img src={url} alt={`${game.name} screenshot ${i + 1}`} loading="lazy" /></button>)}</div></div>}
          <div className="modal-section"><div className="section-heading"><h3>Track your progress</h3></div><AuroraSelect className="modal-status-menu" label="Track your progress" value={libraryStatus || ''} onChange={value => onLibraryStatus(game, value)} options={[{value:'',label:'Not in my library'},{value:'playing',label:'Playing'},{value:'completed',label:'Completed'}]} /></div>
          <button className={`primary-button modal-wishlist ${saved ? 'saved' : ''}`} onClick={() => onToggleSave(game)}>
            <Heart size={17} fill={saved ? 'currentColor' : 'none'} /> {saved ? 'Saved to wishlist' : 'Add to wishlist'}
          </button>
          <p className="data-credit">Game information and artwork provided by <a href="https://www.igdb.com/" target="_blank" rel="noreferrer">IGDB</a>.</p>
        </div>
      </section>
      {viewer && <div className="media-viewer-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setViewer(null) }}>
        <section className="media-viewer" role="dialog" aria-modal="true" aria-label={viewer.type === 'video' ? `Trailer: ${viewer.name || game.name}` : `Screenshot ${viewer.index + 1} of ${screenshots.length}`}>
          <div className="media-viewer-header"><span>{viewer.type === 'video' ? (viewer.name || `${game.name} trailer`) : `${game.name} · ${viewer.index + 1} / ${screenshots.length}`}</span><button type="button" onClick={() => setViewer(null)} aria-label="Close media viewer"><X size={22}/></button></div>
          {viewer.type === 'video' ? <div className="media-video-frame"><iframe key={viewer.id} src={`https://www.youtube-nocookie.com/embed/${viewer.id}?autoplay=1&rel=0`} title={viewer.name || `${game.name} trailer`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /></div> : <div className="media-image-frame"><img src={highResScreenshot(screenshots[viewer.index])} alt={`${game.name} screenshot ${viewer.index + 1}`} />{screenshots.length > 1 && <><button type="button" className="media-viewer-prev" onClick={() => navigateScreenshot(-1)} aria-label="Previous screenshot">‹</button><button type="button" className="media-viewer-next" onClick={() => navigateScreenshot(1)} aria-label="Next screenshot">›</button></>}</div>}
          {viewer.type === 'video' && <p className="media-viewer-note">Video playback depends on the uploader's embedding permissions.</p>}
        </section>
      </div>}
    </div>
  )
}