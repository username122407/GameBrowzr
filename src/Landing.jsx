import { useEffect, useRef, useState } from 'react'
import { Gamepad2, Layers3, Library } from 'lucide-react'
import './editorial.css'
import { useBackgroundMotion } from './AuroraBackground.jsx'

const features = [
  { icon: Gamepad2, title: 'Discover games', body: 'Browse by genre or platform, then explore screenshots, trailers, and game details.' },
  { icon: Layers3, title: 'Compare titles', body: 'Put up to three games side by side. Check ratings, release dates, and official storefront links.' },
  { icon: Library, title: 'Build your collection', body: 'Save games to your Wishlist, track progress in your Library, and sync both with an account.' },
]

function NebulaBackground() {
  const motion = useBackgroundMotion()
  const video = useRef(null)

  useEffect(() => {
    const element = video.current
    if (!element) return
    if (!motion) {
      element.pause()
      return
    }
    // Keep the poster available when autoplay is blocked or the video is still loading.
    element.muted = true
    void element.play().catch(() => {})
    return () => element.pause()
  }, [motion])

  return <div className="gb-editorial-media" aria-hidden="true">
    <img src="/gamebrowzr-nebula-poster.webp" alt="" width="1280" height="720" fetchPriority="high" />
    <video ref={video} src={motion ? "/gamebrowzr-nebula.mp4" : undefined} autoPlay={motion} muted playsInline loop preload={motion ? "metadata" : "none"} poster="/gamebrowzr-nebula-poster.webp" />
  </div>
}

export default function Landing({ user, client, catalogPath }) {
  const userId = user?.id
  const [profile, setProfile] = useState(null)
  useEffect(() => {
    if (!client || !userId) return
    let current = true
    async function loadName() {
      try {
        const { data, error } = await client.from('gamebrowzr_profiles').select('display_name').eq('user_id', userId).maybeSingle()
        if (!error && current) setProfile({ userId, name: data?.display_name })
      } catch { /* Use the sign-up display name if the profile is unavailable. */ }
    }
    void loadName()
    return () => { current = false }
  }, [client, userId])
  const displayName = (profile?.userId === userId && profile?.name) || user?.user_metadata?.display_name || 'Account'

  return <div className="gb-landing gb-editorial">
    <a href="#landing-main" className="gb-skip">Skip to content</a>
    <header className="gb-editorial-masthead">
      <div className="gb-container gb-editorial-header">
        <a className="gb-brand" href="#/" aria-label="GameBrowzr home">
          <img src="/gamebrowzr-mark.svg" width="36" height="36" alt="" /><span className="gb-wordmark">GameBrowzr</span>
        </a>
        <nav aria-label="Main navigation">
          <a className="gb-editorial-guide" href="#features">How it works</a>
          <a className="gb-editorial-account" href={user ? '#/account' : '#/login'}>
            {user ? displayName : 'Log In'}
          </a>
        </nav>
      </div>
    </header>
    <main id="landing-main" tabIndex={-1}>
      <section className="gb-editorial-hero" aria-labelledby="landing-title">
        <NebulaBackground />
        <div className="gb-container gb-editorial-stage">
          <div className="gb-editorial-copy">
            <h1 id="landing-title">Explore<br />Beyond.</h1>
            <p>Find your next game. Compare titles and build your collection.</p>
            <div className="gb-editorial-actions">
              <a className="gb-editorial-cta" href={catalogPath}>Explore Games</a>
              {!user && <a className="gb-editorial-secondary" href="#/register">Create Account</a>}
            </div>
          </div>
        </div>
      </section>
      <section className="gb-container gb-editorial-features" id="features" tabIndex={-1} aria-labelledby="features-title">
        <h2 id="features-title" className="gb-screen-reader">How it works</h2>
        <div className="gb-editorial-feature-list">
          {features.map(({ icon: Icon, title, body }) => <article key={title}>
            <Icon size={23} aria-hidden="true" />
            <div><h3>{title}</h3><p>{body}</p></div>
          </article>)}
        </div>
      </section>
    </main>
    <footer className="gb-container gb-footer"><a className="gb-brand" href="#/"><img src="/gamebrowzr-mark.svg" width="28" height="28" alt="" /><span className="gb-wordmark">GameBrowzr</span></a><a href="https://www.igdb.com/">Game data by IGDB</a></footer>
  </div>
}
