import { useState } from 'react'
import { KeyRound } from 'lucide-react'

export default function AccountSecurity({ client, user }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function submit(event) {
    event.preventDefault()
    if (!client || busy) return
    const form = event.currentTarget
    const values = new FormData(form)
    const current = values.get('current')
    const password = values.get('new')
    setNotice('')
    setError('')
    if (password !== values.get('confirm')) {
      setError('The new passwords do not match.')
      form.elements.confirm.focus()
      return
    }
    if (password === current) {
      setError('Choose a password different from your current password.')
      form.elements.new.focus()
      return
    }
    setBusy(true)
    try {
      const { error } = await client.auth.updateUser({ current_password: current, password })
      if (error) throw error
      form.reset()
      setNotice('Password changed.')
    } catch {
      setError('Could not change your password. Check your current password, or use the reset link below.')
    } finally { setBusy(false) }
  }

  return <section className="gb-security" aria-labelledby="gb-security-title">
    <h2 id="gb-security-title"><KeyRound size={18} aria-hidden="true" /> Account security</h2>
    <details>
      <summary>Change password</summary>
      <form onSubmit={submit} aria-busy={busy}>
        <input className="gb-screen-reader" type="email" name="username" value={user.email ?? ''} autoComplete="username" readOnly tabIndex={-1} aria-label="Account email" />
        <label>Current password<input type="password" name="current" autoComplete="current-password" required /></label>
        <label>New password<input type="password" name="new" autoComplete="new-password" minLength={8} maxLength={72} required /></label>
        <label>Confirm new password<input type="password" name="confirm" autoComplete="new-password" minLength={8} maxLength={72} required /></label>
        <button type="submit" className="gb-account-primary" disabled={busy}>{busy ? 'Changing password…' : 'Update password'}</button>
        <a href="#/forgot">Reset password by email</a>
      </form>
    </details>
    <p role="status">{notice}</p>
    {error && <p role="alert">{error}</p>}
  </section>
}
