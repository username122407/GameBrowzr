import { Heart, Star, CalendarDays } from 'lucide-react'

export default function GameCard({ game, saved, onToggleSave, onOpen }) {
  const platforms = (game.parent_platforms || []).map(item => item.platform?.name).filter(Boolean)
  const image = game.background_image

  return (
    <article className="game-card">
      <button className="cover-button" onClick={() => onOpen(game)} aria-label={`View ${game.name} details`}>
        {image
          ? <img className="game-cover" src={image} alt={`${game.name} artwork`} loading="lazy" />
          : <div className="cover-placeholder"><span>GAMEBROWZR</span><strong>{game.name}</strong></div>}
        <span className="cover-shade" />
        <span className="cover-open">View details</span>
      </button>
      <button
        className={`save-button ${saved ? 'is-saved' : ''}`}
        onClick={() => onToggleSave(game)}
        aria-label={saved ? `Remove ${game.name} from wishlist` : `Add ${game.name} to wishlist`}
        title={saved ? 'Remove from wishlist' : 'Add to wishlist'}
      >
        <Heart size={17} fill={saved ? 'currentColor' : 'none'} />
      </button>
      <div className="game-card-content">
        <div className="game-meta">
          <span>{game.genres?.[0]?.name || 'Game'}</span>
          {game.released && <span><CalendarDays size={12} /> {game.released.slice(0, 4)}</span>}
        </div>
        <button className="game-title" onClick={() => onOpen(game)}>{game.name}</button>
        <div className="game-card-bottom">
          <span className="rating"><Star size={14} fill="currentColor" /> {Number(game.rating || 0).toFixed(1)}</span>
          <span className="platform-count">{platforms.length || '—'} platforms</span>
        </div>
      </div>
    </article>
  )
}