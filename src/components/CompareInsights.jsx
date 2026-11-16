import { ArrowUpRight, GitCompareArrows, Layers3, Monitor, Star, CalendarDays, X, Info } from 'lucide-react'

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
    <header className="insights-header"><div><div className="insights-kicker"><GitCompareArrows size={15}/> GAME COMPARISON</div><h2>Compare games</h2><p>Compare ratings, release dates, genres and platform support side by side.</p></div><button className="insights-close" type="button" onClick={onClose} aria-label="Close comparison"><X size={21}/></button></header>
    <div className="insights-summary" aria-label="Comparison highlights">
      <div><Star size={16}/><span>Highest rated</span><strong>{leaders.length ? leaders.map(game => game.name).join(', ') : 'Not enough ratings'}</strong></div>
      <div><CalendarDays size={16}/><span>Most recent</span><strong>{newest ? newest.name : 'Date unavailable'}</strong></div>
      <div><Layers3 size={16}/><span>Shared genres</span><strong>{commonGenres.length ? commonGenres.join(', ') : 'None listed'}</strong></div>
      <div><Monitor size={16}/><span>Shared platforms</span><strong>{commonPlatforms.length ? commonPlatforms.join(', ') : 'None listed'}</strong></div>
    </div>
    <div className="insights-scroller" tabIndex={0} aria-label="Scrollable game comparison">
      <table className="gb-compare-table">
        <thead><tr><th scope="col">Game</th>{games.map(game => <th scope="col" key={game.id}>
          {game.background_image && <img src={game.background_image} alt="" loading="lazy" />}
          <span>{game.name}</span>
          <button type="button" onClick={() => onRemove(game)} aria-label={'Remove ' + game.name + ' from comparison'}><X size={16}/></button>
        </th>)}</tr></thead>
        <tbody>
          <tr><th scope="row">Rating</th>{games.map(game => {
            const rating = ratingOf(game)
            return <td key={game.id}><strong className="gb-compare-rating">{rating === null ? 'Not rated' : rating.toFixed(1) + ' / 5'}</strong>{rating !== null && <meter className="gb-compare-meter" min={0} max={5} value={rating} aria-label={game.name + ' rating'} />}</td>
          })}</tr>
          <tr><th scope="row">Release date</th>{games.map(game => <td key={game.id}>{game.released || 'Unknown'}</td>)}</tr>
          <tr><th scope="row">Genres</th>{genreSets.map((genres, i) => <td key={games[i].id}>{genres.map(genre => <span key={genre} className={commonGenres.includes(genre) ? 'gb-compare-shared' : undefined}>{genre}</span>)}{!genres.length && 'Not available'}</td>)}</tr>
          <tr><th scope="row">Platforms</th>{platformSets.map((platforms, i) => <td key={games[i].id}>{platforms.map(platform => <span key={platform} className={commonPlatforms.includes(platform) ? 'gb-compare-shared' : undefined}>{platform}</span>)}{!platforms.length && 'Not available'}</td>)}</tr>
          <tr><th scope="row">Details</th>{games.map(game => <td key={game.id}><button type="button" className="insights-details" onClick={() => onOpenGame(game)}>View game <ArrowUpRight size={16}/></button></td>)}</tr>
        </tbody>
      </table>
    </div>
    <footer className="insights-footer"><Info size={15}/><span>Ratings are sourced from IGDB when available. Shared tags are highlighted. This comparison does not represent game quality beyond the available data.</span></footer>
  </div>
}
