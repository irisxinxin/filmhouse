import { Suspense } from 'react';
import type { Film } from '@/types';
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
  const initialFeaturedFilms = await fetchJson<Film[]>('/films/featured').catch(() => []);

  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: '#DED4CC' }} />}>
      <HomeClient initialFeaturedFilms={initialFeaturedFilms} />
    </Suspense>
  );
}
