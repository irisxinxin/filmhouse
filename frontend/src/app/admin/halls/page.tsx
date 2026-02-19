'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import type { Hall, Seat, SeatLayout, SeatLayoutRow, SeatLayoutCell } from '@/types';
import { Plus, Edit, X, Grid3X3, AlertTriangle, Check, Save, Eye, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

const ROW_LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function createDefaultLayout(rows: number, cols: number): SeatLayout {
  const layout: SeatLayout = { rows: [] };
  for (let r = 0; r < rows; r++) {
    const row: SeatLayoutRow = { label: ROW_LABELS[r] || `R${r + 1}`, seats: [] };
    let seatNum = 1;
    for (let c = 0; c < cols; c++) {
      row.seats.push({ type: 'seat', number: seatNum++, seat_type: 'standard' });
    }
    layout.rows.push(row);
  }
  return layout;
}

function reNumberSeats(layout: SeatLayout): SeatLayout {
  return {
    rows: layout.rows.map(row => {
      let num = 1;
      return {
        ...row,
        seats: row.seats.map(cell => {
          if (cell.type === 'seat') {
            return { ...cell, number: num++ };
          }
          return cell;
        }),
      };
    }),
  };
}

function countSeats(layout: SeatLayout): number {
  let count = 0;
  for (const row of layout.rows) {
    for (const cell of row.seats) {
      if (cell.type === 'seat') count++;
    }
  }
  return count;
}

type EditorTool = 'seat' | 'aisle' | 'empty' | 'premium' | 'wheelchair' | 'disabled';

function SeatLayoutEditor({ hall, onClose }: { hall: Hall; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [tool, setTool] = useState<EditorTool>('seat');
  const [preview, setPreview] = useState(false);

  const initialLayout = useMemo((): SeatLayout => {
    if (hall.seat_layout) {
      try {
        const parsed = JSON.parse(hall.seat_layout);
        if (parsed?.rows?.length) return parsed;
      } catch { /* ignore */ }
    }
    return createDefaultLayout(8, 12);
  }, [hall.seat_layout]);

  const [layout, setLayout] = useState<SeatLayout>(initialLayout);

  const saveMutation = useMutation({
    mutationFn: () => adminApi.saveLayout(hall.id, reNumberSeats(layout)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-halls'] });
      queryClient.invalidateQueries({ queryKey: ['admin-seats', hall.id] });
      onClose();
    },
  });

  const handleCellClick = useCallback((rowIdx: number, colIdx: number) => {
    if (preview) return;
    setLayout(prev => {
      const newRows = prev.rows.map((row, ri) => {
        if (ri !== rowIdx) return row;
        const newSeats = row.seats.map((cell, ci) => {
          if (ci !== colIdx) return cell;
          const c = { ...cell };
          switch (tool) {
            case 'seat': return { type: 'seat' as const, number: 0, seat_type: 'standard' };
            case 'aisle': return { type: 'aisle' as const };
            case 'empty': return { type: 'empty' as const };
            case 'premium': return { type: 'seat' as const, number: 0, seat_type: 'premium' };
            case 'wheelchair': return { type: 'seat' as const, number: 0, seat_type: 'wheelchair' };
            case 'disabled':
              if (c.type === 'seat') return { ...c, disabled: !c.disabled };
              return c;
            default: return c;
          }
        });
        return { ...row, seats: newSeats };
      });
      return reNumberSeats({ rows: newRows });
    });
  }, [tool, preview]);

  const addRow = () => {
    setLayout(prev => {
      const cols = prev.rows.length > 0 ? prev.rows[0].seats.length : 12;
      const label = ROW_LABELS[prev.rows.length] || `R${prev.rows.length + 1}`;
      const newRow: SeatLayoutRow = { label, seats: [] };
      let num = 1;
      for (let c = 0; c < cols; c++) {
        newRow.seats.push({ type: 'seat', number: num++, seat_type: 'standard' });
      }
      return reNumberSeats({ rows: [...prev.rows, newRow] });
    });
  };

  const removeRow = () => {
    if (layout.rows.length <= 1) return;
    setLayout(prev => reNumberSeats({ rows: prev.rows.slice(0, -1) }));
  };

  const addCol = () => {
    setLayout(prev => reNumberSeats({
      rows: prev.rows.map(row => ({
        ...row,
        seats: [...row.seats, { type: 'seat', number: 0, seat_type: 'standard' }],
      })),
    }));
  };

  const removeCol = () => {
    if (layout.rows[0]?.seats.length <= 1) return;
    setLayout(prev => reNumberSeats({
      rows: prev.rows.map(row => ({
        ...row,
        seats: row.seats.slice(0, -1),
      })),
    }));
  };

  const getCellStyle = (cell: SeatLayoutCell) => {
    if (cell.type === 'aisle') return 'bg-transparent';
    if (cell.type === 'empty') return 'bg-transparent border border-dashed border-gray-700';
    // seat
    if (cell.disabled) return 'bg-red-900/50 border border-red-500/50 text-red-400';
    if (cell.seat_type === 'premium') return 'bg-amber-600 text-white';
    if (cell.seat_type === 'wheelchair') return 'bg-blue-600 text-white';
    return 'bg-gray-600 text-white';
  };

  const getCellLabel = (cell: SeatLayoutCell) => {
    if (cell.type === 'aisle') return '';
    if (cell.type === 'empty') return '';
    return cell.number || '';
  };

  const numbered = reNumberSeats(layout);
  const totalSeats = countSeats(numbered);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-card rounded-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div>
            <h2 className="text-xl font-semibold">Seatmap Editor — {hall.name}</h2>
            <p className="text-sm text-gray-400">{totalSeats} seats · {numbered.rows.length} rows · {numbered.rows[0]?.seats.length || 0} columns</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setPreview(!preview)} className={cn('btn text-sm', preview ? 'btn-primary' : 'btn-secondary')}>
              {preview ? <><Pencil className="w-4 h-4 mr-1" />Edit</> : <><Eye className="w-4 h-4 mr-1" />Preview</>}
            </button>
            <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="btn btn-primary text-sm">
              <Save className="w-4 h-4 mr-1" />{saveMutation.isPending ? 'Saving...' : 'Save Layout'}
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Toolbar */}
        {!preview && (
          <div className="p-3 border-b border-gray-800 flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-400 mr-2">Tool:</span>
            {([
              ['seat', 'Seat', 'bg-gray-600'],
              ['aisle', 'Aisle', 'bg-transparent border border-gray-500'],
              ['empty', 'Empty', 'bg-transparent border border-dashed border-gray-600'],
              ['premium', 'Premium', 'bg-amber-600'],
              ['wheelchair', 'Wheelchair', 'bg-blue-600'],
              ['disabled', 'Toggle Broken', 'bg-red-900/50 border border-red-500'],
            ] as [EditorTool, string, string][]).map(([t, label, color]) => (
              <button key={t} onClick={() => setTool(t)}
                className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-colors',
                  tool === t ? 'bg-primary text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700')}>
                <div className={cn('w-3 h-3 rounded-sm', color)} />
                {label}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-1">
              <button onClick={addRow} className="btn btn-secondary text-xs px-2 py-1">+ Row</button>
              <button onClick={removeRow} className="btn btn-secondary text-xs px-2 py-1">- Row</button>
              <button onClick={addCol} className="btn btn-secondary text-xs px-2 py-1">+ Col</button>
              <button onClick={removeCol} className="btn btn-secondary text-xs px-2 py-1">- Col</button>
            </div>
          </div>
        )}

        {/* Grid */}
        <div className="flex-1 overflow-auto p-4">
          <div className="mb-4 text-center">
            <div className="mx-auto w-3/4 h-2 bg-gradient-to-r from-transparent via-gray-600 to-transparent rounded-full" />
            <p className="mt-2 text-xs text-gray-500 uppercase">Screen</p>
          </div>
          <div className="space-y-1">
            {numbered.rows.map((row, ri) => (
              <div key={row.label} className="flex items-center justify-center gap-1">
                <span className="w-6 text-center text-sm text-gray-500">{row.label}</span>
                <div className="flex gap-1">
                  {row.seats.map((cell, ci) => (
                    <button key={`${ri}-${ci}`} onClick={() => handleCellClick(ri, ci)}
                      className={cn('w-8 h-8 rounded-t-lg flex items-center justify-center text-xs transition-all',
                        getCellStyle(cell), !preview && 'cursor-pointer hover:ring-2 hover:ring-primary/50')}>
                      {getCellLabel(cell)}
                    </button>
                  ))}
                </div>
                <span className="w-6 text-center text-sm text-gray-500">{row.label}</span>
              </div>
            ))}
          </div>
        </div>

        {saveMutation.isError && (
          <div className="p-3 bg-red-500/10 border-t border-red-500/30 text-red-400 text-sm text-center">
            Failed to save layout. Please try again.
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminHallsPage() {
  const queryClient = useQueryClient();
  const [showHallModal, setShowHallModal] = useState(false);
  const [editingHall, setEditingHall] = useState<Hall | null>(null);
  const [selectedHall, setSelectedHall] = useState<Hall | null>(null);
  const [showEditor, setShowEditor] = useState(false);
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

  // Parse layout for display
  const parsedLayout = useMemo((): SeatLayout | null => {
    if (!selectedHall?.seat_layout) return null;
    try {
      const p = JSON.parse(selectedHall.seat_layout);
      if (p?.rows?.length) return p;
    } catch { /* ignore */ }
    return null;
  }, [selectedHall?.seat_layout]);

  // Build seat lookup for layout-based rendering
  const seatLookup = useMemo(() => {
    const map = new Map<string, Seat>();
    if (seats) {
      for (const s of seats) map.set(`${s.row}-${s.number}`, s);
    }
    return map;
  }, [seats]);

  const activeSeats = seats?.filter(s => s.is_active).length || 0;
  const disabledSeats = seats?.filter(s => !s.is_active).length || 0;

  const renderSeatGrid = () => {
    if (!seats || seats.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-400 mb-4">No seats configured for this hall.</p>
          <button onClick={() => setShowEditor(true)} className="btn btn-primary">Configure Seats</button>
        </div>
      );
    }

    if (parsedLayout) {
      const rows = [...parsedLayout.rows];
      return (
        <div className="overflow-x-auto">
          <div className="mb-6 text-center">
            <div className="mx-auto w-3/4 h-2 bg-gradient-to-r from-transparent via-gray-600 to-transparent rounded-full" />
            <p className="mt-2 text-xs text-gray-500 uppercase">Screen</p>
          </div>
          <div className="space-y-2">
            {rows.map((row) => (
              <div key={row.label} className="flex items-center justify-center gap-1">
                <span className="w-6 text-center text-sm text-gray-500">{row.label}</span>
                <div className="flex gap-1">
                  {row.seats.map((cell, ci) => {
                    if (cell.type === 'aisle') return <div key={`${row.label}-a-${ci}`} className="w-8 h-8" />;
                    if (cell.type === 'empty') return <div key={`${row.label}-e-${ci}`} className="w-8 h-8" />;
                    const seat = seatLookup.get(`${row.label}-${cell.number}`);
                    if (!seat) return <div key={`${row.label}-m-${ci}`} className="w-8 h-8" />;
                    const isSelected = selectedSeats.has(seat.id);
                    return (
                      <button key={seat.id}
                        onClick={() => editMode ? handleSeatClick(seat) : handleToggleSingleSeat(seat)}
                        className={cn('w-8 h-8 rounded-t-lg flex items-center justify-center text-xs transition-all',
                          seat.is_active ? (seat.seat_type === 'premium' ? 'bg-amber-600 text-white' : seat.seat_type === 'wheelchair' ? 'bg-blue-600 text-white' : 'bg-gray-600 hover:bg-gray-500')
                            : 'bg-red-900/50 border border-red-500/50 text-red-400',
                          isSelected && 'ring-2 ring-blue-400 bg-blue-500',
                          editMode && 'cursor-pointer')}
                        title={`${seat.row}${seat.number} - ${seat.seat_type} - ${seat.is_active ? 'Active' : 'Disabled'}`}>
                        {seat.number}
                      </button>
                    );
                  })}
                </div>
                <span className="w-6 text-center text-sm text-gray-500">{row.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 text-center text-sm text-gray-400">
            Total: {seats.length} seats ({activeSeats} active, {disabledSeats} disabled)
          </div>
        </div>
      );
    }

    // Legacy fallback: simple grid
    const grouped: Record<string, Seat[]> = {};
    for (const s of seats) {
      if (!grouped[s.row]) grouped[s.row] = [];
      grouped[s.row].push(s);
    }
    for (const r of Object.keys(grouped)) grouped[r].sort((a, b) => a.number - b.number);
    const rowKeys = Object.keys(grouped).sort().reverse();

    return (
      <div className="overflow-x-auto">
        <div className="mb-6 text-center">
          <div className="mx-auto w-3/4 h-2 bg-gradient-to-r from-transparent via-gray-600 to-transparent rounded-full" />
          <p className="mt-2 text-xs text-gray-500 uppercase">Screen</p>
        </div>
        <div className="space-y-2">
          {rowKeys.map((row) => (
            <div key={row} className="flex items-center justify-center gap-1">
              <span className="w-6 text-center text-sm text-gray-500">{row}</span>
              <div className="flex gap-1">
                {Array.from({ length: Math.max(...grouped[row].map(s => s.number)) }, (_, i) => {
                  const seat = grouped[row].find(s => s.number === i + 1);
                  if (!seat) return <div key={`${row}-${i + 1}`} className="w-8 h-8" />;
                  const isSelected = selectedSeats.has(seat.id);
                  return (
                    <button key={seat.id}
                      onClick={() => editMode ? handleSeatClick(seat) : handleToggleSingleSeat(seat)}
                      className={cn('w-8 h-8 rounded-t-lg flex items-center justify-center text-xs transition-all',
                        seat.is_active ? 'bg-gray-600 hover:bg-gray-500' : 'bg-red-900/50 border border-red-500/50 text-red-400',
                        isSelected && 'ring-2 ring-blue-400 bg-blue-500',
                        editMode && 'cursor-pointer')}
                      title={`${row}${seat.number} - ${seat.is_active ? 'Active' : 'Disabled'}`}>
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
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">Halls & Seats</h1>
        <button onClick={() => { setEditingHall(null); setShowHallModal(true); }} className="btn btn-primary flex items-center">
          <Plus className="w-4 h-4 mr-2" />Add Hall
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
                  <div key={hall.id}
                    onClick={() => { setSelectedHall(hall); setEditMode(false); setSelectedSeats(new Set()); }}
                    className={cn('p-4 rounded-lg cursor-pointer transition-colors',
                      selectedHall?.id === hall.id ? 'bg-primary/20 border border-primary' : 'bg-gray-800 hover:bg-gray-700')}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{hall.name}</h3>
                        <p className="text-sm text-gray-400">
                          {hall.capacity} seats
                          {hall.is_4k && <span className="ml-2 text-primary">4K</span>}
                        </p>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); setEditingHall(hall); setShowHallModal(true); }}
                        className="p-2 hover:bg-gray-600 rounded">
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
                    <button onClick={() => { setEditMode(!editMode); setSelectedSeats(new Set()); }}
                      className={cn('btn text-sm', editMode ? 'btn-primary' : 'btn-secondary')}>
                      {editMode ? '✓ Edit Mode ON' : 'Edit Seats'}
                    </button>
                    <button onClick={() => setShowEditor(true)} className="btn btn-secondary flex items-center text-sm">
                      <Grid3X3 className="w-4 h-4 mr-2" />Seatmap Editor
                    </button>
                  </div>
                </div>

                {editMode && (
                  <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-yellow-400">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-sm font-medium">Edit Mode: Click seats to select, then enable/disable</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400">{selectedSeats.size} selected</span>
                        <button onClick={handleBulkEnable} disabled={selectedSeats.size === 0}
                          className="btn btn-sm bg-green-600 hover:bg-green-700 disabled:opacity-50">
                          <Check className="w-3 h-3 mr-1" />Enable
                        </button>
                        <button onClick={handleBulkDisable} disabled={selectedSeats.size === 0}
                          className="btn btn-sm bg-red-600 hover:bg-red-700 disabled:opacity-50">
                          <X className="w-3 h-3 mr-1" />Disable
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Legend */}
                <div className="flex gap-4 mb-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-600 rounded" />
                    <span className="text-gray-400">Standard: {activeSeats}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-amber-600 rounded" />
                    <span className="text-gray-400">Premium</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-600 rounded" />
                    <span className="text-gray-400">Wheelchair</span>
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

                {renderSeatGrid()}
              </>
            ) : (
              <div className="text-center py-12 text-gray-400">Select a hall to view and configure seats.</div>
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
              <button onClick={() => setShowHallModal(false)} className="p-2 hover:bg-gray-700 rounded"><X className="w-5 h-5" /></button>
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
                <button type="button" onClick={() => setShowHallModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">{editingHall ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Seatmap Editor */}
      {showEditor && selectedHall && (
        <SeatLayoutEditor hall={selectedHall} onClose={() => {
          setShowEditor(false);
          queryClient.invalidateQueries({ queryKey: ['admin-halls'] });
          // Refresh selectedHall data
          adminApi.listHalls().then(res => {
            const updated = (res.data as Hall[]).find(h => h.id === selectedHall.id);
            if (updated) setSelectedHall(updated);
          });
        }} />
      )}
    </div>
  );
}

