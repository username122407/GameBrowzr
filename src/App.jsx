import { useCallback, useEffect, useMemo, useState } from 'react'
import { Gamepad2, Search, Heart, Menu, X, SlidersHorizontal, Sparkles, Library, Monitor, ChevronDown, RefreshCw } from 'lucide-react'
import { getGames, hasApiKey } from './api/rawg'
import { demoGames } from './data/demoGames'
import GameCard from './components/GameCard'
import GameModal from './components/GameModal'

const platformFilters = ['All platforms', 'PC', 'PlayStation', 'Xbox', 'Nintendo', 'Mobile', 'iOS', 'Android']
const sortOptions = [
  { label: 'Top rated', value: '-rating' },
  { label: 'Recently released', value: '-released' },
  { label: 'Name A–Z', value: 'name' },
]

export default function App() {
  const [games, setGames] = useState(demoGames)
  const [query, setQuery] = useState('')
  const [activePlatform, setActivePlatform] = useState('All platforms')
  const [activeGenre, setActiveGenre] = useState('All genres')
  const [sort, setSort] = useState('-rating')
  const [activeTab, setActiveTab] = useState('discover')
  const [wishlist, setWishlist] = useState(() => {
    try { return JSON.parse(localStorage.getItem('gamebrowzr-wishlist') || '[]') } catch { return [] }
  })
  const [selectedGame, setSelectedGame] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [usingDemo, setUsingDemo] = useState(!hasApiKey)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const loadGames = useCallback(async (searchText = query, ordering = sort) => {
    if (!hasApiKey) {
      setUsingDemo(true)
      setError('')
      if (searchText.trim()) {
        setGames(demoGames.filter(game => game.name.toLowerCase().includes(searchText.toLowerCase())))
      } else {
        setGames(demoGames)
      }
      return
    }
    setLoading(true)
    setError('')
    try {
      const data = await getGames({ search: searchText, ordering })
      setGames(data.results || [])
      setUsingDemo(false)
    } catch (err) {
      setError(`${err.message} Showing sample games instead.`)
      setUsingDemo(true)
      setGames(searchText.trim() ? demoGames.filter(game => game.name.toLowerCase().includes(searchText.toLowerCase())) : demoGames)
    } finally {
      setLoading(false)
    }
  }, [query, sort])

  useEffect(() => { loadGames('', sort) }, []) // initial load
  useEffect(() => { localStorage.setItem('gamebrowzr-wishlist', JSON.stringify(wishlist)) }, [wishlist])

  const genres = useMemo(() => ['All genres', ...new Set(games.flatMap(game => (game.genres || []).map(genre => genre.name)).filter(Boolean))], [games])
  const visibleGames = useMemo(() => {
    let result = activeTab === 'wishlist' ? [...wishlist] : [...games]
    if (activePlatform !== 'All platforms') {
      result = result.filter(game => (game.parent_platforms || []).some(item => {
        const name = item.platform?.name?.toLowerCase()
        return activePlatform === 'Mobile' ? ['ios', 'android'].includes(name) : name === activePlatform.toLowerCase()
      }))
    }
    if (activeGenre !== 'All genres') result = result.filter(game => game.genres?.some(genre => genre.name === activeGenre))
    if (sort === 'name') result.sort((a, b) => a.name.localeCompare(b.name))
    return result
  }, [games, wishlist, activeTab, activePlatform, activeGenre, sort])

  const toggleWishlist = game => {
    setWishlist(current => current.some(item => item.id === game.id) ? current.filter(item => item.id !== game.id) : [...current, game])
  }
  const isSaved = game => wishlist.some(item => item.id === game.id)
  const submitSearch = event => {
    event.preventDefault()
    setActiveTab('discover')
    loadGames(query, sort)
  }
  const chooseTab = tab => {
    setActiveTab(tab)
    setMobileMenuOpen(false)
    setActivePlatform('All platforms')
    setActiveGenre('All genres')
    if (tab === 'discover' && !games.length) loadGames('', sort)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" onClick={() => chooseTab('discover')}>
          <span className="brand-mark"><Gamepad2 size={23} /></span>
          <span>GAME<span>VAULT</span></span>
        </a>
        <nav className={`main-nav ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          <button className={activeTab === 'discover' ? 'nav-link active' : 'nav-link'} onClick={() => chooseTab('discover')}><Library size={16} /> Discover</button>
          <button className={activeTab === 'wishlist' ? 'nav-link active' : 'nav-link'} onClick={() => chooseTab('wishlist')}><Heart size={16} /> Wishlist <span className="nav-count">{wishlist.length}</span></button>
        </nav>
        <div className="topbar-right">
          <span className="api-status"><span className={`status-dot ${usingDemo ? 'demo' : ''}`} />{usingDemo ? 'Demo mode' : 'RAWG connected'}</span>
          <button className="mobile-menu-button" onClick={() => setMobileMenuOpen(open => !open)} aria-label="Toggle navigation">{mobileMenuOpen ? <X /> : <Menu />}</button>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-orb orb-one" /><div className="hero-orb orb-two" />
          <div className="hero-content">
            <div className="hero-kicker"><Sparkles size={14} /> YOUR NEXT ADVENTURE STARTS HERE</div>
            <h1>Find your next<br /><span>favorite game.</span></h1>
            <p>Explore games across every platform. Discover what you can play and find the right store to get it.</p>
            <form className="search-form" onSubmit={submitSearch}>
              <Search size={19} />
              <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search games, genres, or titles…" aria-label="Search games" />
              {query && <button type="button" className="clear-search" onClick={() => { setQuery(''); loadGames('', sort) }} aria-label="Clear search"><X size={16} /></button>}
              <button className="search-submit" type="submit">Search</button>
            </form>
            <div className="hero-tags"><span>Explore by platform</span>{['PC', 'PlayStation', 'Xbox', 'Nintendo', 'Mobile'].map(tag => <button key={tag} onClick={() => { setActiveTab('discover'); setActivePlatform(tag); }}>{tag}</button>)}</div>
          </div>
          <div className="hero-art" aria-hidden="true"><div className="art-ring ring-a" /><div className="art-ring ring-b" /><div className="art-controller"><Gamepad2 size={150} strokeWidth={1.1} /></div><span className="art-spark spark-a">✦</span><span className="art-spark spark-b">✧</span></div>
        </section>

        <section className="catalog-section">
          <div className="section-topline">
            <div>
              <div className="eyebrow">{activeTab === 'wishlist' ? 'YOUR COLLECTION' : 'THE GAME LIBRARY'}</div>
              <h2>{activeTab === 'wishlist' ? 'Your wishlist' : 'Explore games'} <span className="heading-dot">.</span></h2>
              <p className="section-subtitle">{activeTab === 'wishlist' ? 'Your saved games, all in one place.' : 'Browse, filter, and discover something worth playing.'}</p>
            </div>
            <div className="result-count"><span>{visibleGames.length}</span> games shown</div>
          </div>

          <div className="filter-bar">
            <div className="filter-label"><SlidersHorizontal size={16} /> FILTER BY</div>
            <div className="filter-select-wrap">
              <Monitor size={15} />
              <select value={activePlatform} onChange={event => setActivePlatform(event.target.value)} aria-label="Filter by platform">
                {platformFilters.map(platform => <option key={platform}>{platform}</option>)}
              </select><ChevronDown size={14} />
            </div>
            <div className="filter-select-wrap">
              <select value={activeGenre} onChange={event => setActiveGenre(event.target.value)} aria-label="Filter by genre">
                {genres.map(genre => <option key={genre}>{genre}</option>)}
              </select><ChevronDown size={14} />
            </div>
            <div className="filter-select-wrap sort-select">
              <select value={sort} onChange={event => { setSort(event.target.value); loadGames(query, event.target.value) }} aria-label="Sort games">
                {sortOptions.map(option => <option value={option.value} key={option.value}>Sort: {option.label}</option>)}
              </select><ChevronDown size={14} />
            </div>
            {(activePlatform !== 'All platforms' || activeGenre !== 'All genres') && <button className="reset-filters" onClick={() => { setActivePlatform('All platforms'); setActiveGenre('All genres') }}>Reset filters</button>}
          </div>

          {usingDemo && <div className="demo-notice"><span className="notice-dot" /><div><strong>Preview data is active.</strong> Add your RAWG API key to load the live game catalog. <a href="https://rawg.io/apidocs" target="_blank" rel="noreferrer">Get an API key ↗</a></div></div>}
          {error && <div className="error-notice">{error}</div>}

          {loading ? <div className="loading-state"><RefreshCw className="spin" size={26} /><p>Finding games for you…</p></div> : visibleGames.length ? (
            <div className="game-grid">
              {visibleGames.map(game => <GameCard key={game.id} game={game} saved={isSaved(game)} onToggleSave={toggleWishlist} onOpen={setSelectedGame} />)}
            </div>
          ) : (
            <div className="empty-state"><div className="empty-icon">{activeTab === 'wishlist' ? <Heart size={28} /> : <Search size={28} />}</div><h3>{activeTab === 'wishlist' ? 'Your wishlist is empty' : 'No games found'}</h3><p>{activeTab === 'wishlist' ? 'Save games you like and they will appear here.' : 'Try another search or adjust your filters.'}</p><button className="secondary-button" onClick={() => { setActiveTab('discover'); setActivePlatform('All platforms'); setActiveGenre('All genres'); setQuery(''); loadGames('', sort) }}>Explore games</button></div>
          )}
        </section>
      </main>

      <footer className="site-footer">
        <a className="footer-brand" href="#"><Gamepad2 size={19} /> GAMEBROWZR</a>
        <p>Discover more. Play more. Find your next favorite.</p>
        <p className="footer-credit">Game data and images powered by <a href="https://rawg.io" target="_blank" rel="noreferrer">RAWG</a>. Store links open official storefront search pages. Availability and prices may vary.</p>
        <span className="copyright">© {new Date().getFullYear()} GameBrowzr · Student capstone project</span>
      </footer>

      {selectedGame && <GameModal game={selectedGame} saved={isSaved(selectedGame)} onClose={() => setSelectedGame(null)} onToggleSave={toggleWishlist} />}
    </div>
  )
}