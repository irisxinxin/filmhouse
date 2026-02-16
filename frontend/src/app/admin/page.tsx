'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { Film, Calendar, Users, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import type { Booking } from '@/types';

export default function AdminDashboard() {
  const { data: films } = useQuery({
    queryKey: ['admin-films'],
    queryFn: async () => (await adminApi.listFilms()).data,
  });

  const { data: bookings } = useQuery({
    queryKey: ['admin-bookings'],
    queryFn: async () => (await adminApi.listBookings()).data as Booking[],
  });

  const today = format(new Date(), 'yyyy-MM-dd');
  const { data: screeningsData } = useQuery({
    queryKey: ['admin-screenings-today', today],
    queryFn: async () => {
      const res = await adminApi.listScreenings({ from: today, to: today });
      return res.data as { data: unknown[]; total: number };
    },
  });

  const totalRevenue = bookings?.reduce((sum, b) => sum + (b.status === 'confirmed' ? b.final_amount : 0), 0) || 0;

  const stats = [
    { label: 'Total Films', value: films?.length || 0, icon: Film, color: 'bg-blue-500' },
    { label: 'Today\'s Screenings', value: screeningsData?.total || 0, icon: Calendar, color: 'bg-green-500' },
    { label: 'Total Bookings', value: bookings?.length || 0, icon: Users, color: 'bg-purple-500' },
    { label: 'Revenue', value: `$${totalRevenue.toFixed(2)}`, icon: DollarSign, color: 'bg-yellow-500' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-8">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="card-dark p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">{stat.label}</p>
                <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Bookings */}
      <div className="card-dark p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Recent Bookings</h2>
        {bookings && bookings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
                  <th className="pb-3">Ref</th>
                  <th className="pb-3">Film</th>
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.slice(0, 10).map((booking: { id: number; booking_ref: string; screening?: { film?: { title: string } }; user?: { email: string }; final_amount: number; status: string }) => (
                  <tr key={booking.id} className="border-b border-gray-800">
                    <td className="py-3 font-mono text-sm">{booking.booking_ref}</td>
                    <td className="py-3">{booking.screening?.film?.title || '-'}</td>
                    <td className="py-3 text-gray-400">{booking.user?.email || '-'}</td>
                    <td className="py-3">${booking.final_amount.toFixed(2)}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        booking.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                        booking.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {booking.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400">No bookings yet.</p>
        )}
      </div>
    </div>
  );
}
