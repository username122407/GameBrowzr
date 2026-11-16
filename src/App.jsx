import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Gamepad2, Compass, Flame, ArrowRight, Search, Heart, Menu, X, SlidersHorizontal, Sparkles, Library, Monitor, ChevronDown, ChevronLeft, ChevronRight, Pause, Play, RefreshCw, GitCompareArrows, Check, Clock3, Trophy, PlayCircle, ArrowUp, XCircle, BarChart3, WandSparkles, Dices, TrendingUp, Keyboard, CarFront, Crosshair, BrainCircuit, Puzzle, Footprints, Shapes, Joystick, Rocket, Swords, Mountain, } from 'lucide-react'
import { getGames, getSpotlightGames, apiProxyEnabled } from './api/igdb'
import { demoGames } from './data/demoGames'
import GameCard from './components/GameCard'
import { useAccount } from './account/AccountProvider.jsx'
import { useCollections } from './collections/useCollections.js'
import { Avatar } from './account/Avatar.jsx'
import './styles.css'

const GameModal = lazy(() => import('./components/GameModal'))
import AuroraSelect from './components/AuroraSelect'
import CompareInsights from './components/CompareInsights'
import { pickSurpriseGame } from './utils/surpriseDiscovery'

const platformFilters = ['All platforms', 'PC', 'PlayStation', 'Xbox', 'Nintendo', 'iOS', 'Android']
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
  const [categoryGenre, setCategoryGenre] = useState(null)
  const [activeQuickExplore, setActiveQuickExplore] = useState(null)
  const { client, user } = useAccount()
  const collections = useCollections(client, user?.id)
  const { wishlist, library, toggleWishlist, setLibraryStatus, preferences } = collections
  const collectionDisabled = !collections.canEdit
  const [selectedGame, setSelectedGame] = useState(null)
  const [compare, setCompare] = useState([])
  const [showTop, setShowTop] = useState(false)
  const [libraryFilter, setLibraryFilter] = useState('all')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const loadMoreRef = useRef(null)
  const requestIdRef = useRef(0)
  const acceptedRequest = useRef(null)
  const [appendFailed, setAppendFailed] = useState(false)
  const loadingRef = useRef(false)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [error, setError] = useState('')
  const [usingDemo, setUsingDemo] = useState(!apiProxyEnabled)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const drawerTouchStart = useRef(null)
  const drawerTouchLast = useRef(null)
  const [drawerDrag, setDrawerDrag] = useState(0)
  const openMobileMenu = () => { setDrawerDrag(0); setMobileMenuOpen(true) }
  const closeMobileMenu = () => { setDrawerDrag(0); setMobileMenuOpen(false) }
  const onDrawerTouchStart = event => {
    if (event.touches.length !== 1) return
    drawerTouchStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }
    drawerTouchLast.current = drawerTouchStart.current
  }
  const onDrawerTouchMove = event => {
    if (!drawerTouchStart.current || event.touches.length !== 1) return
    const dx = event.touches[0].clientX - drawerTouchStart.current.x
    const dy = event.touches[0].clientY - drawerTouchStart.current.y
    // Let vertical scrolling inside the drawer work normally.
    if (Math.abs(dy) > Math.abs(dx) && drawerDrag === 0) return
    drawerTouchLast.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }
    if (dx < 0) setDrawerDrag(Math.max(-280, dx))
  }
  const onDrawerTouchEnd = () => {
    if (drawerDrag < -75) closeMobileMenu()
    else setDrawerDrag(0)
    drawerTouchStart.current = null
    drawerTouchLast.current = null
  }
  useEffect(() => {
    if (!mobileMenuOpen) return
    const onEscape = event => { if (event.key === 'Escape') closeMobileMenu() }
    const onResize = () => { if (window.innerWidth > 820) closeMobileMenu() }
    window.addEventListener('keydown', onEscape)
    window.addEventListener('resize', onResize)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onEscape)
      window.removeEventListener('resize', onResize)
      document.body.style.overflow = previousOverflow
    }
  }, [mobileMenuOpen])
  const [featuredIndex, setFeaturedIndex] = useState(0)
  const [spotlightPaused, setSpotlightPaused] = useState(false)
  const [spotlightManualPaused, setSpotlightManualPaused] = useState(false)
  const [spotlightCycle, setSpotlightCycle] = useState(0)
  const [spotlightCandidates, setSpotlightCandidates] = useState([])
  const [spotlightBroken, setSpotlightBroken] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [visibleCount, setVisibleCount] = useState(48)
  const recentSurpriseIds = useRef([])
  const [surpriseNotice, setSurpriseNotice] = useState('')

  const loadGames = useCallback(async ({ searchText = '', ordering = '-rating', platform = 'All platforms', genre = 'All genres', nextOffset = 0, append = false } = {}) => {
    if (append && loadingRef.current) return
    const requestId = append ? requestIdRef.current : ++requestIdRef.current
    loadingRef.current = true
    if (!append) setLoading(true)
    else setLoadingMore(true)
    setError('')
    setAppendFailed(false)
    try {
      const data = await getGames({ search: searchText, ordering, platform, genre, offset: nextOffset })
      if (requestId !== requestIdRef.current) return
      if (!append) setVisibleCount(48)
      setGames(previous => append ? [...previous, ...(data.results || []).filter(item => !previous.some(old => old.id === item.id))] : (data.results || []))
      if (!append) acceptedRequest.current = { searchText, ordering, platform, genre }
      setOffset(data.nextOffset ?? nextOffset + (data.results || []).length)
      setHasMore(Boolean(data.hasMore))
      setUsingDemo(false)
    } catch (err) {
      if (requestId !== requestIdRef.current) return
      if (append) { setAppendFailed(true); setError(`Could not load more games: ${err.message}`) }
      else {
        setError(`${err.message} Showing sample games instead.`)
        setUsingDemo(true)
        setHasMore(false)
        const text = searchText.trim().toLowerCase()
        const filtered = demoGames.filter(game =>
          game.name.toLowerCase().includes(text) &&
          (platform === 'All platforms' || game.parent_platforms.some(entry => entry.platform.name === platform)) &&
          (genre === 'All genres' || game.genres.some(entry => entry.name === genre)),
        )
        filtered.sort(ordering === 'name' ? (a, b) => a.name.localeCompare(b.name)
          : ordering === '-released' ? (a, b) => b.released.localeCompare(a.released)
          : (a, b) => b.rating - a.rating)
        setGames(filtered)
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
  // Spotlight has its own editorial feed; catalog searches and filters never change it.
  useEffect(() => {
    let cancelled = false
    getSpotlightGames().then(data => {
      if (!cancelled) setSpotlightCandidates(data.results || [])
    }).catch(() => { if (!cancelled) setSpotlightCandidates([]) })
    return () => { cancelled = true }
  }, [])
  useEffect(() => {
    const handler = event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); document.querySelector('.search-form input')?.focus() }
      if (event.key === 'Escape') setShowSuggestions(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
  useEffect(() => { const timer = setTimeout(() => setDebouncedQuery(query.trim()), 450); return () => clearTimeout(timer) }, [query])
  useEffect(() => { if (debouncedQuery !== '' && activeTab === 'discover' && !activeQuickExplore) loadGames({ searchText: debouncedQuery, ordering: sort, platform: activePlatform, genre: activeGenre }) }, [debouncedQuery, loadGames])
  useEffect(() => { const onScroll = () => setShowTop(window.scrollY > 700); window.addEventListener('scroll', onScroll, { passive: true }); return () => window.removeEventListener('scroll', onScroll) }, [])

  const resetFilters = (searchText = query) => {
    const genre = categoryGenre || 'All genres'
    setActivePlatform('All platforms')
    setActiveGenre(genre)
    if (activeTab === 'discover') loadGames({ searchText, ordering: sort, genre })
  }
  const loadMore = useCallback(() => {
    if (visibleCount < games.length) { setVisibleCount(n => n + 48); return }
    if (hasMore && acceptedRequest.current) loadGames({ ...acceptedRequest.current, nextOffset: offset, append: true })
  }, [loadGames, offset, visibleCount, games.length, hasMore])
  useEffect(() => {
    if (activeTab !== 'discover' || (!hasMore && visibleCount >= games.length) || usingDemo || loading || loadingMore || appendFailed) return
    const node = loadMoreRef.current
    if (!node) return
    const observer = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting) loadMore()
    }, { rootMargin: '600px' })
    observer.observe(node)
    return () => observer.disconnect()
  }, [activeTab, hasMore, usingDemo, loading, loadingMore, loadMore, visibleCount, games.length, appendFailed])

  // Never show a spotlight title in Smart Discovery, and skip failed images.
  const spotlightGames = useMemo(() => spotlightCandidates.filter(game => game.spotlight_image && !spotlightBroken.includes(game.id)).slice(0, 5), [spotlightCandidates, spotlightBroken])
  const spotlightIds = useMemo(() => new Set(spotlightCandidates.map(game => game.id)), [spotlightCandidates])
  const featured = spotlightGames[featuredIndex % Math.max(1, spotlightGames.length)]
  useEffect(() => { setFeaturedIndex(0) }, [spotlightGames.length])
  useEffect(() => { if (!preferences.spotlightAutoplay || window.matchMedia('(prefers-reduced-motion: reduce)').matches || spotlightPaused || spotlightManualPaused || spotlightGames.length < 2 || activeTab !== 'discover' || activeQuickExplore) return; const timer = setTimeout(() => { setFeaturedIndex(i => (i + 1) % spotlightGames.length); setSpotlightCycle(i => i + 1) }, 8000); return () => clearTimeout(timer) }, [spotlightPaused, spotlightManualPaused, spotlightGames.length, activeTab, activeQuickExplore, featuredIndex, spotlightCycle, preferences.spotlightAutoplay])
  const moveSpotlight = step => { if (spotlightGames.length < 2) return; setFeaturedIndex(i => (i + step + spotlightGames.length) % spotlightGames.length); setSpotlightCycle(i => i + 1) }
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
    return games.filter(game => !existing.has(game.id) && !spotlightIds.has(game.id) && game.background_image)
      .map(game => ({ game, score: (game.genres || []).reduce((n,g) => n + (interests[g.name] || 0),0) * 10 + (game.rating || 0) }))
      .sort((a,b) => b.score - a.score).slice(0, 8).map(item => item.game)
  }, [games, wishlist, library, spotlightIds])
  const surpriseMe = () => {
    const pick = pickSurpriseGame({
      games, recommendations, wishlist, library, spotlightIds,
      recentIds: recentSurpriseIds.current,
    })
    if (!pick) {
      setSurpriseNotice('No other games are available right now.')
      return
    }
    setSurpriseNotice('')
    recentSurpriseIds.current = [...recentSurpriseIds.current.slice(-9), pick.id]
    setSelectedGame(pick)
  }
  const suggestions = useMemo(() => {
    const text = query.trim().toLowerCase()
    const source = activeTab === 'wishlist' ? wishlist : activeTab === 'library' ? Object.values(library).filter(entry => libraryFilter === 'all' || entry.status === libraryFilter).map(entry => entry.game) : games
    return text.length > 1 ? source.filter(game => game.name.toLowerCase().includes(text)).slice(0,5) : []
  }, [query, games, activeTab, wishlist, library, libraryFilter])
  const visibleGames = useMemo(() => {
    if (activeTab === 'discover') return games
    let result = activeTab === 'library' ? Object.values(library).filter(entry => libraryFilter === 'all' || entry.status === libraryFilter).map(entry => entry.game) : [...wishlist]
    if (activePlatform !== 'All platforms') result = result.filter(game => (game.parent_platforms || []).some(item => {
      const name = item.platform?.name?.toLowerCase()
      return name === activePlatform.toLowerCase()
    }))
    if (activeGenre !== 'All genres') result = result.filter(game => game.genres?.some(genre => genre.name === activeGenre))
    if (query.trim()) result = result.filter(game => game.name.toLowerCase().includes(query.trim().toLowerCase()))
    if (sort === 'name') result.sort((a, b) => a.name.localeCompare(b.name))
    if (sort === '-rating') result.sort((a, b) => (b.rating || 0) - (a.rating || 0))
    if (sort === '-released') result.sort((a, b) => (b.released || '').localeCompare(a.released || ''))
    return result
  }, [games, wishlist, library, libraryFilter, activeTab, activePlatform, activeGenre, sort, query])

  const toggleCompare = game => setCompare(current => current.some(item => item.id === game.id) ? current.filter(item => item.id !== game.id) : current.length < 3 ? [...current, game] : current)
  const isSaved = game => wishlist.some(item => item.id === game.id)
  const submitSearch = event => {
    event.preventDefault()
    setShowSuggestions(false)
    if (activeTab === 'discover') {
      setActiveQuickExplore(null)
      loadGames({ searchText: query.trim(), ordering: sort, platform: activePlatform, genre: activeGenre })
    }
    // Wishlist and Library search is local: stay on the current tab.
  }
  const scrollPageToTop = () => {
    window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }
  const chooseTab = tab => {
    if (activeTab === tab && !activeQuickExplore) {
      closeMobileMenu()
      scrollPageToTop()
      return
    }
    scrollPageToTop()
    setActiveQuickExplore(null)
    setCategoryGenre(null)
    setActiveTab(tab)
    setQuery('')
    setDebouncedQuery('')
    setShowSuggestions(false)
    setMobileMenuOpen(false)
    setActivePlatform('All platforms')
    setActiveGenre('All genres')
    if (tab === 'discover') loadGames({ ordering: sort })
  }

  const chooseQuickExplore = ({ label, ordering, genre }) => {
    if (activeTab === 'discover' && activeQuickExplore === label) {
      closeMobileMenu()
      scrollPageToTop()
      return
    }
    scrollPageToTop()
    const nextSort = ordering || '-rating'
    const nextGenre = genre || 'All genres'
    setActiveQuickExplore(label)
    setCategoryGenre(genre || null)
    setActiveTab('discover')
    setMobileMenuOpen(false)
    setQuery('')
    setDebouncedQuery('')
    setActivePlatform('All platforms')
    setActiveGenre(nextGenre)
    setSort(nextSort)
    loadGames({ searchText: '', ordering: nextSort, platform: 'All platforms', genre: nextGenre })
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content" onClick={event => { event.preventDefault(); document.getElementById('main-content')?.focus() }}>Skip to content</a>
      <button type="button" className={`mobile-drawer-backdrop ${mobileMenuOpen ? 'is-visible' : ''}`} aria-label="Close navigation" aria-hidden={!mobileMenuOpen} tabIndex={mobileMenuOpen ? 0 : -1} onClick={closeMobileMenu}/>
      <aside id="mobile-navigation" onTouchStart={onDrawerTouchStart} onTouchMove={onDrawerTouchMove} onTouchEnd={onDrawerTouchEnd} style={mobileMenuOpen && drawerDrag ? { '--drawer-drag': `${drawerDrag}px` } : undefined} className={`studio-sidebar ${mobileMenuOpen ? 'sidebar-open' : ''}`}>
        <button type="button" className="mobile-drawer-close" onClick={closeMobileMenu} aria-label="Close menu"><X size={20}/></button>
        <a className="studio-brand" href="#/"><img src="/gamebrowzr-mark.webp" alt="GameBrowzr emblem"/><span>GAME<span>BROWZR</span><small>EXPLORE BEYOND</small></span></a>
        <div className="sidebar-label">EXPLORE</div>
        <nav className="studio-nav" aria-label="Main navigation">
          <button className={activeTab === 'discover' && !activeQuickExplore ? 'studio-link active' : 'studio-link'} onClick={() => chooseTab('discover')}><Compass size={18}/> Discover</button>
          <button className={activeTab === 'wishlist' ? 'studio-link active' : 'studio-link'} onClick={() => chooseTab('wishlist')}><Heart size={18}/> Wishlist <span className="side-count">{wishlist.length}</span></button>
          <button className={activeTab === 'library' ? 'studio-link active' : 'studio-link'} onClick={() => chooseTab('library')}><Library size={18}/> My library <span className="side-count">{Object.keys(library).length}</span></button>
        </nav>
        <div className="sidebar-label sidebar-label-secondary">QUICK EXPLORE</div>
        <nav className="studio-nav quick-explore-nav" aria-label="Discovery shortcuts">
          {[
            { label: 'Simulation', icon: Joystick, genre: 'Simulator' },
            { label: 'New releases', icon: Rocket, ordering: '-released' },
            { label: 'Indie gems', icon: Shapes, genre: 'Indie' },
            { label: 'Action', icon: Swords, genre: 'Action' },
            { label: 'RPG adventures', icon: Mountain, genre: 'Role-playing (RPG)' },
            { label: 'Shooters', icon: Crosshair, genre: 'Shooter' },
            { label: 'Strategy', icon: BrainCircuit, genre: 'Strategy' },
            { label: 'Racing', icon: CarFront, genre: 'Racing' },
            { label: 'Puzzle', icon: Puzzle, genre: 'Puzzle' },
            { label: 'Platformers', icon: Footprints, genre: 'Platform' },
          ].map(({label, icon: Icon, ordering, genre}) => (
            <button key={label} type="button" aria-current={activeTab === 'discover' && activeQuickExplore === label ? 'page' : undefined} className={activeTab === 'discover' && activeQuickExplore === label ? 'studio-link active' : 'studio-link'} onClick={() => chooseQuickExplore({ label, ordering, genre })}><Icon size={18}/> {label}</button>
          ))}
        </nav>
      </aside>
      <div className="studio-workspace" data-current-page={activeQuickExplore || activeTab}>
      <header className="studio-topbar">
        <button className="mobile-menu-button" onClick={() => mobileMenuOpen ? closeMobileMenu() : openMobileMenu()} aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"} aria-expanded={mobileMenuOpen} aria-controls="mobile-navigation">{mobileMenuOpen ? <X/> : <Menu/>}</button>
        <div className="studio-location"><strong>{activeTab === 'discover' ? (activeQuickExplore || 'Discover') : activeTab === 'wishlist' ? 'Wishlist' : 'My library'}</strong></div>
        <div className="studio-top-actions"><a className="gb-catalog-account" href={user ? "#/account" : "#/login"}>{user && <Avatar client={client} user={user} />}{user ? "My account" : "Log In"}</a><span className="api-status"><span className={`status-dot ${usingDemo ? 'demo' : ''}`} />{loading ? 'Loading catalog…' : usingDemo ? 'Preview catalog' : 'IGDB connected'}</span></div>
      </header>
      <main id="main-content" tabIndex={-1}>
        {activeTab === 'discover' && !activeQuickExplore && <section className="studio-intro gb-discover-heading"><h1>Discover games</h1><p>Browse the catalog or jump into a genre.</p></section>}
        {activeTab === 'discover' && !activeQuickExplore && <div className="gb-discover-feature"><section className="spotlight-area" aria-label="Featured games" onFocus={() => setSpotlightPaused(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setSpotlightPaused(false) }} onMouseEnter={() => setSpotlightPaused(true)} onMouseLeave={event => { if (!event.currentTarget.contains(document.activeElement)) setSpotlightPaused(false) }}>
          <div className="spotlight-main" tabIndex={0} aria-label="Featured games. Use left and right arrow keys to navigate." onKeyDown={event => { if(event.key === 'ArrowLeft'){event.preventDefault();moveSpotlight(-1)} if(event.key === 'ArrowRight'){event.preventDefault();moveSpotlight(1)} }}>
            <div className="spotlight-image-stack" aria-hidden="true">{spotlightGames.map((game, index) => <div key={game.id} className={`spotlight-frame spotlight-layer ${index === featuredIndex ? 'is-active' : ''}`}><img className="spotlight-fill" src={game.spotlight_image} alt="" aria-hidden="true" loading={index < 2 ? 'eager' : 'lazy'} decoding="async"/><img className="spotlight-art" src={game.spotlight_image} alt="" loading={index < 2 ? 'eager' : 'lazy'} decoding="async" onError={() => setSpotlightBroken(current => current.includes(game.id) ? current : [...current, game.id])}/></div>)}</div>
            <div className="spotlight-overlay" aria-hidden="true" />
            <div key={featured?.id || "empty"} className="spotlight-content cinematic-copy"><span className="spotlight-pill"><Flame size={13}/> IN THE SPOTLIGHT</span><h2>{featured?.name || 'Your universe of games'}</h2><p>{featured ? `${featured.genres?.slice(0,3).map(g=>g.name).join(' · ') || 'Discover something new'}  ${featured.released ? ' · '+featured.released.slice(0,4) : ''}` : 'Explore unforgettable worlds across every platform.'}</p><button className="spotlight-action" disabled={!featured} onClick={() => featured && setSelectedGame(featured)}>Explore game <ArrowRight size={16}/></button></div>
            {spotlightGames.length > 1 && <div className="spotlight-navigation" aria-label="Spotlight navigation"><button className="spotlight-nav-button" type="button" onClick={() => moveSpotlight(-1)} aria-label="Previous featured game"><ChevronLeft size={19}/></button><div className="spotlight-dots">{spotlightGames.map((game,i)=><button key={game.id} className={featuredIndex===i?'active':''} onClick={()=>{setFeaturedIndex(i);setSpotlightCycle(c=>c+1)}} aria-label={`Show ${game.name}`} aria-current={featuredIndex===i?'true':undefined}/>)}</div><button className="spotlight-nav-button" type="button" onClick={() => moveSpotlight(1)} aria-label="Next featured game"><ChevronRight size={19}/></button><button className="spotlight-nav-button spotlight-pause" type="button" onClick={() => setSpotlightManualPaused(p => !p)} aria-label={spotlightManualPaused ? 'Resume slideshow' : 'Pause slideshow'}>{spotlightManualPaused ? <Play size={17}/> : <Pause size={17}/>}</button></div>}
          </div>
        </section>
          <aside className="gb-discover-shortcuts" aria-labelledby="discover-shortcut-heading">
            <h2 id="discover-shortcut-heading">Quick Explore</h2>
            <button type="button" onClick={() => chooseQuickExplore({ label: 'New releases', ordering: '-released' })}><Rocket size={19} aria-hidden="true" /> New releases <ChevronRight size={17} aria-hidden="true" /></button>
            <button type="button" onClick={() => chooseQuickExplore({ label: 'Indie gems', genre: 'Indie' })}><Shapes size={19} aria-hidden="true" /> Indie gems <ChevronRight size={17} aria-hidden="true" /></button>
            <button type="button" onClick={() => chooseQuickExplore({ label: 'RPG adventures', genre: 'Role-playing (RPG)' })}><Mountain size={19} aria-hidden="true" /> RPG adventures <ChevronRight size={17} aria-hidden="true" /></button>
            <a href="#game-catalog" onClick={event => { event.preventDefault(); document.getElementById('game-catalog')?.focus() }}>Search the catalog <ArrowRight size={17} aria-hidden="true" /></a>
          </aside>
        </div>}
        {activeTab === 'discover' && !activeQuickExplore && <section className="curated-section" aria-label="Personalized discoveries">
          <div className="curated-head"><div><span className="eyebrow"><WandSparkles size={14}/> SMART DISCOVERY</span><h2>Picked for your taste <span className="heading-dot">.</span></h2><p>Recommendations based on your saved games and favorite genres, refreshed as you explore.</p></div><button className="surprise-button" onClick={surpriseMe}><Dices size={17}/> Surprise me</button></div>
          <div role="status">{surpriseNotice}</div>
          <div className="curated-scroll">{recommendations.slice(0,6).map(game => <button className="curated-card" key={game.id} onClick={() => setSelectedGame(game)}><img src={game.background_image} alt="" loading="lazy"/><span>{game.name}</span><small>{game.genres?.slice(0,2).map(g=>g.name).join(' · ') || 'Discover'}</small></button>)}</div>
        </section>}
        {activeTab === 'library' && <section className="insights-panel"><div className="insights-title"><BarChart3 size={21}/><div><h2>Your gaming snapshot</h2><p>Insights from the games in your Library.</p></div></div><div className="insight-grid"><div><span>Total tracked</span><strong>{libraryEntries.length}</strong></div><div><span>Completed</span><strong>{libraryEntries.filter(e=>e.status==='completed').length}</strong></div><div><span>Completion rate</span><strong>{libraryEntries.length ? Math.round(libraryEntries.filter(e=>e.status==='completed').length / libraryEntries.length * 100) : 0}%</strong></div><div><span>Favorite genre</span><strong className="insight-genre">{libraryStats.topGenre || 'Explore games'}</strong></div></div><div className="insights-chart-heading"><span>Most played genres in your library</span><small>Games tagged with each genre · a game can have multiple genres</small></div><div className="insights-bars">{Object.entries(libraryStats.genreCounts).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([name,count])=><div className="insights-bar" key={name}><span>{name}</span><div><i style={{width:`${Math.min(100,count/Math.max(1,libraryEntries.length)*100)}%`}}/></div><b title={`${count} of ${libraryEntries.length} tracked games`}>{count} / {libraryEntries.length}</b></div>)}</div></section>}
        <section className="catalog-section" id="game-catalog" tabIndex={-1}>
          {!(activeTab === 'discover' && activeQuickExplore) && <div className="section-topline">
            <div>
              <div className="eyebrow">{activeTab === 'wishlist' || activeTab === 'library' ? 'YOUR COLLECTION' : 'THE GAME LIBRARY'}</div>
              <h2>{activeTab === 'wishlist' ? 'Your wishlist' : activeTab === 'library' ? 'My game library' : 'Explore games'} <span className="heading-dot">.</span></h2>
              <p className="section-subtitle">{activeTab === 'wishlist' ? 'Your saved games, all in one place.' : activeTab === 'library' ? 'Track games you are playing and have completed.' : 'Main games only. Browse, filter and discover something worth playing.'}</p>
            </div>
            <div className="result-count"><span>{visibleGames.length}</span> games shown</div>
          </div>}

          <div className="filter-bar">
            {!(activeTab === 'discover' && activeQuickExplore) && <section className="studio-search"><form className="search-form" onSubmit={e => {setShowSuggestions(false); submitSearch(e)}}><Search size={19}/><input value={query} onFocus={() => setShowSuggestions(true)} onChange={event=>{if(activeTab === 'discover') setActiveQuickExplore(null);setQuery(event.target.value);setShowSuggestions(true);if(activeTab === 'discover' && !event.target.value.trim()) loadGames({ ordering: sort, platform: activePlatform, genre: activeGenre })}} placeholder={activeTab === 'wishlist' ? 'Search your wishlist...' : activeTab === 'library' ? 'Search your library...' : 'Search games, worlds, and adventures...'} aria-label="Search games" autoComplete="off"/>{query && <button type="button" className="clear-search" onClick={()=>{setQuery('');setDebouncedQuery('');setShowSuggestions(false);if(activeTab === 'discover') loadGames({ searchText:'', ordering:sort, platform:activePlatform, genre:activeGenre })}} aria-label="Clear search"><X size={16}/></button>}<button className="search-submit" type="submit">Search <ArrowRight size={15}/></button></form>{showSuggestions && suggestions.length > 0 && <div className="search-suggestions" role="group" aria-label="Game suggestions">{suggestions.map(game => <button key={game.id} onClick={() => {setSelectedGame(game);setShowSuggestions(false)}}><Search size={14}/><span>{game.name}</span><ArrowRight size={14}/></button>)}</div>}</section>}
            <div className="filter-controls">
            <div className="filter-label"><SlidersHorizontal size={16} /> FILTER BY</div>
            <AuroraSelect className="platform-menu" label="Filter by platform" icon={Monitor} value={activePlatform} options={platformFilters} onChange={value => { setActivePlatform(value); if (activeTab === 'discover') loadGames({ searchText: activeQuickExplore ? '' : query, ordering: sort, platform: value, genre: activeGenre }) }} />
            {!categoryGenre && <AuroraSelect className="genre-menu" label="Filter by genre" value={activeGenre} options={genres} onChange={value => { setActiveGenre(value); if (activeTab === 'discover') loadGames({ searchText: activeQuickExplore ? '' : query, ordering: sort, platform: activePlatform, genre: value }) }} />}
            <AuroraSelect className="sort-menu" label="Sort games" value={sort} options={sortOptions.map(option => ({...option, label:`Sort: ${option.label}`}))} onChange={value => { setSort(value); if (activeTab === 'discover') loadGames({ searchText: activeQuickExplore ? '' : query, ordering: value, platform: activePlatform, genre: activeGenre }) }} />
            {(activePlatform !== 'All platforms' || activeGenre !== (categoryGenre || 'All genres')) && <button className="reset-filters" onClick={() => resetFilters()}>Reset filters</button>}
            </div>
          </div>

          {activeTab === 'library' && <div className="library-filter"><span>Library status</span><AuroraSelect label="Library status" value={libraryFilter} onChange={setLibraryFilter} options={[{value:'all',label:'All games'},{value:'playing',label:'Playing'},{value:'completed',label:'Completed'}]} /></div>}
          {activeTab === 'library' && <div className="library-summary">{[['playing','Playing',PlayCircle],['completed','Completed',Trophy]].map(([status,label,Icon]) => <div className="summary-tile" key={status}><Icon size={20}/><strong>{Object.values(library).filter(item => item.status === status).length}</strong><span>{label}</span></div>)}</div>}
          {collections.error && <p className="error-notice" role="status">{collections.error} <button type="button" onClick={collections.refresh}>Retry sync</button></p>}
          {activeTab === 'discover' && usingDemo && <div className="demo-notice"><span className="notice-dot" /><div><strong>Preview data is active.</strong> Configure your Twitch application credentials in Vercel to load the live game catalog. <a href="https://dev.twitch.tv/console/apps" target="_blank" rel="noreferrer">Create API credentials ↗</a></div></div>}
          {activeTab === 'discover' && error && <div className="error-notice" role="status">{error} {appendFailed && <button type="button" onClick={loadMore}>Retry loading games</button>}</div>}

          {loading && activeTab === 'discover' ? <div className="skeleton-grid" aria-label="Loading games" aria-busy="true">{Array.from({length:12},(_,i)=><div className="skeleton-card" key={i}><div/><span/><span/></div>)}</div> : visibleGames.length ? (
            <div className="game-grid">
              {(activeTab === 'discover' ? visibleGames.slice(0, visibleCount) : visibleGames).map(game => <GameCard key={game.id} game={game} saved={isSaved(game)} collectionDisabled={collectionDisabled} onToggleSave={toggleWishlist} onOpen={setSelectedGame} onCompare={toggleCompare} comparing={compare.some(item => item.id === game.id)} libraryStatus={library[game.id]?.status || ""} onLibraryStatus={setLibraryStatus} />)}
            </div>
          ) : (
            <div className="empty-state"><div className="empty-icon">{activeTab === 'wishlist' ? <Heart size={28} /> : <Search size={28} />}</div><h3>{query.trim() && activeTab !== 'discover' ? 'No matching saved games' : activeTab === 'wishlist' ? 'Your wishlist is empty' : activeTab === 'library' ? 'Your library is empty' : 'No games found'}</h3><p>{query.trim() && activeTab !== 'discover' ? 'Try another name or clear your search to see your saved games.' : activeTab === 'wishlist' ? 'Save games you like and they will appear here.' : activeTab === 'library' ? 'Mark games as Playing or Completed.' : 'Try another search or adjust your filters.'}</p>{query.trim() && activeTab !== 'discover' ? <button className="secondary-button" onClick={() => { setQuery(''); setDebouncedQuery(''); setShowSuggestions(false) }}>Clear search</button> : <button className="secondary-button" onClick={() => { if (activeTab === 'discover') { setQuery(''); setDebouncedQuery(''); resetFilters('') } else chooseTab('discover') }}>{activeQuickExplore ? 'Reset filters' : activeTab === 'discover' ? 'Clear search and filters' : 'Explore games'}</button>}</div>
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

      {selectedGame && <Suspense fallback={<p className="gb-modal-loading" role="status">Opening game details?</p>}><GameModal collectionDisabled={collectionDisabled} game={selectedGame} saved={isSaved(selectedGame)} onClose={() => setSelectedGame(null)} onToggleSave={toggleWishlist} libraryStatus={library[selectedGame.id]?.status || ''} onLibraryStatus={setLibraryStatus} /></Suspense>}
      {compare.length > 0 && <aside className="compare-tray" aria-label="Compare selected games"><span><GitCompareArrows size={17}/> Compare {compare.length}/3</span><div className="compare-names">{compare.map(item => <button key={item.id} onClick={() => toggleCompare(item)} title="Remove game">{item.name} ×</button>)}</div><button className="compare-open" disabled={compare.length < 2} onClick={() => document.getElementById('compare-dialog').showModal()}>Compare games</button><button className="compare-clear" onClick={() => setCompare([])} aria-label="Clear comparison"><X size={16}/></button></aside>}
      <dialog id="compare-dialog" className="compare-dialog compare-insights-dialog" onClick={e => { if (e.target === e.currentTarget) e.currentTarget.close() }}>
        <CompareInsights games={compare} onRemove={toggleCompare} onClose={() => document.getElementById('compare-dialog').close()} onOpenGame={game => { document.getElementById('compare-dialog').close(); setSelectedGame(game) }}/>
      </dialog>
      {showTop && <button className="back-top" onClick={() => window.scrollTo({top:0,behavior:'smooth'})} aria-label="Back to top"><ArrowUp size={20}/></button>}
    </div>
  )
}
