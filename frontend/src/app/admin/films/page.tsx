'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import type { Film } from '@/types';
import { Plus, Edit, Trash2, X, Upload, Image as ImageIcon, Film as FilmIcon } from 'lucide-react';
import Image from 'next/image';

export default function AdminFilmsPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingFilm, setEditingFilm] = useState<Film | null>(null);
  const [uploadingPoster, setUploadingPoster] = useState<number | null>(null);
  const posterInputRef = useRef<HTMLInputElement>(null);

  const { data: films, isLoading, error } = useQuery({
    queryKey: ['admin-films'],
    queryFn: async () => {
      console.log('Fetching films...');
      const response = await adminApi.listFilms();
      console.log('Films response:', response);
      return response.data as Film[];
    },
  });

  console.log('Query state:', { films, isLoading, error });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Film>) => adminApi.createFilm(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-films'] });
      setShowModal(false);
      setEditingFilm(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Film> }) => adminApi.updateFilm(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-films'] });
      setShowModal(false);
      setEditingFilm(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminApi.deleteFilm(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-films'] }),
  });

  const handlePosterUpload = async (filmId: number, file: File) => {
    setUploadingPoster(filmId);
    try {
      const formData = new FormData();
      formData.append('poster', file);
      await adminApi.uploadPoster(filmId, formData);
      queryClient.invalidateQueries({ queryKey: ['admin-films'] });
    } catch (error) {
      console.error('Failed to upload poster:', error);
      alert('Failed to upload poster');
    } finally {
      setUploadingPoster(null);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: Partial<Film> = {
      title: formData.get('title') as string,
      year: parseInt(formData.get('year') as string),
      duration: parseInt(formData.get('duration') as string),
      rating: formData.get('rating') as string,
      genre: formData.get('genre') as string,
      synopsis: formData.get('synopsis') as string,
      director: formData.get('director') as string,
      cast: formData.get('cast') as string,
      language: formData.get('language') as string,
      subtitles: formData.get('subtitles') as string,
      poster_url: formData.get('poster_url') as string,
      banner_url: formData.get('banner_url') as string,
      trailer_url: formData.get('trailer_url') as string,
      awards: formData.get('awards') as string,
      is_4k: formData.get('is_4k') === 'on',
      is_featured: formData.get('is_featured') === 'on',
      is_active: formData.get('is_active') === 'on',
    };

    if (editingFilm) {
      updateMutation.mutate({ id: editingFilm.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Films</h1>
          <p className="text-gray-400 mt-1">Manage your film catalog</p>
        </div>
        <button
          onClick={() => { setEditingFilm(null); setShowModal(true); }}
          className="btn btn-primary flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Film
        </button>
      </div>

      {isLoading ? (
        <div className="text-gray-400">Loading...</div>
      ) : (
        <div className="grid gap-4">
          {films?.map((film) => (
            <div key={film.id} className="bg-dark-card rounded-xl border border-gray-700 p-4">
              <div className="flex gap-4">
                {/* Poster */}
                <div className="relative w-24 h-36 flex-shrink-0 rounded-lg overflow-hidden bg-gray-800 group">
                  {film.poster_url ? (
                    <Image src={film.poster_url.startsWith('http') ? film.poster_url : `http://localhost:8080${film.poster_url}`} alt={film.title} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                      <FilmIcon className="w-8 h-8" />
                    </div>
                  )}
                  {/* Upload overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <label className="cursor-pointer p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
                      {uploadingPoster === film.id ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Upload className="w-5 h-5 text-white" />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handlePosterUpload(film.id, file);
                        }}
                      />
                    </label>
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-white text-lg">{film.title}</h3>
                      <p className="text-gray-400 text-sm mt-1">
                        {film.year} • {film.duration}min • {film.language}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setEditingFilm(film); setShowModal(true); }}
                        className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Delete this film?')) {
                            deleteMutation.mutate(film.id);
                          }
                        }}
                        className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="px-2 py-1 bg-gray-700 rounded text-xs">{film.rating}</span>
                    <span className="px-2 py-1 bg-gray-700 rounded text-xs">{film.genre}</span>
                    {film.is_4k && (
                      <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-medium">4K</span>
                    )}
                    {film.subtitles && (
                      <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs">
                        Subs: {film.subtitles}
                      </span>
                    )}
                    {film.is_featured && (
                      <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs">Featured</span>
                    )}
                    <span className={`px-2 py-1 rounded text-xs ${
                      film.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {film.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {/* Director & Cast */}
                  {(film.director || film.cast) && (
                    <p className="text-gray-500 text-sm mt-2 truncate">
                      {film.director && `Dir: ${film.director}`}
                      {film.director && film.cast && ' • '}
                      {film.cast && `Cast: ${film.cast}`}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-card rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-gray-700">
            <div className="flex items-center justify-between p-6 border-b border-gray-700 sticky top-0 bg-dark-card">
              <h2 className="text-xl font-semibold text-white">
                {editingFilm ? 'Edit Film' : 'Add Film'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm text-gray-400 mb-2">Title *</label>
                    <input name="title" defaultValue={editingFilm?.title} className="input w-full" required />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Release Year *</label>
                    <input name="year" type="number" min="1900" max="2100" defaultValue={editingFilm?.year || new Date().getFullYear()} className="input w-full" required />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Duration (min) *</label>
                    <input name="duration" type="number" min="1" defaultValue={editingFilm?.duration || 120} className="input w-full" required />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Rating</label>
                    <select name="rating" defaultValue={editingFilm?.rating || 'PG'} className="input w-full">
                      <option value="G">G - General</option>
                      <option value="PG">PG - Parental Guidance</option>
                      <option value="PG13">PG13</option>
                      <option value="NC16">NC16</option>
                      <option value="M18">M18</option>
                      <option value="R21">R21</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Genre</label>
                    <input name="genre" defaultValue={editingFilm?.genre} placeholder="Drama, Comedy" className="input w-full" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Synopsis</label>
                  <textarea name="synopsis" defaultValue={editingFilm?.synopsis} className="input w-full h-24" placeholder="Film description..." />
                </div>
              </div>

              {/* Credits */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Credits</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Director</label>
                    <input name="director" defaultValue={editingFilm?.director} placeholder="Director name" className="input w-full" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Cast</label>
                    <input name="cast" defaultValue={editingFilm?.cast} placeholder="Actor 1, Actor 2" className="input w-full" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Awards</label>
                  <textarea name="awards" defaultValue={editingFilm?.awards} className="input w-full h-16" placeholder="Awards and nominations..." />
                </div>
              </div>

              {/* Language & Format */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Language & Format</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Language</label>
                    <input name="language" defaultValue={editingFilm?.language} placeholder="English, Mandarin" className="input w-full" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Subtitles</label>
                    <input name="subtitles" defaultValue={editingFilm?.subtitles} placeholder="English, Chinese" className="input w-full" />
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input name="is_4k" type="checkbox" defaultChecked={editingFilm?.is_4k} className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500" />
                    <span className="text-sm text-white">4K Ultra HD</span>
                  </label>
                </div>
              </div>

              {/* Media URLs */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Media</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Poster URL</label>
                    <input name="poster_url" defaultValue={editingFilm?.poster_url} placeholder="/images/films/poster.jpg" className="input w-full" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Banner URL</label>
                    <input name="banner_url" defaultValue={editingFilm?.banner_url} placeholder="/images/banners/banner.jpg" className="input w-full" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Trailer URL (YouTube)</label>
                  <input name="trailer_url" defaultValue={editingFilm?.trailer_url} placeholder="https://youtube.com/watch?v=..." className="input w-full" />
                </div>
              </div>

              {/* Status */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Status</h3>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input name="is_active" type="checkbox" defaultChecked={editingFilm?.is_active ?? true} className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-green-500 focus:ring-green-500" />
                    <span className="text-sm text-white">Active (visible on site)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input name="is_featured" type="checkbox" defaultChecked={editingFilm?.is_featured} className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-yellow-500 focus:ring-yellow-500" />
                    <span className="text-sm text-white">Featured (show in carousel)</span>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-4 pt-4 border-t border-gray-700">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editingFilm ? 'Update Film' : 'Create Film'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
