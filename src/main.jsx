import React, { lazy, Suspense, useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { AccountProvider, useAccount } from './account/AccountProvider.jsx'
import Landing from './Landing.jsx'
import './experience.css'
import AuroraBackground from './AuroraBackground.jsx'

const Catalog = lazy(() => import('./App.jsx'))
const AccountPage = lazy(() => import('./account/AccountPage.jsx'))
const CollectionAccount = lazy(() => import('./collections/CollectionAccount.jsx'))
const catalogPath = '#/discover'
const modes = new Set(['login', 'register', 'forgot', 'reset', 'account'])

function getRoute() {
  return window.location.hash.startsWith('#/') ? window.location.hash.slice(2) : ''
}

function GameBrowzr() {
  const [route, setRoute] = useState(getRoute)
  const { user, ready, recovery } = useAccount()
  useEffect(() => {
    const updateRoute = () => setRoute(getRoute())
    window.addEventListener('hashchange', updateRoute)
    return () => window.removeEventListener('hashchange', updateRoute)
  }, [])
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    document.title = route === 'discover' ? 'Discover | GameBrowzr' : modes.has(route) ? 'Account | GameBrowzr' : 'GameBrowzr — Explore Beyond'
  }, [route])

  if (route === 'discover' && ready && !recovery) return <Catalog />
  if (route === 'discover' && !ready) return <p className="gb-loading" role="status">Opening the catalog…</p>
  if (recovery || modes.has(route)) {
    const mode = recovery ? 'reset' : route
    return mode === 'account' && user
      ? <CollectionAccount key={user.id} />
      : <AccountPage key={mode} mode={mode} />
  }
  return <Landing signedIn={Boolean(user)} catalogPath={catalogPath} />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AccountProvider>
      <AuroraBackground />
      <Suspense fallback={<p className="gb-loading" role="status">Loading GameBrowzr…</p>}>
        <GameBrowzr />
      </Suspense>
    </AccountProvider>
  </React.StrictMode>,
)
