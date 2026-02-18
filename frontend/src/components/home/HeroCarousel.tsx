'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
/* lucide arrows removed – using plain text ‹ › for filmhouse.sg style */
import type { Film } from '@/types';

interface HeroCarouselProps {
  films: Film[];
  autoPlayInterval?: number;
}

export function HeroCarousel({ films, autoPlayInterval = 6000 }: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const goToNext = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev + 1) % films.length);
    setTimeout(() => setIsTransitioning(false), 500);
  }, [films.length, isTransitioning]);

  const goToPrev = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev - 1 + films.length) % films.length);
    setTimeout(() => setIsTransitioning(false), 500);
  }, [films.length, isTransitioning]);

  const goToSlide = (index: number) => {
    if (isTransitioning || index === currentIndex) return;
    setIsTransitioning(true);
    setCurrentIndex(index);
    setIsAutoPlaying(false);
    setTimeout(() => {
      setIsTransitioning(false);
      setIsAutoPlaying(true);
    }, 10000);
  };

  useEffect(() => {
    if (!isAutoPlaying || films.length <= 1) return;
    const interval = setInterval(goToNext, autoPlayInterval);
    return () => clearInterval(interval);
  }, [isAutoPlaying, autoPlayInterval, goToNext, films.length]);

  if (films.length === 0) {
    return (
      <div className="relative h-[55vh] sm:h-[65vh] md:h-[80vh] min-h-[400px] bg-gradient-to-br from-primary/20 to-cream flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-5xl font-display font-bold text-text-primary mb-4">FILMHOUSE</h1>
          <p className="text-text-secondary text-xl">Singapore&apos;s dedicated third space for moving visuals</p>
        </div>
      </div>
    );
  }

  const currentFilm = films[currentIndex];

  return (
    <div className="relative h-[55vh] sm:h-[65vh] md:h-[80vh] min-h-[400px] sm:min-h-[500px] max-h-[850px] overflow-hidden bg-black">
      {/* Slides */}
      {films.map((film, index) => {
        const bannerUrl = film.banner_url || null;
        const posterUrl = film.poster_url || null;

        // Next/Image may eager-load images that are "in view" even if the slide is visually hidden.
        // Only mount images for the current slide (+ neighbors) to speed up landing.
        const shouldRenderImage =
          index === currentIndex ||
          index === (currentIndex + 1) % films.length ||
          index === (currentIndex - 1 + films.length) % films.length;

        return (
          <div
            key={film.id}
            className={`absolute inset-0 transition-all duration-700 ease-out ${
              index === currentIndex 
                ? 'opacity-100 z-10 scale-100' 
                : 'opacity-0 z-0 scale-105'
            }`}
          >
            {/* Background Image */}
            <div className="absolute inset-0">
              {shouldRenderImage ? (
                bannerUrl ? (
                  <Image
                    src={bannerUrl}
                    alt={film.title}
                    fill
                    className="object-cover object-center"
                    priority={index === 0}
                    loading={index === 0 ? 'eager' : 'lazy'}
                    quality={75}
                    sizes="100vw"
                  />
                ) : posterUrl ? (
                  <Image
                    src={posterUrl}
                    alt={film.title}
                    fill
                    className="object-cover scale-150 blur-xl"
                    priority={index === 0}
                    loading={index === 0 ? 'eager' : 'lazy'}
                    quality={75}
                    sizes="100vw"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/40 to-black" />
                )
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/40 to-black" />
              )}
              {/* Gradient Overlays */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
            </div>

            {/* Content */}
            <div className="relative h-full max-w-[1335px] mx-auto px-4 sm:px-6 lg:px-8 flex items-end pb-12 sm:pb-16 md:pb-24">
              <div className={`max-w-2xl transition-all duration-700 delay-200 ${
                index === currentIndex ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
              }`}>
                {/* Genre label */}
                {film.genre && (
                  <p className="text-white/60 text-xs tracking-[0.2em] uppercase mb-3 font-semibold">
                    GENRE: {film.genre}
                  </p>
                )}

                {/* Title */}
                <h1 className="text-3xl sm:text-4xl md:text-6xl font-display font-bold text-white mb-3 sm:mb-4 leading-tight">
                  {film.title}
                </h1>

                {/* Synopsis */}
                <p className="text-white/80 text-sm sm:text-base md:text-lg leading-relaxed mb-5 sm:mb-6 line-clamp-2">
                  {film.synopsis}
                </p>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="fh-hero-btn text-sm px-5 py-2.5">
                    {film.rating}
                  </span>
                  {film.trailer_url ? (
                    <a
                      href={film.trailer_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="fh-hero-btn-filled text-sm px-5 py-2.5"
                    >
                      TRAILER
                    </a>
                  ) : (
                    <span className="fh-hero-btn-filled text-sm px-5 py-2.5">TRAILER</span>
                  )}
                  <Link
                    href={`/film/${film.slug}`}
                    className="fh-hero-btn-filled text-sm px-5 py-2.5"
                  >
                    FULL SYNOPSIS
                  </Link>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Navigation Arrows - filmhouse.sg style: large semi-transparent ‹ › */}
      {films.length > 1 && (
        <>
          <button
            onClick={() => { goToPrev(); setIsAutoPlaying(false); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 text-white/30 hover:text-white/70 transition-colors select-none"
            style={{ fontSize: '4rem', lineHeight: 1, fontWeight: 300 }}
            aria-label="Previous slide"
          >
            ‹
          </button>
          <button
            onClick={() => { goToNext(); setIsAutoPlaying(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 text-white/30 hover:text-white/70 transition-colors select-none"
            style={{ fontSize: '4rem', lineHeight: 1, fontWeight: 300 }}
            aria-label="Next slide"
          >
            ›
          </button>
        </>
      )}

      {/* Dots Indicator - bottom left, active = pill, others = small dot */}
      {films.length > 1 && (
        <div className="absolute bottom-6 left-4 sm:left-8 z-20 flex items-center gap-1.5">
          {films.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? 'bg-white h-2 w-6'
                  : 'bg-white/40 h-2 w-2 hover:bg-white/60'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Progress Bar */}
      {films.length > 1 && isAutoPlaying && (
        <div className="absolute bottom-0 left-0 right-0 z-20 h-1 bg-white/20">
          <div 
            className="h-full bg-primary transition-all ease-linear"
            style={{
              animation: `progress ${autoPlayInterval}ms linear infinite`,
            }}
          />
        </div>
      )}

      <style jsx>{`
        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
}
