import React, { lazy, Suspense, useEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { AccountProvider, useAccount } from './account/AccountProvider.jsx'
import Landing from './Landing.jsx'
import './experience.css'
import AuroraBackground from './AuroraBackground.jsx'
import { swapView } from './utils/viewMotion.js'
import './interactions.css'

const loadCatalog = () => import('./App.jsx')
const loadAccountPage = () => import('./account/AccountPage.jsx')
const loadCollectionAccount = () => import('./collections/CollectionAccount.jsx')
const Catalog = lazy(loadCatalog)
const AccountPage = lazy(loadAccountPage)
const CollectionAccount = lazy(loadCollectionAccount)
const catalogPath = '#/discover'
const modes = new Set(['login', 'register', 'forgot', 'reset', 'account'])

function getRoute() {
  return window.location.hash.startsWith('#/') ? window.location.hash.slice(2) : ''
}

function GameBrowzr() {
  const [route, setRoute] = useState(getRoute)
  const pendingRoute = useRef(0)
  const { user, client, ready, recovery } = useAccount()
  useEffect(() => {
    function updateRoute() {
      const next = getRoute()
      const ticket = ++pendingRoute.current
      if (next === route) return
      const load = next === 'discover' ? loadCatalog
        : next === 'account' && user ? loadCollectionAccount
        : modes.has(next) ? loadAccountPage : null

      const commit = () => {
        if (ticket !== pendingRoute.current || getRoute() !== next) return
        swapView('route', () => {
          if (getRoute() !== next) return
          window.scrollTo({ top: 0, behavior: 'instant' })
          setRoute(next)
        })
      }
      if (load) void load().then(commit, commit)
      else commit()
    }
    window.addEventListener('hashchange', updateRoute)
    return () => window.removeEventListener('hashchange', updateRoute)
  }, [route, user])
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    document.title = route === 'discover' ? 'Discover | GameBrowzr' : modes.has(route) ? 'Account | GameBrowzr' : 'GameBrowzr — Explore Beyond'
  }, [route])

  const landing = route !== 'discover' && !recovery && !modes.has(route)
  let screen
  if (landing) {
    screen = <Landing user={user} client={client} catalogPath={catalogPath} />
  } else if (route === 'discover' && !recovery) {
    screen = ready ? <Catalog /> : <p className="gb-loading" role="status">Opening the catalog…</p>
  } else {
    const mode = recovery ? 'reset' : route
    screen = mode === 'account' && user
      ? <CollectionAccount key={user.id} />
      : <AccountPage key={mode} mode={mode} />
  }

  return <AuroraBackground landing={landing}>
    <div className="gb-route-stage" key={landing ? "landing" : recovery ? "reset" : route}>
      <Suspense fallback={<p className="gb-loading" role="status">Loading GameBrowzr…</p>}>
        {screen}
      </Suspense>
    </div>
  </AuroraBackground>
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AccountProvider>
      <GameBrowzr />
    </AccountProvider>
  </React.StrictMode>,
)
