import { Suspense } from 'react';
import { format } from 'date-fns';
import type { Film, FilmWithScreenings } from '@/types';
import HomeClient from './HomeClient';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://backend-production-113d.up.railway.app/api';

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    next: { revalidate: 30 },
  });
  if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`);
  return (await res.json()) as T;
}

export default async function HomePage() {
  const initialDateStr = format(new Date(), 'yyyy-MM-dd');

  const [initialFeaturedFilms, initialFilmScreenings] = await Promise.all([
    fetchJson<Film[]>('/films/featured').catch(() => []),
    fetchJson<FilmWithScreenings[]>(`/screenings/date/${initialDateStr}`).catch(() => []),
  ]);

  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: 'var(--background)' }} />}>
      <HomeClient
        initialDateStr={initialDateStr}
        initialFeaturedFilms={initialFeaturedFilms}
        initialFilmScreenings={initialFilmScreenings}
      />
    </Suspense>
  );
}