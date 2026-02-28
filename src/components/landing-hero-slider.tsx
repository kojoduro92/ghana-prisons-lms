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
      style={{ display: "grid", gap: 10 }}
      onMouseEnter={() => setAutoplay(false)}
      onMouseLeave={() => setAutoplay(true)}
      aria-label="Landing hero slider"
    >
      <article
        className="landing-slider-stage"
        style={{
          position: "relative",
          minHeight: 420,
          overflow: "hidden",
          borderRadius: 14,
        }}
      >
        <Image
          src={activeSlide.imageSrc}
          alt={activeSlide.title}
          fill
          priority
          sizes="(max-width: 980px) 100vw, 52vw"
          className="landing-slider-image"
          style={{ objectFit: "cover" }}
        />
        <div className="landing-slider-scrim" aria-hidden style={{ position: "absolute", inset: 0 }} />
        <div className="landing-slider-content" style={{ position: "absolute", inset: 0 }}>
          <p className="landing-slider-eyebrow">{activeSlide.eyebrow}</p>
          <h2>{activeSlide.title}</h2>
          <p>{activeSlide.description}</p>
          <div className="landing-slider-actions">
            <Link href={activeSlide.primaryCtaHref} className="button-primary">
              {activeSlide.primaryCtaLabel}
            </Link>
            <Link href="/admin-login" className="button-soft">
              Login
            </Link>
          </div>
        </div>

        <div className="landing-slider-controls">
          <button type="button" className="landing-slider-arrow" aria-label="Previous slide" onClick={previousSlide}>
            ←
          </button>
          <button type="button" className="landing-slider-arrow" aria-label="Next slide" onClick={nextSlide}>
            →
          </button>
        </div>
      </article>

      <div className="landing-slider-pagination" role="tablist" aria-label="Hero slides">
        {safeSlides.map((slide, index) => (
          <button
            type="button"
            key={slide.id}
            role="tab"
            className={`landing-slider-dot ${index === activeIndex ? "landing-slider-dot-active" : ""}`}
            aria-selected={index === activeIndex}
            onClick={() => selectSlide(index)}
          >
            <span className="landing-slider-dot-title">{slide.title}</span>
            <span className="landing-slider-dot-track">
              {index === activeIndex ? (
                <span key={`${slide.id}-${progressKey}`} className="landing-slider-dot-progress" />
              ) : null}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
