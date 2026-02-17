'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { useCartStore } from '@/stores/cart';
import { Search, ShoppingCart, User, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';

const navLinks = [
  { href: '/', label: 'Films' },
  { href: '/events', label: 'Events' },
  { href: '/membership', label: 'Membership' },
  { href: '/gift-shop', label: 'Gift Shop' },
  { href: '/hire-us', label: 'Hire Us' },
];

export function Header() {
  const pathname = usePathname();
  const { isAuthenticated, user, logout } = useAuthStore();
  const { items } = useCartStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setHydrated(true), 0);
    return () => clearTimeout(t);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    const t = setTimeout(() => {
      setMobileMenuOpen(false);
      setUserMenuOpen(false);
    }, 0);
    return () => clearTimeout(t);
  }, [pathname]);

  const cartCount = hydrated ? items.length : 0;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <div className="border-2 border-white px-3 py-1">
              <span className="text-sm font-bold text-white tracking-widest">
                FILMHOUSE
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || 
                (link.href !== '/' && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-white'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            {/* Search */}
            <button className="text-white/80 hover:text-white transition-colors">
              <Search className="w-5 h-5" />
            </button>

            {/* Cart */}
            <Link href="/cart" className="relative text-white/80 hover:text-white transition-colors">
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-white text-primary text-xs font-bold rounded-full flex items-center justify-center animate-bounce-once">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </Link>

            {/* User */}
            <div className="relative">
              <button 
                className="text-white/80 hover:text-white transition-colors"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                onBlur={() => setTimeout(() => setUserMenuOpen(false), 200)}
              >
                <User className="w-5 h-5" />
              </button>
              
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl py-2 animate-slide-down">
                  {isAuthenticated ? (
                    <>
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">{user?.first_name} {user?.last_name}</p>
                        <p className="text-xs text-gray-500">{user?.email}</p>
                      </div>
                      <Link 
                        href="/bookings" 
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        My Bookings
                      </Link>
                      {user?.role === 'admin' && (
                        <Link 
                          href="/admin" 
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
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
                      <Link 
                        href="/login" 
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Sign In
                      </Link>
                      <Link 
                        href="/register" 
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
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

      {/* Mobile Menu */}
      <div className={`md:hidden overflow-hidden transition-all duration-300 ${
        mobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
      }`}>
        <nav className="bg-primary border-t border-white/20 px-4 py-4 space-y-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || 
              (link.href !== '/' && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-white bg-white/10'
                    : 'text-white/80 hover:text-white hover:bg-white/5'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <Link
            href="/cart"
            className="block px-4 py-3 rounded-lg text-sm font-medium text-white/80 hover:text-white hover:bg-white/5 transition-colors"
          >
            Cart {cartCount > 0 && `(${cartCount})`}
          </Link>
        </nav>
      </div>
    </header>
  );
}
