'use client';

import { useMemo } from 'react';
import type { SeatWithStatus, SeatLayout } from '@/types';
import { groupSeatsByRow } from '@/lib/utils';

interface SeatMapProps {
  seats: SeatWithStatus[];
  selectedSeats: number[];
  onSeatClick: (seatId: number) => void;
  onRemoveFromCart?: (seatId: number) => void;
  disabled?: boolean;
  seatLayout?: string; // JSON string of SeatLayout
}

export function SeatMap({ seats, selectedSeats, onSeatClick, onRemoveFromCart, disabled = false, seatLayout }: SeatMapProps) {
  const parsedLayout = useMemo((): SeatLayout | null => {
    if (!seatLayout) return null;
    try {
      const parsed = JSON.parse(seatLayout);
      if (parsed && parsed.rows && parsed.rows.length > 0) return parsed;
    } catch { /* ignore */ }
    return null;
  }, [seatLayout]);

  // Build a lookup: row+number -> seat
  const seatLookup = useMemo(() => {
    const map = new Map<string, SeatWithStatus>();
    for (const s of seats) {
      map.set(`${s.row}-${s.number}`, s);
    }
    return map;
  }, [seats]);

  // Fallback: legacy grid rendering
  const seatsByRow = useMemo(() => groupSeatsByRow(seats), [seats]);
  const legacyRows = Object.keys(seatsByRow).sort().reverse();
  const maxSeatNumber = seats.length > 0 ? Math.max(...seats.map(s => s.number)) : 0;

  const getSeatStyle = (status: string, seatType: string) => {
    const baseStyle = seatType === 'premium' 
      ? 'ring-1 ring-amber-400/50' 
      : '';
    
    switch (status) {
      case 'selected':
        return `bg-primary text-white ring-2 ring-primary ring-offset-2 ring-offset-cream scale-110 shadow-lg ${baseStyle}`;
      case 'booked':
        return `bg-gray-300 text-gray-400 cursor-not-allowed ${baseStyle}`;
      case 'locked':
        return `bg-amber-100 text-amber-600 cursor-not-allowed border-2 border-amber-300 ${baseStyle}`;
      case 'in_cart':
        return `bg-amber-500 text-white hover:bg-amber-600 cursor-pointer ${baseStyle}`;
      default:
        return `bg-[#2d6a4f] text-white hover:bg-[#1b4332] hover:scale-105 cursor-pointer shadow-sm hover:shadow-md ${baseStyle}`;
    }
  };

  const renderSeatButton = (seat: SeatWithStatus) => {
    const isSelected = selectedSeats.includes(seat.id);
    const status = isSelected ? 'selected' : seat.status;
    const isInCart = status === 'in_cart';
    const isDisabled = disabled || status === 'booked' || status === 'locked';

    const handleClick = () => {
      if (isInCart && onRemoveFromCart) {
        onRemoveFromCart(seat.id);
      } else if (!isDisabled && !isInCart) {
        onSeatClick(seat.id);
      }
    };

    return (
      <button
        key={seat.id}
        onClick={handleClick}
        disabled={isDisabled}
        className={`
          w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-[6px] sm:text-[8px] md:text-[10px] font-bold
          transition-all duration-200 ease-out
          flex items-center justify-center
          focus:outline-none focus-visible:ring-1 focus-visible:ring-primary
          ${getSeatStyle(status, seat.seat_type)}
        `}
        title={`Row ${seat.row}, Seat ${seat.number} - ${status}${seat.seat_type === 'premium' ? ' (Premium)' : ''}`}
        aria-label={`Seat ${seat.row}${seat.number}, ${status}`}
      >
        {seat.number}
      </button>
    );
  };

  const renderLayoutBased = (layout: SeatLayout) => {
    // Render rows in order (A at top = closest to screen), reversed for cinema view
    const rows = [...layout.rows].reverse();
    return (
      <div className="space-y-1 sm:space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-center gap-px sm:gap-0.5">
            <span className="w-3 sm:w-4 text-center text-[8px] sm:text-[10px] font-bold text-text-muted flex-shrink-0">{row.label}</span>
            <div className="flex gap-px sm:gap-0.5">
              {row.seats.map((cell, idx) => {
                if (cell.type === 'aisle') {
                  return <div key={`${row.label}-aisle-${idx}`} className="w-3 h-4 sm:w-4 sm:h-5 md:w-5 md:h-6" />;
                }
                if (cell.type === 'empty') {
                  return <div key={`${row.label}-empty-${idx}`} className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />;
                }
                // type === 'seat'
                const seat = seatLookup.get(`${row.label}-${cell.number}`);
                if (!seat) {
                  return <div key={`${row.label}-missing-${idx}`} className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />;
                }
                return renderSeatButton(seat);
              })}
            </div>
            <span className="w-3 sm:w-4 text-center text-[8px] sm:text-[10px] font-bold text-text-muted flex-shrink-0">{row.label}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderLegacy = () => (
    <div className="space-y-1 sm:space-y-2">
      {legacyRows.map((row) => {
        const rowSeats = seatsByRow[row];
        return (
          <div key={row} className="flex items-center justify-center gap-px sm:gap-0.5">
            <span className="w-3 sm:w-4 text-center text-[8px] sm:text-[10px] font-bold text-text-muted flex-shrink-0">{row}</span>
            <div className="flex gap-px sm:gap-0.5">
              {Array.from({ length: maxSeatNumber }, (_, i) => {
                const seatNumber = i + 1;
                const seat = rowSeats.find(s => s.number === seatNumber);
                if (!seat) {
                  return <div key={`${row}-${seatNumber}`} className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />;
                }
                return renderSeatButton(seat);
              })}
            </div>
            <span className="w-3 sm:w-4 text-center text-[8px] sm:text-[10px] font-bold text-text-muted flex-shrink-0">{row}</span>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="w-full">
      <div className="w-full p-2 sm:p-4">
        {/* Screen Indicator */}
        <div className="mb-6 sm:mb-12 text-center">
          <div className="relative mx-auto w-3/4 max-w-md">
            <div className="h-1.5 sm:h-2 bg-gradient-to-r from-transparent via-gray-400 to-transparent rounded-full" />
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1/2 h-6 sm:h-8 bg-gradient-to-b from-gray-200/50 to-transparent rounded-b-full blur-sm" />
          </div>
          <p className="mt-2 sm:mt-4 text-xs sm:text-sm text-text-muted font-bold uppercase tracking-[0.2em]">CINEMA SCREEN FRONT</p>
        </div>

        {/* Seat Grid - layout-based or legacy */}
        {parsedLayout ? renderLayoutBased(parsedLayout) : renderLegacy()}

        {/* Legend */}
        <div className="mt-3 sm:mt-6 flex flex-wrap justify-center gap-2 sm:gap-3 text-[8px] sm:text-[10px]">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 sm:w-4 sm:h-4 bg-[#2d6a4f]" />
            <span className="text-text-secondary">Available</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 sm:w-4 sm:h-4 bg-primary ring-1 ring-primary ring-offset-1 ring-offset-cream" />
            <span className="text-text-secondary">Selected</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 sm:w-4 sm:h-4 bg-gray-300" />
            <span className="text-text-secondary">Sold</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 sm:w-4 sm:h-4 bg-amber-100 border border-amber-300" />
            <span className="text-text-secondary">Reserved</span>
          </div>
        </div>

        {/* Seat Selection Info */}
        {selectedSeats.length > 0 && (
          <div className="mt-4 sm:mt-6 text-center">
            <p className="text-xs sm:text-sm text-text-secondary">
              <span className="font-semibold text-primary">{selectedSeats.length}</span> seat{selectedSeats.length > 1 ? 's' : ''} selected
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
