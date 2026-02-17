'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { loadStripe } from '@stripe/stripe-js';
import { useCartStore } from '@/stores/cart';
import { useAuthStore } from '@/stores/auth';
import { bookingsApi, paymentApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, CreditCard, Check, AlertCircle, Loader2, Trash2, Clock } from 'lucide-react';

// Initialize Stripe
const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

export default function CheckoutPage() {
  const router = useRouter();
  const { items, guestInfo, clearCart, clearExpiredItems, getTotal, removeItem } = useCartStore();
  const { isAuthenticated, user } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'paynow'>('card');
  const [expiredItems, setExpiredItems] = useState<string[]>([]);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [useStripe, setUseStripe] = useState(true);
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    setHydrated(true);
  }, []);

  // Update current time for countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Check for expired items
  useEffect(() => {
    if (!hydrated) return;
    
    const checkExpired = () => {
      const expired = clearExpiredItems();
      if (expired.length > 0) {
        setExpiredItems(expired.map(item => `${item.filmTitle} - Seat ${item.seatLabel}`));
      }
    };
    
    checkExpired();
    const interval = setInterval(checkExpired, 10000);
    return () => clearInterval(interval);
  }, [hydrated, clearExpiredItems]);

  // Redirect if no items or no user info
  useEffect(() => {
    if (hydrated && items.length === 0) {
      router.push('/cart');
    }
    if (hydrated && !isAuthenticated && !guestInfo) {
      router.push('/cart');
    }
  }, [hydrated, items.length, isAuthenticated, guestInfo, router]);

  // Create booking and redirect to Stripe
  const stripeCheckoutMutation = useMutation({
    mutationFn: async () => {
      // Group items by screening with ticket type info
      const screeningGroups = items.reduce((acc, item) => {
        if (!acc[item.screeningId]) {
          acc[item.screeningId] = [];
        }
        acc[item.screeningId].push({
          seat_id: item.seatId,
          ticket_type_id: item.ticketTypeId || 1,
        });
        return acc;
      }, {} as Record<number, { seat_id: number; ticket_type_id: number }[]>);

      // Create bookings for each screening
      const bookings = [];
      for (const [screeningId, tickets] of Object.entries(screeningGroups)) {
        let res;
        if (isAuthenticated) {
          const seatIds = tickets.map(t => t.seat_id);
          res = await bookingsApi.create(
            parseInt(screeningId),
            seatIds,
            paymentMethod
          );
        } else {
          res = await bookingsApi.createGuestBooking(
            parseInt(screeningId),
            tickets,
            paymentMethod,
            guestInfo || undefined
          );
        }
        bookings.push(res.data);
      }

      // For now, use the first booking for Stripe checkout
      // In production, you might want to combine multiple bookings
      const booking = bookings[0];
      
      // Create Stripe checkout session
      const baseUrl = window.location.origin;
      const successUrl = `${baseUrl}/checkout/success`;
      const cancelUrl = `${baseUrl}/checkout?cancelled=true`;
      
      const sessionRes = await paymentApi.createCheckoutSession(
        booking.id,
        successUrl,
        cancelUrl
      );

      return { bookings, session: sessionRes.data };
    },
    onSuccess: async ({ bookings, session }) => {
      if (session.demo_mode) {
        // Demo mode - directly confirm the bookings we just created
        try {
          for (const booking of bookings) {
            await paymentApi.demoConfirm(booking.id);
          }
          clearCart();
          const bookingRefs = bookings.map((b: { booking_ref: string }) => b.booking_ref).join(',');
          router.push(`/checkout/success?refs=${bookingRefs}`);
        } catch (err) {
          setProcessingError('Failed to confirm booking. Please try again.');
        }
        return;
      }

      // Redirect to Stripe Checkout using the URL from backend
      if (session.checkout_url) {
        window.location.href = session.checkout_url;
      } else {
        setProcessingError('Failed to get checkout URL');
      }
    },
    onError: (err: unknown) => {
      // Extract error message from various error formats
      let message = 'Failed to create checkout session';
      if (err instanceof Error) {
        message = err.message;
      } else if (typeof err === 'object' && err !== null) {
        const axiosErr = err as { response?: { data?: { error?: string } }; message?: string };
        message = axiosErr.response?.data?.error || axiosErr.message || message;
      }
      
      // Make error messages more user-friendly
      if (message.includes('already booked')) {
        setProcessingError('One or more seats you selected are no longer available. Please go back and select different seats.');
      } else if (message.includes('locked')) {
        setProcessingError('These seats are currently being held by another customer. Please try again in a few minutes or select different seats.');
      } else if (message.includes('expired')) {
        setProcessingError('Your seat reservation has expired. Please go back and select your seats again.');
      } else if (message.includes('409') || message.includes('status code 409')) {
        setProcessingError('One or more seats you selected are no longer available. Please go back and select different seats.');
      } else {
        setProcessingError(message);
      }
    },
  });

  // Demo checkout (fallback when Stripe not configured)
  const demoCheckoutMutation = useMutation({
    mutationFn: async () => {
      // Group items by screening with ticket type info
      const screeningGroups = items.reduce((acc, item) => {
        if (!acc[item.screeningId]) {
          acc[item.screeningId] = [];
        }
        acc[item.screeningId].push({
          seat_id: item.seatId,
          ticket_type_id: item.ticketTypeId || 1,
        });
        return acc;
      }, {} as Record<number, { seat_id: number; ticket_type_id: number }[]>);

      // Create bookings for each screening
      const bookings = [];
      for (const [screeningId, tickets] of Object.entries(screeningGroups)) {
        let res;
        if (isAuthenticated) {
          const seatIds = tickets.map(t => t.seat_id);
          res = await bookingsApi.create(
            parseInt(screeningId),
            seatIds,
            paymentMethod
          );
        } else {
          res = await bookingsApi.createGuestBooking(
            parseInt(screeningId),
            tickets,
            paymentMethod,
            guestInfo || undefined
          );
        }
        bookings.push(res.data);
      }
      
      // Confirm each booking with demo payment (only for authenticated users)
      // Guest bookings are auto-confirmed by the backend
      if (isAuthenticated) {
        for (const booking of bookings) {
          await paymentApi.demoConfirm(booking.id);
        }
      }
      
      return bookings;
    },
    onSuccess: (bookings) => {
      clearCart();
      const bookingRefs = bookings.map(b => b.booking_ref).join(',');
      router.push(`/checkout/success?refs=${bookingRefs}`);
    },
    onError: (err: Error) => {
      const message = err.message || 'Failed to process your order. Please try again.';
      // Make error messages more user-friendly
      if (message.includes('already booked')) {
        setProcessingError('One or more seats you selected are no longer available. Please go back and select different seats.');
      } else if (message.includes('locked')) {
        setProcessingError('These seats are currently being held by another customer. Please try again in a few minutes or select different seats.');
      } else if (message.includes('expired')) {
        setProcessingError('Your seat reservation has expired. Please go back and select your seats again.');
      } else {
        setProcessingError(message);
      }
    },
  });

  const handleCheckout = () => {
    setProcessingError(null);
    
    if (useStripe && stripePromise) {
      stripeCheckoutMutation.mutate();
    } else {
      demoCheckoutMutation.mutate();
    }
  };

  const getTimeRemaining = (expiresAt: number) => {
    const remaining = expiresAt - currentTime;
    if (remaining <= 0) return 'Expired';
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!hydrated || items.length === 0) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  const customerInfo = isAuthenticated 
    ? { name: `${user?.first_name} ${user?.last_name}`, email: user?.email, phone: user?.phone }
    : guestInfo;

  // Group items by screening for display
  const groupedItems = items.reduce((acc, item) => {
    const key = `${item.screeningId}`;
    if (!acc[key]) {
      acc[key] = {
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
  }, {} as Record<string, { filmTitle: string; filmPoster: string; screeningDate: string; screeningTime: string; hallName: string; items: typeof items }>);

  const isProcessing = stripeCheckoutMutation.isPending || demoCheckoutMutation.isPending;

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/cart" 
            className="inline-flex items-center text-text-secondary hover:text-primary mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Cart
          </Link>
          <h1 className="text-2xl font-display font-bold text-text-primary">Checkout</h1>
        </div>

        {/* Expired Items Warning */}
        {expiredItems.length > 0 && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-800">Some tickets have expired</p>
                <p className="text-sm text-red-700 mt-1">
                  The following seats were removed because the reservation expired:
                </p>
                <ul className="text-sm text-red-600 mt-2 list-disc list-inside">
                  {expiredItems.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Processing Error */}
        {processingError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">Payment Failed</p>
              <p className="text-sm text-red-600 mt-1">{processingError}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Summary */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 bg-gray-50 border-b">
                <h2 className="font-semibold text-text-primary">Order Summary</h2>
              </div>
              <div className="divide-y">
                {Object.entries(groupedItems).map(([key, group]) => (
                  <div key={key} className="p-4">
                    <div className="flex gap-4">
                      <div className="relative w-16 h-24 rounded-lg overflow-hidden flex-shrink-0">
                        <Image
                          src={group.filmPoster}
                          alt={group.filmTitle}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-text-primary">{group.filmTitle}</h3>
                        <p className="text-sm text-text-secondary">
                          {group.screeningDate} • {group.screeningTime}
                        </p>
                        <p className="text-sm text-text-muted">{group.hallName}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {group.items.map((item) => (
                            <div 
                              key={item.id}
                              className="flex items-center gap-2 px-2 py-1 bg-gray-100 rounded text-sm"
                            >
                              <span className="font-medium">{item.seatLabel}</span>
                              <span className="text-text-muted">{formatCurrency(item.price)}</span>
                              <span className="text-xs text-amber-600 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {getTimeRemaining(item.expiresAt)}
                              </span>
                              <button
                                onClick={() => removeItem(item.id)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Customer Info */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="font-semibold text-text-primary mb-4">Customer Information</h2>
              <div className="space-y-2">
                <p className="text-text-primary font-medium">{customerInfo?.name}</p>
                <p className="text-text-secondary">{customerInfo?.email}</p>
                {customerInfo?.phone && (
                  <p className="text-text-muted">{customerInfo.phone}</p>
                )}
              </div>
              <p className="text-xs text-text-muted mt-4">
                📧 Your tickets will be sent to this email address
              </p>
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="font-semibold text-text-primary mb-4">Payment Method</h2>
              
              <div className="space-y-3">
                <label className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  paymentMethod === 'card' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'card'}
                    onChange={() => setPaymentMethod('card')}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center transition-colors ${
                    paymentMethod === 'card' ? 'border-primary' : 'border-gray-300'
                  }`}>
                    {paymentMethod === 'card' && <div className="w-3 h-3 rounded-full bg-primary" />}
                  </div>
                  <CreditCard className="w-6 h-6 mr-4 text-text-secondary" />
                  <div>
                    <p className="font-semibold text-text-primary">Credit / Debit Card</p>
                    <p className="text-sm text-text-muted">Visa, Mastercard, AMEX</p>
                  </div>
                </label>

                <label className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  paymentMethod === 'paynow' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'paynow'}
                    onChange={() => setPaymentMethod('paynow')}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center transition-colors ${
                    paymentMethod === 'paynow' ? 'border-primary' : 'border-gray-300'
                  }`}>
                    {paymentMethod === 'paynow' && <div className="w-3 h-3 rounded-full bg-primary" />}
                  </div>
                  <div className="w-6 h-6 mr-4 bg-purple-600 rounded flex items-center justify-center text-xs font-bold text-white">
                    PN
                  </div>
                  <div>
                    <p className="font-semibold text-text-primary">PayNow</p>
                    <p className="text-sm text-text-muted">Pay via QR code</p>
                  </div>
                </label>
              </div>

              {/* Demo mode toggle */}
              <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-amber-700">
                    {useStripe && stripePromise 
                      ? '💳 Stripe test mode enabled' 
                      : '⚠️ Demo mode: Payment will be simulated'}
                  </p>
                  {stripePromise && (
                    <button
                      onClick={() => setUseStripe(!useStripe)}
                      className="text-xs text-amber-600 underline hover:text-amber-800"
                    >
                      {useStripe ? 'Use demo mode' : 'Use Stripe'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar - Total */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm p-6 sticky top-24">
              <h3 className="font-semibold text-text-primary mb-4">Payment Summary</h3>
              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Subtotal ({items.length} tickets)</span>
                  <span className="text-text-primary">{formatCurrency(getTotal())}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Booking Fee</span>
                  <span className="text-text-primary">{formatCurrency(0)}</span>
                </div>
              </div>

              <div className="border-t pt-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-text-primary">Total</span>
                  <span className="text-2xl font-bold text-primary">{formatCurrency(getTotal())}</span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={isProcessing || items.length === 0}
                className="w-full py-4 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    {useStripe && stripePromise ? 'Pay with Stripe' : 'Complete Payment'}
                  </>
                )}
              </button>

              <p className="text-xs text-text-muted text-center mt-4">
                By completing this purchase, you agree to our Terms of Service
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
