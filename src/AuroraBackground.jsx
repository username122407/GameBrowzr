import { createContext, useContext, useEffect, useState } from 'react'

const BackgroundMotion = createContext(false)
const reducedMotion = '(prefers-reduced-motion: reduce)'

export function useBackgroundMotion() {
  return useContext(BackgroundMotion)
}

export default function AuroraBackground({ children, landing }) {
  const [reduce, setReduce] = useState(() => window.matchMedia(reducedMotion).matches)
  const [playing, setPlaying] = useState(() => {
    try { return localStorage.getItem('gamebrowzr-background-motion') !== 'off' } catch { return true }
  })

  useEffect(() => {
    const preference = window.matchMedia(reducedMotion)
    const change = () => setReduce(preference.matches)
    preference.addEventListener('change', change)
    change()
    return () => preference.removeEventListener('change', change)
  }, [])

  function toggle() {
    const next = !playing
    setPlaying(next)
    try { localStorage.setItem('gamebrowzr-background-motion', next ? 'on' : 'off') } catch { /* Apply for this visit. */ }
  }

  const motion = !reduce && (landing || playing)
  return <BackgroundMotion.Provider value={motion}>
    <div className="gb-atmosphere" data-playing={motion} aria-hidden="true"><i /><i /></div>
    {!landing && !reduce && <button className="gb-motion-control" type="button" onClick={toggle}>{playing ? 'Pause background' : 'Play background'}</button>}
    {children}
  </BackgroundMotion.Provider>
}
