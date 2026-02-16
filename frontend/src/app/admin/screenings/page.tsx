'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import type { Screening, Film, Hall } from '@/types';
import { Plus, Trash2, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function AdminScreeningsPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [dateFilter, setDateFilter] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: screeningsData, isLoading } = useQuery({
    queryKey: ['admin-screenings', dateFilter],
    queryFn: async () => {
      const res = await adminApi.listScreenings({ from: dateFilter, to: dateFilter });
      return res.data as { data: Screening[]; total: number };
    },
  });

  const { data: films } = useQuery({
    queryKey: ['admin-films'],
    queryFn: async () => (await adminApi.listFilms()).data as Film[],
  });

  const { data: halls } = useQuery({
    queryKey: ['admin-halls'],
    queryFn: async () => (await adminApi.listHalls()).data as Hall[],
  });

  const createMutation = useMutation({
    mutationFn: (data: { film_id: number; hall_id: number; start_time: string; price: number }) =>
      adminApi.createScreening(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-screenings'] });
      setShowModal(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminApi.deleteScreening(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-screenings'] }),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const date = formData.get('date') as string;
    const time = formData.get('time') as string;
    const startTime = new Date(`${date}T${time}`).toISOString();

    createMutation.mutate({
      film_id: parseInt(formData.get('film_id') as string),
      hall_id: parseInt(formData.get('hall_id') as string),
      start_time: startTime,
      price: parseFloat(formData.get('price') as string),
    });
  };

  const screenings = screeningsData?.data || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">Screenings</h1>
        <button
          onClick={() => setShowModal(true)}
          className="btn btn-primary flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Screening
        </button>
      </div>

      {/* Date Filter */}
      <div className="mb-6">
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="input w-auto"
        />
      </div>

      {isLoading ? (
        <div className="text-gray-400">Loading...</div>
      ) : screenings.length > 0 ? (
        <div className="card-dark overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-400 text-sm bg-gray-800/50">
                <th className="p-4">Time</th>
                <th className="p-4">Film</th>
                <th className="p-4">Hall</th>
                <th className="p-4">Price</th>
                <th className="p-4">Status</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {screenings.map((screening) => (
                <tr key={screening.id} className="border-t border-gray-800">
                  <td className="p-4">
                    <div>
                      <p className="font-medium">{format(parseISO(screening.start_time), 'h:mm a')}</p>
                      <p className="text-xs text-gray-500">
                        ends {format(parseISO(screening.end_time), 'h:mm a')}
                      </p>
                    </div>
                  </td>
                  <td className="p-4">{screening.film?.title || '-'}</td>
                  <td className="p-4">
                    {screening.hall?.name}
                    {screening.hall?.is_4k && (
                      <span className="ml-2 px-1.5 py-0.5 bg-primary/20 text-primary rounded text-xs">4K</span>
                    )}
                  </td>
                  <td className="p-4">${screening.price.toFixed(2)}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs ${
                      screening.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {screening.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => {
                        if (confirm('Delete this screening?')) {
                          deleteMutation.mutate(screening.id);
                        }
                      }}
                      className="p-2 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card-dark p-8 text-center text-gray-400">
          No screenings for this date.
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-card rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h2 className="text-xl font-semibold">Add Screening</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-700 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Film *</label>
                <select name="film_id" className="input" required>
                  <option value="">Select a film</option>
                  {films?.map((film) => (
                    <option key={film.id} value={film.id}>
                      {film.title} ({film.duration}min)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Hall *</label>
                <select name="hall_id" className="input" required>
                  <option value="">Select a hall</option>
                  {halls?.map((hall) => (
                    <option key={hall.id} value={hall.id}>
                      {hall.name} ({hall.capacity} seats){hall.is_4k ? ' - 4K' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Date *</label>
                  <input
                    name="date"
                    type="date"
                    defaultValue={dateFilter}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Time *</label>
                  <input
                    name="time"
                    type="time"
                    defaultValue="14:00"
                    className="input"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Price (SGD) *</label>
                <input
                  name="price"
                  type="number"
                  step="0.01"
                  defaultValue="15.00"
                  className="input"
                  required
                />
              </div>
              <div className="flex justify-end space-x-4 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
