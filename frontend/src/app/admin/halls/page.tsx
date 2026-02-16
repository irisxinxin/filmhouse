'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import type { Hall, Seat } from '@/types';
import { Plus, Edit, X, Grid3X3, AlertTriangle, Check } from 'lucide-react';
import { cn, groupSeatsByRow } from '@/lib/utils';

export default function AdminHallsPage() {
  const queryClient = useQueryClient();
  const [showHallModal, setShowHallModal] = useState(false);
  const [showSeatModal, setShowSeatModal] = useState(false);
  const [editingHall, setEditingHall] = useState<Hall | null>(null);
  const [selectedHall, setSelectedHall] = useState<Hall | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [selectedSeats, setSelectedSeats] = useState<Set<number>>(new Set());

  const { data: halls, isLoading } = useQuery({
    queryKey: ['admin-halls'],
    queryFn: async () => (await adminApi.listHalls()).data as Hall[],
  });

  const { data: seats } = useQuery({
    queryKey: ['admin-seats', selectedHall?.id],
    queryFn: async () => (await adminApi.getSeats(selectedHall!.id)).data as Seat[],
    enabled: !!selectedHall,
  });

  const createHallMutation = useMutation({
    mutationFn: (data: { name: string; capacity: number; is_4k?: boolean }) => adminApi.createHall(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-halls'] });
      setShowHallModal(false);
      setEditingHall(null);
    },
  });

  const updateHallMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Hall> }) => adminApi.updateHall(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-halls'] });
      setShowHallModal(false);
      setEditingHall(null);
    },
  });

  const bulkCreateSeatsMutation = useMutation({
    mutationFn: ({ hallId, data }: { hallId: number; data: { rows: string[]; seats_per_row: number; aisles?: number[] } }) =>
      adminApi.bulkCreateSeats(hallId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-seats', selectedHall?.id] });
      queryClient.invalidateQueries({ queryKey: ['admin-halls'] });
      setShowSeatModal(false);
    },
  });

  const toggleSeatMutation = useMutation({
    mutationFn: ({ hallId, seatId }: { hallId: number; seatId: number }) =>
      adminApi.toggleSeat(hallId, seatId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-seats', selectedHall?.id] });
    },
  });

  const bulkUpdateSeatsMutation = useMutation({
    mutationFn: (data: { seat_ids: number[]; is_active: boolean }) =>
      adminApi.bulkUpdateSeats(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-seats', selectedHall?.id] });
      setSelectedSeats(new Set());
    },
  });

  const handleHallSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      capacity: parseInt(formData.get('capacity') as string),
      is_4k: formData.get('is_4k') === 'on',
    };

    if (editingHall) {
      updateHallMutation.mutate({ id: editingHall.id, data });
    } else {
      createHallMutation.mutate(data);
    }
  };

  const handleBulkSeatsSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedHall) return;

    const formData = new FormData(e.currentTarget);
    const rowsStr = formData.get('rows') as string;
    const rows = rowsStr.split(',').map(r => r.trim().toUpperCase());
    const seatsPerRow = parseInt(formData.get('seats_per_row') as string);
    const aislesStr = formData.get('aisles') as string;
    const aisles = aislesStr ? aislesStr.split(',').map(a => parseInt(a.trim())) : [];

    bulkCreateSeatsMutation.mutate({
      hallId: selectedHall.id,
      data: { rows, seats_per_row: seatsPerRow, aisles },
    });
  };

  const handleSeatClick = (seat: Seat) => {
    if (!editMode) return;
    
    if (selectedSeats.has(seat.id)) {
      const newSet = new Set(selectedSeats);
      newSet.delete(seat.id);
      setSelectedSeats(newSet);
    } else {
      setSelectedSeats(new Set([...selectedSeats, seat.id]));
    }
  };

  const handleToggleSingleSeat = (seat: Seat) => {
    if (!selectedHall) return;
    toggleSeatMutation.mutate({ hallId: selectedHall.id, seatId: seat.id });
  };

  const handleBulkEnable = () => {
    if (selectedSeats.size === 0) return;
    bulkUpdateSeatsMutation.mutate({ seat_ids: Array.from(selectedSeats), is_active: true });
  };

  const handleBulkDisable = () => {
    if (selectedSeats.size === 0) return;
    bulkUpdateSeatsMutation.mutate({ seat_ids: Array.from(selectedSeats), is_active: false });
  };

  const seatsByRow = seats ? groupSeatsByRow(seats) : {};
  const rows = Object.keys(seatsByRow).sort().reverse();
  const activeSeats = seats?.filter(s => s.is_active).length || 0;
  const disabledSeats = seats?.filter(s => !s.is_active).length || 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">Halls & Seats</h1>
        <button
          onClick={() => { setEditingHall(null); setShowHallModal(true); }}
          className="btn btn-primary flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Hall
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Halls List */}
        <div className="lg:col-span-1">
          <div className="card-dark p-4">
            <h2 className="text-lg font-semibold mb-4">Halls</h2>
            {isLoading ? (
              <p className="text-gray-400">Loading...</p>
            ) : (
              <div className="space-y-2">
                {halls?.map((hall) => (
                  <div
                    key={hall.id}
                    onClick={() => { setSelectedHall(hall); setEditMode(false); setSelectedSeats(new Set()); }}
                    className={cn(
                      'p-4 rounded-lg cursor-pointer transition-colors',
                      selectedHall?.id === hall.id ? 'bg-primary/20 border border-primary' : 'bg-gray-800 hover:bg-gray-700'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{hall.name}</h3>
                        <p className="text-sm text-gray-400">
                          {hall.capacity} seats
                          {hall.is_4k && <span className="ml-2 text-primary">4K</span>}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingHall(hall);
                          setShowHallModal(true);
                        }}
                        className="p-2 hover:bg-gray-600 rounded"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Seat Map */}
        <div className="lg:col-span-2">
          <div className="card-dark p-6">
            {selectedHall ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">{selectedHall.name} - Seat Layout</h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setEditMode(!editMode); setSelectedSeats(new Set()); }}
                      className={cn(
                        'btn text-sm',
                        editMode ? 'btn-primary' : 'btn-secondary'
                      )}
                    >
                      {editMode ? '✓ Edit Mode ON' : 'Edit Seats'}
                    </button>
                    <button
                      onClick={() => setShowSeatModal(true)}
                      className="btn btn-secondary flex items-center text-sm"
                    >
                      <Grid3X3 className="w-4 h-4 mr-2" />
                      Reset Layout
                    </button>
                  </div>
                </div>

                {/* Edit Mode Controls */}
                {editMode && (
                  <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-yellow-400">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-sm font-medium">Edit Mode: Click seats to select, then enable/disable</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400">{selectedSeats.size} selected</span>
                        <button
                          onClick={handleBulkEnable}
                          disabled={selectedSeats.size === 0}
                          className="btn btn-sm bg-green-600 hover:bg-green-700 disabled:opacity-50"
                        >
                          <Check className="w-3 h-3 mr-1" />
                          Enable
                        </button>
                        <button
                          onClick={handleBulkDisable}
                          disabled={selectedSeats.size === 0}
                          className="btn btn-sm bg-red-600 hover:bg-red-700 disabled:opacity-50"
                        >
                          <X className="w-3 h-3 mr-1" />
                          Disable
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Stats */}
                <div className="flex gap-4 mb-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-600 rounded" />
                    <span className="text-gray-400">Active: {activeSeats}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-900/50 rounded border border-red-500/50" />
                    <span className="text-gray-400">Disabled: {disabledSeats}</span>
                  </div>
                  {editMode && (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-blue-500 rounded ring-2 ring-blue-400" />
                      <span className="text-gray-400">Selected</span>
                    </div>
                  )}
                </div>

                {seats && seats.length > 0 ? (
                  <div className="overflow-x-auto">
                    {/* Screen */}
                    <div className="mb-6 text-center">
                      <div className="mx-auto w-3/4 h-2 bg-gradient-to-r from-transparent via-gray-600 to-transparent rounded-full" />
                      <p className="mt-2 text-xs text-gray-500 uppercase">Screen</p>
                    </div>

                    {/* Seats */}
                    <div className="space-y-2">
                      {rows.map((row) => (
                        <div key={row} className="flex items-center justify-center gap-1">
                          <span className="w-6 text-center text-sm text-gray-500">{row}</span>
                          <div className="flex gap-1">
                            {Array.from({ length: Math.max(...seatsByRow[row].map(s => s.number)) }, (_, i) => {
                              const seat = seatsByRow[row].find(s => s.number === i + 1);
                              if (!seat) {
                                return <div key={`${row}-${i + 1}`} className="w-8 h-8" />;
                              }
                              const isSelected = selectedSeats.has(seat.id);
                              return (
                                <button
                                  key={seat.id}
                                  onClick={() => editMode ? handleSeatClick(seat) : handleToggleSingleSeat(seat)}
                                  className={cn(
                                    'w-8 h-8 rounded-t-lg flex items-center justify-center text-xs transition-all',
                                    seat.is_active 
                                      ? 'bg-gray-600 hover:bg-gray-500' 
                                      : 'bg-red-900/50 border border-red-500/50 text-red-400',
                                    isSelected && 'ring-2 ring-blue-400 bg-blue-500',
                                    editMode && 'cursor-pointer'
                                  )}
                                  title={`${row}${seat.number} - ${seat.is_active ? 'Active' : 'Disabled (broken)'}`}
                                >
                                  {seat.number}
                                </button>
                              );
                            })}
                          </div>
                          <span className="w-6 text-center text-sm text-gray-500">{row}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 text-center text-sm text-gray-400">
                      Total: {seats.length} seats ({activeSeats} active, {disabledSeats} disabled)
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-400 mb-4">No seats configured for this hall.</p>
                    <button
                      onClick={() => setShowSeatModal(true)}
                      className="btn btn-primary"
                    >
                      Configure Seats
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-gray-400">
                Select a hall to view and configure seats.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hall Modal */}
      {showHallModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-card rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h2 className="text-xl font-semibold">{editingHall ? 'Edit Hall' : 'Add Hall'}</h2>
              <button onClick={() => setShowHallModal(false)} className="p-2 hover:bg-gray-700 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleHallSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Name *</label>
                <input name="name" defaultValue={editingHall?.name} className="input" required />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Capacity</label>
                <input name="capacity" type="number" defaultValue={editingHall?.capacity || 100} className="input" />
              </div>
              <label className="flex items-center">
                <input name="is_4k" type="checkbox" defaultChecked={editingHall?.is_4k} className="mr-2" />
                <span className="text-sm">4K Projection</span>
              </label>
              <div className="flex justify-end space-x-4 pt-4">
                <button type="button" onClick={() => setShowHallModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingHall ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Seats Modal */}
      {showSeatModal && selectedHall && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-card rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h2 className="text-xl font-semibold">Configure Seats - {selectedHall.name}</h2>
              <button onClick={() => setShowSeatModal(false)} className="p-2 hover:bg-gray-700 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleBulkSeatsSubmit} className="p-6 space-y-4">
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm text-yellow-400">
                ⚠️ This will replace all existing seats in this hall.
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Rows (comma separated) *</label>
                <input
                  name="rows"
                  defaultValue="A,B,C,D,E,F,G"
                  placeholder="A,B,C,D,E,F,G"
                  className="input"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">e.g., A,B,C,D,E,F,G</p>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Seats per Row *</label>
                <input
                  name="seats_per_row"
                  type="number"
                  defaultValue={17}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Aisle positions (seat numbers to skip)</label>
                <input
                  name="aisles"
                  placeholder="3,4"
                  className="input"
                />
                <p className="text-xs text-gray-500 mt-1">e.g., 3,4 to create an aisle between seats 2 and 5</p>
              </div>
              <div className="flex justify-end space-x-4 pt-4">
                <button type="button" onClick={() => setShowSeatModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Generate Seats
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
