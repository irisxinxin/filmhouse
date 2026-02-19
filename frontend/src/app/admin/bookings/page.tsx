'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatCurrency, cn } from '@/lib/utils';
import { Search, Filter, RefreshCw, Mail, Eye, ChevronDown, Check, X, Clock, Ticket } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

interface Booking {
  id: number;
  booking_ref: string;
  status: string;
  total_amount: number;
  payment_method: string;
  payment_ref: string;
  guest_name: string;
  guest_email: string;
  created_at: string;
  user?: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  };
  screening: {
    id: number;
    start_time: string;
    film: {
      id: number;
      title: string;
    };
    hall: {
      id: number;
      name: string;
    };
  };
  tickets: Array<{
    id: number;
    price: number;
    seat: {
      id: number;
      row: string;
      number: number;
      seat_type: string;
    };
  }>;
}

async function fetchBookings(status?: string): Promise<Booking[]> {
  const token = localStorage.getItem('token');
  const url = status 
    ? `${API_URL}/admin/bookings?status=${status}`
    : `${API_URL}/admin/bookings`;
  
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch bookings');
  return res.json();
}

async function updateBookingStatus(id: number, status: string): Promise<void> {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_URL}/admin/bookings/${id}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error('Failed to update booking');
}

async function resendEmail(id: number): Promise<void> {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_URL}/admin/bookings/${id}/resend-email`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to resend email');
}

export default function AdminBookingsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const { data: bookings = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-bookings', statusFilter],
    queryFn: () => fetchBookings(statusFilter || undefined),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => 
      updateBookingStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
    },
  });

  const resendEmailMutation = useMutation({
    mutationFn: resendEmail,
    onSuccess: () => {
      alert('Email sent successfully!');
    },
    onError: () => {
      alert('Failed to send email');
    },
  });

  const filteredBookings = bookings.filter(booking => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      booking.booking_ref.toLowerCase().includes(query) ||
      booking.guest_email?.toLowerCase().includes(query) ||
      booking.guest_name?.toLowerCase().includes(query) ||
      booking.user?.email.toLowerCase().includes(query) ||
      booking.screening.film.title.toLowerCase().includes(query)
    );
  });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      refunded: 'bg-gray-100 text-gray-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-SG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Bookings</h1>
          <p className="text-gray-400 mt-1">Manage all ticket bookings</p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by ref, email, name, or film..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-10 pr-8 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white appearance-none focus:outline-none focus:border-primary"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
            <option value="refunded">Refunded</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {['pending', 'confirmed', 'cancelled', 'refunded'].map((status) => {
          const count = bookings.filter(b => b.status === status).length;
          const icons: Record<string, React.ReactNode> = {
            pending: <Clock className="w-5 h-5" />,
            confirmed: <Check className="w-5 h-5" />,
            cancelled: <X className="w-5 h-5" />,
            refunded: <RefreshCw className="w-5 h-5" />,
          };
          return (
            <div
              key={status}
              onClick={() => setStatusFilter(statusFilter === status ? '' : status)}
              className={cn(
                'p-4 rounded-lg cursor-pointer transition-all',
                statusFilter === status
                  ? 'bg-primary text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                {icons[status]}
                <span className="capitalize">{status}</span>
              </div>
              <p className="text-2xl font-bold">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-gray-800 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : filteredBookings.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No bookings found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Ref</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Film</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Screening</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Tickets</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Created</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-750">
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm text-primary">{booking.booking_ref}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-white text-sm">
                          {booking.user 
                            ? `${booking.user.first_name} ${booking.user.last_name}`
                            : booking.guest_name || 'Guest'}
                        </p>
                        <p className="text-gray-400 text-xs">
                          {booking.user?.email || booking.guest_email}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white text-sm">
                      {booking.screening.film.title}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-white text-sm">
                          {new Date(booking.screening.start_time).toLocaleDateString('en-SG', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </p>
                        <p className="text-gray-400 text-xs">
                          {new Date(booking.screening.start_time).toLocaleTimeString('en-SG', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })} • {booking.screening.hall.name}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Ticket className="w-4 h-4 text-gray-400" />
                        <span className="text-white">{booking.tickets?.length || 0}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white font-medium">
                      {formatCurrency(booking.total_amount)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'px-2 py-1 rounded-full text-xs font-medium capitalize',
                        getStatusBadge(booking.status)
                      )}>
                        {booking.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {formatDate(booking.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedBooking(booking)}
                          className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {booking.status === 'confirmed' && (
                          <button
                            onClick={() => resendEmailMutation.mutate(booking.id)}
                            disabled={resendEmailMutation.isPending}
                            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
                            title="Resend email"
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                        )}
                        {booking.status === 'pending' && (
                          <>
                            <button
                              onClick={() => updateStatusMutation.mutate({ id: booking.id, status: 'confirmed' })}
                              className="p-1.5 text-green-400 hover:text-green-300 hover:bg-green-900/30 rounded transition-colors"
                              title="Confirm"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => updateStatusMutation.mutate({ id: booking.id, status: 'cancelled' })}
                              className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded transition-colors"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-700 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Booking Details</h2>
                <p className="text-gray-400 font-mono">{selectedBooking.booking_ref}</p>
              </div>
              <button
                onClick={() => setSelectedBooking(null)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Status</span>
                <span className={cn(
                  'px-3 py-1 rounded-full text-sm font-medium capitalize',
                  getStatusBadge(selectedBooking.status)
                )}>
                  {selectedBooking.status}
                </span>
              </div>

              {/* Customer */}
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Customer</h3>
                <div className="bg-gray-900 rounded-lg p-4">
                  <p className="text-white font-medium">
                    {selectedBooking.user 
                      ? `${selectedBooking.user.first_name} ${selectedBooking.user.last_name}`
                      : selectedBooking.guest_name}
                  </p>
                  <p className="text-gray-400 text-sm">
                    {selectedBooking.user?.email || selectedBooking.guest_email}
                  </p>
                </div>
              </div>

              {/* Screening */}
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Screening</h3>
                <div className="bg-gray-900 rounded-lg p-4">
                  <p className="text-white font-medium">{selectedBooking.screening.film.title}</p>
                  <p className="text-gray-400 text-sm">
                    {formatDate(selectedBooking.screening.start_time)} • {selectedBooking.screening.hall.name}
                  </p>
                </div>
              </div>

              {/* Tickets */}
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">
                  Tickets ({selectedBooking.tickets?.length || 0})
                </h3>
                <div className="bg-gray-900 rounded-lg divide-y divide-gray-800">
                  {selectedBooking.tickets?.map((ticket) => (
                    <div key={ticket.id} className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center text-white font-medium">
                          {ticket.seat.row}{ticket.seat.number}
                        </span>
                        <div>
                          <p className="text-white text-sm">Seat {ticket.seat.row}{ticket.seat.number}</p>
                          <p className="text-gray-400 text-xs">Row {ticket.seat.row}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white">{formatCurrency(ticket.price)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment */}
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Payment</h3>
                <div className="bg-gray-900 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Method</span>
                    <span className="text-white capitalize">{selectedBooking.payment_method}</span>
                  </div>
                  {selectedBooking.payment_ref && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Reference</span>
                      <span className="text-white font-mono text-sm">{selectedBooking.payment_ref}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-gray-800">
                    <span className="text-white font-medium">Total</span>
                    <span className="text-primary font-bold text-lg">
                      {formatCurrency(selectedBooking.total_amount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                {selectedBooking.status === 'confirmed' && (
                  <button
                    onClick={() => {
                      resendEmailMutation.mutate(selectedBooking.id);
                    }}
                    disabled={resendEmailMutation.isPending}
                    className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <Mail className="w-4 h-4" />
                    Resend Email
                  </button>
                )}
                {selectedBooking.status === 'pending' && (
                  <>
                    <button
                      onClick={() => {
                        updateStatusMutation.mutate({ id: selectedBooking.id, status: 'confirmed' });
                        setSelectedBooking(null);
                      }}
                      className="flex-1 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      Confirm
                    </button>
                    <button
                      onClick={() => {
                        updateStatusMutation.mutate({ id: selectedBooking.id, status: 'cancelled' });
                        setSelectedBooking(null);
                      }}
                      className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
