import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { authRedirect, useAccount } from './AccountProvider.jsx'
import AvatarPicker, { clearAvatarPhoto } from './Avatar.jsx'
import AccountSecurity from './AccountSecurity.jsx'
import './account.css'

const titles = {
  login: 'Log in',
  register: 'Create account',
  forgot: 'Reset your password',
  reset: 'Choose a new password',
  account: 'Your account',
}

export default function AccountPage({ mode, collections, children }) {
  const { client, user, ready, configured, recovery, issue, finishRecovery } = useAccount()
  const heading = useRef(null)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const title = titles[mode] || titles.login
  const profile = mode === 'account'
  const register = mode === 'register'
  const forgot = mode === 'forgot'
  const reset = mode === 'reset'
  const canSubmit = ready && client && (!profile || (user && profileLoaded)) && (!reset || (user && recovery))

  useEffect(() => {
    document.title = title + ' | GameBrowzr'
    heading.current?.focus({ preventScroll: true })
  }, [title])
  useEffect(() => {
    if (collections && !collections.loading && !collections.error) setProfileLoaded(true)
  }, [collections])

  async function submit(event) {
    event.preventDefault()
    if (!canSubmit || busy) return
    const form = new FormData(event.currentTarget)
    const email = form.get('email')?.trim()
    const password = form.get('password')
    const name = form.get('name')?.trim()
    if ((profile || register) && !name) {
      setError('Enter a display name.')
      return
    }

    setBusy(true)
    setError('')
    setNotice('')
    try {
      let result
      if (profile) {
        const saved = await collections.saveProfile({ displayName: name })
        if (!saved) throw new Error('Profile not saved')
        setNotice('Profile saved.')
        return
      }
      else if (register) result = await client.auth.signUp({
        email, password, options: { data: { display_name: name }, emailRedirectTo: authRedirect('confirm') },
      })
      else if (forgot) result = await client.auth.resetPasswordForEmail(email, { redirectTo: authRedirect('recovery') })
      else if (reset) result = await client.auth.updateUser({ password })
      else result = await client.auth.signInWithPassword({ email, password })
      if (result.error) throw result.error

      if (forgot) setNotice('If the address has an account, check your email for a reset link.')
      else if (register && !result.data.session) setNotice('Check your email for a confirmation link. Open it in this browser.')
      else if (reset) {
        finishRecovery()
        setNotice('Password updated. You can now return to Discover.')
      } else {
        window.location.hash = '/discover'
      }
    } catch {
      setError(forgot ? 'Could not request a reset link. Try again shortly.'
        : mode === 'login' ? 'Could not log in. Check your email, password, and email confirmation.'
        : 'Could not save your changes. Check your details and try again.')
    } finally {
      setBusy(false)
    }
  }

  async function logout() {
    setBusy(true)
    setError('')
    try {
      const result = await client.auth.signOut({ scope: 'local' })
      if (result.error) throw result.error
      clearAvatarPhoto(client, user.id)
      window.location.hash = '/discover'
    } catch {
      setError('Could not log out. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return <main className="gb-account" id="main-content">
    <header className="gb-account-topbar">
      <a className="gb-brand" href="#/" onClick={recovery ? finishRecovery : undefined}><img src="/gamebrowzr-mark.svg" width="32" height="32" alt="" />GameBrowzr</a>
      <a className="gb-account-back" href="#/discover" onClick={recovery ? finishRecovery : undefined}><ArrowLeft size={17} aria-hidden="true" /> Explore games</a>
    </header>
    <div className={profile ? "gb-account-panel gb-profile-panel" : "gb-account-panel gb-access-panel"}>
      {profile && user ? <aside className="gb-profile-avatar"><AvatarPicker key={user.id} client={client} user={user} /></aside> : <aside className="gb-account-brand" aria-hidden="true" />}
      <section className="gb-account-form" aria-labelledby="account-heading">
        <p className="gb-account-caption">{profile ? 'Profile' : 'Account access'}</p>
        <h1 id="account-heading" ref={heading} tabIndex={-1}>{title}</h1>
        {!ready && <p role="status">Checking your session…</p>}
        {ready && !configured && <p role="status">Accounts aren’t configured for this site yet. You can still explore as a guest.</p>}
        {profile && collections?.loading && <p role="status">Loading account settings…</p>}
        {profile && collections?.error && <p role="alert">{collections.error}</p>}
        {issue && <p role="status">{issue}</p>}
        {ready && configured && profile && !user && <p><a href="#/login">Log in</a> to view your profile.</p>}
        {ready && configured && reset && !canSubmit && !notice && <p><a href="#/forgot">Request a new reset link</a> to change your password.</p>}
        {canSubmit && <form onSubmit={submit}>
          {(profile || register) && <label>Display name <input name="name" autoComplete="nickname" defaultValue={profile ? collections.profile?.display_name ?? user.user_metadata?.display_name ?? '' : ''} required maxLength={48} /></label>}
          {profile && <>
            <p className="gb-account-email">{user.email}</p>
          </>}
          {!profile && !reset && <label>Email address <input name="email" type="email" autoComplete="email" required maxLength={254} /></label>}
          {!profile && !forgot && <label>{reset ? 'New password' : 'Password'} <span className="gb-password-field"><input name="password" type={showPassword ? "text" : "password"} autoComplete={register || reset ? 'new-password' : 'current-password'} required minLength={register || reset ? 8 : undefined} maxLength={72} /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}</button></span></label>}
          <button className="gb-account-primary" type="submit" disabled={busy || (profile && collections.busy)}>{busy ? 'Working…' : profile ? 'Save profile' : forgot ? 'Send reset link' : reset ? 'Update password' : title}<ArrowRight size={17} aria-hidden="true" /></button>
        </form>}
        {error && <p role="alert">{error}</p>}
        <p role="status" className="gb-account-notice">{notice}</p>
        {mode === 'login' && <div className="gb-account-links"><a href="#/register">Create account</a><a href="#/forgot">Forgot password?</a></div>}
        {(register || forgot) && <a href="#/login">Back to log in</a>}
        {profile && user && <><AccountSecurity client={client} user={user} />{children}<button type="button" className="gb-account-secondary" disabled={busy} onClick={logout}>Log out</button></>}
      </section>
    </div>
  </main>
}
