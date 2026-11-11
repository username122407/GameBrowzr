import { useEffect, useState } from 'react'
import { X, ExternalLink, Star, CalendarDays, Monitor, Heart } from 'lucide-react'
import { getGameDetails } from '../api/rawg'

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

export default function GameModal({ game, saved, onClose, onToggleSave }) {
  const [details, setDetails] = useState(game)
  const [loading, setLoading] = useState(false)

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
    const onKey = event => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const platforms = (details.parent_platforms || game.parent_platforms || []).map(item => item.platform?.name).filter(Boolean)
  const stores = [...new Set(platforms)].flatMap(platform => (storeSearch[platform] || []).map(([label, makeUrl]) => ({ label, url: makeUrl(game.name) })))
  const description = (details.description_raw || '').trim()

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
            <div className="section-heading"><ExternalLink size={17} /><h3>Find this game</h3></div>
            <p className="helper-text">These links open each platform's official store search. Availability, region, and price may vary; confirm the exact game before purchasing.</p>
            <div className="store-grid">
              {stores.map(store => <a className="store-link" href={store.url} target="_blank" rel="noreferrer" key={store.label}>{store.label}<ExternalLink size={14} /></a>)}
              {!stores.length && <span className="muted">No store search links are available for the listed platforms.</span>}
            </div>
          </div>
          <div className="modal-section">
            <div className="section-heading"><span className="description-dot" /><h3>About the game</h3></div>
            {loading ? <p className="muted">Loading game description…</p> : <p className="description-text">{description || 'A description is not available for this game.'}</p>}
          </div>
          <button className={`primary-button modal-wishlist ${saved ? 'saved' : ''}`} onClick={() => onToggleSave(game)}>
            <Heart size={17} fill={saved ? 'currentColor' : 'none'} /> {saved ? 'Saved to wishlist' : 'Add to wishlist'}
          </button>
          <p className="rawg-credit">Game information and artwork provided by <a href="https://rawg.io" target="_blank" rel="noreferrer">RAWG</a>.</p>
        </div>
      </section>
    </div>
  )
}