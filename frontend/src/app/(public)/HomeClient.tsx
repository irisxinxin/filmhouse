'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { format, add, sub } from 'date-fns';
import { screeningsApi, filmsApi, programsApi } from '@/lib/api';
import { HeroCarousel } from '@/components/home/HeroCarousel';
import type { FilmWithScreenings, Film, Screening, Program } from '@/types';
import { Calendar, Mail, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function HomeClient({
  initialDateStr,
  initialFeaturedFilms,
  initialFilmScreenings,
}: {
  initialDateStr: string;
  initialFeaturedFilms: Film[];
  initialFilmScreenings: FilmWithScreenings[];
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const programSlug = searchParams.get('program');

  const [selectedDate, setSelectedDate] = useState(() => new Date(initialDateStr + 'T00:00:00'));
  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  const goPrevDay = () => setSelectedDate((d) => sub(d, { days: 1 }));
  const goNextDay = () => setSelectedDate((d) => add(d, { days: 1 }));

  const handlePickDate = (value: string) => {
    if (!value) return;
    setSelectedDate(new Date(value + 'T00:00:00'));
  };

  const clearProgram = () => {
    router.push('/', { scroll: false });
  };

  const { data: featuredFilms } = useQuery({
    queryKey: ['films', 'featured'],
    queryFn: async () => {
      const res = await filmsApi.getFeatured();
      return res.data as Film[];
    },
    initialData: initialFeaturedFilms,
    staleTime: 60_000,
  });

  // Fetch the selected program details
  const { data: selectedProgram } = useQuery({
    queryKey: ['program', programSlug],
    queryFn: async () => {
      if (!programSlug) return null;
      const res = await programsApi.get(programSlug);
      return res.data as Program;
    },
    enabled: !!programSlug,
    staleTime: 60_000,
  });

  // Fetch all screenings for the date
  const { data: allScreenings, isLoading } = useQuery({
    queryKey: ['screenings', dateStr],
    queryFn: async () => {
      const res = await screeningsApi.getByDate(dateStr);
      return res.data as FilmWithScreenings[];
    },
    initialData: dateStr === initialDateStr && !programSlug ? initialFilmScreenings : undefined,
    staleTime: 30_000,
  });

  // Filter screenings by program if a program is selected
  const filmScreenings = useFilteredScreenings(allScreenings, selectedProgram, programSlug);

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      {/* Hero Carousel */}
      <HeroCarousel films={featuredFilms || []} />

      {/* Program Filter Banner */}
      {programSlug && selectedProgram && (
        <div className="bg-primary/10 border-b border-primary/20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2">
                <span className="text-xs tracking-widest uppercase font-bold text-primary/60">Program:</span>
                <span className="text-sm font-display font-bold italic text-primary">{selectedProgram.name}</span>
              </div>
              <button
                onClick={clearProgram}
                className="inline-flex items-center gap-1.5 text-xs tracking-wide uppercase font-semibold text-primary/70 hover:text-primary transition-colors"
              >
                Show All Films
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Date Selector - Sticky */}
      <div className="sticky top-[72px] z-40 fh-surface backdrop-blur-sm fh-rule">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="fh-datebar">
            <div className="fh-datebar-left">
              <button type="button" className="fh-datebtn" aria-label="Previous day" onClick={goPrevDay}>
                ◀
              </button>
              <div className="min-w-0">
                <span className="fh-datelabel">SHOWING </span>
                <span className="fh-datevalue">{format(selectedDate, 'EEEE do MMMM').toUpperCase()}</span>
              </div>
              <button type="button" className="fh-datebtn" aria-label="Next day" onClick={goNextDay}>
                ▶
              </button>
              <div className="relative">
                <button type="button" className="fh-datebtn" aria-label="Pick a date">
                  <Calendar className="w-4 h-4" />
                </button>
                <input
                  aria-label="Pick a date"
                  type="date"
                  className="fh-dateinput"
                  value={dateStr}
                  onChange={(e) => handlePickDate(e.target.value)}
                />
              </div>
            </div>

            <div className="fh-datebar-right hidden sm:flex">
              <Link href="/mailing-list" className="fh-mailing-link">
                <span>JOIN OUR MAILING LIST</span>
                <Mail className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Films Grid */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="fh-film-card animate-pulse">
                <div className="flex h-[240px]">
                  <div className="w-[200px] bg-white/30 shrink-0" />
                  <div className="flex-1 p-4 space-y-3">
                    <div className="h-5 bg-white/30 rounded w-2/3" />
                    <div className="h-3 bg-white/30 rounded w-1/2" />
                    <div className="h-12 bg-white/30 rounded" />
                    <div className="flex gap-2 mt-auto">
                      <div className="h-7 w-16 bg-white/30 rounded" />
                      <div className="h-7 w-16 bg-white/30 rounded" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filmScreenings && filmScreenings.length > 0 ? (
          <div className="fh-film-grid">
            {filmScreenings.map(({ film, screenings }, idx) => (
              <FilmCard key={film.id} film={film} screenings={screenings} priority={idx < 4} />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center">
            <Calendar className="w-12 h-12 text-primary/30 mx-auto mb-4" />
            <h3 className="text-lg font-display font-semibold text-text-primary mb-2">No screenings available</h3>
            <p className="text-sm text-text-secondary">
              {programSlug ? 'No screenings for this program on this date.' : 'Try selecting a different date above.'}
            </p>
            {programSlug && (
              <button onClick={clearProgram} className="mt-4 fh-btn-outline">
                Show All Films
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

/** Filter screenings by program films */
function useFilteredScreenings(
  allScreenings: FilmWithScreenings[] | undefined,
  selectedProgram: Program | null | undefined,
  programSlug: string | null,
): FilmWithScreenings[] | undefined {
  if (!allScreenings) return undefined;
  if (!programSlug || !selectedProgram?.films) return allScreenings;

  const programFilmIds = new Set(selectedProgram.films.map((f) => f.id));
  return allScreenings.filter(({ film }) => programFilmIds.has(film.id));
}

function FilmCard({
  film,
  screenings,
  priority,
}: {
  film: Film;
  screenings: Screening[];
  priority?: boolean;
}) {
  const posterUrl = film.poster_url || null;

  return (
    <article className="fh-film-card flex flex-col">
      <div className="flex flex-1">
        {/* Poster — fills full card height */}
        <Link
          href={`/film/${film.slug}`}
          className="relative w-[160px] sm:w-[200px] shrink-0 overflow-hidden bg-white/30"
        >
          {posterUrl ? (
            <Image
              src={posterUrl}
              alt={film.title}
              fill
              className="object-cover"
              sizes="170px"
              priority={!!priority}
            />
          ) : (
            <div className="w-full h-full bg-white/20" />
          )}
        </Link>

        {/* Content */}
        <div className="min-w-0 flex-1 p-3 sm:p-4 flex flex-col">
          <Link href={`/film/${film.slug}`}>
            <h3 className="text-base sm:text-[17px] font-display font-bold text-primary leading-tight hover:text-primary-dark transition-colors">
              {film.title}
            </h3>
          </Link>

          <div className="mt-1.5 text-[13px] text-text-secondary leading-relaxed">
            <span className="font-bold text-primary">{film.year}</span>
            <span className="mx-1.5">|</span>
            <span>{film.duration}mins</span>
            <span className="mx-1.5">|</span>
            <span>({film.rating})</span>
            {film.genre ? (
              <>
                <span className="mx-1.5">|</span>
                <span>{film.genre}</span>
              </>
            ) : null}
          </div>

          {film.synopsis ? (
            <p className="mt-2 text-[13px] text-text-primary/80 leading-relaxed line-clamp-3">
              {film.synopsis}
            </p>
          ) : null}

          {/* Showtimes */}
          <div className="mt-auto pt-3 flex flex-wrap items-center gap-1.5">
            {screenings.slice(0, 3).map((screening) => (
              <Link key={screening.id} href={`/book/${screening.id}`} className="fh-pill-solid">
                {formatTime(screening.start_time)}
              </Link>
            ))}

            {film.is_4k && (
              <span className="fh-badge-4k">4K</span>
            )}
          </div>
        </div>
      </div>

      {/* Other dates — bottom of card, after content area */}
      <div className="border-t border-[rgba(139,35,50,0.15)] ml-[160px] sm:ml-[200px] px-3 sm:px-4 py-2">
        <Link
          href={`/film/${film.slug}`}
          className="fh-btn-outline-red"
        >
          Other dates
        </Link>
      </div>
    </article>
  );
}
