import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { easyFlowFeatures, systems } from '../config/systems.js'
import '../styles/landingPage.css'

const SECTION_LINKS = [
  { id: 'systems', label: 'Systems' },
  { id: 'features', label: 'Features' },
  { id: 'workflow', label: 'Workflow' },
  { id: 'status', label: 'Status' },
]

function SystemAction({ system }) {
  const className = 'system-card__action'

  if (!system.available || !system.destination) {
    return <button className={className} type="button" disabled>Coming soon</button>
  }

  if (system.linkType === 'external') {
    return <a className={className} href={system.destination}>Open system</a>
  }

  return <Link className={className} to={system.destination}>Open Easy Flow</Link>
}

function RouteGrid() {
  return (
    <div className="route-grid" aria-hidden="true">
      <span className="route-grid__road route-grid__road--horizontal" />
      <span className="route-grid__road route-grid__road--vertical" />
      <span className="route-grid__lane route-grid__lane--top" />
      <span className="route-grid__lane route-grid__lane--bottom" />
      <span className="route-grid__lane route-grid__lane--left" />
      <span className="route-grid__lane route-grid__lane--right" />
      <span className="route-grid__signal route-grid__signal--north"><i /><i /><i /></span>
      <span className="route-grid__signal route-grid__signal--east"><i /><i /><i /></span>
      <span className="route-grid__signal route-grid__signal--south"><i /><i /><i /></span>
      <span className="route-grid__signal route-grid__signal--west"><i /><i /><i /></span>
      <span className="route-grid__vehicle route-grid__vehicle--one" />
      <span className="route-grid__vehicle route-grid__vehicle--two" />
      <span className="route-grid__vehicle route-grid__vehicle--three" />
      <span className="route-grid__readout">INTERSECTION STATUS<br /><b>MONITORING</b></span>
    </div>
  )
}

function FeatureIcon({ icon }) {
  const paths = {
    monitoring: <><path d="M4 19V5m0 14h16M8 15l3-3 2 2 4-5" /><circle cx="17" cy="9" r="1.5" /></>,
    analytics: <><path d="M4 19V5m0 14h16M8 15v-3m4 3V8m4 7v-5m4 5V6" /></>,
    violations: <><path d="M12 4 21 20H3L12 4Z" /><path d="M12 10v4m0 3h.01" /></>,
    controls: <><rect x="7" y="3" width="10" height="15" rx="2" /><circle cx="12" cy="7" r="1" /><circle cx="12" cy="10.5" r="1" /><circle cx="12" cy="14" r="1" /><path d="M12 18v3m-3 0h6" /></>,
  }

  return <svg className="feature-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[icon]}</svg>
}

export default function LandingPage() {
  const [activeSection, setActiveSection] = useState(() => {
    const hashSection = window.location.hash.slice(1)
    return SECTION_LINKS.some(({ id }) => id === hashSection) ? hashSection : ''
  })
  const [hasScrolled, setHasScrolled] = useState(false)

  useEffect(() => {
    document.title = 'Easy Flow | System Portal'
  }, [])

  useEffect(() => {
    const sectionElements = SECTION_LINKS
      .map(({ id }) => document.getElementById(id))
      .filter(Boolean)
    const revealElements = document.querySelectorAll('[data-landing-reveal]')
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const updateHeader = () => setHasScrolled(window.scrollY > 8)
    updateHeader()
    window.addEventListener('scroll', updateHeader, { passive: true })

    const activeObserver = new IntersectionObserver((entries) => {
      const visibleEntry = entries.find((entry) => entry.isIntersecting)
      if (visibleEntry) setActiveSection(visibleEntry.target.id)
    }, { rootMargin: '-22% 0px -62% 0px', threshold: 0 })
    sectionElements.forEach((section) => activeObserver.observe(section))

    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('landing-reveal--visible')
          observer.unobserve(entry.target)
        }
      })
    }, { threshold: 0.12 })

    revealElements.forEach((element) => {
      if (prefersReducedMotion) element.classList.add('landing-reveal--visible')
      else revealObserver.observe(element)
    })

    return () => {
      window.removeEventListener('scroll', updateHeader)
      activeObserver.disconnect()
      revealObserver.disconnect()
    }
  }, [])

  const handleSectionNavigation = (event, sectionId) => {
    event.preventDefault()
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    })
    window.history.pushState(null, '', `#${sectionId}`)
    setActiveSection(sectionId)
  }

  return (
    <main className="landing-page">
      <header className={`landing-header ${hasScrolled ? 'landing-header--scrolled' : ''}`}>
        <div className="landing-header__inner">
          <Link className="landing-brand" to="/landing" aria-label="Easy Flow system portal home">
            <span className="landing-brand__mark"><span /><span /><span /></span>
            <span>Easy Flow</span>
          </Link>
          <nav className="landing-nav" aria-label="Landing page navigation">
            {SECTION_LINKS.map(({ id, label }) => (
              <a
                className={activeSection === id ? 'landing-nav__link--active' : ''}
                href={`#${id}`}
                key={id}
                aria-current={activeSection === id ? 'location' : undefined}
                onClick={(event) => handleSectionNavigation(event, id)}
              >
                {label}
              </a>
            ))}
            <Link to="/dashboard">Open Easy Flow</Link>
          </nav>
        </div>
      </header>

      <section className="landing-hero" aria-labelledby="portal-title">
        <div className="landing-hero__copy">
          <p className="landing-kicker">System documentation portal</p>
          <h1 id="portal-title">Find the right system for the work ahead.</h1>
          <p>Use this portal to understand each operational system and continue to its dedicated application or website.</p>
          <a className="landing-hero__action" href="#systems">Browse systems</a>
        </div>
        <RouteGrid />
      </section>

      <section className="features-section landing-reveal" id="features" data-landing-reveal aria-labelledby="features-title">
        <div className="section-heading">
          <div>
            <p className="landing-kicker">Explore Easy Flow</p>
            <h2 id="features-title">Documentation that leads to the work.</h2>
          </div>
          <p>Choose a capability to learn what it supports, then open the relevant workspace.</p>
        </div>
        <div className="features-grid">
          {easyFlowFeatures.map((feature) => (
            <article className="feature-card" key={feature.id}>
              <FeatureIcon icon={feature.icon} />
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
              <ul className="feature-card__tags" aria-label={`${feature.title} capabilities`}>
                {feature.tags.map((tag) => <li key={tag}>{tag}</li>)}
              </ul>
              <Link className="feature-card__action" to={feature.destination}>Open feature</Link>
            </article>
          ))}
        </div>
      </section>

      <section className="workflow-section landing-reveal" id="workflow" data-landing-reveal aria-labelledby="workflow-title">
        <div className="workflow-section__heading">
          <p className="landing-kicker">Easy Flow workflow</p>
          <h2 id="workflow-title">See the condition. Review the evidence. Set the response.</h2>
        </div>
        <div className="workflow-line" aria-label="Easy Flow operational workflow">
          <article><span className="workflow-line__marker" /><h3>Monitor conditions</h3><p>Use the live map and camera feeds to understand current intersection activity.</p></article>
          <article><span className="workflow-line__marker" /><h3>Review data and violations</h3><p>Check traffic patterns and recorded violations before making an operational decision.</p></article>
          <article><span className="workflow-line__marker" /><h3>Adjust signal controls</h3><p>Apply appropriate traffic-light timing and thresholds from the control workspace.</p></article>
        </div>
      </section>

      <section className="systems-section landing-reveal" id="systems" data-landing-reveal aria-labelledby="systems-title">
        <div className="section-heading">
          <div>
            <p className="landing-kicker">Available systems</p>
            <h2 id="systems-title">Choose a system</h2>
          </div>
          <p>Each system opens in its own dedicated workspace.</p>
        </div>
        <div className="systems-grid">
          {systems.map((system) => (
            <article className={`system-card ${system.available ? 'system-card--available' : ''}`} key={system.id}>
              <div className="system-card__topline">
                <span className="system-card__status"><span />{system.status}</span>
                <span className="system-card__number">{system.id === 'easy-flow' ? 'EF' : '—'}</span>
              </div>
              <h3>{system.name}</h3>
              <p>{system.purpose}</p>
              <ul className="system-card__tags" aria-label={`${system.name} features`}>
                {system.tags.map((tag) => <li key={tag}>{tag}</li>)}
              </ul>
              <SystemAction system={system} />
            </article>
          ))}
        </div>
      </section>

      <section className="status-section landing-reveal" id="status" data-landing-reveal aria-labelledby="status-title">
        <div className="section-heading">
          <div>
            <p className="landing-kicker">System status and roadmap</p>
            <h2 id="status-title">What is ready today.</h2>
          </div>
          <p>New systems will be made available here when their dedicated applications are ready.</p>
        </div>
        <div className="roadmap-grid">
          {systems.map((system) => (
            <article className={`roadmap-card ${system.available ? 'roadmap-card--available' : ''}`} key={system.id}>
              <span className="roadmap-card__status"><i />{system.status}</span>
              <h3>{system.name}</h3>
              <p>{system.available ? 'Operational system available from this portal.' : 'Dedicated application and documentation are in preparation.'}</p>
              <SystemAction system={system} />
            </article>
          ))}
        </div>
      </section>

      <section className="portal-guide landing-reveal" data-landing-reveal aria-labelledby="guide-title">
        <div>
          <p className="landing-kicker">Using this portal</p>
          <h2 id="guide-title">Start here, then continue in the system.</h2>
        </div>
        <p className="portal-guide__copy">This portal provides an overview of each system. Use an available action to continue to its dedicated workspace, then return here when you need another service.</p>
      </section>

      <footer className="landing-footer landing-reveal" data-landing-reveal>
        <span>Easy Flow system portal</span>
        <span>Documentation directory · Temporary contact details</span>
      </footer>
    </main>
  )
}
