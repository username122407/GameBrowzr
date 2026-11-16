import { ArrowUpRight, Check, GitCompareArrows, Layers3, Monitor, Star, CalendarDays, X, Info } from 'lucide-react'

const genresOf = game => [...new Set((game.genres || []).map(x => typeof x === 'string' ? x : x?.name).filter(Boolean))]
const platformsOf = game => [...new Set([...(game.parent_platforms || []).map(x => x?.platform?.name), ...(game.platforms || []).map(x => typeof x === 'string' ? x : x?.name)].filter(Boolean))]
const ratingOf = game => Number.isFinite(Number(game.rating)) && Number(game.rating) > 0 ? Math.min(5, Number(game.rating)) : null
const releaseOf = game => { const date = game.released; if (!date) return null; const parsed = new Date(date); return Number.isNaN(parsed.getTime()) ? null : parsed }
const intersection = groups => groups.length ? groups.reduce((common, next) => common.filter(x => next.some(y => x.toLowerCase() === y.toLowerCase()))) : []

export default function CompareInsights({ games, onRemove, onClose, onOpenGame }) {
  const rated = games.filter(g => ratingOf(g) !== null)
  const maxRating = Math.max(...rated.map(ratingOf))
  const leaders = games.length > 1 && rated.length === games.length ? rated.filter(game => ratingOf(game) === maxRating) : []
  const genreSets = games.map(genresOf)
  const platformSets = games.map(platformsOf)
  const commonGenres = intersection(genreSets)
  const commonPlatforms = intersection(platformSets)
  const dates = games.map(releaseOf).filter(Boolean)
  const newest = dates.length === games.length && games.length > 1 ? games.reduce((best,g) => releaseOf(g) > releaseOf(best) ? g : best) : null
  return <div className="insights-wrap">
    <header className="insights-header"><div><div className="insights-kicker"><GitCompareArrows size={15}/> GAME COMPARISON</div><h2>Find your next favorite.</h2><p>Compare ratings, release dates, genres and platform support side by side.</p></div><button className="insights-close" type="button" onClick={onClose} aria-label="Close comparison"><X size={21}/></button></header>
    <div className="insights-summary" aria-label="Comparison highlights">
      <div><Star size={16}/><span>Highest rated</span><strong>{leaders.length ? leaders.map(game => game.name).join(', ') : 'Not enough ratings'}</strong></div>
      <div><CalendarDays size={16}/><span>Most recent</span><strong>{newest ? newest.name : 'Date unavailable'}</strong></div>
      <div><Layers3 size={16}/><span>Shared genres</span><strong>{commonGenres.length ? commonGenres.join(', ') : 'None listed'}</strong></div>
      <div><Monitor size={16}/><span>Shared platforms</span><strong>{commonPlatforms.length ? commonPlatforms.join(', ') : 'None listed'}</strong></div>
    </div>
    <div className="insights-scroller" tabIndex={0} aria-label="Scrollable game comparison">
      <div className="insights-columns" style={{'--compare-count': games.length}}>
        {games.map(game => {
          const rating = ratingOf(game), genres = genresOf(game), platforms = platformsOf(game), date = releaseOf(game)
          return <article className="insights-game" key={game.id}>
            <div className="insights-cover">{game.background_image ? <img src={game.background_image} alt="" loading="lazy"/> : <div className="insights-cover-placeholder">Artwork unavailable</div>}<button type="button" onClick={() => onRemove(game)} aria-label={`Remove ${game.name} from comparison`}><X size={16}/></button></div>
            <div className="insights-game-body">
              <h3 title={game.name}>{game.name}</h3>
              <div className="insights-row-title"><Star size={14}/> Community rating {leaders.some(item => item.id === game.id) && <span className="insights-leader"><Check size={12}/> Highest</span>}</div>
              <div className="insights-score">{rating === null ? 'Not rated' : <><strong>{rating.toFixed(1)}</strong><small> / 5</small></>}</div>
              <div className="insights-bar"><span style={{width:`${rating === null ? 0 : rating * 20}%`}}/></div>
              <div className="insights-row-title"><CalendarDays size={14}/> Release date</div>
              <p className="insights-value">{date ? date.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}) : 'Unknown'} {newest?.id === game.id && <span className="insights-leader">Newest</span>}</p>
              <div className="insights-row-title"><Layers3 size={14}/> Genres <small>{genres.length ? `${genres.length} listed` : ''}</small></div>
              <div className="insights-tags">{genres.length ? genres.map(x => <span key={x} className={commonGenres.includes(x) ? 'is-shared' : ''}>{x}</span>) : <em>Not available</em>}</div>
              <div className="insights-row-title"><Monitor size={14}/> Platforms <small>{platforms.length ? `${platforms.length} listed` : ''}</small></div>
              <div className="insights-tags">{platforms.length ? platforms.map(x => <span key={x} className={commonPlatforms.includes(x) ? 'is-shared' : ''}>{x}</span>) : <em>Not available</em>}</div>
              <button type="button" className="insights-details" onClick={() => onOpenGame(game)}>Explore details <ArrowUpRight size={16}/></button>
            </div>
          </article>
        })}
      </div>
    </div>
    <footer className="insights-footer"><Info size={15}/><span>Ratings are sourced from IGDB when available. Shared tags are highlighted. This comparison does not represent game quality beyond the available data.</span></footer>
  </div>
}
