'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { screeningsApi, ticketTypesApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

export interface TicketType {
  id: number;
  name: string;
  description: string;
  sort_order: number;
  is_active: boolean;
}

export interface ScreeningPrice {
  id: number;
  screening_id: number;
  ticket_type_id: number;
  ticket_type: TicketType;
  price: number;
  is_active: boolean;
}

interface TicketTypeSelectorProps {
  screeningId: number;
  seatId: number;
  seatLabel: string;
  defaultPrice: number;
  onSelect: (seatId: number, ticketTypeId: number, ticketTypeName: string, price: number) => void;
  selectedTicketTypeId?: number;
}

export function TicketTypeSelector({
  screeningId,
  seatId,
  seatLabel,
  defaultPrice,
  onSelect,
  selectedTicketTypeId,
}: TicketTypeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Fetch prices for this screening
  const { data: prices } = useQuery({
    queryKey: ['screening-prices', screeningId],
    queryFn: async () => {
      const res = await screeningsApi.getPrices(screeningId);
      return res.data as ScreeningPrice[];
    },
    staleTime: 60000, // Cache for 1 minute
  });

  // Default to Standard (id=1) if not selected
  const currentTypeId = selectedTicketTypeId || 1;
  const currentPrice = prices?.find(p => p.ticket_type_id === currentTypeId);
  const displayPrice = currentPrice?.price ?? defaultPrice;
  const displayName = currentPrice?.ticket_type?.name ?? 'Standard';

  const handleSelect = (price: ScreeningPrice) => {
    onSelect(seatId, price.ticket_type_id, price.ticket_type.name, price.price);
    setIsOpen(false);
  };

  if (!prices || prices.length <= 1) {
    // Only one price option, no need for selector
    return (
      <div className="flex items-center justify-between py-2">
        <div>
          <span className="text-text-primary">Seat </span>
          <span className="font-bold text-primary">{seatLabel}</span>
        </div>
        <span className="font-semibold text-text-primary">{formatCurrency(displayPrice)}</span>
      </div>
    );
  }

  return (
    <div className="py-2">
      <div className="flex items-center justify-between mb-1">
        <div>
          <span className="text-text-primary">Seat </span>
          <span className="font-bold text-primary">{seatLabel}</span>
        </div>
        <span className="font-semibold text-text-primary">{formatCurrency(displayPrice)}</span>
      </div>
      
      {/* Ticket Type Dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <span className="text-text-secondary">{displayName}</span>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        
        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
            {prices.map((price) => (
              <button
                key={price.ticket_type_id}
                type="button"
                onClick={() => handleSelect(price)}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                  price.ticket_type_id === currentTypeId ? 'bg-primary/5 text-primary' : 'text-text-primary'
                }`}
              >
                <div>
                  <span className="font-medium">{price.ticket_type.name}</span>
                  {price.ticket_type.description && (
                    <span className="text-xs text-text-secondary ml-2">
                      ({price.ticket_type.description})
                    </span>
                  )}
                </div>
                <span className="font-semibold">{formatCurrency(price.price)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Hook to manage ticket selections for multiple seats
export function useTicketSelections(defaultPrice: number) {
  const [selections, setSelections] = useState<Map<number, { ticketTypeId: number; ticketTypeName: string; price: number }>>(new Map());

  const setSelection = (seatId: number, ticketTypeId: number, ticketTypeName: string, price: number) => {
    setSelections(prev => {
      const next = new Map(prev);
      next.set(seatId, { ticketTypeId, ticketTypeName, price });
      return next;
    });
  };

  const getSelection = (seatId: number) => {
    return selections.get(seatId) || { ticketTypeId: 1, ticketTypeName: 'Standard', price: defaultPrice };
  };

  const clearSelections = () => {
    setSelections(new Map());
  };

  const getTotal = (seatIds: number[]) => {
    return seatIds.reduce((sum, seatId) => {
      const sel = getSelection(seatId);
      return sum + sel.price;
    }, 0);
  };

  return { selections, setSelection, getSelection, clearSelections, getTotal };
}
