'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { filmsApi, programsApi, screeningsApi } from '@/lib/api';
import { HeroCarousel } from '@/components/home/HeroCarousel';
import { DateSelector } from '@/components/ui/DatePicker';
import type { Film, Screening, Program } from '@/types';
import { Mail, X, CalendarDays } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { isSameDay, format } from 'date-fns';

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function HomeClient({
  initialFeaturedFilms,
}: {
  initialDateStr?: string;
  initialFeaturedFilms: Film[];
  initialFilmScreenings?: unknown;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const programSlug = searchParams.get('program');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const clearProgram = () => router.push('/', { scroll: false });

  const { data: featuredFilms } = useQuery({
    queryKey: ['films', 'featured'],
    queryFn: async () => {
      const res = await filmsApi.getFeatured();
      return res.data as Film[];
    },
    initialData: initialFeaturedFilms,
    staleTime: 60_000,
  });

  // Fetch ALL films
  const { data: allFilms, isLoading } = useQuery({
    queryKey: ['films', 'all'],
    queryFn: async () => {
      const res = await filmsApi.list();
      return res.data as Film[];
    },
    staleTime: 60_000,
  });

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

  const selectedDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null;

  const { data: homeScreenings } = useQuery({
    queryKey: ['screenings', 'home'],
    queryFn: async () => {
      const res = await screeningsApi.getHome({ days: 30, limit: 3 });
      return (res.data || {}) as Record<string, Screening[]>;
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const { data: dateScreenings } = useQuery({
    queryKey: ['screenings', 'date', selectedDateStr],
    queryFn: async () => {
      if (!selectedDateStr) return {} as Record<number, Screening[]>;
      const res = await screeningsApi.getByDate(selectedDateStr);
      const items = (res.data || []) as { film: Film; screenings: Screening[] }[];
      const map: Record<number, Screening[]> = {};
      items.forEach((item) => {
        map[item.film.id] = item.screenings;
      });
      return map;
    },
    enabled: !!selectedDateStr,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  // Filter by program if selected
  const films = (() => {
    if (!allFilms) return undefined;
    if (!programSlug || !selectedProgram?.films) return allFilms;
    const ids = new Set(selectedProgram.films.map((f) => f.id));
    return allFilms.filter((f) => ids.has(f.id));
  })();

  return (
    <div className="min-h-screen" style={{ background: '#DED4CC' }}>
      <HeroCarousel films={featuredFilms || []} />

      {/* Program Filter Banner */}
      {programSlug && selectedProgram && (
        <div className="bg-primary/10 border-b border-primary/20">
          <div className="max-w-[1335px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2">
                <span className="text-xs tracking-widest uppercase font-bold text-primary/60">Program:</span>
                <span className="text-sm font-display font-bold italic text-primary">{selectedProgram.name}</span>
              </div>
              <button onClick={clearProgram}
                className="inline-flex items-center gap-1.5 text-xs tracking-wide uppercase font-semibold text-primary/70 hover:text-primary transition-colors">
                Show All Films <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Browse mode header */}
      <div className="sticky top-[88px] z-40 fh-surface backdrop-blur-sm fh-rule">
        <div className="max-w-[1335px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="fh-datebar">
            <div className="fh-datebar-left flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => setSelectedDate(null)}
                className={`flex items-center gap-1.5 px-3 py-2 sm:px-5 sm:py-2.5 rounded-lg text-sm sm:text-base font-bold tracking-wide transition-all duration-200 ${
                  !selectedDate
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-transparent text-primary border border-primary/30 hover:bg-primary/10'
                }`}
              >
                Browse by Film
              </button>
              <button
                onClick={() => setSelectedDate(selectedDate || new Date())}
                className={`flex items-center gap-1.5 px-3 py-2 sm:px-5 sm:py-2.5 rounded-lg text-sm sm:text-base font-bold tracking-wide transition-all duration-200 ${
                  selectedDate
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-transparent text-primary border border-primary/30 hover:bg-primary/10'
                }`}
              >
                <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5" />
                Browse by Date
              </button>
            </div>
            <div className="fh-datebar-right hidden sm:flex items-center">
              <Link href="/mailing-list" className="fh-mailing-link">
                <span>JOIN OUR MAILING LIST</span>
                <Mail className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Date selector */}
      {selectedDate && (
        <div className="fh-surface border-b border-primary/10">
          <div className="max-w-[1335px] mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <DateSelector
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              days={21}
            />
          </div>
        </div>
      )}

      {/* Films Grid */}
      <section className="max-w-[1335px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="fh-film-card animate-pulse">
                <div className="flex min-h-[400px]">
                  <div className="w-[140px] sm:w-[260px] lg:w-[300px] bg-white/30 shrink-0" />
                  <div className="flex-1 p-4 space-y-3">
                    <div className="h-5 bg-white/30 rounded w-2/3" />
                    <div className="h-3 bg-white/30 rounded w-1/2" />
                    <div className="h-12 bg-white/30 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : films && films.length > 0 ? (
          <div className="fh-film-grid">
            {films.map((film, idx) => {
              const screenings = selectedDateStr
                ? dateScreenings?.[film.id] || []
                : homeScreenings?.[film.id] || [];
              return (
                <FilmCard
                  key={film.id}
                  film={film}
                  priority={idx < 2}
                  selectedDate={selectedDate}
                  screenings={screenings}
                  hasSelectedDate={!!selectedDateStr}
                />
              );
            })}
          </div>
        ) : (
          <div className="py-16 text-center">
            <h3 className="text-lg font-display font-semibold text-text-primary mb-2">No films available</h3>
            <p className="text-sm text-text-secondary">Check back soon for new screenings.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(now.getDate() + 1);

  if (d.toDateString() === now.toDateString()) return 'Today';
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
}

function FilmCard({
  film,
  priority,
  selectedDate,
  screenings,
  hasSelectedDate,
}: {
  film: Film;
  priority?: boolean;
  selectedDate?: Date | null;
  screenings: Screening[];
  hasSelectedDate: boolean;
}) {
  const posterUrl = film.poster_url || null;
  const upcomingScreenings = (screenings || []).slice(0, 20);

  // Group screenings by date
  const screeningsByDate = upcomingScreenings.reduce((acc, s) => {
    const dateKey = new Date(s.start_time).toDateString();
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(s);
    return acc;
  }, {} as Record<string, Screening[]>);

  // Get unique dates to display
  const screeningDates = Object.entries(screeningsByDate).map(([dateKey, sessions]) => ({
    dateKey,
    label: formatShortDate(sessions[0].start_time),
    count: sessions.length,
  }));

  // If a date is selected and this film has no screenings on that date, don't render
  if (selectedDate) {
    const hasScreeningOnDate = upcomingScreenings.some(s =>
      isSameDay(new Date(s.start_time), selectedDate)
    );
    if (!hasScreeningOnDate) return null;
  }

  return (
    <article className="fh-film-card h-full flex flex-col">
      <div className="flex flex-1">
        <Link href={`/film/${film.slug}`}
          className="group relative w-[120px] sm:w-[260px] lg:w-[300px] shrink-0 overflow-hidden bg-white/30">
          {posterUrl ? (
            <Image
              src={posterUrl}
              alt={film.title}
              fill
              className="object-cover"
              sizes="(max-width: 639px) 120px, (max-width: 1024px) 260px, 300px"
              priority={!!priority}
              loading={priority ? 'eager' : 'lazy'}
              fetchPriority={priority ? 'high' : 'low'}
              quality={60}
            />
          ) : (
            <div className="w-full h-full bg-white/20" />
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300" />
        </Link>

        <div className="fh-card-content min-w-0 flex-1 p-4 sm:p-5 overflow-hidden transition-all duration-300">
          <Link href={`/film/${film.slug}`}>
            <h3 className="fh-card-title">{film.title}</h3>
          </Link>

          <div className="fh-card-meta">
            <span>{film.year}</span>
            <span className="fh-meta-sep">|</span>
            <span>{film.duration}mins</span>
            <span className="fh-meta-sep">|</span>
            <span>({film.rating})</span>
            {film.genre && (<><span className="fh-meta-sep">|</span><span>{film.genre}</span></>)}
          </div>

          {film.synopsis && <p className="fh-card-synopsis">{film.synopsis}</p>}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="fh-card-bottom border-t border-primary/10 px-4 sm:px-5 py-3 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 sm:gap-3 transition-all duration-300">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {selectedDate ? (
            /* Date selected: show showtimes for that date */
            (() => {
              const dateKey = selectedDate.toDateString();
              const sessions = screeningsByDate[dateKey] || [];
              return (
                <>
                  <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    {formatShortDate(selectedDate.toISOString())}
                  </span>
                  {sessions.map((s) => (
                    <Link key={s.id} href={`/book/${s.id}`} className="fh-pill-solid text-[11px] sm:text-xs hover:opacity-80 transition-opacity">
                      {formatTime(s.start_time)}
                    </Link>
                  ))}
                </>
              );
            })()
          ) : (
            /* No date selected: show date pills */
            <>
              {screeningDates.slice(0, 3).map((d) => (
                <Link key={d.dateKey} href={`/film/${film.slug}`} className="fh-pill-solid text-[11px] sm:text-xs hover:opacity-80 transition-opacity">
                  {d.label}
                </Link>
              ))}
              {screeningDates.length > 3 && (
                <Link href={`/film/${film.slug}`} className="text-xs sm:text-sm font-bold text-primary hover:text-primary-dark transition-colors whitespace-nowrap">
                  +{screeningDates.length - 3} more
                </Link>
              )}
              {screeningDates.length === 0 && (
                <span className="text-xs text-text-secondary italic">
                  {hasSelectedDate ? 'Coming soon' : 'View showtimes'}
                </span>
              )}
            </>
          )}
        </div>
        <Link href={`/film/${film.slug}`} className="fh-btn-outline-red shrink-0 text-xs sm:text-sm">
          Book tickets
        </Link>
      </div>
    </article>
  );
}
