"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

interface LandingHeroSlide {
  id: string;
  title: string;
  eyebrow: string;
  description: string;
  imageSrc: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
}

interface LandingHeroSliderProps {
  slides: LandingHeroSlide[];
}

const AUTO_ROTATE_MS = 6200;

export function LandingHeroSlider({ slides }: LandingHeroSliderProps) {
  const safeSlides = useMemo(() => slides.filter((slide) => Boolean(slide.imageSrc)), [slides]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const [progressKey, setProgressKey] = useState(0);

  useEffect(() => {
    if (!autoplay || safeSlides.length <= 1) return;

    const timer = window.setTimeout(() => {
      setActiveIndex((previous) => (previous + 1) % safeSlides.length);
      setProgressKey((previous) => previous + 1);
    }, AUTO_ROTATE_MS);

    return () => window.clearTimeout(timer);
  }, [activeIndex, autoplay, safeSlides.length]);

  if (safeSlides.length === 0) {
    return null;
  }

  const activeSlide = safeSlides[activeIndex];

  function selectSlide(nextIndex: number): void {
    setActiveIndex(nextIndex);
    setProgressKey((previous) => previous + 1);
  }

  function previousSlide(): void {
    const nextIndex = activeIndex === 0 ? safeSlides.length - 1 : activeIndex - 1;
    selectSlide(nextIndex);
  }

  function nextSlide(): void {
    const nextIndex = (activeIndex + 1) % safeSlides.length;
    selectSlide(nextIndex);
  }

  return (
    <section
      className="landing-slider"
      style={{ display: "flex", flexDirection: "column", width: "100%" }}
      onMouseEnter={() => setAutoplay(false)}
      onMouseLeave={() => setAutoplay(true)}
      aria-label="Landing hero slider"
    >
      <article
        className="landing-slider-stage"
        style={{
          position: "relative",
          minHeight: 700,
          overflow: "hidden",
          borderRadius: 20,
          boxShadow: '0 32px 64px rgba(0,0,0,0.15)'
        }}
      >
        <Image
          src={activeSlide.imageSrc}
          alt={activeSlide.title}
          fill
          priority
          sizes="100vw"
          className="landing-slider-image"
          style={{ objectFit: "cover", transform: "scale(1.05)", transition: "transform 6s ease-out" }}
        />
        <div className="landing-slider-scrim" aria-hidden style={{ 
          position: "absolute", 
          inset: 0, 
          background: "linear-gradient(to top, rgba(15,10,5,0.95) 0%, rgba(15,10,5,0.7) 40%, rgba(15,10,5,0.2) 100%)"
        }} />
        
        <div className="landing-slider-content" style={{ position: "absolute", inset: 0, padding: '64px 80px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ maxWidth: '900px', marginTop: '-80px' }}>
            <p className="landing-slider-eyebrow" style={{ color: '#ffcf99', fontSize: '1.1rem', marginBottom: '20px', letterSpacing: '0.18em', fontWeight: 800, textTransform: 'uppercase', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{activeSlide.eyebrow}</p>
            <h1 style={{ fontSize: 'clamp(3rem, 5vw, 4.8rem)', color: '#fff', margin: '0 0 28px', lineHeight: 1.1, fontWeight: 800, letterSpacing: '-0.02em', textShadow: '0 4px 12px rgba(0,0,0,0.6)' }}>{activeSlide.title}</h1>
            <p style={{ color: 'rgba(255,255,255,0.95)', fontSize: '1.3rem', lineHeight: 1.6, marginBottom: '48px', maxWidth: '780px', marginInline: 'auto', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>{activeSlide.description}</p>
            <div className="landing-slider-actions" style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
              <Link href={activeSlide.primaryCtaHref} className="button-primary" style={{ padding: '18px 40px', fontSize: '1.15rem', fontWeight: 700, background: 'linear-gradient(to right, #c88c5a, #a86f43)', color: '#fff', border: 'none', borderRadius: '99px', boxShadow: '0 12px 28px rgba(200, 140, 90, 0.4)', transition: 'transform 0.2s, box-shadow 0.2s' }}>
                {activeSlide.primaryCtaLabel}
              </Link>
            </div>
          </div>
        </div>

        <div className="landing-slider-controls" style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', width: '100%', display: 'flex', justifyContent: 'space-between', padding: '0 24px', pointerEvents: 'none' }}>
          <button type="button" className="landing-slider-arrow" aria-label="Previous slide" onClick={previousSlide} style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', width: '56px', height: '56px', color: '#fff', fontSize: '1.5rem', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '50%', pointerEvents: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'} onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}>
            ←
          </button>
          <button type="button" className="landing-slider-arrow" aria-label="Next slide" onClick={nextSlide} style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', width: '56px', height: '56px', color: '#fff', fontSize: '1.5rem', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '50%', pointerEvents: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'} onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}>
            →
          </button>
        </div>

        <div className="landing-slider-pagination" role="tablist" aria-label="Hero slides" style={{ position: 'absolute', bottom: '40px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '20px', zIndex: 10, width: '100%', maxWidth: '1000px', padding: '0 24px' }}>
          {safeSlides.map((slide, index) => (
            <button
              type="button"
              key={slide.id}
              role="tab"
              className={`landing-slider-dot ${index === activeIndex ? "landing-slider-dot-active" : ""}`}
              aria-selected={index === activeIndex}
              onClick={() => selectSlide(index)}
              style={{
                flex: 1,
                background: index === activeIndex ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(12px)',
                border: index === activeIndex ? '1px solid rgba(255,255,255,0.8)' : '1px solid rgba(255,255,255,0.25)',
                padding: '20px',
                borderRadius: '16px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: index === activeIndex ? '0 8px 24px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.1)'
              }}
              onMouseOver={(e) => { if (index !== activeIndex) e.currentTarget.style.background = 'rgba(255,255,255,0.15)' }}
              onMouseOut={(e) => { if (index !== activeIndex) e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
            >
              <span className="landing-slider-dot-title" style={{ fontSize: '0.95rem', fontWeight: 700, color: index === activeIndex ? '#fff' : 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '14px', transition: 'color 0.3s ease', letterSpacing: '0.02em' }}>{slide.title}</span>
              <span className="landing-slider-dot-track" style={{ display: 'block', height: '4px', background: 'rgba(255,255,255,0.25)', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                {index === activeIndex ? (
                  <span key={`${slide.id}-${progressKey}`} className="landing-slider-dot-progress" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '100%', background: '#fff', transformOrigin: 'left center' }} />
                ) : null}
              </span>
            </button>
          ))}
        </div>
      </article>
    </section>
  );
}
