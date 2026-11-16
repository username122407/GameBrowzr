import { createContext, useContext, useEffect, useState } from 'react'

const BackgroundMotion = createContext(false)
const reducedMotion = '(prefers-reduced-motion: reduce)'

export function useBackgroundMotion() {
  return useContext(BackgroundMotion)
}

export default function AuroraBackground({ children }) {
  const [reduce, setReduce] = useState(() => window.matchMedia(reducedMotion).matches)

  useEffect(() => {
    const preference = window.matchMedia(reducedMotion)
    const change = () => setReduce(preference.matches)
    preference.addEventListener('change', change)
    change()
    return () => preference.removeEventListener('change', change)
  }, [])

  const motion = !reduce
  return <BackgroundMotion.Provider value={motion}>
    <div className="gb-atmosphere" data-playing={motion} aria-hidden="true"><i /><i /></div>
    {children}
  </BackgroundMotion.Provider>
}
