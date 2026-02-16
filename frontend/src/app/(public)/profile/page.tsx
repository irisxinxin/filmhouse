'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Mail, Phone, Calendar, Ticket, Star, Gift, Settings, LogOut, ChevronRight, Edit2, Check, X } from 'lucide-react';
import Link from 'next/link';

interface UserProfile {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  date_of_birth?: string;
  membership_tier: string;
  points: number;
  created_at: string;
}

interface Booking {
  id: number;
  booking_ref: string;
  status: string;
  final_amount: number;
  created_at: string;
  screening?: {
    start_time: string;
    film?: { title: string; poster_url?: string };
    hall?: { name: string };
  };
  tickets?: Array<{ seat?: { row: string; number: number } }>;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', phone: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchProfile(token);
    fetchBookings(token);
  }, [router]);

  const fetchProfile = async (token: string) => {
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user || data);
        setEditForm({
          first_name: data.user?.first_name || data.first_name || '',
          last_name: data.user?.last_name || data.last_name || '',
          phone: data.user?.phone || data.phone || '',
        });
      } else if (res.status === 401) {
        localStorage.removeItem('token');
        router.push('/login');
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async (token: string) => {
    try {
      const res = await fetch(`${API_URL}/bookings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBookings(data.slice(0, 5));
      }
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
    }
  };

  const handleSave = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        setEditing(false);
      }
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/');
  };

  const getMembershipColor = (tier: string) => {
    switch (tier?.toLowerCase()) {
      case 'patron': return 'from-amber-500 to-amber-600';
      case 'member': return 'from-primary to-primary-dark';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-cream pb-20">
      {/* Header */}
      <div className={`bg-gradient-to-br ${getMembershipColor(user.membership_tier)} text-white pt-8 pb-24`}>
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-display font-bold">My Profile</h1>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-white/80 hover:text-white text-sm"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Profile Card */}
      <div className="max-w-2xl mx-auto px-4 -mt-16">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Avatar & Name */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                {user.first_name?.[0]}{user.last_name?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                {editing ? (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editForm.first_name}
                        onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                        placeholder="First name"
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      />
                      <input
                        type="text"
                        value={editForm.last_name}
                        onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                        placeholder="Last name"
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      />
                    </div>
                    <input
                      type="tel"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      placeholder="Phone number"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-1 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium"
                      >
                        <Check className="w-4 h-4" />
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => setEditing(false)}
                        className="flex items-center gap-1 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-text-primary">
                        {user.first_name} {user.last_name}
                      </h2>
                      <button onClick={() => setEditing(true)} className="p-1 text-gray-400 hover:text-primary">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-text-muted text-sm">{user.email}</p>
                    {user.phone && <p className="text-text-muted text-sm">{user.phone}</p>}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Membership & Points */}
          <div className="grid grid-cols-2 divide-x divide-gray-100">
            <div className="p-5 text-center">
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold mb-1 bg-gradient-to-r ${getMembershipColor(user.membership_tier)} text-white`}>
                <Star className="w-3.5 h-3.5" />
                {user.membership_tier || 'Friend'}
              </div>
              <p className="text-xs text-text-muted">Membership</p>
            </div>
            <div className="p-5 text-center">
              <p className="text-2xl font-bold text-primary">{user.points || 0}</p>
              <p className="text-xs text-text-muted">Points</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 bg-white rounded-2xl shadow-sm overflow-hidden">
          <Link href="/bookings" className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Ticket className="w-5 h-5 text-primary" />
              </div>
              <span className="font-medium text-text-primary">My Bookings</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>
          <Link href="/membership" className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-t border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Gift className="w-5 h-5 text-amber-500" />
              </div>
              <span className="font-medium text-text-primary">Upgrade Membership</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>
        </div>

        {/* Recent Bookings */}
        {bookings.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="font-semibold text-text-primary">Recent Bookings</h3>
              <Link href="/bookings" className="text-sm text-primary font-medium">View All</Link>
            </div>
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100">
              {bookings.map((booking) => (
                <Link
                  key={booking.id}
                  href={`/bookings/${booking.id}`}
                  className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-12 h-16 rounded-lg bg-gray-200 overflow-hidden flex-shrink-0">
                    {booking.screening?.film?.poster_url && (
                      <img
                        src={booking.screening.film.poster_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text-primary truncate">
                      {booking.screening?.film?.title || 'Unknown Film'}
                    </p>
                    <p className="text-sm text-text-muted">
                      {booking.screening?.start_time
                        ? new Date(booking.screening.start_time).toLocaleDateString('en-SG', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'N/A'}
                    </p>
                    <p className="text-xs text-text-muted">{booking.booking_ref}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      booking.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
                      booking.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {booking.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Account Info */}
        <div className="mt-6 bg-white rounded-2xl shadow-sm p-4">
          <h3 className="font-semibold text-text-primary mb-3">Account Info</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3 text-text-secondary">
              <Mail className="w-4 h-4 text-gray-400" />
              <span>{user.email}</span>
            </div>
            {user.phone && (
              <div className="flex items-center gap-3 text-text-secondary">
                <Phone className="w-4 h-4 text-gray-400" />
                <span>{user.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-text-secondary">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span>Member since {new Date(user.created_at).toLocaleDateString('en-SG', { month: 'long', year: 'numeric' })}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
