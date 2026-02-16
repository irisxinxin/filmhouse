'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string; // unique id for cart item
  screeningId: number;
  seatId: number;
  seatLabel: string; // e.g., "A1", "B5"
  filmTitle: string;
  filmPoster: string;
  screeningDate: string;
  screeningTime: string;
  hallName: string;
  price: number;
  ticketTypeId: number; // 1=Standard, 2=Member, etc.
  ticketTypeName: string; // "Standard", "Member", etc.
  addedAt: number; // timestamp
  expiresAt: number; // lock expiration timestamp
}

export interface GuestInfo {
  name: string;
  email: string;
  phone: string;
}

interface CartState {
  items: CartItem[];
  guestInfo: GuestInfo | null;
  
  // Actions
  addItem: (item: Omit<CartItem, 'id' | 'addedAt'>) => void;
  removeItem: (id: string) => void;
  removeItemsBySeat: (screeningId: number, seatId: number) => void;
  removeItemsByScreening: (screeningId: number) => void;
  clearCart: () => void;
  clearExpiredItems: () => CartItem[]; // returns removed items
  setGuestInfo: (info: GuestInfo | null) => void;
  
  // Computed
  getTotal: () => number;
  getItemCount: () => number;
  getItemsByScreening: (screeningId: number) => CartItem[];
  hasExpiredItems: () => boolean;
  getExpiredItems: () => CartItem[];
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      guestInfo: null,

      addItem: (item) => {
        const id = `${item.screeningId}-${item.seatId}-${Date.now()}`;
        const newItem: CartItem = {
          ...item,
          id,
          addedAt: Date.now(),
        };
        set((state) => ({
          items: [...state.items, newItem],
        }));
      },

      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }));
      },

      removeItemsBySeat: (screeningId, seatId) => {
        set((state) => ({
          items: state.items.filter(
            (item) => !(item.screeningId === screeningId && item.seatId === seatId)
          ),
        }));
      },

      removeItemsByScreening: (screeningId) => {
        set((state) => ({
          items: state.items.filter((item) => item.screeningId !== screeningId),
        }));
      },

      clearCart: () => {
        set({ items: [], guestInfo: null });
      },

      clearExpiredItems: () => {
        const now = Date.now();
        const expired = get().items.filter((item) => item.expiresAt < now);
        set((state) => ({
          items: state.items.filter((item) => item.expiresAt >= now),
        }));
        return expired;
      },

      setGuestInfo: (info) => {
        set({ guestInfo: info });
      },

      getTotal: () => {
        return get().items.reduce((sum, item) => sum + item.price, 0);
      },

      getItemCount: () => {
        return get().items.length;
      },

      getItemsByScreening: (screeningId) => {
        return get().items.filter((item) => item.screeningId === screeningId);
      },

      hasExpiredItems: () => {
        const now = Date.now();
        return get().items.some((item) => item.expiresAt < now);
      },

      getExpiredItems: () => {
        const now = Date.now();
        return get().items.filter((item) => item.expiresAt < now);
      },
    }),
    {
      name: 'filmhouse-cart',
      partialize: (state) => ({
        items: state.items,
        guestInfo: state.guestInfo,
      }),
    }
  )
);
