import { useState } from 'react'

export default function AuroraBackground() {
  const [playing, setPlaying] = useState(() => {
    try { return localStorage.getItem('gamebrowzr-background-motion') !== 'off' } catch { return true }
  })
  function toggle() {
    const next = !playing
    setPlaying(next)
    try { localStorage.setItem('gamebrowzr-background-motion', next ? 'on' : 'off') } catch { /* Apply for this visit. */ }
  }
  return <>
    <div className="gb-atmosphere" data-playing={playing} aria-hidden="true"><i /><i /></div>
    <button className="gb-motion-control" type="button" onClick={toggle}>{playing ? 'Pause background' : 'Play background'}</button>
  </>
}

