/* eslint-disable @next/next/no-img-element -- these are fixed WebP assets; a plain
   img keeps the demo free of an image-optimisation runtime. */
'use client';

import { ArrowRightIcon } from '../icons';
import { templateStyle, type TemplateProps } from './index';

const NAV_LINKS = ['Work', 'About', 'Contact'] as const;

const PORTRAIT = { src: '/samples/portfolio/portrait.webp', width: 960, height: 1193 };

const STATS = [
  { value: '12 yrs', label: 'Designing' },
  { value: '48', label: 'Launches' },
  { value: '9', label: 'Countries' },
] as const;

const WORK = [
  {
    name: 'Charter booking',
    meta: 'Marine · 2026',
    src: '/samples/portfolio/work-charter.webp',
    width: 1024,
    height: 683,
  },
  {
    name: 'Timepiece configurator',
    meta: 'Watches · 2025',
    src: '/samples/portfolio/work-watch.webp',
    width: 960,
    height: 640,
  },
  {
    name: 'Rooftop club site',
    meta: 'Hospitality · 2025',
    src: '/samples/portfolio/work-rooftop.webp',
    width: 1024,
    height: 683,
  },
] as const;

/**
 * A person-led portfolio: portrait beside a short pitch, a stats strip, three
 * recent projects and a testimonial on the accent colour.
 */
export function PortfolioTemplate({ theme, busy }: TemplateProps) {
  return (
    <article
      className="site folio"
      style={templateStyle(theme)}
      data-mode={theme?.mode ?? 'light'}
      data-busy={busy}
      data-template="portfolio"
    >
      <header className="site__nav">
        <p className="folio__brand">
          <span className="folio__monogram">AT</span>
          Ari Tan
        </p>
        <nav className="site__links" aria-label="Preview navigation">
          {NAV_LINKS.map((link) => (
            <span key={link}>{link}</span>
          ))}
        </nav>
        <span className="site__cta">Book a call</span>
      </header>

      <section className="folio__hero">
        <div className="folio__intro">
          <p className="site__eyebrow">Independent creative director</p>
          <h1 className="folio__title">Design that earns its keep.</h1>
          <p className="folio__sub">
            Brand, digital and campaign design for premium labels — shipped in weeks, not quarters.
          </p>
          <div className="site__actions">
            <span className="site__button">Start a project</span>
            <span className="site__link">
              See recent work
              <ArrowRightIcon width={15} height={15} />
            </span>
          </div>
        </div>

        <div className="folio__media">
          <img
            className="folio__image"
            src={PORTRAIT.src}
            width={PORTRAIT.width}
            height={PORTRAIT.height}
            alt="Portrait of Ari Tan"
            decoding="async"
          />
        </div>
      </section>

      <section className="folio__stats">
        {STATS.map((stat) => (
          <p key={stat.label} className="folio__stat">
            <span className="folio__statValue">{stat.value}</span>
            <span className="folio__statLabel">{stat.label}</span>
          </p>
        ))}
      </section>

      <section className="site__band">
        <div className="site__sectionHead">
          <div>
            <p className="site__eyebrow">Selected work</p>
            <h2 className="site__sectionTitle">Recent projects</h2>
          </div>
          <p className="site__sectionIntro">
            Three recent projects, from a charter booking flow to a full campaign system.
          </p>
        </div>

        <div className="site__grid site__grid--three">
          {WORK.map((item) => (
            <article key={item.name} className="card">
              <div className="card__media" data-shape="tall">
                <img
                  className="card__image"
                  src={item.src}
                  width={item.width}
                  height={item.height}
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="card__body">
                <div>
                  <h3 className="card__name">{item.name}</h3>
                  <p className="card__meta">{item.meta}</p>
                </div>
                <ArrowRightIcon className="card__arrow" width={17} height={17} />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="folio__quote">
        <blockquote className="folio__quoteText">
          “Ari made our charter booking feel effortless. Direct bookings are up 42%.”
        </blockquote>
        <p className="folio__quoteBy">Maya L. · Head of digital, Meridian</p>
      </section>

      <footer className="site__footer">
        <p className="site__brand site__brand--small">Ari Tan</p>
        <nav className="site__links site__links--small" aria-label="Preview footer">
          <span>Work</span>
          <span>About</span>
          <span>Contact</span>
        </nav>
        <p className="site__fineprint">© 2026 Ari Tan</p>
      </footer>
    </article>
  );
}
