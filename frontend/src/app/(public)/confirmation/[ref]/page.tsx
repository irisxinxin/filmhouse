'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { CheckCircle, Calendar, MapPin, Mail, Download, Home, Clock } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface Seat {
  id: number;
  row: string;
  number: number;
}

interface Ticket {
  id: number;
  seat: Seat;
  price: number;
}

interface Film {
  title: string;
  poster_url: string;
}

interface Hall {
  name: string;
}

interface Screening {
  film: Film;
  hall: Hall;
  start_time: string;
}

interface BookingDetails {
  id: number;
  booking_ref: string;
  screening: Screening;
  tickets: Ticket[];
  total_amount: number;
  final_amount: number;
  guest_name: string;
  guest_email: string;
  qr_code: string;
  status: string;
}

export default function ConfirmationPage() {
  const params = useParams();
  const bookingRef = params.ref as string;
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const response = await fetch(`http://localhost:8080/api/booking/ref/${bookingRef}`);
        if (!response.ok) {
          throw new Error('Booking not found');
        }
        const data = await response.json();
        setBooking(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load booking');
      } finally {
        setLoading(false);
      }
    };

    if (bookingRef) {
      fetchBooking();
    }
  }, [bookingRef]);

  // Format date and time
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-SG', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-SG', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getSeats = () => {
    return booking?.tickets.map(t => `${t.seat.row}${t.seat.number}`).sort() || [];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#c8a97e]"></div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Booking Not Found</h1>
          <p className="text-gray-400 mb-6">We couldn&apos;t find a booking with reference: {bookingRef}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-[#c8a97e] text-black px-6 py-3 rounded-lg font-medium hover:bg-[#d4b88f] transition-colors"
          >
            <Home className="w-5 h-5" />
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] py-12">
      <div className="max-w-2xl mx-auto px-4">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500/20 rounded-full mb-4">
            <CheckCircle className="w-12 h-12 text-green-500" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Booking Confirmed!</h1>
          <p className="text-gray-400">
            Your tickets have been sent to <span className="text-[#c8a97e]">{booking.guest_email}</span>
          </p>
        </div>

        {/* Booking Card */}
        <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden border border-gray-800">
          {/* Film Info */}
          <div className="flex gap-4 p-6 border-b border-gray-800">
            <div className="relative w-24 h-36 flex-shrink-0 rounded-lg overflow-hidden">
              <Image
                src={booking.screening.film.poster_url || '/placeholder-poster.jpg'}
                alt={booking.screening.film.title}
                fill
                className="object-cover"
              />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white mb-3">{booking.screening.film.title}</h2>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-300">
                  <Calendar className="w-4 h-4 text-[#c8a97e]" />
                  <span>{formatDate(booking.screening.start_time)}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <Clock className="w-4 h-4 text-[#c8a97e]" />
                  <span>{formatTime(booking.screening.start_time)}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <MapPin className="w-4 h-4 text-[#c8a97e]" />
                  <span>{booking.screening.hall.name}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Booking Details */}
          <div className="p-6 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Booking Reference</span>
              <span className="text-white font-mono text-lg font-bold">{booking.booking_ref}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Seats</span>
              <div className="flex gap-2">
                {getSeats().map((seat) => (
                  <span
                    key={seat}
                    className="bg-[#c8a97e]/20 text-[#c8a97e] px-3 py-1 rounded-lg font-medium"
                  >
                    {seat}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Total Paid</span>
              <span className="text-white font-bold text-xl">${booking.final_amount.toFixed(2)}</span>
            </div>
          </div>

          {/* QR Code */}
          <div className="p-6 bg-white/5 border-t border-gray-800">
            <div className="text-center">
              <p className="text-gray-400 text-sm mb-4">Show this QR code at the entrance</p>
              <div className="inline-block bg-white p-4 rounded-xl">
                <QRCodeSVG 
                  value={booking.qr_code || booking.booking_ref} 
                  size={160}
                  level="M"
                />
              </div>
              <p className="text-gray-500 text-xs mt-4">Ref: {booking.booking_ref}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4">
          <button className="flex-1 flex items-center justify-center gap-2 bg-[#1a1a1a] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#2a2a2a] transition-colors border border-gray-800">
            <Download className="w-5 h-5" />
            Download Tickets
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 bg-[#1a1a1a] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#2a2a2a] transition-colors border border-gray-800">
            <Mail className="w-5 h-5" />
            Resend Email
          </button>
        </div>

        {/* Back to Home */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[#c8a97e] hover:text-[#d4b88f] transition-colors"
          >
            <Home className="w-5 h-5" />
            Back to Home
          </Link>
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
          <p className="text-blue-400 text-sm">
            <strong>📧 Check your email!</strong> We&apos;ve sent your tickets to {booking.guest_email}. 
            If you don&apos;t see it, please check your spam folder.
          </p>
        </div>
      </div>
    </div>
  );
}
