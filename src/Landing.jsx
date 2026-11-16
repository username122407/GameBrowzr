import { ArrowRight, Compass, GitCompareArrows, Library } from 'lucide-react'

const features = [
  { icon: Compass, title: 'Discover new games', body: 'Filter the IGDB catalog by platform and genre. Dive into trailers, screenshots, and details.', preview: ['Indie gems', 'RPG adventures', 'New releases'] },
  { icon: GitCompareArrows, title: 'Compare your shortlist', body: 'See up to three games side by side. Check ratings and supported platforms, then find official storefront links.', preview: ['Genres', 'Platforms', 'Release dates'] },
  { icon: Library, title: 'Build your collection', body: 'Wishlist games for later and track what you’re playing or have completed. Sign in to pick up on another device.', preview: ['Wishlist', 'Playing', 'Completed'] },
]

export default function Landing({ signedIn, catalogPath }) {
  return <div className="gb-landing">
    <a href="#landing-main" className="gb-skip">Skip to content</a>
    <header className="gb-header gb-container">
      <a className="gb-brand" href="#/" aria-label="GameBrowzr home"><img src="/gamebrowzr-mark.webp" width="38" height="38" alt="" />Game<span>Browzr</span></a>
      <nav aria-label="Main navigation">
        <a href="#features">How it works</a>
        <a className="gb-button gb-outline" href={signedIn ? '#/account' : '#/login'}>{signedIn ? 'My account' : 'Log In'}</a>
      </nav>
    </header>
    <main id="landing-main" tabIndex={-1}>
      <section className="gb-hero gb-container" aria-labelledby="landing-title">
        <div className="gb-hero-text">
          <h1 id="landing-title">Explore<br />Beyond.</h1>
          <p>Find your next game, compare the contenders, and build a collection worth coming back to.</p>
          <div className="gb-hero-actions">
            <a className="gb-button gb-primary" href={catalogPath}>Explore Games <ArrowRight size={18} aria-hidden="true" /></a>
            {!signedIn && <a className="gb-button gb-outline" href="#/register">Create Account</a>}
          </div>
          <small>Browse freely as a guest.</small>
        </div>
        <div className="gb-hero-art" aria-hidden="true">
          <img src="/aurora-portal.webp" alt="" width="1440" height="960" fetchPriority="high" />
        </div>
      </section>
      <section className="gb-features gb-container" id="features" tabIndex={-1} aria-labelledby="features-title">
        <h2 id="features-title">How it works</h2>
        <div className="gb-feature-grid">
          {features.map(({ icon: Icon, title, body, preview }) => <article key={title}>
            <Icon size={25} aria-hidden="true" /><h3>{title}</h3><p>{body}</p>
            <ul aria-label={title}>{preview.map(item => <li key={item}>{item}</li>)}</ul>
          </article>)}
        </div>
        <a className="gb-button gb-primary" href={catalogPath}>Explore Games <ArrowRight size={18} aria-hidden="true" /></a>
      </section>
    </main>
    <footer className="gb-container gb-footer"><span>GameBrowzr</span><a href="https://www.igdb.com/">Game data by IGDB</a></footer>
  </div>
}

