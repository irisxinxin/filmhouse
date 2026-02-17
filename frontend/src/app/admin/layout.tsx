'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth';
import { Film, Calendar, Users, LayoutDashboard, Settings, Armchair, QrCode, LogOut, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, logout } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);

  // Wait for hydration
  useEffect(() => {
    const t = setTimeout(() => setHydrated(true), 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (hydrated && (!isAuthenticated || user?.role !== 'admin')) {
      router.push('/login');
    }
  }, [hydrated, isAuthenticated, user, router]);

  if (!hydrated || !isAuthenticated || user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  const navItems = [
    { href: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
    { href: '/admin/scan', icon: QrCode, label: 'Scan Tickets' },
    { href: '/admin/films', icon: Film, label: 'Films' },
    { href: '/admin/screenings', icon: Calendar, label: 'Screenings' },
    { href: '/admin/halls', icon: Armchair, label: 'Halls & Seats' },
    { href: '/admin/bookings', icon: Users, label: 'Bookings' },
    { href: '/admin/settings', icon: Settings, label: 'Settings' },
  ];

  const isActive = (item: typeof navItems[0]) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname.startsWith(item.href);
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <div className="min-h-screen flex bg-dark text-white">
      {/* Sidebar */}
      <aside className="w-64 bg-dark-card border-r border-gray-800 fixed h-full flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-gray-800">
          <Link href="/" className="flex items-center gap-2 text-white hover:text-primary transition-colors">
            <span className="text-xl font-bold tracking-wider">FILMHOUSE</span>
          </Link>
          <p className="text-xs text-gray-500 mt-1">Admin Panel</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center px-4 py-3 rounded-lg transition-colors',
                isActive(item)
                  ? 'bg-primary text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              )}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="p-4 border-t border-gray-800 space-y-1">
          <Link
            href="/"
            className="flex items-center px-4 py-3 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <Home className="w-5 h-5 mr-3" />
            View Site
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-3 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-64 bg-dark-lighter min-h-screen">
        {children}
      </main>
    </div>
  );
}
