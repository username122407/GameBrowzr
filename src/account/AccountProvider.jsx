import { createContext, useContext, useEffect, useState } from 'react'

const Context = createContext(null)
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const configured = Boolean(url && key)
let clientPromise

function getClient() {
  clientPromise ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(url, key, { auth: { flowType: 'pkce', detectSessionInUrl: false } }),
  )
  return clientPromise
}

export function authRedirect(flow) {
  const target = new URL(import.meta.env.BASE_URL, window.location.origin)
  target.searchParams.set('auth', flow)
  return target.href
}

export function useAccount() {
  return useContext(Context)
}

export function AccountProvider({ children }) {
  const [client, setClient] = useState(null)
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(!configured)
  const [recovery, setRecovery] = useState(false)
  const [issue, setIssue] = useState('')

  useEffect(() => {
    if (!configured) return
    let active = true
    let subscription

    async function initialize() {
      const next = await getClient()
      if (!active) return
      const target = new URL(window.location.href)
      const flow = target.searchParams.get('auth')
      const code = target.searchParams.get('code')
      subscription = next.auth.onAuthStateChange((event, session) => {
        if (!active) return
        setUser(session?.user ?? null)
        if (event === 'SIGNED_OUT') setRecovery(false)
        if (!flow && event === 'INITIAL_SESSION') setReady(true)
      }).data.subscription
      setClient(next)
      if (!flow) return

      let succeeded = false
      let recovered = false
      try {
        if (code) {
          const { data, error } = await next.auth.exchangeCodeForSession(code)
          recovered = data?.redirectType === 'recovery'
          succeeded = Boolean(!error && data?.session && (recovered || flow === 'confirm'))
        }
      } catch {
        // Treat a failed exchange as an unusable link and let the user try again.
      }
      if (!active) return
      if (!succeeded) setIssue('This email link could not be opened. Request a new link on this device.')
      setRecovery(succeeded && recovered)
      setReady(true)
      target.hash = succeeded ? recovered ? '/reset' : '/account' : flow === 'recovery' ? '/forgot' : '/login'
      for (const name of ['auth', 'code', 'error', 'error_code', 'error_description', 'sb_flow_id']) target.searchParams.delete(name)
      // Keep the router's hashchange event while removing the one-time code.
      window.history.replaceState(null, '', target.pathname + target.search)
      window.location.hash = target.hash
    }

    initialize().catch(() => {
      if (active) {
        setIssue('Accounts are temporarily unavailable.')
        setReady(true)
      }
    })
    return () => {
      active = false
      subscription?.unsubscribe()
    }
  }, [])

  return <Context.Provider value={{ client, user, ready, configured, recovery, issue, finishRecovery: () => setRecovery(false) }}>
    {children}
  </Context.Provider>
}
