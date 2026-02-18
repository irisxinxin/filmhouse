'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { screeningsApi, bookingsApi } from '@/lib/api';
import { useCartStore } from '@/stores/cart';
import { useAuthStore } from '@/stores/auth';
import { SeatMap } from '@/components/booking/SeatMap';
import { TicketTypeSelector, useTicketSelections } from '@/components/booking/TicketTypeSelector';
import { formatDate, formatTime, formatCurrency } from '@/lib/utils';
import type { Screening, SeatWithStatus } from '@/types';
import { ArrowLeft, Clock, MapPin, ShoppingCart, Check, AlertCircle, Loader2, Plus } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function BookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { addItem, items, getItemsByScreening, removeItemsBySeat } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addedToCart, setAddedToCart] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['screening-seats', id],
    queryFn: async () => {
      const res = await screeningsApi.getSeats(parseInt(id));
      return res.data as { screening: Screening; seats: SeatWithStatus[] };
    },
    enabled: hydrated,
    refetchInterval: 15000,
  });

  // Ticket type selections for each seat
  const { setSelection, getSelection, clearSelections, getTotal } = useTicketSelections(data?.screening?.price || 15);

  // Get seats already in cart for this screening
  const cartSeatsForScreening = hydrated 
    ? getItemsByScreening(parseInt(id)).map(item => item.seatId)
    : [];

  const handleSeatClick = useCallback((seatId: number) => {
    setError(null);
    setAddedToCart(false);
    
    // Check if seat is already in cart
    if (cartSeatsForScreening.includes(seatId)) {
      setError('This seat is already in your cart');
      return;
    }
    
    setSelectedSeats((prev) => {
      if (prev.includes(seatId)) {
        return prev.filter((id) => id !== seatId);
      }
      return [...prev, seatId];
    });
  }, [cartSeatsForScreening]);

  const [isLocking, setIsLocking] = useState(false);

  const handleAddToCart = async () => {
    if (!data || selectedSeats.length === 0 || isLocking) return;
    
    const { screening, seats } = data;
    
    setIsLocking(true);
    setError(null);
    
    try {
      // Lock seats on the server first (use different API for guest vs authenticated)
      if (isAuthenticated) {
        await bookingsApi.lockSeats(screening.id, selectedSeats);
      } else {
        await bookingsApi.guestLockSeats(screening.id, selectedSeats);
      }
      
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes from now
      
      selectedSeats.forEach((seatId) => {
        const seat = seats.find(s => s.id === seatId);
        const ticketSelection = getSelection(seatId);
        if (seat) {
          addItem({
            screeningId: screening.id,
            seatId: seat.id,
            seatLabel: `${seat.row}${seat.number}`,
            filmTitle: screening.film?.title || 'Unknown Film',
            filmPoster: screening.film?.poster_url || '/images/placeholder-poster.jpg',
            screeningDate: formatDate(screening.start_time, 'EEEE, d MMMM yyyy'),
            screeningTime: formatTime(screening.start_time),
            hallName: screening.hall?.name || 'Main Hall',
            price: ticketSelection.price,
            ticketTypeId: ticketSelection.ticketTypeId,
            ticketTypeName: ticketSelection.ticketTypeName,
            expiresAt,
          });
        }
      });
      
      setAddedToCart(true);
      setSelectedSeats([]);
      clearSelections();
      refetch();
    } catch (err: unknown) {
      // Extract error message from various error formats
      let errorMessage = 'Failed to lock seats. Please try again.';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'object' && err !== null) {
        // Handle axios error or other object errors
        const axiosErr = err as { response?: { data?: { error?: string } }; message?: string };
        errorMessage = axiosErr.response?.data?.error || axiosErr.message || errorMessage;
      }
      
      // Make error messages more user-friendly
      if (errorMessage.includes('already booked') || errorMessage.includes('already locked')) {
        errorMessage = 'Sorry, one or more seats you selected are no longer available. Please choose different seats.';
        refetch(); // Refresh seat map to show updated availability
      } else if (errorMessage.includes('409') || errorMessage.includes('Conflict') || errorMessage.includes('status code 409')) {
        errorMessage = 'These seats were just taken by another customer. Please select different seats.';
        refetch();
      }
      setError(errorMessage);
    } finally {
      setIsLocking(false);
    }
  };

  // Proceed directly to checkout (add to cart + redirect)
  const handleProceedToCheckout = async () => {
    if (!data || selectedSeats.length === 0 || isLocking) return;
    
    const { screening, seats } = data;
    
    setIsLocking(true);
    setError(null);
    
    try {
      // Lock seats on the server first
      if (isAuthenticated) {
        await bookingsApi.lockSeats(screening.id, selectedSeats);
      } else {
        await bookingsApi.guestLockSeats(screening.id, selectedSeats);
      }
      
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes from now
      
      selectedSeats.forEach((seatId) => {
        const seat = seats.find(s => s.id === seatId);
        const ticketSelection = getSelection(seatId);
        if (seat) {
          addItem({
            screeningId: screening.id,
            seatId: seat.id,
            seatLabel: `${seat.row}${seat.number}`,
            filmTitle: screening.film?.title || 'Unknown Film',
            filmPoster: screening.film?.poster_url || '/images/placeholder-poster.jpg',
            screeningDate: formatDate(screening.start_time, 'EEEE, d MMMM yyyy'),
            screeningTime: formatTime(screening.start_time),
            hallName: screening.hall?.name || 'Main Hall',
            price: ticketSelection.price,
            ticketTypeId: ticketSelection.ticketTypeId,
            ticketTypeName: ticketSelection.ticketTypeName,
            expiresAt,
          });
        }
      });
      
      // Give Zustand persist a tick to flush to storage before navigation
      await new Promise((r) => setTimeout(r, 0));

      // Redirect directly to checkout (or cart if guest needs to enter contact info)
      if (isAuthenticated) {
        router.push('/checkout');
      } else {
        router.push('/cart');
      }
    } catch (err: unknown) {
      let errorMessage = 'Failed to lock seats. Please try again.';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'object' && err !== null) {
        const axiosErr = err as { response?: { data?: { error?: string } }; message?: string };
        errorMessage = axiosErr.response?.data?.error || axiosErr.message || errorMessage;
      }
      
      if (errorMessage.includes('already booked') || errorMessage.includes('already locked')) {
        errorMessage = 'Sorry, one or more seats you selected are no longer available. Please choose different seats.';
        refetch();
      } else if (errorMessage.includes('409') || errorMessage.includes('Conflict') || errorMessage.includes('status code 409')) {
        errorMessage = 'These seats were just taken by another customer. Please select different seats.';
        refetch();
      }
      setError(errorMessage);
    } finally {
      setIsLocking(false);
    }
  };

  const handleGoToCart = () => {
    router.push('/cart');
  };

  const handleGoToCheckout = () => {
    router.push(isAuthenticated ? '/checkout' : '/cart');
  };

  // Loading state
  if (!hydrated) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Loading seat map...</p>
        </div>
      </div>
    );
  }

  const { screening, seats } = data;
  const selectedSeatDetails = seats.filter((s) => selectedSeats.includes(s.id));
  const totalPrice = getTotal(selectedSeats);
  const posterUrl = screening.film?.poster_url || '/images/placeholder-poster.jpg';
  const cartItemCount = items.length;

  // Mark cart seats as "in_cart" status
  const seatsWithCartStatus = seats.map(seat => ({
    ...seat,
    status: cartSeatsForScreening.includes(seat.id) ? 'in_cart' : seat.status,
  }));

  return (
    <div className="min-h-screen bg-cream pt-2">
      {/* Film Info Header */}
      <div className="bg-primary text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link 
            href={`/film/${screening.film?.slug || ''}`} 
            className="inline-flex items-center text-white/80 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Film
          </Link>
          
          <div className="flex items-center gap-4 md:gap-6">
            {/* Mini Poster */}
            <div className="hidden sm:block relative w-16 md:w-20 h-24 md:h-28 rounded-lg overflow-hidden shadow-lg flex-shrink-0">
              <Image
                src={posterUrl}
                alt={screening.film?.title || 'Film'}
                fill
                className="object-cover"
              />
            </div>
            
            <div className="flex-1 min-w-0">
              <h1 className="text-xl md:text-2xl lg:text-3xl font-display font-bold truncate">
                {screening.film?.title}
              </h1>
              <div className="flex flex-wrap items-center gap-3 md:gap-4 mt-2 text-white/80 text-sm">
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-1.5" />
                  <span>{formatDate(screening.start_time, 'EEE, d MMM')} • {formatTime(screening.start_time)}</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-1.5" />
                  <span>{screening.hall?.name}</span>
                  {screening.hall?.is_4k && (
                    <span className="ml-2 px-2 py-0.5 bg-blue-500 text-white rounded text-xs font-bold">4K</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">
                1
              </div>
              <span className="ml-2 text-sm font-medium text-primary">Select Seats</span>
            </div>
            <div className="w-12 h-0.5 bg-gray-200" />
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center text-sm font-bold">
                2
              </div>
              <span className="ml-2 text-sm font-medium text-gray-500">Enter Details</span>
            </div>
            <div className="w-12 h-0.5 bg-gray-200" />
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center text-sm font-bold">
                3
              </div>
              <span className="ml-2 text-sm font-medium text-gray-500">Review & Pay</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-slide-down">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">Error</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
            <button 
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              ×
            </button>
          </div>
        )}

        {/* Added to Cart Success */}
        {addedToCart && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3 animate-slide-down">
            <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-green-800">Added to cart!</p>
              <p className="text-sm text-green-600 mt-1">
                Your seats have been reserved for 10 minutes.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleGoToCheckout}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
              >
                {isAuthenticated ? 'Checkout' : 'Continue'}
              </button>
              <button
                onClick={handleGoToCart}
                className="px-4 py-2 bg-white text-green-700 border border-green-200 rounded-lg text-sm font-medium hover:bg-green-50 transition-colors"
              >
                View Cart ({cartItemCount})
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Main Content - Seat Map */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm p-4 md:p-6">
              <h2 className="text-xl font-bold text-text-primary mb-2">Select Your Seats</h2>
              <p className="text-text-secondary text-sm mb-6">
                Click on available seats to select. Seats are held for 10 minutes after adding to cart.
              </p>
              
              {/* Legend */}
              <div className="flex flex-wrap gap-4 mb-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-emerald-500 rounded" />
                  <span className="text-text-secondary">Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-primary rounded" />
                  <span className="text-text-secondary">Selected</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-amber-500 rounded" />
                  <span className="text-text-secondary">In Cart</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-gray-300 rounded" />
                  <span className="text-text-secondary">Sold</span>
                </div>
              </div>

              <SeatMap
                seats={seatsWithCartStatus}
                selectedSeats={selectedSeats}
                onSeatClick={handleSeatClick}
                onRemoveFromCart={(seatId) => removeItemsBySeat(Number(id), seatId)}
                disabled={false}
              />
            </div>
          </div>

          {/* Sidebar - Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm p-5 md:p-6 sticky top-24">
              <h3 className="text-lg font-bold text-text-primary mb-4">Your Selection</h3>
              
              {selectedSeatDetails.length > 0 ? (
                <>
                  {/* Selected Seats with Ticket Type Selector */}
                  <div className="space-y-1 mb-4 divide-y divide-gray-100">
                    {selectedSeatDetails.map((seat) => (
                      <TicketTypeSelector
                        key={seat.id}
                        screeningId={screening.id}
                        seatId={seat.id}
                        seatLabel={`${seat.row}${seat.number}`}
                        defaultPrice={screening.price}
                        selectedTicketTypeId={getSelection(seat.id).ticketTypeId}
                        onSelect={setSelection}
                      />
                    ))}
                  </div>

                  {/* Total */}
                  <div className="border-t border-gray-100 pt-4 mb-6">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-text-primary">Total</span>
                      <span className="text-2xl font-bold text-primary">{formatCurrency(totalPrice)}</span>
                    </div>
                    <p className="text-xs text-text-muted mt-1">
                      {selectedSeats.length} ticket{selectedSeats.length > 1 ? 's' : ''}
                    </p>
                  </div>

                  {/* Proceed to Checkout Button - Primary action */}
                  <button
                    onClick={handleProceedToCheckout}
                    disabled={isLocking}
                    className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-all hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLocking ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Check className="w-5 h-5" />
                    )}
                    {isLocking ? 'Reserving...' : 'Proceed to Checkout'}
                  </button>

                  {/* Add to Cart Button - Secondary action */}
                  <button
                    onClick={handleAddToCart}
                    disabled={isLocking}
                    className="w-full mt-3 py-3 border-2 border-primary text-primary font-semibold rounded-xl hover:bg-primary/5 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-5 h-5" />
                    Add to Cart
                  </button>

                  {cartItemCount > 0 && (
                    <button
                      onClick={handleGoToCart}
                      className="w-full mt-3 py-3 border border-gray-300 text-text-secondary font-medium rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <ShoppingCart className="w-5 h-5" />
                      View Cart ({cartItemCount})
                    </button>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MapPin className="w-8 h-8 text-text-muted" />
                  </div>
                  <p className="text-text-secondary">
                    Select seats to add to your cart.
                  </p>
                  {cartItemCount > 0 && (
                    <button
                      onClick={handleGoToCart}
                      className="mt-4 px-6 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
                    >
                      View Cart ({cartItemCount})
                    </button>
                  )}
                </div>
              )}

              {/* Info */}
              <div className="mt-6 p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-700">
                  💡 You can add tickets from multiple screenings to your cart and checkout together.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
