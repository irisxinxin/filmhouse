'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import { bookingsApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import type { Booking } from '@/types';
import { formatDate, formatTime, formatCurrency } from '@/lib/utils';
import { Ticket, Calendar, MapPin, ChevronRight, Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function BookingsPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/bookings');
    }
  }, [isAuthenticated, router]);

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['user-bookings'],
    queryFn: async () => (await bookingsApi.list()).data as Booking[],
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) return null;

  // Separate upcoming and past bookings
  const now = new Date();
  const upcomingBookings = bookings?.filter(b => 
    b.screening?.start_time && new Date(b.screening.start_time) > now && b.status !== 'cancelled'
  ) || [];
  const pastBookings = bookings?.filter(b => 
    !b.screening?.start_time || new Date(b.screening.start_time) <= now || b.status === 'cancelled'
  ) || [];

  return (
    <div className="min-h-screen bg-cream py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-display font-bold text-text-primary">My Bookings</h1>
            <p className="text-text-secondary mt-1">
              Welcome back, {user?.first_name || 'Guest'}
            </p>
          </div>
          <Link 
            href="/"
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
          >
            Book More
          </Link>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : bookings && bookings.length > 0 ? (
          <div className="space-y-8">
            {/* Upcoming Bookings */}
            {upcomingBookings.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Upcoming ({upcomingBookings.length})
                </h2>
                <div className="space-y-4">
                  {upcomingBookings.map((booking) => (
                    <BookingCard key={booking.id} booking={booking} />
                  ))}
                </div>
              </section>
            )}

            {/* Past Bookings */}
            {pastBookings.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-text-muted mb-4">
                  Past Bookings ({pastBookings.length})
                </h2>
                <div className="space-y-4 opacity-75">
                  {pastBookings.map((booking) => (
                    <BookingCard key={booking.id} booking={booking} isPast />
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Ticket className="w-10 h-10 text-text-muted" />
            </div>
            <h3 className="text-xl font-semibold text-text-primary mb-2">No bookings yet</h3>
            <p className="text-text-secondary mb-6">Browse our films and book your first ticket!</p>
            <Link href="/" className="btn btn-primary">
              Browse Films
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function BookingCard({ booking, isPast = false }: { booking: Booking; isPast?: boolean }) {
  const posterUrl = booking.screening?.film?.poster_url || '/images/placeholder-poster.jpg';
  
  const getStatusBadge = () => {
    switch (booking.status) {
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">
            <CheckCircle className="w-3 h-3" />
            Confirmed
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
            <XCircle className="w-3 h-3" />
            Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <Link
      href={`/bookings/${booking.id}`}
      className="bg-white rounded-xl p-4 md:p-5 flex gap-4 hover:shadow-md transition-all group"
    >
      {/* Poster */}
      <div className="relative w-16 h-24 md:w-20 md:h-28 rounded-lg overflow-hidden flex-shrink-0">
        <Image
          src={posterUrl}
          alt={booking.screening?.film?.title || 'Film'}
          fill
          className="object-cover"
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-text-primary line-clamp-1 group-hover:text-primary transition-colors">
            {booking.screening?.film?.title || 'Unknown Film'}
          </h3>
          {getStatusBadge()}
        </div>
        
        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-text-secondary">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4 text-text-muted" />
            {booking.screening?.start_time
              ? formatDate(booking.screening.start_time, 'EEE, d MMM')
              : '-'}
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4 text-text-muted" />
            {booking.screening?.start_time
              ? formatTime(booking.screening.start_time)
              : '-'}
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="w-4 h-4 text-text-muted" />
            {booking.screening?.hall?.name || '-'}
          </div>
        </div>

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-3">
            <span className="text-xs text-text-muted">
              Ref: <span className="font-mono font-medium text-text-secondary">{booking.booking_ref}</span>
            </span>
            <span className="text-xs text-text-muted flex items-center gap-1">
              <Ticket className="w-3 h-3" />
              {booking.tickets?.length || 0} ticket{(booking.tickets?.length || 0) !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-primary">
              {formatCurrency(booking.final_amount)}
            </span>
            <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </div>
        </div>
      </div>
    </Link>
  );
}
