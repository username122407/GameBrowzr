import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Gamepad2, Search, Heart, Menu, X, SlidersHorizontal, Sparkles, Library, Monitor, ChevronDown, RefreshCw, GitCompareArrows, Check, Clock3, Trophy, PlayCircle, ArrowUp, XCircle } from 'lucide-react'
import { getGames, apiProxyEnabled } from './api/igdb'
import { demoGames } from './data/demoGames'
import GameCard from './components/GameCard'
import GameModal from './components/GameModal'

const platformFilters = ['All platforms', 'PC', 'PlayStation', 'Xbox', 'Nintendo', 'Mobile', 'iOS', 'Android']
const catalogGenres = ['All genres', 'Action', 'Adventure', 'Arcade', 'Fighting', 'Indie', 'Music', 'Platform', 'Puzzle', 'Racing', 'Role-playing (RPG)', 'Shooter', 'Simulator', 'Sport', 'Strategy', 'Tactical', 'Turn-based strategy (TBS)', 'Visual Novel']
const PAGE_SIZE = 60
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
  const [compare, setCompare] = useState([])
  const [library, setLibrary] = useState(() => {
    try { return JSON.parse(localStorage.getItem('gamebrowzr-library') || '{}') } catch { return {} }
  })
  const [showTop, setShowTop] = useState(false)
  const [libraryFilter, setLibraryFilter] = useState('all')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const loadMoreRef = useRef(null)
  const requestIdRef = useRef(0)
  const loadingRef = useRef(false)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [error, setError] = useState('')
  const [usingDemo, setUsingDemo] = useState(!apiProxyEnabled)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const loadGames = useCallback(async ({ searchText = '', ordering = '-rating', platform = 'All platforms', genre = 'All genres', nextOffset = 0, append = false } = {}) => {
    if (append && loadingRef.current) return
    const requestId = append ? requestIdRef.current : ++requestIdRef.current
    loadingRef.current = true
    if (!append) setLoading(true)
    else setLoadingMore(true)
    setError('')
    try {
      const data = await getGames({ search: searchText, ordering, platform, genre, offset: nextOffset })
      if (requestId !== requestIdRef.current) return
      setGames(previous => append ? [...previous, ...(data.results || []).filter(item => !previous.some(old => old.id === item.id))] : (data.results || []))
      setOffset(data.nextOffset ?? nextOffset + (data.results || []).length)
      setHasMore(Boolean(data.hasMore))
      setUsingDemo(false)
    } catch (err) {
      if (requestId !== requestIdRef.current) return
      if (append) setError(`Could not load more games: ${err.message}`)
      else {
        setError(`${err.message} Showing sample games instead.`)
        setUsingDemo(true)
        setHasMore(false)
        setGames(searchText.trim() ? demoGames.filter(game => game.name.toLowerCase().includes(searchText.toLowerCase())) : demoGames)
      }
    } finally {
      if (requestId === requestIdRef.current) {
        loadingRef.current = false
        setLoading(false)
        setLoadingMore(false)
      }
    }
  }, [])

  useEffect(() => { loadGames() }, [loadGames])
  useEffect(() => { const timer = setTimeout(() => setDebouncedQuery(query.trim()), 450); return () => clearTimeout(timer) }, [query])
  useEffect(() => { if (debouncedQuery !== '') loadGames({ searchText: debouncedQuery, ordering: sort, platform: activePlatform, genre: activeGenre }) }, [debouncedQuery, loadGames])
  useEffect(() => { localStorage.setItem('gamebrowzr-library', JSON.stringify(library)) }, [library])
  useEffect(() => { const onScroll = () => setShowTop(window.scrollY > 700); window.addEventListener('scroll', onScroll, { passive: true }); return () => window.removeEventListener('scroll', onScroll) }, [])

  const refreshGames = (searchText = query, ordering = sort, platform = activePlatform, genre = activeGenre) => {
    setActiveTab('discover')
    loadGames({ searchText, ordering, platform, genre })
  }
  const loadMore = useCallback(() => loadGames({ searchText: query, ordering: sort, platform: activePlatform, genre: activeGenre, nextOffset: offset, append: true }), [loadGames, query, sort, activePlatform, activeGenre, offset])
  useEffect(() => {
    if (activeTab !== 'discover' || !hasMore || usingDemo || loading || loadingMore) return
    const node = loadMoreRef.current
    if (!node) return
    const observer = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting) loadMore()
    }, { rootMargin: '600px' })
    observer.observe(node)
    return () => observer.disconnect()
  }, [activeTab, hasMore, usingDemo, loading, loadingMore, loadMore])
  useEffect(() => { localStorage.setItem('gamebrowzr-wishlist', JSON.stringify(wishlist)) }, [wishlist])

  const genres = catalogGenres
  const visibleGames = useMemo(() => {
    if (activeTab === 'discover') return games
    let result = activeTab === 'library' ? Object.values(library).filter(entry => libraryFilter === 'all' || entry.status === libraryFilter).map(entry => entry.game) : [...wishlist]
    if (activePlatform !== 'All platforms') result = result.filter(game => (game.parent_platforms || []).some(item => {
      const name = item.platform?.name?.toLowerCase()
      return activePlatform === 'Mobile' ? ['ios', 'android'].includes(name) : name === activePlatform.toLowerCase()
    }))
    if (activeGenre !== 'All genres') result = result.filter(game => game.genres?.some(genre => genre.name === activeGenre))
    if (sort === 'name') result.sort((a, b) => a.name.localeCompare(b.name))
    return result
  }, [games, wishlist, library, libraryFilter, activeTab, activePlatform, activeGenre, sort])

  const setLibraryStatus = (game, status) => {
    setLibrary(current => {
      const next = { ...current }
      if (status) next[game.id] = { game, status }
      else delete next[game.id]
      return next
    })
  }
  const toggleCompare = game => setCompare(current => current.some(item => item.id === game.id) ? current.filter(item => item.id !== game.id) : current.length < 3 ? [...current, game] : current)
  const toggleWishlist = game => {
    setWishlist(current => current.some(item => item.id === game.id) ? current.filter(item => item.id !== game.id) : [...current, game])
  }
  const isSaved = game => wishlist.some(item => item.id === game.id)
  const submitSearch = event => {
    event.preventDefault()
    setActiveTab('discover')
    refreshGames(query, sort)
  }
  const chooseTab = tab => {
    setActiveTab(tab)
    setMobileMenuOpen(false)
    setActivePlatform('All platforms')
    setActiveGenre('All genres')
    if (tab === 'discover' && !games.length) refreshGames('', sort)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" onClick={() => chooseTab('discover')}>
          <span className="brand-mark"><Gamepad2 size={23} /></span>
          <span>GAME<span>BROWZR</span></span>
        </a>
        <nav className={`main-nav ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          <button className={activeTab === 'discover' ? 'nav-link active' : 'nav-link'} onClick={() => chooseTab('discover')}><Library size={16} /> Discover</button>
          <button className={activeTab === 'wishlist' ? 'nav-link active' : 'nav-link'} onClick={() => chooseTab('wishlist')}><Heart size={16} /> Wishlist <span className="nav-count">{wishlist.length}</span></button>
          <button className={activeTab === 'library' ? 'nav-link active' : 'nav-link'} onClick={() => chooseTab('library')}><Library size={16} /> My library <span className="nav-count">{Object.keys(library).length}</span></button>
        </nav>
        <div className="topbar-right">
          <span className="api-status"><span className={`status-dot ${usingDemo ? 'demo' : ''}`} />{usingDemo ? 'Demo mode' : 'IGDB connected'}</span>
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
              <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search the IGDB catalog for any game…" aria-label="Search games" />
              {query && <button type="button" className="clear-search" onClick={() => { setQuery(''); refreshGames('', sort) }} aria-label="Clear search"><X size={16} /></button>}
              <button className="search-submit" type="submit">Search</button>
            </form>
            <div className="hero-tags"><span>Explore by platform</span>{['PC', 'PlayStation', 'Xbox', 'Nintendo', 'Mobile'].map(tag => <button key={tag} onClick={() => { setActivePlatform(tag); refreshGames(query, sort, tag, activeGenre) }}>{tag}</button>)}</div>
          </div>
          <div className="hero-art" aria-hidden="true"><div className="art-ring ring-a" /><div className="art-ring ring-b" /><div className="art-controller"><Gamepad2 size={150} strokeWidth={1.1} /></div><span className="art-spark spark-a">✦</span><span className="art-spark spark-b">✧</span></div>
        </section>

        <section className="catalog-section">
          <div className="section-topline">
            <div>
              <div className="eyebrow">{activeTab === 'wishlist' || activeTab === 'library' ? 'YOUR COLLECTION' : 'THE GAME LIBRARY'}</div>
              <h2>{activeTab === 'wishlist' ? 'Your wishlist' : activeTab === 'library' ? 'My game library' : 'Explore games'} <span className="heading-dot">.</span></h2>
              <p className="section-subtitle">{activeTab === 'wishlist' ? 'Your saved games, all in one place.' : activeTab === 'library' ? 'Track what you want to play, are playing, and have completed.' : 'Main games only. Browse, filter and discover something worth playing.'}</p>
            </div>
            <div className="result-count"><span>{visibleGames.length}</span> games shown</div>
          </div>

          <div className="filter-bar">
            <div className="filter-label"><SlidersHorizontal size={16} /> FILTER BY</div>
            <div className="filter-select-wrap">
              <Monitor size={15} />
              <select value={activePlatform} onChange={event => { setActivePlatform(event.target.value); refreshGames(query, sort, event.target.value, activeGenre) }} aria-label="Filter by platform">
                {platformFilters.map(platform => <option key={platform}>{platform}</option>)}
              </select><ChevronDown size={14} />
            </div>
            <div className="filter-select-wrap">
              <select value={activeGenre} onChange={event => { setActiveGenre(event.target.value); refreshGames(query, sort, activePlatform, event.target.value) }} aria-label="Filter by genre">
                {genres.map(genre => <option key={genre}>{genre}</option>)}
              </select><ChevronDown size={14} />
            </div>
            <div className="filter-select-wrap sort-select">
              <select value={sort} onChange={event => { setSort(event.target.value); refreshGames(query, event.target.value) }} aria-label="Sort games">
                {sortOptions.map(option => <option value={option.value} key={option.value}>Sort: {option.label}</option>)}
              </select><ChevronDown size={14} />
            </div>
            {(activePlatform !== 'All platforms' || activeGenre !== 'All genres') && <button className="reset-filters" onClick={() => { setActivePlatform('All platforms'); setActiveGenre('All genres'); refreshGames(query, sort, 'All platforms', 'All genres') }}>Reset filters</button>}
          </div>

          {activeTab === 'discover' && <div className="discovery-shortcuts"><span>QUICK DISCOVERY</span><button onClick={() => { setQuery(''); setSort('-rating'); refreshGames('', '-rating') }}>★ Top rated</button><button onClick={() => { setQuery(''); setSort('-released'); refreshGames('', '-released') }}>◷ New releases</button><button onClick={() => { setQuery(''); setActiveGenre('Indie'); refreshGames('', sort, activePlatform, 'Indie') }}>✦ Indie gems</button><button onClick={() => { setQuery(''); setActiveGenre('Shooter'); refreshGames('', sort, activePlatform, 'Shooter') }}>◎ Shooters</button></div>}
          {activeTab === 'library' && <div className="library-filter"><label htmlFor="library-status">Library status</label><select id="library-status" value={libraryFilter} onChange={event => setLibraryFilter(event.target.value)}><option value="all">All games</option><option value="want">Want to play</option><option value="playing">Playing</option><option value="completed">Completed</option></select></div>}
          {activeTab === 'library' && <div className="library-summary">{[['want','Want to play',Clock3],['playing','Playing',PlayCircle],['completed','Completed',Trophy]].map(([status,label,Icon]) => <div className="summary-tile" key={status}><Icon size={20}/><strong>{Object.values(library).filter(item => item.status === status).length}</strong><span>{label}</span></div>)}</div>}
          {usingDemo && <div className="demo-notice"><span className="notice-dot" /><div><strong>Preview data is active.</strong> Configure your Twitch application credentials in Vercel to load the live game catalog. <a href="https://dev.twitch.tv/console/apps" target="_blank" rel="noreferrer">Create API credentials ↗</a></div></div>}
          {error && <div className="error-notice">{error}</div>}

          {loading ? <div className="skeleton-grid" aria-label="Loading games" aria-busy="true">{Array.from({length:12},(_,i)=><div className="skeleton-card" key={i}><div/><span/><span/></div>)}</div> : visibleGames.length ? (
            <div className="game-grid">
              {visibleGames.map(game => <GameCard key={game.id} game={game} saved={isSaved(game)} onToggleSave={toggleWishlist} onOpen={setSelectedGame} onCompare={toggleCompare} comparing={compare.some(item => item.id === game.id)} libraryStatus={library[game.id]?.status || ""} onLibraryStatus={setLibraryStatus} />)}
            </div>
          ) : (
            <div className="empty-state"><div className="empty-icon">{activeTab === 'wishlist' ? <Heart size={28} /> : <Search size={28} />}</div><h3>{activeTab === 'wishlist' ? 'Your wishlist is empty' : activeTab === 'library' ? 'Your library is empty' : 'No games found'}</h3><p>{activeTab === 'wishlist' ? 'Save games you like and they will appear here.' : activeTab === 'library' ? 'Mark games as Want to play, Playing, or Completed.' : 'Try another search or adjust your filters.'}</p><button className="secondary-button" onClick={() => { setActivePlatform('All platforms'); setActiveGenre('All genres'); setQuery(''); refreshGames('', sort, 'All platforms', 'All genres') }}>Explore games</button></div>
          )}
          {activeTab === 'discover' && !usingDemo && hasMore && !loading && <div style={{ textAlign: 'center', padding: '28px 0' }}><div ref={loadMoreRef} aria-live="polite" style={{ color: '#b5a7d0' }}>{loadingMore ? 'Loading more games automatically…' : `Keep scrolling — more games load automatically`}</div></div>}
        </section>
      </main>

      <footer className="site-footer">
        <a className="footer-brand" href="#"><Gamepad2 size={19} /> GAMEBROWZR</a>
        <p>Discover more. Play more. Find your next favorite.</p>
        <p className="footer-credit">Game data and images powered by <a href="https://www.igdb.com/" target="_blank" rel="noreferrer">IGDB</a>. Store links open official storefront search pages. Availability and prices may vary.</p>
        <span className="copyright">© {new Date().getFullYear()} GameBrowzr · Student capstone project</span>
      </footer>

      {selectedGame && <GameModal game={selectedGame} saved={isSaved(selectedGame)} onClose={() => setSelectedGame(null)} onToggleSave={toggleWishlist} libraryStatus={library[selectedGame.id]?.status || ''} onLibraryStatus={setLibraryStatus} />}
      {compare.length > 0 && <aside className="compare-tray" aria-label="Compare selected games"><span><GitCompareArrows size={17}/> Compare {compare.length}/3</span><div className="compare-names">{compare.map(item => <button key={item.id} onClick={() => toggleCompare(item)} title="Remove game">{item.name} ×</button>)}</div><button className="compare-open" disabled={compare.length < 2} onClick={() => document.getElementById('compare-dialog').showModal()}>Compare games</button><button className="compare-clear" onClick={() => setCompare([])} aria-label="Clear comparison"><X size={16}/></button></aside>}
      <dialog id="compare-dialog" className="compare-dialog" onClick={e => { if (e.target === e.currentTarget) e.currentTarget.close() }}><div className="compare-header"><h2>Compare games</h2><button onClick={() => document.getElementById('compare-dialog').close()} aria-label="Close comparison"><X/></button></div><div className="compare-grid">{compare.map(game => <div key={game.id} className="compare-column">{game.background_image && <img src={game.background_image} alt=""/>}<h3>{game.name}</h3><p>Rating: {game.rating ? game.rating.toFixed(1) : 'N/A'}</p><p>Released: {game.released || 'Unknown'}</p><p>Genres: {game.genres?.map(g => g.name).join(', ') || 'Unknown'}</p><p>Platforms: {game.platforms?.join(', ') || 'Unknown'}</p></div>)}</div></dialog>
      {showTop && <button className="back-top" onClick={() => window.scrollTo({top:0,behavior:'smooth'})} aria-label="Back to top"><ArrowUp size={20}/></button>}
    </div>
  )
}