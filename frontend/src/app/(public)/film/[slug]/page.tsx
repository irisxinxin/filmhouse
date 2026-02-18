'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { filmsApi } from '@/lib/api';
import Image from 'next/image';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { Film, Screening } from '@/types';

export default function FilmDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const { data: film, isLoading: filmLoading } = useQuery({
    queryKey: ['film', slug],
    queryFn: async () => {
      const res = await filmsApi.get(slug);
      return res.data as Film;
    },
  });

  // Fetch ALL upcoming screenings for this film (no date filter)
  const { data: allScreenings } = useQuery({
    queryKey: ['film-all-screenings', film?.id],
    queryFn: async () => {
      if (!film?.id) return [];
      // Fetch screenings for next 14 days
      const results: Screening[] = [];
      for (let i = 0; i < 14; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        try {
          const res = await filmsApi.getScreenings(film.id, dateStr);
          if (res.data && Array.isArray(res.data)) {
            results.push(...res.data);
          }
        } catch { /* skip */ }
      }
      return results;
    },
    enabled: !!film?.id,
  });

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).toLowerCase();
  };

  // Group screenings by date
  const screeningsByDate = (allScreenings || []).reduce<Record<string, Screening[]>>((acc, s) => {
    const date = s.start_time.split('T')[0];
    if (!acc[date]) acc[date] = [];
    acc[date].push(s);
    return acc;
  }, {});

  const sortedDates = Object.keys(screeningsByDate).sort();

  // Extract YouTube video ID from URL
  const getYoutubeId = (url: string) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=))([^&?]+)/);
    return match ? match[1] : null;
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
          <Link href="/" className="text-primary hover:underline font-medium">← Back to Films</Link>
        </div>
      </div>
    );
  }

  const posterUrl = film.poster_url || '/images/placeholder-poster.jpg';
  const youtubeId = film.trailer_url ? getYoutubeId(film.trailer_url) : null;

  return (
    <div className="min-h-screen" style={{ background: '#DED4CC' }}>
      <div className="max-w-[1335px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back link */}
        <Link href="/" className="inline-flex items-center text-primary hover:underline mb-6 text-sm font-semibold">
          ← Back to Films
        </Link>

        <div className="flex flex-col md:flex-row gap-6 md:gap-10">
          {/* Left: Poster + Trailer button */}
          <div className="flex-shrink-0 mx-auto md:mx-0">
            <div className="relative w-[280px] md:w-[320px] aspect-[2/3] overflow-hidden">
              <Image
                src={posterUrl}
                alt={film.title}
                fill
                className="object-cover"
                priority
              />
            </div>
            {film.trailer_url && (
              <a
                href={film.trailer_url}
                target="_blank"
                rel="noopener noreferrer"
                className="fh-pill-solid w-full mt-4 justify-center py-3 text-center"
              >
                ▶ TRAILER
              </a>
            )}
          </div>

          {/* Right: Film info */}
          <div className="flex-1 min-w-0">
            {/* Title */}
            <h2 className="fh-card-title text-[32px] md:text-[38px] mb-2">{film.title}</h2>

            {/* Meta: year | duration | rating | genre */}
            <div className="fh-card-meta text-[18px] mb-1">
              <span>{film.year}</span>
              <span className="fh-meta-sep">|</span>
              <span>{film.duration}mins</span>
              <span className="fh-meta-sep">|</span>
              <span>({film.rating})</span>
              {film.genre && (
                <>
                  <span className="fh-meta-sep">|</span>
                  <span>{film.genre}</span>
                </>
              )}
            </div>

            {/* Director & Cast */}
            {(film.director || film.cast) && (
              <div className="mt-2 mb-4 text-[15px] text-text-primary/80 space-y-0.5">
                {film.director && <div>Directed by {film.director}</div>}
                {film.cast && <div>Starring {film.cast}</div>}
              </div>
            )}

            {/* Screenings grouped by date */}
            {sortedDates.length > 0 && (
              <div className="mt-4 mb-6">
                {sortedDates.map((date) => (
                  <div key={date} className="mb-3">
                    <div className="text-[16px] font-bold text-primary mb-1.5">
                      {format(parseISO(date), 'EEEE do MMMM')}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {screeningsByDate[date].map((screening) => (
                        <Link
                          key={screening.id}
                          href={`/book/${screening.id}`}
                          className="fh-pill-solid"
                        >
                          {formatTime(screening.start_time)}
                        </Link>
                      ))}
                      {screeningsByDate[date].some((s) => s.hall?.is_4k) && (
                        <span className="fh-badge-4k">4K</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Synopsis */}
            {film.synopsis && (
              <div className="mt-4 text-[16px] leading-relaxed text-text-primary/85 max-w-2xl">
                <p>{film.synopsis}</p>
              </div>
            )}

            {/* Language */}
            {(film.language || film.subtitles) && (
              <p className="mt-3 text-[15px] text-text-primary/70 italic">
                In {film.language}{film.subtitles ? ` with ${film.subtitles} subtitles` : ''}
              </p>
            )}

            {/* Awards */}
            {film.awards && (
              <div className="mt-4 text-[14px] text-text-primary/70 italic text-right max-w-2xl">
                <p>{film.awards}</p>
              </div>
            )}

            {/* YouTube embed */}
            {youtubeId && (
              <div className="mt-6 max-w-2xl">
                <iframe
                  width="100%"
                  height="350"
                  src={`https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1`}
                  frameBorder="0"
                  allowFullScreen
                  className="w-full"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
