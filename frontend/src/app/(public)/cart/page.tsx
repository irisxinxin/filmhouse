'use client';

import { useCartStore, type CartItem } from '@/stores/cart';
import { useAuthStore } from '@/stores/auth';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Trash2, ShoppingCart, AlertCircle, Clock, ArrowRight, ArrowLeft, XCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface InvalidSeat {
  screening_id: number;
  seat_id: number;
  seat_label: string;
  film_title: string;
  reason: string;
}

export default function CartPage() {
  const router = useRouter();
  const { items, removeItem, clearCart, clearExpiredItems, getTotal, guestInfo, setGuestInfo } = useCartStore();
  const { isAuthenticated, user } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);
  const [expiredItems, setExpiredItems] = useState<CartItem[]>([]);
  const [invalidSeats, setInvalidSeats] = useState<InvalidSeat[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [guestForm, setGuestForm] = useState({
    name: guestInfo?.name || '',
    email: guestInfo?.email || '',
    phone: guestInfo?.phone || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setHydrated(true);
  }, []);

  // Validate cart seats against backend
  const validateCartSeats = useCallback(async () => {
    if (items.length === 0) {
      setInvalidSeats([]);
      return true;
    }

    setIsValidating(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/validate-cart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(item => ({
            screening_id: item.screeningId,
            seat_id: item.seatId,
            seat_label: item.seatLabel,
            film_title: item.filmTitle,
          })),
        }),
      });

      const data = await response.json();
      
      if (!data.valid && data.invalid_seats) {
        setInvalidSeats(data.invalid_seats);
        return false;
      }
      
      setInvalidSeats([]);
      return true;
    } catch (error) {
      console.error('Failed to validate cart:', error);
      return true; // Allow checkout on validation error, backend will catch it
    } finally {
      setIsValidating(false);
    }
  }, [items]);

  // Check for expired items on mount and periodically
  useEffect(() => {
    if (!hydrated) return;
    
    const checkExpired = () => {
      const expired = clearExpiredItems();
      if (expired.length > 0) {
        setExpiredItems(expired);
      }
    };
    
    checkExpired();
    const interval = setInterval(checkExpired, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, [hydrated, clearExpiredItems]);

  // Validate cart when items change or on mount
  useEffect(() => {
    if (hydrated && items.length > 0) {
      validateCartSeats();
    }
  }, [hydrated, items.length, validateCartSeats]);

  // Check if a specific item is invalid
  const isItemInvalid = (item: CartItem) => {
    return invalidSeats.some(
      inv => inv.screening_id === item.screeningId && inv.seat_id === item.seatId
    );
  };

  // Get invalid reason for an item
  const getInvalidReason = (item: CartItem) => {
    const invalid = invalidSeats.find(
      inv => inv.screening_id === item.screeningId && inv.seat_id === item.seatId
    );
    return invalid?.reason || 'This seat is no longer available';
  };

  const validateGuestForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!guestForm.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!guestForm.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestForm.email)) {
      newErrors.email = 'Invalid email address';
    }
    
    if (!guestForm.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[+]?[\d\s-]{8,}$/.test(guestForm.phone)) {
      newErrors.phone = 'Invalid phone number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProceedToCheckout = async () => {
    // Re-validate before proceeding
    const isValid = await validateCartSeats();
    if (!isValid) {
      return; // Don't proceed if there are invalid seats
    }

    if (!isAuthenticated && !guestInfo) {
      setShowGuestForm(true);
      return;
    }
    router.push('/checkout');
  };

  const handleGuestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateGuestForm()) {
      // Re-validate before proceeding
      const isValid = await validateCartSeats();
      if (!isValid) {
        return;
      }
      setGuestInfo(guestForm);
      setShowGuestForm(false);
      router.push('/checkout');
    }
  };

  const handleRemoveInvalidSeats = () => {
    // Remove all invalid seats from cart
    invalidSeats.forEach(inv => {
      const item = items.find(
        i => i.screeningId === inv.screening_id && i.seatId === inv.seat_id
      );
      if (item) {
        removeItem(item.id);
      }
    });
    setInvalidSeats([]);
  };

  const getTimeRemaining = (expiresAt: number) => {
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) return 'Expired';
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Group items by screening
  const groupedItems = items.reduce((acc, item) => {
    const key = `${item.screeningId}-${item.screeningDate}-${item.screeningTime}`;
    if (!acc[key]) {
      acc[key] = {
        screeningId: item.screeningId,
        filmTitle: item.filmTitle,
        filmPoster: item.filmPoster,
        screeningDate: item.screeningDate,
        screeningTime: item.screeningTime,
        hallName: item.hallName,
        items: [],
      };
    }
    acc[key].items.push(item);
    return acc;
  }, {} as Record<string, { screeningId: number; filmTitle: string; filmPoster: string; screeningDate: string; screeningTime: string; hallName: string; items: CartItem[] }>);

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-display font-bold text-text-primary flex items-center gap-3">
            <ShoppingCart className="w-7 h-7" />
            Your Cart
          </h1>
          {items.length > 0 && (
            <button
              onClick={clearCart}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Expired Items Warning */}
        {expiredItems.length > 0 && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">Some tickets have expired</p>
                <p className="text-sm text-amber-700 mt-1">
                  The following seats were removed because the reservation expired:
                </p>
                <ul className="text-sm text-amber-600 mt-2 space-y-1">
                  {expiredItems.map((item) => (
                    <li key={item.id}>
                      {item.filmTitle} - Seat {item.seatLabel}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => setExpiredItems([])}
                  className="text-sm text-amber-700 hover:text-amber-800 font-medium mt-2"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Invalid Seats Warning - Seats purchased by others */}
        {invalidSeats.length > 0 && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-red-800">Some seats are no longer available</p>
                <p className="text-sm text-red-700 mt-1">
                  The following seats have been purchased by another customer. Please remove them to continue:
                </p>
                <ul className="text-sm text-red-600 mt-2 space-y-1">
                  {invalidSeats.map((seat, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <span className="font-medium">{seat.film_title}</span> - Seat {seat.seat_label}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={handleRemoveInvalidSeats}
                  className="mt-3 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                >
                  Remove Unavailable Seats
                </button>
              </div>
            </div>
          </div>
        )}

        {items.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center">
            <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-text-primary mb-2">Your cart is empty</h2>
            <p className="text-text-secondary mb-6">Browse our films and add tickets to your cart.</p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Browse Films
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Cart Items */}
            {Object.values(groupedItems).map((group) => (
              <div key={`${group.screeningId}-${group.screeningDate}`} className="bg-white rounded-2xl overflow-hidden shadow-sm">
                {/* Film Header */}
                <div className="flex items-center gap-4 p-4 bg-gray-50 border-b">
                  <div className="relative w-16 h-24 rounded-lg overflow-hidden flex-shrink-0">
                    <Image
                      src={group.filmPoster || '/images/placeholder-poster.jpg'}
                      alt={group.filmTitle}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-text-primary">{group.filmTitle}</h3>
                    <p className="text-sm text-text-secondary">
                      {group.screeningDate} • {group.screeningTime}
                    </p>
                    <p className="text-sm text-text-muted">{group.hallName}</p>
                  </div>
                </div>

                {/* Seats */}
                <div className="p-4 space-y-3">
                  {group.items.map((item) => {
                    const invalid = isItemInvalid(item);
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between py-2 border-b border-gray-100 last:border-0 ${
                          invalid ? 'bg-red-50 -mx-4 px-4 rounded-lg' : ''
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <span className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold ${
                            invalid 
                              ? 'bg-red-100 text-red-600' 
                              : 'bg-primary/10 text-primary'
                          }`}>
                            {item.seatLabel}
                          </span>
                          <div>
                            <p className={`font-medium ${invalid ? 'text-red-700' : 'text-text-primary'}`}>
                              Seat {item.seatLabel}
                              {invalid && (
                                <span className="ml-2 text-xs bg-red-600 text-white px-2 py-0.5 rounded-full">
                                  Unavailable
                                </span>
                              )}
                            </p>
                            {invalid ? (
                              <p className="text-sm text-red-600 flex items-center gap-1">
                                <XCircle className="w-3 h-3" />
                                {getInvalidReason(item)}
                              </p>
                            ) : (
                              <p className="text-sm text-text-muted flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Expires in {getTimeRemaining(item.expiresAt)}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`font-semibold ${invalid ? 'text-red-600 line-through' : 'text-text-primary'}`}>
                            {formatCurrency(item.price)}
                          </span>
                          <button
                            onClick={() => removeItem(item.id)}
                            className={`p-2 rounded-lg transition-colors ${
                              invalid 
                                ? 'text-red-600 hover:bg-red-100' 
                                : 'text-red-500 hover:bg-red-50'
                            }`}
                            title="Remove"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Summary */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <span className="text-text-secondary">Subtotal ({items.length} tickets)</span>
                <span className="font-semibold text-text-primary">{formatCurrency(getTotal())}</span>
              </div>
              <div className="flex justify-between items-center text-lg font-bold mb-6">
                <span className="text-text-primary">Total</span>
                <span className="text-primary">{formatCurrency(getTotal())}</span>
              </div>

              {/* User Info */}
              {isAuthenticated ? (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-text-secondary">Booking as:</p>
                  <p className="font-medium text-text-primary">{user?.first_name} {user?.last_name}</p>
                  <p className="text-sm text-text-muted">{user?.email}</p>
                </div>
              ) : guestInfo ? (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-text-secondary">Booking as guest:</p>
                      <p className="font-medium text-text-primary">{guestInfo.name}</p>
                      <p className="text-sm text-text-muted">{guestInfo.email}</p>
                    </div>
                    <button
                      onClick={() => setGuestInfo(null)}
                      className="text-sm text-primary hover:underline"
                    >
                      Change
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/"
                  className="w-full sm:w-auto sm:flex-1 py-4 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 border border-gray-200 bg-white text-text-primary hover:bg-gray-50"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Buy More Tickets
                </Link>

                <button
                  onClick={handleProceedToCheckout}
                  disabled={invalidSeats.length > 0 || isValidating}
                  className={`w-full sm:w-auto sm:flex-1 py-4 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 ${
                    invalidSeats.length > 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-primary text-white hover:bg-primary-dark'
                  }`}
                >
                  {isValidating ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Validating...
                    </>
                  ) : invalidSeats.length > 0 ? (
                    <>
                      <XCircle className="w-5 h-5" />
                      Remove Unavailable Seats First
                    </>
                  ) : (
                    <>
                      Proceed to Checkout
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>

              {invalidSeats.length > 0 && (
                <p className="text-center text-sm text-red-600 mt-3">
                  Please remove unavailable seats before proceeding to checkout.
                </p>
              )}

              {!isAuthenticated && !guestInfo && (
                <p className="text-center text-sm text-text-muted mt-3">
                  You can checkout as a guest or{' '}
                  <Link href="/login?redirect=/cart" className="text-primary hover:underline">
                    sign in
                  </Link>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Guest Info Modal */}
        {showGuestForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 animate-slide-up">
              <h2 className="text-xl font-bold text-text-primary mb-2">Guest Checkout</h2>
              <p className="text-text-secondary mb-6">
                Enter your details to receive your tickets via email.
              </p>

              <form onSubmit={handleGuestSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={guestForm.name}
                    onChange={(e) => setGuestForm({ ...guestForm, name: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary ${
                      errors.name ? 'border-red-500' : 'border-gray-200'
                    }`}
                    placeholder="John Doe"
                  />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={guestForm.email}
                    onChange={(e) => setGuestForm({ ...guestForm, email: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary ${
                      errors.email ? 'border-red-500' : 'border-gray-200'
                    }`}
                    placeholder="john@example.com"
                  />
                  {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                  <p className="text-xs text-text-muted mt-1">
                    Your tickets will be sent to this email
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={guestForm.phone}
                    onChange={(e) => setGuestForm({ ...guestForm, phone: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary ${
                      errors.phone ? 'border-red-500' : 'border-gray-200'
                    }`}
                    placeholder="+65 9123 4567"
                  />
                  {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowGuestForm(false)}
                    className="flex-1 py-3 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors"
                  >
                    Continue
                  </button>
                </div>
              </form>

              <div className="mt-4 pt-4 border-t text-center">
                <p className="text-sm text-text-muted">
                  Already have an account?{' '}
                  <Link href="/login?redirect=/cart" className="text-primary hover:underline">
                    Sign in
                  </Link>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
