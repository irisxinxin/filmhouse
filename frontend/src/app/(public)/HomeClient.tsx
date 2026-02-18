'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { filmsApi, programsApi } from '@/lib/api';
import { HeroCarousel } from '@/components/home/HeroCarousel';
import type { Film, Screening, Program } from '@/types';
import { Mail, X } from 'lucide-react';
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
  initialFeaturedFilms,
}: {
  initialDateStr?: string;
  initialFeaturedFilms: Film[];
  initialFilmScreenings?: unknown;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const programSlug = searchParams.get('program');

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

      {/* NOW SHOWING header */}
      <div className="sticky top-[88px] z-40 fh-surface backdrop-blur-sm fh-rule">
        <div className="max-w-[1335px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="fh-datebar">
            <div className="fh-datebar-left">
              <span className="fh-datelabel">NOW SHOWING</span>
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
      <section className="max-w-[1335px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="fh-film-card animate-pulse">
                <div className="flex h-[240px]">
                  <div className="w-[280px] bg-white/30 shrink-0" />
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
            {films.map((film, idx) => (
              <FilmCard key={film.id} film={film} priority={idx < 4} />
            ))}
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

function FilmCard({ film, priority }: { film: Film; priority?: boolean }) {
  const posterUrl = film.poster_url || null;

  // Fetch upcoming screenings for this film
  const { data: screenings } = useQuery({
    queryKey: ['film-screenings-home', film.id],
    queryFn: async () => {
      const res = await filmsApi.getScreenings(film.id);
      return (res.data || []) as Screening[];
    },
    staleTime: 60_000,
  });

  const upcomingScreenings = (screenings || []).slice(0, 6);

  // Group screenings by date
  const screeningsByDate = upcomingScreenings.reduce((acc, s) => {
    const dateKey = new Date(s.start_time).toDateString();
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(s);
    return acc;
  }, {} as Record<string, Screening[]>);

  return (
    <article className="fh-film-card">
      <div className="flex h-[340px]">
        <Link href={`/film/${film.slug}`}
          className="group relative w-[220px] sm:w-[280px] shrink-0 overflow-hidden bg-white/30">
          {posterUrl ? (
            <Image src={posterUrl} alt={film.title} fill className="object-cover" sizes="280px" priority={!!priority} />
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

          {/* Next screening date */}
          {Object.keys(screeningsByDate).length > 0 && (() => {
            const [dateKey, dateSessions] = Object.entries(screeningsByDate)[0];
            return (
              <div className="mt-auto pt-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    {formatShortDate(dateSessions[0].start_time)}
                  </span>
                  {dateSessions.map((s) => (
                    <Link key={s.id} href={`/book/${s.id}`} className="fh-pill-solid">
                      {formatTime(s.start_time)}
                    </Link>
                  ))}
                  {film.is_4k && <span className="fh-badge-4k">4K</span>}
                </div>
              </div>
            );
          })()}

          <div className="fh-card-dates pt-3 transition-all duration-300">
            <Link href={`/film/${film.slug}`} className="fh-btn-outline-red">
              Book tickets
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
