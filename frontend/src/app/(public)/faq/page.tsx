'use client';

import { useState } from 'react';
import { ChevronDown, Search, Mail, MessageCircle } from 'lucide-react';
import Link from 'next/link';

const faqs = [
  {
    category: 'Tickets & Booking',
    icon: '🎟️',
    questions: [
      {
        q: 'How do I book tickets?',
        a: 'You can book tickets online through our website or at our box office. Online bookings require an account. Select your film, choose your seats, and complete payment to receive your e-ticket.',
      },
      {
        q: 'Can I cancel or refund my tickets?',
        a: 'All ticket sales are final. Refunds are only provided if a screening is cancelled by Filmhouse. In such cases, you will be offered a full refund or the option to rebook for another screening.',
      },
      {
        q: 'How early should I arrive?',
        a: 'We recommend arriving at least 15 minutes before your screening. This allows time to collect any snacks and find your seats. Latecomers may not be admitted once the film has started.',
      },
      {
        q: 'Can I choose my seats?',
        a: 'Yes! Our online booking system allows you to select your preferred seats. Seats are allocated on a first-come, first-served basis.',
      },
    ],
  },
  {
    category: 'Membership',
    icon: '⭐',
    questions: [
      {
        q: 'What are the membership benefits?',
        a: 'Members enjoy priority booking, discounted tickets, birthday treats, exclusive event invitations, and more. Benefits vary by membership tier (Friend, Member, Patron).',
      },
      {
        q: 'How do I sign up for membership?',
        a: 'You can sign up online through our Membership page or at our box office. Membership is valid for one year from the date of purchase.',
      },
      {
        q: 'Can I upgrade my membership?',
        a: 'Yes, you can upgrade your membership at any time. The price difference will be prorated based on your remaining membership period.',
      },
    ],
  },
  {
    category: 'Venue & Facilities',
    icon: '🏛️',
    questions: [
      {
        q: 'Where is Filmhouse located?',
        a: 'We are located at Golden Mile Tower, 6001 Beach Road, #05-00, Singapore 199589. The nearest MRT station is Nicoll Highway (Circle Line).',
      },
      {
        q: 'Is there parking available?',
        a: 'Yes, Golden Mile Tower has a multi-storey car park. Parking rates apply as per the building management.',
      },
      {
        q: 'Is the venue wheelchair accessible?',
        a: 'Yes, our venue is wheelchair accessible. Please contact us in advance if you require any special assistance, and we will be happy to accommodate your needs.',
      },
      {
        q: 'Can I bring outside food and drinks?',
        a: 'Outside food and beverages are not permitted in our cinema halls. We have a snack bar offering a selection of drinks, popcorn, and light bites.',
      },
    ],
  },
  {
    category: 'Events & Hire',
    icon: '🎬',
    questions: [
      {
        q: 'Can I hire the venue for private events?',
        a: 'Yes! Our cinema spaces are available for private screenings, corporate events, and special occasions. Please visit our Hire Us page or contact events@filmhouse.sg for more information.',
      },
      {
        q: 'Do you host film festivals or special events?',
        a: 'Yes, we regularly host film festivals, director Q&As, and special screenings. Check our Events page or subscribe to our newsletter to stay updated.',
      },
    ],
  },
];

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  const toggleItem = (key: string) => {
    setOpenItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const filteredFaqs = searchQuery
    ? faqs.map(section => ({
        ...section,
        questions: section.questions.filter(
          q => q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
               q.a.toLowerCase().includes(searchQuery.toLowerCase())
        )
      })).filter(section => section.questions.length > 0)
    : faqs;

  return (
    <div className="min-h-screen bg-cream">
      {/* Hero */}
      <div className="bg-primary text-white py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">FAQ</h1>
          <p className="text-xl text-white/80 max-w-2xl mb-8">
            Find answers to commonly asked questions about Filmhouse.
          </p>
          
          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
            <input
              type="text"
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/40"
            />
          </div>
        </div>
      </div>

      {/* FAQ Sections */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {filteredFaqs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-text-secondary text-lg">No results found for &quot;{searchQuery}&quot;</p>
            <button 
              onClick={() => setSearchQuery('')}
              className="mt-4 text-primary hover:underline"
            >
              Clear search
            </button>
          </div>
        ) : (
          filteredFaqs.map((section, sectionIndex) => (
            <div key={sectionIndex} className="mb-10">
              <h2 className="text-xl font-display font-bold text-text-primary mb-6 flex items-center gap-3">
                <span className="text-2xl">{section.icon}</span>
                {section.category}
              </h2>
              <div className="space-y-3">
                {section.questions.map((faq, questionIndex) => {
                  const key = `${sectionIndex}-${questionIndex}`;
                  const isOpen = openItems[key];
                  return (
                    <div 
                      key={questionIndex} 
                      className="bg-white rounded-xl overflow-hidden shadow-sm"
                    >
                      <button
                        onClick={() => toggleItem(key)}
                        className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
                      >
                        <span className="font-semibold text-text-primary pr-4">{faq.q}</span>
                        <ChevronDown className={`w-5 h-5 text-text-muted transition-transform flex-shrink-0 ${
                          isOpen ? 'rotate-180' : ''
                        }`} />
                      </button>
                      <div className={`overflow-hidden transition-all duration-300 ${
                        isOpen ? 'max-h-96' : 'max-h-0'
                      }`}>
                        <div className="px-5 pb-5 text-text-secondary leading-relaxed">
                          {faq.a}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}

        {/* Contact CTA */}
        <div className="mt-12 bg-white rounded-2xl p-8 text-center shadow-sm">
          <MessageCircle className="w-12 h-12 text-primary mx-auto mb-4" />
          <h3 className="text-xl font-display font-bold text-text-primary mb-2">Still have questions?</h3>
          <p className="text-text-secondary mb-6">We&apos;re here to help!</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="mailto:hello@filmhouse.sg"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-colors"
            >
              <Mail className="w-4 h-4" />
              Email Us
            </a>
            <Link
              href="/hire-us"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-text-primary font-semibold rounded-xl transition-colors"
            >
              Contact Form
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
