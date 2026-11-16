import { ArrowUpRight, X } from 'lucide-react'

function labels(items) {
  return [...new Set((items || []).map(item => typeof item === 'string' ? item : item?.name).filter(Boolean))]
}

function platformsOf(game) {
  const platforms = labels(game.platforms)
  const list = platforms.length ? platforms : labels(game.parent_platforms?.map(item => item?.platform))
  return [...new Set(list.map(name => /^(pc \(microsoft windows\)|windows pc|pc)$/i.test(name) ? 'PC' : name))]
}

function sharedAcross(rows) {
  if (rows.length < 2) return new Set()
  return new Set(rows[0].map(name => name.toLowerCase()).filter(name =>
    rows.every(row => row.some(value => value.toLowerCase() === name)),
  ))
}

function ratingOf(game) {
  const rating = Number(game.rating)
  return Number.isFinite(rating) && rating > 0 ? Math.min(5, rating).toFixed(1) + ' / 5' : 'Unrated'
}

function releaseOf(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—'
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

export default function CompareInsights({ games, onRemove, onClose, onOpenGame }) {
  const genres = games.map(game => labels(game.genres))
  const platforms = games.map(platformsOf)
  const rows = [
    { name: 'Genres', values: genres, shared: sharedAcross(genres) },
    { name: 'Platforms', values: platforms, shared: sharedAcross(platforms) },
  ]
  return <div className="insights-wrap">
    <header className="insights-header">
      <h2 id="gb-compare-title">Compare games</h2>
      <button className="insights-close" type="button" onClick={onClose} aria-label="Close comparison"><X size={21} /></button>
    </header>
    <div className="insights-scroller gb-compare-scroll" tabIndex={0} aria-label="Scrollable game comparison">
      <table className="gb-compare-table gb-compare-aligned" aria-labelledby="gb-compare-title">
        <colgroup><col className="gb-compare-label-col" />{games.map(game => <col key={game.id} />)}</colgroup>
        <thead><tr><th scope="col">Game</th>{games.map(game => <th scope="col" key={game.id}>
          <div className="gb-compare-cover">{game.background_image && <img src={game.background_image} alt="" loading="lazy" />}</div>
          <span className="gb-compare-heading">{game.name}</span>
          <button type="button" onClick={() => onRemove(game)} aria-label={'Remove ' + game.name + ' from comparison'}><X size={16} /></button>
        </th>)}</tr></thead>
        <tbody>
          <tr><th scope="row">Rating</th>{games.map(game => <td key={game.id}><strong className="gb-compare-rating">{ratingOf(game)}</strong></td>)}</tr>
          <tr><th scope="row">Release date</th>{games.map(game => <td key={game.id}>{releaseOf(game.released)}</td>)}</tr>
          {rows.map(({ name, values, shared }) => <tr key={name}><th scope="row">{name}</th>
            {values.map((list, index) => <td key={games[index].id}>
              {list.length ? <ul className="gb-compare-tags">{list.map(label => {
                const common = shared.has(label.toLowerCase())
                return <li key={label} className={common ? 'gb-compare-shared' : undefined}>
                  {label}{common && <span className="gb-screen-reader"> (shared)</span>}
                </li>
              })}</ul> : '—'}
            </td>)}
          </tr>)}
          <tr><th scope="row">Details</th>{games.map(game => <td key={game.id}><button type="button" className="insights-details" onClick={() => onOpenGame(game)} aria-label={'View ' + game.name}>View game <ArrowUpRight size={16} aria-hidden="true" /></button></td>)}</tr>
        </tbody>
      </table>
    </div>
  </div>
}
