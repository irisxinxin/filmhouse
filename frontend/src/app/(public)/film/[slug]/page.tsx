'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { filmsApi, programsApi } from '@/lib/api';
import Image from 'next/image';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { Film, Screening, Program } from '@/types';

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

  // Fetch ALL upcoming screenings for this film (single request, no date filter)
  const { data: allScreenings } = useQuery({
    queryKey: ['film-all-screenings', film?.id],
    queryFn: async () => {
      if (!film?.id) return [];
      const res = await filmsApi.getScreenings(film.id);
      return (res.data || []) as Screening[];
    },
    enabled: !!film?.id,
  });

  // Fetch programs this film belongs to
  const { data: filmPrograms } = useQuery({
    queryKey: ['film-programs', film?.id],
    queryFn: async () => {
      if (!film?.id) return [];
      const res = await filmsApi.getPrograms(film.id);
      return (res.data || []) as Program[];
    },
    enabled: !!film?.id,
  });

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true,
    }).toLowerCase();

  const screeningsByDate = (allScreenings || []).reduce<Record<string, Screening[]>>((acc, s) => {
    const date = s.start_time.split('T')[0];
    if (!acc[date]) acc[date] = [];
    acc[date].push(s);
    return acc;
  }, {});
  const sortedDates = Object.keys(screeningsByDate).sort();

  const getYoutubeId = (url: string) => {
    const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=))([^&?]+)/);
    return m ? m[1] : null;
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

        {/* Three-column layout: poster | info | screenings */}
        <div className="fh-detail-layout">
          {/* Left: Poster */}
          <div className="fh-detail-poster">
            <div className="relative w-full aspect-[2/3] overflow-hidden">
              <Image src={posterUrl} alt={film.title} fill className="object-cover" priority quality={75} sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 300px" />
            </div>
            {film.trailer_url && (
              <a href={film.trailer_url} target="_blank" rel="noopener noreferrer"
                className="fh-pill-solid w-full mt-4 justify-center py-3 text-center">
                ▶ TRAILER
              </a>
            )}

            {/* Programs - "Featured As Part Of" */}
            {filmPrograms && filmPrograms.length > 0 && (
              <div className="mt-6">
                <p className="text-sm font-semibold tracking-wide text-[#5a4a3a] mb-3" style={{ letterSpacing: '0.05em' }}>
                  Featured As Part Of
                </p>
                <div className="flex flex-col gap-2">
                  {filmPrograms.map((program) => (
                    <Link
                      key={program.id}
                      href={`/?program=${program.slug}`}
                      className="block w-full text-center py-2.5 px-4 border-2 text-sm font-semibold tracking-wide transition-colors"
                      style={{
                        borderColor: '#8B2332',
                        color: '#8B2332',
                        background: 'transparent',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#8B2332';
                        e.currentTarget.style.color = '#fff';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#8B2332';
                      }}
                    >
                      {program.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Middle: Film info */}
          <div className="fh-detail-info">
            <h2 className="fh-card-title text-[28px] md:text-[32px] mb-1">{film.title}</h2>

            <ul className="fh-detail-meta">
              <li>{film.year}</li>
              <li>{film.duration}mins</li>
              <li>({film.rating})</li>
              {film.genre && <li>{film.genre}</li>}
            </ul>

            {(film.director || film.cast) && (
              <div className="fh-detail-credits">
                {film.director && <span>Directed by {film.director}</span>}
                {film.cast && <span>Starring {film.cast}</span>}
              </div>
            )}

            {film.synopsis && (
              <div className="fh-detail-synopsis">
                <p>{film.synopsis}</p>
              </div>
            )}

            {(film.language || film.subtitles) && (
              <p className="fh-detail-language">
                In {film.language}{film.subtitles ? ` with ${film.subtitles} subtitles` : ''}
              </p>
            )}

            {film.awards && (
              <div className="fh-detail-awards">
                <p>{film.awards}</p>
              </div>
            )}

            {youtubeId && (
              <div className="mt-8">
                <iframe width="100%" height="350"
                  src={`https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1`}
                  frameBorder="0" allowFullScreen className="w-full" />
              </div>
            )}
          </div>

          {/* Right: Screenings by date */}
          <div id="screenings" className="fh-detail-screenings">
            {sortedDates.length > 0 ? (
              sortedDates.map((date) => (
                <div key={date} className="fh-detail-daterow">
                  <div className="fh-detail-dateheading">
                    {format(parseISO(date), 'EEEE do MMMM')}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {screeningsByDate[date].map((screening) => (
                      <Link key={screening.id} href={`/book/${screening.id}`} className="fh-pill-solid">
                        {formatTime(screening.start_time)}
                      </Link>
                    ))}
                    {screeningsByDate[date].some((s) => s.hall?.is_4k) && (
                      <span className="fh-badge-4k">4K</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-text-secondary text-sm">No upcoming screenings</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
