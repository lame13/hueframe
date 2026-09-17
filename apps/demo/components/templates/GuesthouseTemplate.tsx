/* eslint-disable @next/next/no-img-element -- these are fixed WebP assets; a plain
   img keeps the demo free of an image-optimisation runtime. */
'use client';

import { ArrowRightIcon, SunMark } from '../icons';
import { templateStyle, type TemplateProps } from './index';

const NAV_LINKS = ['Stay', 'Spaces', 'Journal'] as const;

const HERO = { src: '/samples/guesthouse/hero-terrace.webp', width: 1024, height: 683 };

const ROOMS = [
  {
    name: 'Courtyard room',
    meta: 'Peaceful · Private · Garden views',
    src: '/samples/guesthouse/room-courtyard.webp',
    width: 960,
    height: 640,
  },
  {
    name: 'Sea-view suite',
    meta: 'Bright · Spacious · Endless horizons',
    src: '/samples/guesthouse/room-suite.webp',
    width: 1024,
    height: 710,
  },
] as const;

/**
 * A coastal guesthouse page: hero with a full-bleed photo, then two room cards.
 * The layout and copy are fixed; only colours and the photo change.
 */
export function GuesthouseTemplate({ theme, busy }: TemplateProps) {
  return (
    <article
      className="site"
      style={templateStyle(theme)}
      data-mode={theme?.mode ?? 'light'}
      data-busy={busy}
      data-template="guesthouse"
    >
      <header className="site__nav">
        <p className="site__brand">
          <SunMark className="site__mark" width={26} height={26} />
          Casa Mar
        </p>
        <nav className="site__links" aria-label="Preview navigation">
          {NAV_LINKS.map((link) => (
            <span key={link}>{link}</span>
          ))}
        </nav>
        <span className="site__cta">Book a room</span>
      </header>

      <section className="hero">
        <div className="hero__copy">
          <p className="site__eyebrow">A coastal guesthouse</p>
          <h1 className="hero__title">A slower kind of stay.</h1>
          <p className="hero__sub">Quiet rooms, sea air and space to switch off.</p>
          <div className="site__actions">
            <span className="site__button">Find your stay</span>
            <span className="site__link">
              View rooms
              <ArrowRightIcon width={15} height={15} />
            </span>
          </div>
        </div>

        <div className="hero__media">
          <img
            className="hero__image"
            src={HERO.src}
            width={HERO.width}
            height={HERO.height}
            alt="Infinity pool overlooking the sea at Casa Mar"
            decoding="async"
          />
        </div>
      </section>

      <section className="site__band">
        <div className="site__sectionHead">
          <div>
            <p className="site__eyebrow">Our rooms</p>
            <h2 className="site__sectionTitle">Room to unwind</h2>
          </div>
          <p className="site__sectionIntro">
            Light-filled spaces, natural textures and views that make you breathe a little deeper.
          </p>
        </div>

        <div className="site__grid site__grid--two">
          {ROOMS.map((room) => (
            <article key={room.name} className="card">
              <div className="card__media">
                <img
                  className="card__image"
                  src={room.src}
                  width={room.width}
                  height={room.height}
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="card__body">
                <div>
                  <h3 className="card__name">{room.name}</h3>
                  <p className="card__meta">{room.meta}</p>
                </div>
                <ArrowRightIcon className="card__arrow" width={17} height={17} />
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className="site__footer">
        <p className="site__brand site__brand--small">Casa Mar</p>
        <nav className="site__links site__links--small" aria-label="Preview footer">
          <span>Rooms</span>
          <span>Story</span>
          <span>Contact</span>
        </nav>
        <p className="site__fineprint">© 2026 Casa Mar</p>
      </footer>
    </article>
  );
}
