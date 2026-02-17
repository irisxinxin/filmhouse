'use client';

import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { bookingsApi, paymentApi } from '@/lib/api';
import { useCartStore } from '@/stores/cart';
import { formatCurrency, formatDate, formatTime } from '@/lib/utils';
import Image from 'next/image';
import Link from 'next/link';
import { Check, Download, Mail, Home, Loader2 } from 'lucide-react';
import { Suspense, useEffect } from 'react';
import type { Ticket } from '@/types';

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const { clearCart } = useCartStore();
  const bookingRefs = searchParams.get('refs')?.split(',') || [];
  const sessionId = searchParams.get('session_id');

  // If we have a Stripe session_id, fetch the payment status first
  const { data: paymentStatus, isLoading: isLoadingPayment } = useQuery({
    queryKey: ['payment-status', sessionId],
    queryFn: async () => {
      const res = await paymentApi.getStatus(sessionId!);
      return res.data;
    },
    enabled: !!sessionId,
  });

  // Get booking refs from payment status or URL params
  const effectiveBookingRefs = paymentStatus?.booking_id 
    ? [paymentStatus.booking_id.toString()]
    : bookingRefs;

  const { data: bookings, isLoading: isLoadingBookings } = useQuery({
    queryKey: ['checkout-bookings', effectiveBookingRefs],
    queryFn: async () => {
      // If we have booking IDs from payment status, fetch by ID
      if (paymentStatus?.booking_id) {
        const res = await bookingsApi.get(paymentStatus.booking_id);
        return res.data ? [res.data] : [];
      }
      // Otherwise fetch by refs
      const results = await Promise.all(
        effectiveBookingRefs.map(ref => bookingsApi.getByRef(ref).catch(() => null))
      );
      return results.filter(r => r?.data).map(r => r!.data);
    },
    enabled: effectiveBookingRefs.length > 0 || !!paymentStatus,
  });

  const isLoading = isLoadingPayment || isLoadingBookings;

  // Stripe flow redirects away from the app, so the cart may still contain the old seats.
  // Once we can display the confirmed booking(s), clear the cart to avoid stale locks/"unavailable" warnings.
  useEffect(() => {
    if (bookings && bookings.length > 0) {
      clearCart();
    }
  }, [bookings, clearCart]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  if (!bookings || bookings.length === 0) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-text-primary mb-4">Booking Not Found</h1>
          <Link href="/" className="text-primary hover:underline">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  const totalAmount = bookings.reduce((sum, b) => sum + b.final_amount, 0);
  const totalTickets = bookings.reduce((sum, b) => sum + (b.tickets?.length || 0), 0);

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-display font-bold text-text-primary mb-2">
            Booking Confirmed!
          </h1>
          <p className="text-text-secondary">
            Your tickets have been booked successfully.
          </p>
        </div>

        {/* Email Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8 flex items-start gap-3">
          <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-blue-800">Check your email</p>
            <p className="text-sm text-blue-700">
              We&apos;ve sent your e-tickets to your email address. Please present the QR code at entry.
            </p>
          </div>
        </div>

        {/* Bookings */}
        <div className="space-y-6 mb-8">
          {bookings.map((booking) => (
            <div key={booking.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {/* Film Header */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 border-b">
                <div className="relative w-16 h-24 rounded-lg overflow-hidden flex-shrink-0">
                  <Image
                    src={booking.screening?.film?.poster_url || '/images/placeholder-poster.jpg'}
                    alt={booking.screening?.film?.title || 'Film'}
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <h3 className="font-semibold text-text-primary">
                    {booking.screening?.film?.title}
                  </h3>
                  <p className="text-sm text-text-secondary">
                    {formatDate(booking.screening?.start_time, 'EEEE, d MMMM yyyy')}
                  </p>
                  <p className="text-sm text-text-muted">
                    {formatTime(booking.screening?.start_time)} • {booking.screening?.hall?.name}
                  </p>
                </div>
              </div>

              {/* Booking Details */}
              <div className="p-4">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm text-text-secondary">Booking Reference</span>
                  <span className="font-mono font-bold text-primary">{booking.booking_ref}</span>
                </div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm text-text-secondary">Seats</span>
                  <span className="font-medium text-text-primary">
                    {booking.tickets?.map((t: Ticket) => `${t.seat?.row}${t.seat?.number}`).join(', ')}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-text-secondary">Amount Paid</span>
                  <span className="font-semibold text-text-primary">
                    {formatCurrency(booking.final_amount)}
                  </span>
                </div>
              </div>

              {/* QR Code */}
              <div className="p-4 bg-gray-50 border-t text-center">
                <p className="text-sm text-text-muted mb-3">Present this QR code at entry</p>
                <div className="inline-block bg-white p-4 rounded-xl shadow-sm">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${booking.qr_code}`}
                    alt="QR Code"
                    className="w-32 h-32"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
          <h3 className="font-semibold text-text-primary mb-4">Order Summary</h3>
          <div className="flex justify-between items-center mb-2">
            <span className="text-text-secondary">Total Tickets</span>
            <span className="font-medium text-text-primary">{totalTickets}</span>
          </div>
          <div className="flex justify-between items-center text-lg font-bold">
            <span className="text-text-primary">Total Paid</span>
            <span className="text-primary">{formatCurrency(totalAmount)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/"
            className="flex-1 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" />
            Back to Home
          </Link>
          <button
            onClick={() => window.print()}
            className="flex-1 py-3 border-2 border-primary text-primary rounded-xl font-semibold hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            Print Tickets
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
