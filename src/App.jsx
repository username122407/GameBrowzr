import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Gamepad2, Compass, Flame, ArrowRight, Search, Heart, Menu, X, SlidersHorizontal, Sparkles, Library, Monitor, ChevronDown, RefreshCw, GitCompareArrows, Check, Clock3, Trophy, PlayCircle, ArrowUp, XCircle, BarChart3, WandSparkles, Dices, TrendingUp, Keyboard } from 'lucide-react'
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
  const [featuredIndex, setFeaturedIndex] = useState(0)
  const [spotlightPaused, setSpotlightPaused] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [visibleCount, setVisibleCount] = useState(48)

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
      if (!append) setVisibleCount(48)
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
  useEffect(() => {
    const handler = event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); document.querySelector('.search-form input')?.focus() }
      if (event.key === 'Escape') { setShowSuggestions(false); setShowShortcuts(false) }
      if (event.key === '?' && !['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)) setShowShortcuts(v => !v)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
  useEffect(() => { const timer = setTimeout(() => setDebouncedQuery(query.trim()), 450); return () => clearTimeout(timer) }, [query])
  useEffect(() => { if (debouncedQuery !== '') loadGames({ searchText: debouncedQuery, ordering: sort, platform: activePlatform, genre: activeGenre }) }, [debouncedQuery, loadGames])
  useEffect(() => { localStorage.setItem('gamebrowzr-library', JSON.stringify(library)) }, [library])
  useEffect(() => { const onScroll = () => setShowTop(window.scrollY > 700); window.addEventListener('scroll', onScroll, { passive: true }); return () => window.removeEventListener('scroll', onScroll) }, [])

  const refreshGames = (searchText = query, ordering = sort, platform = activePlatform, genre = activeGenre) => {
    setActiveTab('discover')
    loadGames({ searchText, ordering, platform, genre })
  }
  const loadMore = useCallback(() => {
    if (visibleCount < games.length) { setVisibleCount(n => n + 48); return }
    if (hasMore) loadGames({ searchText: query, ordering: sort, platform: activePlatform, genre: activeGenre, nextOffset: offset, append: true })
  }, [loadGames, query, sort, activePlatform, activeGenre, offset, visibleCount, games.length, hasMore])
  useEffect(() => {
    if (activeTab !== 'discover' || (!hasMore && visibleCount >= games.length) || usingDemo || loading || loadingMore) return
    const node = loadMoreRef.current
    if (!node) return
    const observer = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting) loadMore()
    }, { rootMargin: '600px' })
    observer.observe(node)
    return () => observer.disconnect()
  }, [activeTab, hasMore, usingDemo, loading, loadingMore, loadMore, visibleCount, games.length])
  useEffect(() => { localStorage.setItem('gamebrowzr-wishlist', JSON.stringify(wishlist)) }, [wishlist])

  const spotlightGames = useMemo(() => games.filter(game => game.background_image).slice(0, 5), [games])
  const featured = spotlightGames[featuredIndex % Math.max(1, spotlightGames.length)]
  useEffect(() => { setFeaturedIndex(0) }, [games])
  useEffect(() => { if (spotlightPaused || spotlightGames.length < 2 || activeTab !== 'discover') return; const timer = setInterval(() => setFeaturedIndex(i => (i + 1) % spotlightGames.length), 6500); return () => clearInterval(timer) }, [spotlightPaused, spotlightGames.length, activeTab])
  const genres = catalogGenres
  const libraryEntries = Object.values(library)
  const libraryStats = useMemo(() => {
    const entries = Object.values(library)
    const genreCounts = {}
    const platformCounts = {}
    for (const { game } of entries) {
      for (const g of game.genres || []) genreCounts[g.name] = (genreCounts[g.name] || 0) + 1
      for (const p of game.parent_platforms || []) { const n = p.platform?.name; if (n) platformCounts[n] = (platformCounts[n] || 0) + 1 }
    }
    return { genreCounts, platformCounts, topGenre: Object.entries(genreCounts).sort((a,b) => b[1]-a[1])[0]?.[0] }
  }, [library])
  const recommendations = useMemo(() => {
    const saved = [...wishlist, ...libraryEntries.map(entry => entry.game)]
    const interests = {}
    saved.forEach(game => (game.genres || []).forEach(g => { interests[g.name] = (interests[g.name] || 0) + 1 }))
    const existing = new Set(saved.map(g => g.id))
    return games.filter(game => !existing.has(game.id) && game.background_image)
      .map(game => ({ game, score: (game.genres || []).reduce((n,g) => n + (interests[g.name] || 0),0) * 10 + (game.rating || 0) }))
      .sort((a,b) => b.score - a.score).slice(0, 8).map(item => item.game)
  }, [games, wishlist, library])
  const suggestions = useMemo(() => {
    const text = query.trim().toLowerCase()
    return text.length > 1 ? games.filter(game => game.name.toLowerCase().includes(text)).slice(0,5) : []
  }, [query, games])
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
      <aside className={`studio-sidebar ${mobileMenuOpen ? 'sidebar-open' : ''}`}>
        <a className="studio-brand" href="#" onClick={e => {e.preventDefault(); chooseTab('discover')}}><img src="/gamebrowzr-mark.webp" alt="GameBrowzr emblem"/><span>GAME<span>BROWZR</span><small>EXPLORE BEYOND</small></span></a>
        <div className="sidebar-label">EXPLORE</div>
        <nav className="studio-nav" aria-label="Main navigation">
          <button className={activeTab === 'discover' ? 'studio-link active' : 'studio-link'} onClick={() => chooseTab('discover')}><Compass size={18}/> Discover <ArrowRight size={14} className="link-arrow"/></button>
          <button className={activeTab === 'wishlist' ? 'studio-link active' : 'studio-link'} onClick={() => chooseTab('wishlist')}><Heart size={18}/> Wishlist <span className="side-count">{wishlist.length}</span></button>
          <button className={activeTab === 'library' ? 'studio-link active' : 'studio-link'} onClick={() => chooseTab('library')}><Library size={18}/> My library <span className="side-count">{Object.keys(library).length}</span></button>
        </nav>
        <div className="sidebar-label sidebar-label-secondary">QUICK EXPLORE</div>
        <nav className="studio-nav" aria-label="Discovery shortcuts">
          <button className="studio-link" onClick={() => {setQuery(''); setSort('-rating'); refreshGames('', '-rating')}}><Trophy size={18}/> Top rated</button>
          <button className="studio-link" onClick={() => {setQuery(''); setSort('-released'); refreshGames('', '-released')}}><Flame size={18}/> New releases</button>
          <button className="studio-link" onClick={() => {setQuery(''); setActiveGenre('Indie'); refreshGames('', sort, activePlatform, 'Indie')}}><Sparkles size={18}/> Indie gems</button>
        </nav>
        <div className="sidebar-bottom"><div className="sidebar-gradient-icon"><Gamepad2 size={21}/></div><strong>Make your next<br/>play unforgettable.</strong><span>Find games worth exploring.</span></div>
      </aside>
      <div className="studio-workspace">
      <header className="studio-topbar">
        <button className="mobile-menu-button" onClick={() => setMobileMenuOpen(open => !open)} aria-label="Toggle navigation">{mobileMenuOpen ? <X/> : <Menu/>}</button>
        <div className="studio-location"><span>DISCOVER</span><span className="location-separator">/</span><strong>{activeTab === 'discover' ? 'Game store' : activeTab === 'wishlist' ? 'Wishlist' : 'My library'}</strong></div>
        <div className="studio-top-actions"><button className="shortcut-toggle" onClick={() => setShowShortcuts(true)} title="Keyboard shortcuts"><Keyboard size={16}/> <span>Shortcuts</span></button><span className="api-status"><span className={`status-dot ${usingDemo ? 'demo' : ''}`} />{usingDemo ? 'Preview catalog' : 'IGDB connected'}</span><button className="top-avatar" onClick={() => chooseTab('library')} aria-label="Open my library"><Library size={18}/></button></div>
      </header>
      <main>
        <section className="studio-intro"><div><div className="hero-kicker"><Sparkles size={14}/> CURATED FOR THE CURIOUS</div><h1>Discover your <em>next obsession.</em></h1><p>From timeless classics to your next favorite. One beautiful place to explore gaming.</p></div><div className="intro-glow" aria-hidden="true"/></section>
        {activeTab === 'discover' && <section className="spotlight-area" aria-label="Featured games" onMouseEnter={() => setSpotlightPaused(true)} onMouseLeave={() => setSpotlightPaused(false)}>
          <div className="spotlight-main" style={featured?.background_image ? {backgroundImage:`linear-gradient(90deg,rgba(10,9,23,.83) 0%,rgba(10,9,23,.22) 100%),url(${featured.background_image})`} : undefined}>
            <div className="spotlight-content"><span className="spotlight-pill"><Flame size={13}/> IN THE SPOTLIGHT</span><h2>{featured?.name || 'Your universe of games'}</h2><p>{featured ? `${featured.genres?.slice(0,3).map(g=>g.name).join(' · ') || 'Discover something new'}  ${featured.released ? ' · '+featured.released.slice(0,4) : ''}` : 'Explore unforgettable worlds across every platform.'}</p><button className="spotlight-action" onClick={() => featured && setSelectedGame(featured)}>Explore game <ArrowRight size={16}/></button></div>
            <div className="spotlight-dots">{spotlightGames.map((game,i)=><button key={game.id} className={featuredIndex===i?'active':''} onClick={()=>setFeaturedIndex(i)} aria-label={`Show featured game ${i+1}`} aria-current={featuredIndex===i?'true':undefined}/>)}</div>
          </div>
          <div className="spotlight-side"><div className="side-feature"><span>YOUR LIBRARY</span><strong>Every adventure,<br/>in one place.</strong><p>Save it. Play it. Remember it.</p><button onClick={() => chooseTab('library')}>View library <ArrowRight size={15}/></button><div className="side-feature-glow"/></div><div className="side-mini"><span className="mini-icon"><Heart size={20}/></span><div><strong>{wishlist.length} saved games</strong><small>Your next adventures await</small></div><ArrowRight size={16}/></div></div>
        </section>}
        {activeTab === 'discover' && <section className="curated-section" aria-label="Personalized discoveries">
          <div className="curated-head"><div><span className="eyebrow"><WandSparkles size={14}/> SMART DISCOVERY</span><h2>Picked for your taste <span className="heading-dot">.</span></h2><p>Recommendations based on your saved games and favorite genres, refreshed as you explore.</p></div><button className="surprise-button" onClick={() => { const pick = recommendations[Math.floor(Math.random()*recommendations.length)] || games[Math.floor(Math.random()*games.length)]; if (pick) setSelectedGame(pick) }}><Dices size={17}/> Surprise me</button></div>
          <div className="curated-scroll">{recommendations.slice(0,6).map(game => <button className="curated-card" key={game.id} onClick={() => setSelectedGame(game)}><img src={game.background_image} alt="" loading="lazy"/><span>{game.name}</span><small>{game.genres?.slice(0,2).map(g=>g.name).join(' · ') || 'Discover'}</small></button>)}</div>
          {!wishlist.length && !libraryEntries.length && <p className="recommendation-note">Save games to your wishlist or library to personalize these recommendations.</p>}
        </section>}
        {activeTab === 'library' && <section className="insights-panel"><div className="insights-title"><BarChart3 size={21}/><div><h2>Your gaming snapshot</h2><p>Insights from the games you've saved on this device.</p></div></div><div className="insight-grid"><div><span>Total tracked</span><strong>{libraryEntries.length}</strong></div><div><span>Completed</span><strong>{libraryEntries.filter(e=>e.status==='completed').length}</strong></div><div><span>Completion rate</span><strong>{libraryEntries.length ? Math.round(libraryEntries.filter(e=>e.status==='completed').length / libraryEntries.length * 100) : 0}%</strong></div><div><span>Favorite genre</span><strong className="insight-genre">{libraryStats.topGenre || 'Explore games'}</strong></div></div><div className="insights-bars">{Object.entries(libraryStats.genreCounts).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([name,count])=><div className="insights-bar" key={name}><span>{name}</span><div><i style={{width:`${Math.max(8,count/Math.max(1,libraryEntries.length)*100)}%`}}/></div><b>{count}</b></div>)}</div></section>}
        <section className="studio-search"><form className="search-form" onSubmit={e => {setShowSuggestions(false); submitSearch(e)}}><Search size={19}/><input value={query} onFocus={() => setShowSuggestions(true)} onChange={event=>{setQuery(event.target.value);setShowSuggestions(true)}} placeholder="Search games, worlds, and adventures..." aria-label="Search games" autoComplete="off"/>{query && <button type="button" className="clear-search" onClick={()=>{setQuery('');refreshGames('',sort)}} aria-label="Clear search"><X size={16}/></button>}<button className="search-submit" type="submit">Search <ArrowRight size={15}/></button></form>{showSuggestions && suggestions.length > 0 && <div className="search-suggestions" role="listbox" aria-label="Game suggestions">{suggestions.map(game => <button key={game.id} role="option" aria-selected="false" onClick={() => {setSelectedGame(game);setShowSuggestions(false)}}><Search size={14}/><span>{game.name}</span><ArrowRight size={14}/></button>)}</div>}<div className="studio-search-note"><span>EXPLORE PLATFORMS</span>{['PC','PlayStation','Xbox','Nintendo','Mobile'].map(tag=><button key={tag} onClick={()=>{setActivePlatform(tag);refreshGames(query,sort,tag,activeGenre)}}>{tag}</button>)}</div></section>
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
              {visibleGames.slice(0,visibleCount).map(game => <GameCard key={game.id} game={game} saved={isSaved(game)} onToggleSave={toggleWishlist} onOpen={setSelectedGame} onCompare={toggleCompare} comparing={compare.some(item => item.id === game.id)} libraryStatus={library[game.id]?.status || ""} onLibraryStatus={setLibraryStatus} />)}
            </div>
          ) : (
            <div className="empty-state"><div className="empty-icon">{activeTab === 'wishlist' ? <Heart size={28} /> : <Search size={28} />}</div><h3>{activeTab === 'wishlist' ? 'Your wishlist is empty' : activeTab === 'library' ? 'Your library is empty' : 'No games found'}</h3><p>{activeTab === 'wishlist' ? 'Save games you like and they will appear here.' : activeTab === 'library' ? 'Mark games as Want to play, Playing, or Completed.' : 'Try another search or adjust your filters.'}</p><button className="secondary-button" onClick={() => { setActivePlatform('All platforms'); setActiveGenre('All genres'); setQuery(''); refreshGames('', sort, 'All platforms', 'All genres') }}>Explore games</button></div>
          )}
          {activeTab === 'discover' && !usingDemo && (hasMore || visibleCount < games.length) && !loading && <div className="render-more" ref={loadMoreRef} aria-live="polite"><p>{loadingMore ? 'Loading more discoveries…' : `Showing ${Math.min(visibleCount, games.length)} of ${games.length} loaded games · Scroll for more`}</p></div>}
        </section>
      </main>
      </div>

      <footer className="site-footer">
        <a className="footer-brand" href="#"><img src="/gamebrowzr-mark.webp" alt="" width="28" height="28" /> GAMEBROWZR</a>
        <p>Discover more. Play more. Find your next favorite.</p>
        <p className="footer-credit">Game data and images powered by <a href="https://www.igdb.com/" target="_blank" rel="noreferrer">IGDB</a>. Store links open official storefront search pages. Availability and prices may vary.</p>
        <span className="copyright">© {new Date().getFullYear()} GameBrowzr · Student capstone project</span>
      </footer>

      {showShortcuts && <div className="shortcuts-overlay" onClick={() => setShowShortcuts(false)}><div className="shortcuts-box" onClick={e=>e.stopPropagation()}><button onClick={() => setShowShortcuts(false)} aria-label="Close"><X/></button><h2>Keyboard shortcuts</h2><p><kbd>Ctrl</kbd> + <kbd>K</kbd> Focus search</p><p><kbd>?</kbd> Open shortcuts</p><p><kbd>Esc</kbd> Close panels</p></div></div>}
      {selectedGame && <GameModal game={selectedGame} saved={isSaved(selectedGame)} onClose={() => setSelectedGame(null)} onToggleSave={toggleWishlist} libraryStatus={library[selectedGame.id]?.status || ''} onLibraryStatus={setLibraryStatus} />}
      {compare.length > 0 && <aside className="compare-tray" aria-label="Compare selected games"><span><GitCompareArrows size={17}/> Compare {compare.length}/3</span><div className="compare-names">{compare.map(item => <button key={item.id} onClick={() => toggleCompare(item)} title="Remove game">{item.name} ×</button>)}</div><button className="compare-open" disabled={compare.length < 2} onClick={() => document.getElementById('compare-dialog').showModal()}>Compare games</button><button className="compare-clear" onClick={() => setCompare([])} aria-label="Clear comparison"><X size={16}/></button></aside>}
      <dialog id="compare-dialog" className="compare-dialog" onClick={e => { if (e.target === e.currentTarget) e.currentTarget.close() }}><div className="compare-header"><h2>Compare games</h2><button onClick={() => document.getElementById('compare-dialog').close()} aria-label="Close comparison"><X/></button></div><div className="compare-grid">{compare.map(game => <div key={game.id} className="compare-column">{game.background_image && <img src={game.background_image} alt=""/>}<h3>{game.name}</h3><p>Rating: {game.rating ? game.rating.toFixed(1) : 'N/A'}</p><p>Released: {game.released || 'Unknown'}</p><p>Genres: {game.genres?.map(g => g.name).join(', ') || 'Unknown'}</p><p>Platforms: {game.platforms?.join(', ') || 'Unknown'}</p></div>)}</div></dialog>
      {showTop && <button className="back-top" onClick={() => window.scrollTo({top:0,behavior:'smooth'})} aria-label="Back to top"><ArrowUp size={20}/></button>}
    </div>
  )
}