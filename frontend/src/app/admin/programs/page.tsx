'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import type { Program, Film } from '@/types';
import { Plus, Edit, Trash2, X, Film as FilmIcon, GripVertical } from 'lucide-react';

export default function AdminProgramsPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [showFilmModal, setShowFilmModal] = useState<number | null>(null);

  const { data: programs, isLoading } = useQuery({
    queryKey: ['admin-programs'],
    queryFn: async () => (await adminApi.listPrograms()).data as Program[],
  });

  const { data: allFilms } = useQuery({
    queryKey: ['admin-films'],
    queryFn: async () => (await adminApi.listFilms()).data as Film[],
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Program>) => adminApi.createProgram(data as Parameters<typeof adminApi.createProgram>[0]),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-programs'] }); setShowModal(false); setEditingProgram(null); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Program> }) => adminApi.updateProgram(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-programs'] }); setShowModal(false); setEditingProgram(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminApi.deleteProgram(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-programs'] }),
  });

  const addFilmMutation = useMutation({
    mutationFn: ({ programId, filmId }: { programId: number; filmId: number }) =>
      adminApi.addFilmToProgram(programId, filmId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-programs'] }),
  });

  const removeFilmMutation = useMutation({
    mutationFn: ({ programId, filmId }: { programId: number; filmId: number }) =>
      adminApi.removeFilmFromProgram(programId, filmId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-programs'] }),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = {
      name: fd.get('name') as string,
      slug: fd.get('slug') as string,
      description: fd.get('description') as string,
      image_url: fd.get('image_url') as string,
      sort_order: parseInt(fd.get('sort_order') as string) || 0,
      is_active: fd.get('is_active') === 'on',
    };
    if (editingProgram) {
      updateMutation.mutate({ id: editingProgram.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const programFilmIds = (p: Program) => (p.films || []).map((f) => f.id);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Programs</h1>
          <p className="text-gray-400 mt-1">Manage film programs and collections</p>
        </div>
        <button onClick={() => { setEditingProgram(null); setShowModal(true); }} className="btn btn-primary flex items-center">
          <Plus className="w-4 h-4 mr-2" />Add Program
        </button>
      </div>

      {isLoading ? (
        <div className="text-gray-400">Loading...</div>
      ) : (
        <div className="grid gap-4">
          {programs?.map((program) => (
            <div key={program.id} className="bg-dark-card rounded-xl border border-gray-700 p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <GripVertical className="w-5 h-5 text-gray-600" />
                  <div>
                    <h3 className="font-semibold text-white text-lg">{program.name}</h3>
                    <p className="text-gray-400 text-sm mt-0.5">/{program.slug} · Sort: {program.sort_order}</p>
                    {program.description && <p className="text-gray-500 text-sm mt-1">{program.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs ${program.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {program.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <button onClick={() => { setEditingProgram(program); setShowModal(true); }} className="p-2 hover:bg-gray-700 rounded-lg transition-colors" title="Edit">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => { if (confirm('Delete this program?')) deleteMutation.mutate(program.id); }} className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Films in this program */}
              <div className="mt-4 pt-4 border-t border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-400">Films ({(program.films || []).length})</span>
                  <button onClick={() => setShowFilmModal(program.id)} className="text-xs text-primary hover:text-primary-light transition-colors">+ Add Film</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(program.films || []).map((film) => (
                    <span key={film.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 rounded-lg text-sm text-white">
                      <FilmIcon className="w-3.5 h-3.5 text-gray-400" />
                      {film.title}
                      <button onClick={() => removeFilmMutation.mutate({ programId: program.id, filmId: film.id })} className="ml-1 text-gray-500 hover:text-red-400 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                  {(program.films || []).length === 0 && <span className="text-gray-600 text-sm">No films yet</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-card rounded-xl w-full max-w-lg border border-gray-700">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-xl font-semibold text-white">{editingProgram ? 'Edit Program' : 'Add Program'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-700 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Name *</label>
                <input name="name" defaultValue={editingProgram?.name} className="input w-full" required />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Slug</label>
                <input name="slug" defaultValue={editingProgram?.slug} className="input w-full" placeholder="auto-generated if empty" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Description</label>
                <textarea name="description" defaultValue={editingProgram?.description} className="input w-full" rows={3} />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Image URL</label>
                <input name="image_url" defaultValue={editingProgram?.image_url} className="input w-full" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Sort Order</label>
                  <input name="sort_order" type="number" defaultValue={editingProgram?.sort_order || 0} className="input w-full" />
                </div>
                <div className="flex items-center gap-3 pt-7">
                  <input name="is_active" type="checkbox" defaultChecked={editingProgram?.is_active ?? true} className="w-4 h-4" />
                  <label className="text-sm text-gray-400">Active</label>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-ghost">Cancel</button>
                <button type="submit" className="btn btn-primary">{editingProgram ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Film to Program Modal */}
      {showFilmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-card rounded-xl w-full max-w-lg border border-gray-700 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-xl font-semibold text-white">Add Film to Program</h2>
              <button onClick={() => setShowFilmModal(null)} className="p-2 hover:bg-gray-700 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-2">
              {allFilms?.filter((f) => {
                const prog = programs?.find((p) => p.id === showFilmModal);
                return prog ? !programFilmIds(prog).includes(f.id) : true;
              }).map((film) => (
                <button
                  key={film.id}
                  onClick={() => { addFilmMutation.mutate({ programId: showFilmModal, filmId: film.id }); setShowFilmModal(null); }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700 transition-colors text-left"
                >
                  <FilmIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <div>
                    <span className="text-white font-medium">{film.title}</span>
                    <span className="text-gray-500 text-sm ml-2">{film.year} · {film.rating}</span>
                  </div>
                </button>
              ))}
              {allFilms?.filter((f) => {
                const prog = programs?.find((p) => p.id === showFilmModal);
                return prog ? !programFilmIds(prog).includes(f.id) : true;
              }).length === 0 && (
                <p className="text-gray-500 text-center py-4">All films already added</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
