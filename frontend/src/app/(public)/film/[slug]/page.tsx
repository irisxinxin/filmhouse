'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { filmsApi } from '@/lib/api';
import Image from 'next/image';
import Link from 'next/link';
import { Clock, Calendar, Award, Play, ChevronLeft, MapPin, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { format, addDays, isToday } from 'date-fns';
import type { Film, Screening } from '@/types';

export default function FilmDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const { data: film, isLoading: filmLoading } = useQuery({
    queryKey: ['film', slug],
    queryFn: async () => {
      const res = await filmsApi.get(slug);
      return res.data as Film;
    },
  });

  const { data: screenings, isLoading: screeningsLoading } = useQuery({
    queryKey: ['film-screenings', film?.id, selectedDate],
    queryFn: async () => {
      if (!film?.id) return [];
      const res = await filmsApi.getScreenings(film.id, selectedDate);
      return res.data as Screening[];
    },
    enabled: !!film?.id,
  });

  // Generate next 14 days
  const dates = Array.from({ length: 14 }, (_, i) => {
    const date = addDays(new Date(), i);
    return date.toISOString().split('T')[0];
  });

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (filmLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#DED4CC' }}>
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  if (!film) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#DED4CC' }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-text-primary mb-2">Film Not Found</h1>
          <p className="text-text-secondary mb-4">The film you&apos;re looking for doesn&apos;t exist.</p>
          <Link href="/" className="text-primary hover:underline font-medium">
            ← Back to Films
          </Link>
        </div>
      </div>
    );
  }

  const posterUrl = film.poster_url || '/images/placeholder-poster.jpg';
  const bannerUrl = film.banner_url || null;

  return (
    <div className="min-h-screen" style={{ background: '#DED4CC' }}>
      {/* Hero Section with Banner */}
      <div className="relative">
        {/* Background Banner */}
        <div className="absolute inset-0 h-[450px] md:h-[500px] overflow-hidden">
          {bannerUrl ? (
            <Image
              src={bannerUrl}
              alt={film.title}
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/30 to-[#DED4CC]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#DED4CC] via-[#DED4CC]/90 to-[#DED4CC]/30" />
        </div>

        {/* Content */}
        <div className="relative max-w-[1335px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12">
          <Link 
            href="/" 
            className="inline-flex items-center text-text-secondary hover:text-primary mb-6 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            Back to Films
          </Link>

          <div className="flex flex-col md:flex-row gap-6 md:gap-8">
            {/* Poster */}
            <div className="flex-shrink-0 mx-auto md:mx-0">
              <div className="relative w-56 md:w-64 aspect-[2/3] overflow-hidden shadow-2xl">
                <Image
                  src={posterUrl}
                  alt={film.title}
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            </div>

            {/* Film Info */}
            <div className="flex-1 text-center md:text-left">
              {/* Awards Badge */}
              {film.awards && (
                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 text-sm mb-4">
                  <Award className="w-4 h-4" />
                  <span className="font-medium">{film.awards.split('.')[0].split(',')[0]}</span>
                </div>
              )}

              <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-text-primary mb-4">
                {film.title}
              </h1>

              {/* Meta Info */}
              <div className="flex flex-wrap justify-center md:justify-start items-center gap-3 text-text-secondary mb-6">
                <span className="font-semibold text-text-primary">{film.year}</span>
                <span className="w-1 h-1 bg-gray-400 rounded-full" />
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {Math.floor(film.duration / 60)}h {film.duration % 60}min
                </span>
                <span className="w-1 h-1 bg-gray-400 rounded-full" />
                <span className="px-2.5 py-1 bg-primary text-white text-sm font-bold">
                  {film.rating}
                </span>
                <span className="w-1 h-1 bg-gray-400 rounded-full" />
                <span>{film.genre}</span>
                {film.is_4k && (
                  <>
                    <span className="w-1 h-1 bg-gray-400 rounded-full" />
                    <span className="px-2.5 py-1 bg-blue-500 text-white text-xs font-bold">4K</span>
                  </>
                )}
              </div>

              {/* Synopsis */}
              <p className="text-text-secondary text-lg leading-relaxed mb-6 max-w-2xl">
                {film.synopsis}
              </p>

              {/* Language & Subtitles */}
              {(film.language || film.subtitles) && (
                <p className="text-text-muted mb-4">
                  <span className="font-medium text-text-secondary">In {film.language}</span>
                  {film.subtitles && <span> with {film.subtitles} subtitles</span>}
                </p>
              )}

              {/* Director & Cast */}
              {(film.director || film.cast) && (
                <div className="text-text-secondary mb-6 space-y-1">
                  {film.director && (
                    <p><span className="font-medium text-text-primary">Director:</span> {film.director}</p>
                  )}
                  {film.cast && (
                    <p><span className="font-medium text-text-primary">Cast:</span> {film.cast}</p>
                  )}
                </div>
              )}

              {/* Awards Full */}
              {film.awards && (
                <div className="bg-white/80 backdrop-blur-sm p-4 mb-6 max-w-2xl">
                  <p className="text-sm text-text-secondary italic">{film.awards}</p>
                </div>
              )}

              {/* Trailer Button */}
              {film.trailer_url && (
                <a
                  href={film.trailer_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-white border-2 border-primary text-primary px-6 py-3 font-semibold hover:bg-primary hover:text-white transition-all"
                >
                  <Play className="w-5 h-5" />
                  Watch Trailer
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Screenings Section */}
      <div className="max-w-[1335px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl font-display font-bold text-text-primary mb-6">
          Book Tickets
        </h2>

        {/* Date Selector */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          {dates.map((date) => {
            const dateObj = new Date(date);
            const isSelected = date === selectedDate;
            const isTodayDate = isToday(dateObj);
            return (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                className={`flex flex-col items-center px-4 py-3 min-w-[72px] transition-all duration-200 ${
                  isSelected
                    ? 'bg-primary text-white shadow-lg shadow-primary/25 scale-105'
                    : 'bg-white text-text-secondary hover:bg-gray-50 border border-gray-200'
                }`}
              >
                <span className={`text-xs font-semibold uppercase ${
                  isSelected ? 'text-white/90' : isTodayDate ? 'text-primary' : ''
                }`}>
                  {isTodayDate ? 'Today' : format(dateObj, 'EEE')}
                </span>
                <span className="text-xl font-bold mt-0.5">{format(dateObj, 'd')}</span>
                <span className={`text-xs ${isSelected ? 'text-white/80' : 'text-text-muted'}`}>
                  {format(dateObj, 'MMM')}
                </span>
              </button>
            );
          })}
        </div>

        {/* Screenings Grid */}
        {screeningsLoading ? (
          <div className="bg-white/80 p-8 text-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
          </div>
        ) : screenings && screenings.length > 0 ? (
          <div className="bg-white/80 p-6 shadow-sm">
            <div className="flex flex-wrap gap-3">
              {screenings.map((screening) => (
                <Link
                  key={screening.id}
                  href={`/book/${screening.id}`}
                  className="group flex flex-col items-center px-6 py-4 bg-[#DED4CC] hover:bg-primary transition-all duration-200 border border-primary/20 hover:border-primary hover:shadow-lg"
                >
                  <span className="text-lg font-bold text-text-primary group-hover:text-white transition-colors">
                    {formatTime(screening.start_time)}
                  </span>
                  <span className="text-sm text-text-muted group-hover:text-white/80 transition-colors flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {screening.hall?.name || 'Main Hall'}
                  </span>
                  {screening.hall?.is_4k && (
                    <span className="mt-1.5 px-2 py-0.5 bg-blue-500 text-white text-xs font-bold">
                      4K
                    </span>
                  )}
                  <span className="mt-2 text-sm font-semibold text-primary group-hover:text-white transition-colors">
                    ${screening.price?.toFixed(2) || '15.00'}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white/80 p-8 text-center">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">No screenings available</h3>
            <p className="text-text-muted">Try selecting another date above.</p>
          </div>
        )}
      </div>
    </div>
  );
}
