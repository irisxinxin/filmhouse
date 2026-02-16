'use client';

import { Check, Star, Gift, Ticket, Coffee, Percent, ChevronDown, Users } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

const tiers = [
  {
    name: 'Friend',
    price: 0,
    period: 'Free',
    description: 'Start your journey with Filmhouse',
    features: [
      'Newsletter updates',
      'Early access to event announcements',
      'Birthday greeting',
    ],
    cta: 'Sign Up Free',
    popular: false,
    color: 'gray',
  },
  {
    name: 'Member',
    price: 88,
    period: '/year',
    description: 'For the regular cinema-goer',
    features: [
      'All Friend benefits',
      '$2 off every ticket',
      '10% off at concessions',
      'Priority booking for events',
      'Member-only screenings',
      'Free popcorn on your birthday',
    ],
    cta: 'Join Now',
    popular: true,
    color: 'primary',
  },
  {
    name: 'Patron',
    price: 288,
    period: '/year',
    description: 'For the true film enthusiast',
    features: [
      'All Member benefits',
      '$4 off every ticket',
      '20% off at concessions',
      'Complimentary drink per visit',
      'Exclusive patron events',
      '2 guest passes per month',
      'Name on supporter wall',
    ],
    cta: 'Become a Patron',
    popular: false,
    color: 'amber',
  },
];

const benefits = [
  { icon: Ticket, title: 'Discounted Tickets', description: 'Save on every visit with member pricing' },
  { icon: Coffee, title: 'Concession Perks', description: 'Enjoy discounts on food and drinks' },
  { icon: Star, title: 'Exclusive Events', description: 'Access to member-only screenings and talks' },
  { icon: Gift, title: 'Birthday Treats', description: 'Special surprises on your special day' },
  { icon: Percent, title: 'Partner Discounts', description: 'Deals at nearby restaurants and cafes' },
];

const faqs = [
  { q: 'How do I use my membership?', a: 'Simply show your membership card or app at the box office to receive your benefits.' },
  { q: 'Can I upgrade my membership?', a: "Yes! You can upgrade anytime and we'll prorate the difference." },
  { q: 'Is my membership transferable?', a: 'Memberships are personal and non-transferable, but you can bring guests with certain tiers.' },
  { q: 'How do I cancel?', a: "Contact us anytime to cancel. We'll refund the unused portion of your membership." },
];

export default function MembershipPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-cream">
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary via-primary to-primary-dark text-white py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-sm mb-6">
            <Users className="w-4 h-4" />
            <span>Join 2,000+ members</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
            Join the Filmhouse Family
          </h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            Become a member and enjoy exclusive benefits, discounts, and access to special events.
          </p>
        </div>
      </div>

      {/* Benefits */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl font-display font-bold text-center text-text-primary mb-12">
          Member Benefits
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          {benefits.map((benefit) => (
            <div key={benefit.title} className="text-center group">
              <div className="w-14 h-14 bg-primary/10 group-hover:bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-3 transition-colors">
                <benefit.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-semibold text-text-primary mb-1">{benefit.title}</h3>
              <p className="text-sm text-text-muted">{benefit.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing Tiers */}
      <div className="bg-white py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-display font-bold text-center text-text-primary mb-12">
            Choose Your Membership
          </h2>
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`relative rounded-2xl p-6 lg:p-8 transition-all duration-300 ${
                  tier.popular
                    ? 'bg-primary text-white shadow-2xl shadow-primary/30 scale-[1.02] md:scale-105'
                    : 'bg-cream border border-gray-200 hover:border-gray-300 hover:shadow-lg'
                }`}
              >
                {tier.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
                    Most Popular
                  </span>
                )}
                <h3 className={`text-2xl font-bold mb-2 ${tier.popular ? 'text-white' : 'text-text-primary'}`}>
                  {tier.name}
                </h3>
                <p className={`text-sm mb-4 ${tier.popular ? 'text-white/80' : 'text-text-muted'}`}>
                  {tier.description}
                </p>
                <div className="mb-6">
                  <span className={`text-4xl font-bold ${tier.popular ? 'text-white' : 'text-primary'}`}>
                    ${tier.price}
                  </span>
                  <span className={tier.popular ? 'text-white/80' : 'text-text-muted'}>
                    {tier.period}
                  </span>
                </div>
                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        tier.popular ? 'bg-white/20' : 'bg-primary/10'
                      }`}>
                        <Check className={`w-3 h-3 ${tier.popular ? 'text-white' : 'text-primary'}`} />
                      </div>
                      <span className={`text-sm ${tier.popular ? 'text-white/90' : 'text-text-secondary'}`}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                <button
                  className={`w-full py-3 rounded-xl font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] ${
                    tier.popular
                      ? 'bg-white text-primary hover:bg-gray-100'
                      : 'bg-primary text-white hover:bg-primary-dark'
                  }`}
                >
                  {tier.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl font-display font-bold text-center text-text-primary mb-8">
          Frequently Asked Questions
        </h2>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div 
              key={i} 
              className="bg-white rounded-xl overflow-hidden shadow-sm"
            >
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between p-5 text-left"
              >
                <span className="font-semibold text-text-primary pr-4">{faq.q}</span>
                <ChevronDown className={`w-5 h-5 text-text-muted transition-transform flex-shrink-0 ${
                  openFaq === i ? 'rotate-180' : ''
                }`} />
              </button>
              <div className={`overflow-hidden transition-all duration-300 ${
                openFaq === i ? 'max-h-40' : 'max-h-0'
              }`}>
                <p className="px-5 pb-5 text-text-secondary">{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-dark text-white py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-display font-bold mb-4">Ready to Join?</h2>
          <p className="text-white/70 mb-6 max-w-md mx-auto">
            Start enjoying member benefits today. Sign up takes less than a minute.
          </p>
          <Link 
            href="/register"
            className="inline-block px-8 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-all hover:scale-[1.02]"
          >
            Get Started
          </Link>
        </div>
      </div>
    </div>
  );
}
