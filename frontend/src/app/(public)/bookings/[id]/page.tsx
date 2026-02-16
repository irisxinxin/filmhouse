'use client';

import { use, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { bookingsApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import type { Booking } from '@/types';
import { formatDate, formatTime, formatCurrency } from '@/lib/utils';
import { ArrowLeft, Calendar, MapPin, Ticket, CheckCircle, XCircle, Mail, Clock, Download, Share2, Loader2 } from 'lucide-react';
import Image from 'next/image';

export default function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const isNew = searchParams.get('new') === 'true';
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  const { data: booking, isLoading, refetch } = useQuery({
    queryKey: ['booking', id],
    queryFn: async () => (await bookingsApi.get(parseInt(id))).data as Booking,
    enabled: isAuthenticated,
  });

  // Auto-confirm for demo (simulate payment success)
  const confirmMutation = useMutation({
    mutationFn: () => bookingsApi.confirm(parseInt(id), `DEMO-${Date.now()}`),
    onSuccess: () => refetch(),
  });

  useEffect(() => {
    if (isNew && booking?.status === 'pending') {
      const timer = setTimeout(() => {
        confirmMutation.mutate();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isNew, booking?.status]);

  if (!isAuthenticated) return null;

  if (isLoading || !booking) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Loading booking details...</p>
        </div>
      </div>
    );
  }

  const posterUrl = booking.screening?.film?.poster_url || '/images/placeholder-poster.jpg';

  return (
    <div className="min-h-screen bg-cream py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link 
          href="/bookings" 
          className="inline-flex items-center text-text-secondary hover:text-primary mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to My Bookings
        </Link>

        {/* Success Banner for new bookings */}
        {isNew && booking.status === 'confirmed' && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center animate-slide-down">
            <CheckCircle className="w-6 h-6 text-emerald-500 mr-3 flex-shrink-0" />
            <div>
              <p className="font-semibold text-emerald-700">Booking Confirmed!</p>
              <p className="text-sm text-emerald-600">Your tickets have been booked successfully.</p>
            </div>
          </div>
        )}

        {isNew && booking.status === 'pending' && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center animate-slide-down">
            <Loader2 className="w-5 h-5 text-amber-500 mr-3 animate-spin flex-shrink-0" />
            <div>
              <p className="font-semibold text-amber-700">Processing Payment...</p>
              <p className="text-sm text-amber-600">Please wait while we confirm your booking.</p>
            </div>
          </div>
        )}

        {/* Main Booking Card */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* Header with Film Info */}
          <div className="relative bg-gradient-to-r from-primary to-primary-dark p-6 text-white">
            <div className="flex items-start gap-4">
              <div className="relative w-20 h-28 rounded-lg overflow-hidden shadow-lg flex-shrink-0">
                <Image
                  src={posterUrl}
                  alt={booking.screening?.film?.title || 'Film'}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-display font-bold mb-2 line-clamp-2">
                  {booking.screening?.film?.title || 'Unknown Film'}
                </h1>
                <div className="space-y-1 text-white/80 text-sm">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
                    {booking.screening?.start_time
                      ? formatDate(booking.screening.start_time, 'EEEE, d MMMM yyyy')
                      : '-'}
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-2 flex-shrink-0" />
                    {booking.screening?.start_time
                      ? formatTime(booking.screening.start_time)
                      : '-'}
                  </div>
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                    {booking.screening?.hall?.name || '-'}
                    {booking.screening?.hall?.is_4k && (
                      <span className="ml-2 px-2 py-0.5 bg-blue-500 text-white rounded text-xs font-bold">4K</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Status Badge */}
            <div className="absolute top-4 right-4">
              <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                booking.status === 'confirmed' ? 'bg-emerald-500 text-white' :
                booking.status === 'pending' ? 'bg-amber-500 text-white' :
                'bg-red-500 text-white'
              }`}>
                {booking.status === 'confirmed' && <CheckCircle className="w-3 h-3 inline mr-1" />}
                {booking.status === 'cancelled' && <XCircle className="w-3 h-3 inline mr-1" />}
                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
              </span>
            </div>
          </div>

          {/* Booking Reference */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wide">Booking Reference</p>
                <p className="text-2xl font-mono font-bold text-text-primary">{booking.booking_ref}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-text-muted">Booked on</p>
                <p className="text-sm text-text-secondary">
                  {formatDate(booking.created_at, 'd MMM yyyy, h:mm a')}
                </p>
              </div>
            </div>
          </div>

          {/* Tickets */}
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3 flex items-center">
              <Ticket className="w-4 h-4 mr-2" />
              Tickets ({booking.tickets?.length || 0})
            </h3>
            <div className="flex flex-wrap gap-2">
              {booking.tickets?.map((ticket) => (
                <div
                  key={ticket.id}
                  className="px-4 py-2.5 bg-cream rounded-xl text-center border border-gray-200"
                >
                  <p className="text-lg font-bold text-text-primary">{ticket.seat?.row}{ticket.seat?.number}</p>
                  <p className="text-xs text-text-muted">{formatCurrency(ticket.price)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Summary */}
          <div className="p-6">
            <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">
              Payment Summary
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-text-secondary">
                <span>Subtotal</span>
                <span>{formatCurrency(booking.total_amount)}</span>
              </div>
              {booking.discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Member Discount</span>
                  <span>-{formatCurrency(booking.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold text-text-primary pt-2 border-t border-gray-100">
                <span>Total Paid</span>
                <span className="text-primary">{formatCurrency(booking.final_amount)}</span>
              </div>
            </div>
            {booking.points_earned > 0 && (
              <p className="mt-4 text-sm text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">
                🎉 +{booking.points_earned} points earned with this booking
              </p>
            )}
          </div>
        </div>

        {/* QR Code Ticket */}
        {booking.status === 'confirmed' && (
          <div className="mt-6 bg-white rounded-2xl shadow-sm p-6 text-center">
            <h3 className="text-lg font-bold text-text-primary mb-4">🎫 Your E-Ticket</h3>
            
            <div className="inline-block p-4 bg-white rounded-xl border-2 border-dashed border-gray-200">
              <QRCodeSVG 
                value={booking.qr_code || booking.booking_ref} 
                size={180}
                level="M"
                includeMargin
              />
            </div>
            
            <p className="mt-4 font-mono text-xl font-bold text-primary">{booking.booking_ref}</p>
            <p className="mt-2 text-sm text-text-muted">
              Present this QR code at entry
            </p>
            
            {/* Redeem Status */}
            {booking.redeem_status === 'redeemed' && booking.redeemed_at && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-amber-700 font-medium">✓ Ticket Used</p>
                <p className="text-sm text-amber-600">
                  Redeemed on {formatDate(booking.redeemed_at, 'd MMM yyyy')} at {formatTime(booking.redeemed_at)}
                </p>
              </div>
            )}
            
            {/* Email Status */}
            {booking.email_sent && (
              <div className="mt-4 flex items-center justify-center text-sm text-text-muted">
                <Mail className="w-4 h-4 mr-2" />
                Ticket sent to your email
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-text-primary rounded-lg text-sm font-medium transition-colors">
                <Download className="w-4 h-4" />
                Save Ticket
              </button>
              <button className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-text-primary rounded-lg text-sm font-medium transition-colors">
                <Share2 className="w-4 h-4" />
                Share
              </button>
            </div>
          </div>
        )}

        {/* Help Section */}
        <div className="mt-6 text-center">
          <p className="text-sm text-text-muted">
            Need help? Contact us at{' '}
            <a href="mailto:hello@filmhouse.sg" className="text-primary hover:underline">
              hello@filmhouse.sg
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
