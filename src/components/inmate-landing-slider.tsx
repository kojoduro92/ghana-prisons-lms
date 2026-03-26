"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export interface InmateLandingSlide {
  id: string;
  title: string;
  eyebrow: string;
  description: string;
  imageSrc: string;
  ctaLabel: string;
  ctaHref: string;
}

interface InmateLandingSliderProps {
  slides: InmateLandingSlide[];
}

const ROTATE_INTERVAL_MS = 5600;

export function InmateLandingSlider({ slides }: InmateLandingSliderProps) {
  const safeSlides = slides.filter((slide) => Boolean(slide.imageSrc));
  const [activeIndex, setActiveIndex] = useState(0);
  const [animationKey, setAnimationKey] = useState(0);

  useEffect(() => {
    if (safeSlides.length <= 1) return;
    const timer = window.setTimeout(() => {
      setActiveIndex((previous) => (previous + 1) % safeSlides.length);
      setAnimationKey((previous) => previous + 1);
    }, ROTATE_INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [activeIndex, safeSlides.length]);

  if (safeSlides.length === 0) return null;

  function setSlide(index: number): void {
    setActiveIndex(index);
    setAnimationKey((previous) => previous + 1);
  }

  function previous(): void {
    const nextIndex = activeIndex === 0 ? safeSlides.length - 1 : activeIndex - 1;
    setSlide(nextIndex);
  }

  function next(): void {
    setSlide((activeIndex + 1) % safeSlides.length);
  }

  return (
    <section className="inmate-landing-v2-slider" aria-label="Inmate learning hero slider">
      <div className="inmate-landing-v2-slider-stage">
        {safeSlides.map((slide, index) => (
          <article
            key={slide.id}
            className={`inmate-landing-v2-slide ${index === activeIndex ? "is-active" : ""}`}
            aria-hidden={index === activeIndex ? undefined : true}
          >
            <Image
              src={slide.imageSrc}
              alt={slide.title}
              fill
              priority={index === 0}
              sizes="(max-width: 1300px) 100vw, 1240px"
              className="inmate-landing-v2-slide-image"
            />
            <div className="inmate-landing-v2-slide-overlay">
              <p>{slide.eyebrow}</p>
              <h1>{slide.title}</h1>
              <span>{slide.description}</span>
              <Link href={slide.ctaHref} className="button-primary inmate-landing-v2-slide-cta">
                {slide.ctaLabel}
              </Link>
            </div>
          </article>
        ))}

        <div className="inmate-landing-v2-slider-controls">
          <button type="button" onClick={previous} aria-label="Show previous slide">
            ←
          </button>
          <button type="button" onClick={next} aria-label="Show next slide">
            →
          </button>
        </div>
      </div>

      <div className="inmate-landing-v2-slider-tabs" role="tablist" aria-label="Landing slides">
        {safeSlides.map((slide, index) => (
          <button
            type="button"
            key={slide.id}
            role="tab"
            className={index === activeIndex ? "is-active" : ""}
            aria-selected={index === activeIndex}
            onClick={() => setSlide(index)}
          >
            <strong>{slide.eyebrow}</strong>
            <span>{slide.title}</span>
            <i>
              {index === activeIndex ? (
                <em key={`${slide.id}-${animationKey}`} className="inmate-landing-v2-slider-progress" />
              ) : null}
            </i>
          </button>
        ))}
      </div>
    </section>
  );
}
