'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { Mail, Lock, User, Phone, AlertCircle, Loader2, Eye, EyeOff, Check } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth, isAuthenticated } = useAuthStore();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    phone: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const passwordStrength = () => {
    const { password } = formData;
    if (password.length === 0) return null;
    if (password.length < 6) return { level: 'weak', text: 'Too short', color: 'bg-red-500' };
    if (password.length < 8) return { level: 'fair', text: 'Fair', color: 'bg-amber-500' };
    if (password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)) {
      return { level: 'strong', text: 'Strong', color: 'bg-emerald-500' };
    }
    return { level: 'good', text: 'Good', color: 'bg-blue-500' };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const res = await authApi.register({
        email: formData.email,
        password: formData.password,
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
      });
      setAuth(res.data.user, res.data.token);
      router.push('/');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const strength = passwordStrength();

  return (
    <div className="relative min-h-[80vh] bg-cream px-4 py-10">
      {/* Background texture */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-72 w-[44rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-primary/20 via-amber-200/30 to-primary/10 blur-3xl" />
        <div className="absolute -bottom-24 right-[-6rem] h-64 w-64 rounded-full bg-gradient-to-tr from-primary/15 to-emerald-200/20 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.22]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.05) 1px, transparent 0)',
            backgroundSize: '18px 18px',
          }}
        />
      </div>

      <div className="relative mx-auto w-full max-w-4xl">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] overflow-hidden rounded-3xl border border-black/5 bg-white shadow-[0_22px_60px_-35px_rgba(15,23,42,0.45)]">
          {/* Left: Form */}
          <div className="p-7 sm:p-10">
            <div className="flex items-start justify-between gap-6">
              <div>
                <Link href="/" className="inline-flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
                    <span className="text-sm font-black tracking-widest">FH</span>
                  </span>
                  <span className="text-lg font-display font-bold text-text-primary tracking-[0.12em]">
                    FILMHOUSE
                  </span>
                </Link>
                <h1 className="mt-5 text-3xl sm:text-4xl font-display font-bold text-text-primary leading-tight">
                  Create your account
                </h1>
                <p className="mt-2 text-sm sm:text-base text-text-secondary max-w-md">
                  Save your details for faster checkout, view bookings, and earn membership points.
                </p>
              </div>
              <div className="hidden sm:flex flex-col items-end text-right">
                <span className="text-xs font-semibold text-text-muted">Already a member?</span>
                <Link href="/login" className="mt-1 text-sm font-semibold text-primary hover:text-primary-dark">
                  Sign in →
                </Link>
              </div>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 animate-slide-down">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-700 text-sm leading-relaxed">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="first_name" className="block text-sm font-medium text-text-primary mb-2">
                  First Name
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                  <input
                    id="first_name"
                    name="first_name"
                    type="text"
                    value={formData.first_name}
                    onChange={handleChange}
                    className="input pl-12 w-full"
                    placeholder="John"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="last_name" className="block text-sm font-medium text-text-primary mb-2">
                  Last Name
                </label>
                <input
                  id="last_name"
                  name="last_name"
                  type="text"
                  value={formData.last_name}
                  onChange={handleChange}
                  className="input w-full"
                  placeholder="Doe"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="input pl-12 w-full"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-text-primary mb-2">
                Phone <span className="text-text-muted font-normal">(optional)</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  className="input pl-12 w-full"
                  placeholder="+65 9123 4567"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-primary mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  className="input pl-12 pr-12 w-full"
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {/* Password Strength */}
              {strength && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${strength.color} transition-all`}
                      style={{ width: strength.level === 'weak' ? '25%' : strength.level === 'fair' ? '50%' : strength.level === 'good' ? '75%' : '100%' }}
                    />
                  </div>
                  <span className="text-xs text-text-muted">{strength.text}</span>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-text-primary mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="input pl-12 pr-12 w-full"
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                />
                {formData.confirmPassword && formData.password === formData.confirmPassword && (
                  <Check className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full rounded-2xl bg-primary px-5 py-3.5 text-white font-semibold shadow-sm transition-all hover:bg-primary-dark hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating account...
                </span>
              ) : (
                'Create Account'
              )}
            </button>

            <div className="mt-6 sm:hidden text-center text-sm text-text-muted">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:text-primary-dark font-semibold">
                Sign in
              </Link>
            </div>

            {/* Terms */}
            <p className="mt-6 text-center text-xs text-text-muted leading-relaxed">
              By creating an account, you agree to our{' '}
              <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>
              {' '}and{' '}
              <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
            </p>
          </form>
          </div>

          {/* Right: Benefits */}
          <aside className="relative border-t border-black/5 bg-gradient-to-b from-cream to-white p-7 sm:p-10 lg:border-t-0 lg:border-l">
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-black/10 to-transparent lg:hidden" />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold tracking-wider text-text-muted">YOUR TICKET TO</p>
                <h2 className="mt-1 text-2xl font-display font-bold text-text-primary">Member Perks</h2>
              </div>
              <div className="h-10 w-10 rounded-2xl bg-white shadow-sm border border-black/5 flex items-center justify-center">
                <Check className="h-5 w-5 text-emerald-600" />
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-2xl bg-white/70 border border-black/5 p-4">
                <p className="text-sm font-semibold text-text-primary">Faster checkout</p>
                <p className="mt-1 text-sm text-text-secondary">Auto-fill your details and jump straight to seats.</p>
              </div>
              <div className="rounded-2xl bg-white/70 border border-black/5 p-4">
                <p className="text-sm font-semibold text-text-primary">All bookings in one place</p>
                <p className="mt-1 text-sm text-text-secondary">Reopen QR tickets anytime from your profile.</p>
              </div>
              <div className="rounded-2xl bg-white/70 border border-black/5 p-4">
                <p className="text-sm font-semibold text-text-primary">Membership points</p>
                <p className="mt-1 text-sm text-text-secondary">Earn points and access member pricing.</p>
              </div>
            </div>

            <div className="mt-8 rounded-3xl bg-dark text-white p-5 shadow-sm">
              <p className="text-xs font-semibold tracking-wider text-white/70">TIP</p>
              <p className="mt-1 text-sm text-white/85 leading-relaxed">
                Use an email you can access right now — we send e-tickets there after checkout.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
