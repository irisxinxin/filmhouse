'use client';

import { useState } from 'react';
import { Mail, Check, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function MailingListPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Demo mode — just show success
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-xl mx-auto px-4 py-16 sm:py-24">
        <Link
          href="/"
          className="inline-flex items-center text-text-secondary hover:text-primary mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>

        <div className="bg-white rounded-2xl shadow-sm p-8 sm:p-10">
          {submitted ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-display font-bold text-text-primary mb-3">
                You&apos;re on the list!
              </h1>
              <p className="text-text-secondary mb-6">
                We&apos;ll keep you updated on new films, special screenings, and exclusive events at Filmhouse.
              </p>
              <Link
                href="/"
                className="inline-flex items-center px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors"
              >
                Browse Films
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-7 h-7 text-primary" />
                </div>
                <h1 className="text-2xl font-display font-bold text-text-primary mb-2">
                  Join Our Mailing List
                </h1>
                <p className="text-text-secondary">
                  Be the first to know about new films, special screenings, and exclusive events at Filmhouse Singapore.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    placeholder="you@example.com"
                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary ${
                      error ? 'border-red-500' : 'border-gray-200'
                    }`}
                  />
                  {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors"
                >
                  Subscribe
                </button>
              </form>

              <p className="text-xs text-text-muted text-center mt-6">
                We respect your privacy. Unsubscribe at any time.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
