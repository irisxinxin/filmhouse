'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { Film, Screening } from '@/types';
import { formatTime, formatDuration } from '@/lib/utils';
import { Play, Clock, Star } from 'lucide-react';

interface FilmCardProps {
  film: Film;
  screenings?: Screening[];
  showScreenings?: boolean;
}

export function FilmCard({ film, screenings = [], showScreenings = true }: FilmCardProps) {
  const posterUrl = film.poster_url?.startsWith('http') 
    ? film.poster_url 
    : film.poster_url || null;

  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group">
      <div className="flex">
        {/* Poster */}
        <Link 
          href={`/film/${film.slug}`} 
          className="relative w-36 sm:w-44 aspect-[2/3] flex-shrink-0 overflow-hidden"
        >
          {posterUrl ? (
            <Image
              src={posterUrl}
              alt={film.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 144px, 176px"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
              <span className="text-5xl">🎬</span>
            </div>
          )}
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white font-medium text-sm bg-primary/90 px-3 py-1.5 rounded-full">
              View Details
            </span>
          </div>
        </Link>

        {/* Content */}
        <div className="flex-1 p-4 sm:p-5 flex flex-col">
          {/* Awards badge */}
          {film.awards && (
            <div className="flex items-center gap-1.5 text-xs text-primary mb-2">
              <Star className="w-3.5 h-3.5 fill-primary" />
              <span className="font-medium line-clamp-1">{film.awards.split('.')[0]}</span>
            </div>
          )}

          <Link href={`/film/${film.slug}`}>
            <h3 className="text-lg font-bold text-gray-900 hover:text-primary transition-colors line-clamp-1">
              {film.title}
            </h3>
          </Link>

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-gray-500">
            <span className="font-medium text-gray-700">{film.year}</span>
            <span className="w-1 h-1 bg-gray-300 rounded-full" />
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatDuration(film.duration)}
            </span>
            <span className="w-1 h-1 bg-gray-300 rounded-full" />
            <span className="px-1.5 py-0.5 bg-primary text-white text-xs font-semibold rounded">
              {film.rating}
            </span>
          </div>

          {/* Genre & Language */}
          <div className="mt-1.5 text-sm text-gray-500">
            <span>{film.genre}</span>
            {film.language && (
              <span className="ml-2 text-gray-400">• {film.language}</span>
            )}
          </div>

          {/* Synopsis */}
          <p className="mt-2 text-sm text-gray-600 line-clamp-2 flex-grow">
            {film.synopsis}
          </p>

          {/* Screenings */}
          {showScreenings && screenings.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <div className="flex flex-wrap gap-2">
                {screenings.slice(0, 4).map((screening) => (
                  <Link
                    key={screening.id}
                    href={`/book/${screening.id}`}
                    className="inline-flex flex-col items-center px-4 py-2 bg-cream hover:bg-primary text-gray-700 hover:text-white rounded-lg transition-all duration-200 border border-gray-200 hover:border-primary group/btn"
                  >
                    <span className="text-sm font-bold">
                      {formatTime(screening.start_time)}
                    </span>
                    <span className="text-xs text-gray-500 group-hover/btn:text-white/80">
                      {screening.hall?.name || 'Main'}
                    </span>
                    {screening.hall?.is_4k && (
                      <span className="mt-0.5 px-1.5 py-0.5 bg-blue-500 text-white text-[10px] font-bold rounded">
                        4K
                      </span>
                    )}
                  </Link>
                ))}
                {screenings.length > 4 && (
                  <Link
                    href={`/film/${film.slug}`}
                    className="inline-flex items-center px-3 py-2 text-sm text-primary hover:text-primary-dark font-medium"
                  >
                    +{screenings.length - 4} more
                  </Link>
                )}
              </div>
            </div>
          )}

          {showScreenings && screenings.length === 0 && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <Link
                href={`/film/${film.slug}`}
                className="inline-flex items-center text-sm text-primary hover:text-primary-dark font-medium"
              >
                View other dates →
              </Link>
            </div>
          )}

          {/* Trailer */}
          {film.trailer_url && (
            <a
              href={film.trailer_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center mt-2 text-sm text-gray-500 hover:text-primary transition-colors"
            >
              <Play className="w-4 h-4 mr-1" />
              Watch Trailer
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
