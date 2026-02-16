'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Play, Clock, Award } from 'lucide-react';
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
      <div className="relative h-[70vh] min-h-[500px] bg-gradient-to-br from-primary/20 to-cream flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-5xl font-display font-bold text-text-primary mb-4">FILMHOUSE</h1>
          <p className="text-text-secondary text-xl">Singapore&apos;s dedicated third space for moving visuals</p>
        </div>
      </div>
    );
  }

  const currentFilm = films[currentIndex];

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  return (
    <div className="relative h-[70vh] min-h-[500px] max-h-[700px] overflow-hidden bg-black">
      {/* Slides */}
      {films.map((film, index) => {
        const bannerUrl = film.banner_url || null;
        const posterUrl = film.poster_url || null;
        
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
              {bannerUrl ? (
                <Image
                  src={bannerUrl}
                  alt={film.title}
                  fill
                  className="object-cover object-center"
                  priority={index === 0}
                  sizes="100vw"
                />
              ) : posterUrl ? (
                <Image
                  src={posterUrl}
                  alt={film.title}
                  fill
                  className="object-cover scale-150 blur-xl"
                  priority={index === 0}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/40 to-black" />
              )}
              {/* Gradient Overlays */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
            </div>

            {/* Content */}
            <div className="relative h-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-end pb-20 md:pb-24">
              <div className={`max-w-2xl transition-all duration-700 delay-200 ${
                index === currentIndex ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
              }`}>
                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className="px-3 py-1 bg-primary text-white text-sm font-bold rounded">
                    {film.rating}
                  </span>
                  {film.is_4k && (
                    <span className="px-3 py-1 bg-blue-500 text-white text-sm font-bold rounded">
                      4K
                    </span>
                  )}
                  {film.awards && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/90 text-black text-sm font-medium rounded">
                      <Award className="w-3.5 h-3.5" />
                      {film.awards.split('.')[0].split(',')[0]}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-bold text-white mb-4 leading-tight">
                  {film.title}
                </h1>

                {/* Meta Info */}
                <div className="flex flex-wrap items-center gap-3 text-white/80 text-sm mb-4">
                  <span className="font-medium">{film.year}</span>
                  <span className="w-1 h-1 bg-white/50 rounded-full" />
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatDuration(film.duration)}
                  </span>
                  <span className="w-1 h-1 bg-white/50 rounded-full" />
                  <span>{film.genre}</span>
                </div>

                {/* Synopsis */}
                <p className="text-white/80 text-base md:text-lg leading-relaxed mb-6 line-clamp-2 md:line-clamp-3">
                  {film.synopsis}
                </p>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href={`/film/${film.slug}`}
                    className="inline-flex items-center gap-2 px-6 md:px-8 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Book Now
                  </Link>
                  {film.trailer_url && (
                    <a
                      href={film.trailer_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 md:px-6 py-3 bg-white/10 text-white rounded-lg font-medium hover:bg-white/20 transition-all backdrop-blur-sm border border-white/20"
                    >
                      <Play className="w-5 h-5" />
                      Trailer
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Navigation Arrows */}
      {films.length > 1 && (
        <>
          <button
            onClick={() => { goToPrev(); setIsAutoPlaying(false); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 md:p-3 bg-black/30 hover:bg-black/50 rounded-full backdrop-blur-sm transition-all hover:scale-110 active:scale-95"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </button>
          <button
            onClick={() => { goToNext(); setIsAutoPlaying(false); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 md:p-3 bg-black/30 hover:bg-black/50 rounded-full backdrop-blur-sm transition-all hover:scale-110 active:scale-95"
            aria-label="Next slide"
          >
            <ChevronRight className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {films.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
          {films.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? 'bg-white w-8'
                  : 'bg-white/40 w-2 hover:bg-white/60'
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
