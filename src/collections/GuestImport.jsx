import { useState } from 'react'

export default function GuestImport({ collections }) {
  const [confirming, setConfirming] = useState(false)
  const [completed, setCompleted] = useState(false)
  const { wishlist, library } = collections.guestCount
  if (!wishlist && !library) return null

  async function confirmImport() {
    if (await collections.importGuest()) {
      setCompleted(true)
      setConfirming(false)
    }
  }

  return <section className="account-import" aria-labelledby="device-games-title">
    <h2 id="device-games-title">Games on this device</h2>
    <p>{wishlist} in Wishlist / {library} in Library</p>
    <p>Import adds missing games to your account. Existing cloud entries and device saves are kept.</p>
    {confirming
      ? <div className="account-actions">
        <button type="button" disabled={!collections.canEdit} onClick={confirmImport}>Confirm import</button>
        <button type="button" disabled={collections.busy} onClick={() => setConfirming(false)}>Cancel</button>
      </div>
      : <button type="button" disabled={!collections.canEdit} onClick={() => { setCompleted(false); setConfirming(true) }}>Review import</button>}
    <p role="status">{completed && 'Device collection imported.'}</p>
  </section>
}
