'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import type { Film } from '@/types';
import { Star, StarOff, Upload, Save, GripVertical } from 'lucide-react';
import Image from 'next/image';

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data: films, isLoading } = useQuery({
    queryKey: ['admin', 'films'],
    queryFn: async () => {
      const res = await adminApi.listFilms();
      return res.data as Film[];
    },
  });

  const updateFilmMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Film> }) => {
      return adminApi.updateFilm(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'films'] });
      queryClient.invalidateQueries({ queryKey: ['films', 'featured'] });
    },
  });

  const toggleFeatured = async (film: Film) => {
    await updateFilmMutation.mutateAsync({
      id: film.id,
      data: { is_featured: !film.is_featured },
    });
  };

  const featuredFilms = films?.filter(f => f.is_featured) || [];
  const nonFeaturedFilms = films?.filter(f => !f.is_featured) || [];

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Site Settings</h1>
        <p className="text-gray-400 mt-1">Configure homepage banner and featured films</p>
      </div>

      {/* Featured Films Section */}
      <section className="bg-dark-card rounded-xl border border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700 bg-gray-800/50">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Star className="w-5 h-5 text-accent" />
            Featured Films (Hero Carousel)
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            These films will appear in the homepage hero carousel. Drag to reorder.
          </p>
        </div>

        <div className="p-6">
          {featuredFilms.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Star className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No featured films yet.</p>
              <p className="text-sm">Click the star icon on a film below to feature it.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {featuredFilms.map((film, index) => (
                <div
                  key={film.id}
                  className="flex items-center gap-4 p-3 bg-gray-800 rounded-lg border border-gray-700"
                >
                  <GripVertical className="w-5 h-5 text-gray-500 cursor-grab" />
                  <span className="w-6 h-6 flex items-center justify-center bg-primary text-white text-sm font-bold rounded">
                    {index + 1}
                  </span>
                  <div className="relative w-16 h-24 flex-shrink-0 rounded overflow-hidden">
                    {film.poster_url ? (
                      <Image src={film.poster_url} alt={film.title} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-700 flex items-center justify-center text-2xl">🎬</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-white truncate">{film.title}</h3>
                    <p className="text-sm text-gray-400">{film.year} • {film.genre}</p>
                    {film.banner_url ? (
                      <span className="inline-flex items-center text-xs text-green-400 mt-1">
                        ✓ Has banner image
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-xs text-amber-400 mt-1">
                        ⚠ No banner image (will use poster)
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => toggleFeatured(film)}
                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                    title="Remove from featured"
                  >
                    <Star className="w-5 h-5 text-accent fill-accent" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* All Films Section */}
      <section className="bg-dark-card rounded-xl border border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">All Films</h2>
          <p className="text-sm text-gray-400 mt-1">
            Click the star to add a film to the featured carousel
          </p>
        </div>

        <div className="divide-y divide-gray-700">
          {nonFeaturedFilms.map((film) => (
            <div
              key={film.id}
              className="flex items-center gap-4 p-4 hover:bg-gray-800/50 transition-colors"
            >
              <div className="relative w-12 h-18 flex-shrink-0 rounded overflow-hidden">
                {film.poster_url ? (
                  <Image src={film.poster_url} alt={film.title} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-700 flex items-center justify-center text-xl">🎬</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-white truncate">{film.title}</h3>
                <p className="text-sm text-gray-400">{film.year} • {film.genre}</p>
              </div>
              <button
                onClick={() => toggleFeatured(film)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                title="Add to featured"
              >
                <StarOff className="w-5 h-5 text-gray-500 hover:text-accent" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Banner Upload Section */}
      <section className="bg-dark-card rounded-xl border border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Banner Images
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Upload wide banner images for featured films (recommended: 1920x1080)
          </p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {featuredFilms.map((film) => (
              <div key={film.id} className="border border-gray-700 rounded-lg overflow-hidden">
                <div className="aspect-video bg-gray-800 relative">
                  {film.banner_url ? (
                    <Image src={film.banner_url} alt={film.title} fill className="object-cover" />
                  ) : film.poster_url ? (
                    <Image src={film.poster_url} alt={film.title} fill className="object-cover blur-sm opacity-50" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                      No banner
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-3 left-3 text-white">
                    <p className="font-semibold">{film.title}</p>
                  </div>
                </div>
                <div className="p-3 bg-gray-800">
                  <label className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors">
                    <Upload className="w-4 h-4" />
                    <span className="text-sm">Upload Banner</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const formData = new FormData();
                        formData.append('banner', file);
                        try {
                          await adminApi.uploadBanner(film.id, formData);
                          queryClient.invalidateQueries({ queryKey: ['admin', 'films'] });
                        } catch {
                          alert('Failed to upload banner');
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
          
          {featuredFilms.length === 0 && (
            <p className="text-center text-gray-500 py-8">
              Feature some films first to upload banners
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
