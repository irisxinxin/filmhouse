'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, addDays, isToday } from 'date-fns';
import { screeningsApi, filmsApi } from '@/lib/api';
import { HeroCarousel } from '@/components/home/HeroCarousel';
import type { FilmWithScreenings, Film, Screening } from '@/types';
import { Clock, Play, Award, ChevronRight, Calendar } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDuration(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

export default function HomePage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  // Generate next 14 days
  const dates = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i));

  const { data: featuredFilms } = useQuery({
    queryKey: ['films', 'featured'],
    queryFn: async () => {
      const res = await filmsApi.getFeatured();
      return res.data as Film[];
    },
  });

  const { data: filmScreenings, isLoading } = useQuery({
    queryKey: ['screenings', dateStr],
    queryFn: async () => {
      const res = await screeningsApi.getByDate(dateStr);
      return res.data as FilmWithScreenings[];
    },
  });

  return (
    <div className="min-h-screen bg-cream">
      {/* Hero Carousel */}
      <HeroCarousel films={featuredFilms || []} />

      {/* Date Selector - Sticky */}
      <div className="sticky top-16 z-40 bg-cream/95 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4 gap-2 overflow-x-auto scrollbar-hide">
            {dates.map((date) => {
              const isSelected = format(date, 'yyyy-MM-dd') === dateStr;
              const isTodayDate = isToday(date);
              return (
                <button
                  key={date.toISOString()}
                  onClick={() => setSelectedDate(date)}
                  className={`flex-shrink-0 flex flex-col items-center px-4 py-2.5 rounded-xl transition-all duration-200 min-w-[72px] ${
                    isSelected
                      ? 'bg-primary text-white shadow-lg shadow-primary/25 scale-105'
                      : 'bg-white text-text-secondary hover:bg-gray-50 border border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className={`text-xs font-semibold uppercase tracking-wide ${
                    isSelected ? 'text-white/90' : isTodayDate ? 'text-primary' : ''
                  }`}>
                    {isTodayDate ? 'Today' : format(date, 'EEE')}
                  </span>
                  <span className="text-xl font-bold mt-0.5">{format(date, 'd')}</span>
                  <span className={`text-xs ${isSelected ? 'text-white/80' : 'text-text-muted'}`}>
                    {format(date, 'MMM')}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Films List */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-display font-bold text-text-primary">
            {format(selectedDate, 'EEEE, d MMMM')}
          </h2>
          <span className="text-sm text-text-muted">
            {filmScreenings?.length || 0} films showing
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-6 animate-pulse">
                <div className="flex gap-6">
                  <div className="w-32 h-48 bg-gray-200 rounded-xl" />
                  <div className="flex-1 space-y-3">
                    <div className="h-6 bg-gray-200 rounded w-1/3" />
                    <div className="h-4 bg-gray-200 rounded w-1/4" />
                    <div className="h-16 bg-gray-200 rounded" />
                    <div className="flex gap-2">
                      <div className="h-12 w-20 bg-gray-200 rounded-lg" />
                      <div className="h-12 w-20 bg-gray-200 rounded-lg" />
                      <div className="h-12 w-20 bg-gray-200 rounded-lg" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filmScreenings && filmScreenings.length > 0 ? (
          <div className="space-y-6">
            {filmScreenings.map(({ film, screenings }) => (
              <FilmRow key={film.id} film={film} screenings={screenings} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-text-primary mb-2">No screenings available</h3>
            <p className="text-text-secondary">Try selecting a different date above.</p>
          </div>
        )}
      </section>

      {/* Newsletter Section */}
      <section className="bg-dark text-white py-16 mt-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-2xl font-display font-bold mb-3">Join Our Mailing List</h3>
          <p className="text-white/70 mb-6 max-w-md mx-auto">
            Be the first to know about new films, special events, and exclusive offers.
          </p>
          <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <button 
              type="submit" 
              className="px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors"
            >
              Subscribe
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

function FilmRow({ film, screenings }: { film: Film; screenings: Screening[] }) {
  const posterUrl = film.poster_url || null;

  return (
    <article className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 group">
      <div className="flex flex-col md:flex-row">
        {/* Poster */}
        <Link href={`/film/${film.slug}`} className="md:w-44 flex-shrink-0 relative overflow-hidden">
          <div className="relative aspect-[2/3] md:aspect-auto md:h-full">
            {posterUrl ? (
              <Image
                src={posterUrl}
                alt={film.title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 176px"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center min-h-[200px]">
                <span className="text-5xl">🎬</span>
              </div>
            )}
          </div>
        </Link>

        {/* Content */}
        <div className="flex-1 p-5 md:p-6">
          {/* Awards Badge */}
          {film.awards && (
            <div className="flex items-center gap-1.5 text-xs text-primary mb-2">
              <Award className="w-3.5 h-3.5 fill-primary/20" />
              <span className="font-medium line-clamp-1">{film.awards.split('.')[0]}</span>
            </div>
          )}

          {/* Title */}
          <Link href={`/film/${film.slug}`}>
            <h3 className="text-xl md:text-2xl font-display font-bold text-text-primary hover:text-primary transition-colors mb-2">
              {film.title}
            </h3>
          </Link>

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-2 md:gap-3 text-sm text-text-secondary mb-3">
            <span className="font-semibold text-text-primary">{film.year}</span>
            <span className="w-1 h-1 bg-gray-300 rounded-full" />
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {formatDuration(film.duration)}
            </span>
            <span className="w-1 h-1 bg-gray-300 rounded-full" />
            <span className="px-2 py-0.5 bg-primary text-white text-xs font-bold rounded">
              {film.rating}
            </span>
            <span className="w-1 h-1 bg-gray-300 rounded-full hidden sm:block" />
            <span className="hidden sm:inline">{film.genre}</span>
            {film.is_4k && (
              <span className="px-2 py-0.5 bg-blue-500 text-white text-xs font-bold rounded">4K</span>
            )}
          </div>

          {/* Synopsis */}
          <p className="text-text-secondary text-sm line-clamp-2 mb-3">
            {film.synopsis}
          </p>

          {/* Language Info */}
          {film.language && (
            <p className="text-xs text-text-muted mb-4">
              In {film.language}
              {film.subtitles && ` with ${film.subtitles} subtitles`}
            </p>
          )}

          {/* Screenings */}
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            {screenings.slice(0, 5).map((screening) => (
              <Link
                key={screening.id}
                href={`/book/${screening.id}`}
                className="group/btn inline-flex flex-col items-center px-4 py-2.5 bg-cream hover:bg-primary rounded-xl transition-all duration-200 border border-gray-200 hover:border-primary hover:shadow-md"
              >
                <span className="text-sm font-bold text-text-primary group-hover/btn:text-white transition-colors">
                  {formatTime(screening.start_time)}
                </span>
                <span className="text-xs text-text-muted group-hover/btn:text-white/80 transition-colors">
                  {screening.hall?.name || 'Main'}
                </span>
                {screening.hall?.is_4k && (
                  <span className="mt-1 px-1.5 py-0.5 bg-blue-500 text-white text-[10px] font-bold rounded">
                    4K
                  </span>
                )}
              </Link>
            ))}
            
            {screenings.length > 5 && (
              <Link
                href={`/film/${film.slug}`}
                className="text-sm text-primary hover:text-primary-dark font-medium"
              >
                +{screenings.length - 5} more
              </Link>
            )}
            
            {/* Trailer Button */}
            {film.trailer_url && (
              <a
                href={film.trailer_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-text-secondary hover:text-primary transition-colors"
              >
                <Play className="w-4 h-4" />
                <span className="text-sm font-medium">Trailer</span>
              </a>
            )}

            {/* More Dates Link */}
            <Link
              href={`/film/${film.slug}`}
              className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary-dark font-medium ml-auto"
            >
              All dates
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
