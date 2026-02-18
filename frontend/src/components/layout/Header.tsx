'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/brand/Logo';
import { useAuthStore } from '@/stores/auth';
import { useCartStore } from '@/stores/cart';
import { useQuery } from '@tanstack/react-query';
import { programsApi } from '@/lib/api';
import type { Program } from '@/types';
import { Search, ShoppingCart, User, Menu, X, ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';

const navLinks = [
  { href: '/', label: 'films' },
  { href: '/events', label: 'events' },
  { href: '/membership', label: 'membership' },
  { href: '/gift-shop', label: 'gift shop' },
  { href: '/hire-us', label: 'hire us' },
  { href: '/mailing-list', label: 'join the mailing list' },
];

export function Header() {
  const pathname = usePathname();
  const { isAuthenticated, user, logout } = useAuthStore();
  const { items } = useCartStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileFilmsOpen, setMobileFilmsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [filmsDropdownOpen, setFilmsDropdownOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const { data: programs } = useQuery({
    queryKey: ['programs'],
    queryFn: async () => (await programsApi.list()).data as Program[],
    staleTime: 60_000,
  });

  useEffect(() => {
    const t = setTimeout(() => setHydrated(true), 0);
    return () => clearTimeout(t);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    const t = setTimeout(() => {
      setMobileMenuOpen(false);
      setMobileFilmsOpen(false);
      setUserMenuOpen(false);
    }, 0);
    return () => clearTimeout(t);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  const cartCount = hydrated ? items.length : 0;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[72px]">
          {/* Logo */}
          <div className="flex items-center">
            <Logo
              priority
              width={176}
              height={90}
              imageClassName="h-9 w-auto"
              className="block"
            />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center">
            {/* Films dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setFilmsDropdownOpen(true)}
              onMouseLeave={() => setFilmsDropdownOpen(false)}
            >
              <Link
                href="/"
                className={`fh-nav-link ${pathname === '/' ? 'text-white' : ''}`}
              >
                films
                <ChevronDown className={`w-3 h-3 opacity-60 transition-transform duration-200 ${filmsDropdownOpen ? 'rotate-180' : ''}`} />
              </Link>
              {filmsDropdownOpen && (
                <div className="absolute left-0 top-full pt-1 z-50">
                  <div className="bg-white rounded shadow-xl py-1.5 min-w-[220px] animate-slide-down">
                    <Link
                      href="/"
                      className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors font-medium"
                    >
                      All Films
                    </Link>
                    <hr className="my-1 border-gray-100" />
                    {programs?.map((program) => (
                      <Link
                        key={program.id}
                        href={`/?program=${program.slug}`}
                        className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors"
                      >
                        {program.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Other nav links */}
            {navLinks.filter(l => l.href !== '/').map((link) => {
              const isActive = pathname === link.href ||
                (link.href !== '/' && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`fh-nav-link ${isActive ? 'text-white' : ''}`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button className="text-white/80 hover:text-white transition-colors" aria-label="Search">
              <Search className="w-5 h-5" />
            </button>

            <Link href="/cart" className="relative text-white/80 hover:text-white transition-colors" aria-label="Cart">
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-white text-primary text-xs font-bold rounded-full flex items-center justify-center">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </Link>

            {/* User menu */}
            <div className="relative">
              <button
                className="text-white/80 hover:text-white transition-colors"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                onBlur={() => setTimeout(() => setUserMenuOpen(false), 200)}
                aria-label="Account"
              >
                <User className="w-5 h-5" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded shadow-xl py-2 animate-slide-down">
                  {isAuthenticated ? (
                    <>
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">{user?.first_name} {user?.last_name}</p>
                        <p className="text-xs text-gray-500">{user?.email}</p>
                      </div>
                      <Link href="/bookings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                        My Bookings
                      </Link>
                      {user?.role === 'admin' && (
                        <Link href="/admin" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                          Admin Panel
                        </Link>
                      )}
                      <hr className="my-1" />
                      <button
                        onClick={logout}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Sign Out
                      </button>
                    </>
                  ) : (
                    <>
                      <Link href="/login" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                        Sign In
                      </Link>
                      <Link href="/register" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                        Create Account
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden text-white/80 hover:text-white transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu - full screen overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-[72px] z-50 bg-primary overflow-y-auto">
          <nav className="px-6 py-6 space-y-1">
            {/* Films with expandable sub-menu */}
            <div>
              <button
                onClick={() => setMobileFilmsOpen(!mobileFilmsOpen)}
                className="flex items-center justify-between w-full px-3 py-3.5 text-[15px] tracking-wide text-white/90 hover:text-white transition-colors"
              >
                <span>films</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${mobileFilmsOpen ? 'rotate-180' : ''}`} />
              </button>
              <div className={`overflow-hidden transition-all duration-300 ${mobileFilmsOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                <Link
                  href="/"
                  className="block pl-8 pr-3 py-3 text-sm text-white/70 hover:text-white transition-colors"
                >
                  All Films
                </Link>
                {programs?.map((program) => (
                  <Link
                    key={program.id}
                    href={`/?program=${program.slug}`}
                    className="block pl-8 pr-3 py-3 text-sm text-white/70 hover:text-white transition-colors"
                  >
                    {program.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Other links */}
            {navLinks.filter(l => l.href !== '/').map((link) => {
              const isActive = pathname === link.href ||
                (link.href !== '/' && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`block px-3 py-3.5 text-[15px] tracking-wide transition-colors ${
                    isActive ? 'text-white' : 'text-white/90 hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}

            <hr className="border-white/15 my-4" />

            <Link
              href="/cart"
              className="block px-3 py-3.5 text-[15px] tracking-wide text-white/90 hover:text-white transition-colors"
            >
              cart {cartCount > 0 && `(${cartCount})`}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}