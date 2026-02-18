'use client';

import { Calendar, MapPin, Clock, Users, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { format, isPast, isToday } from 'date-fns';

const events = [
  {
    id: 1,
    title: "Director's Talk: Park Chan-wook",
    date: '2026-02-20',
    time: '7:00 PM',
    venue: 'Green Room',
    image: '/images/banners/thirst-banner.jpg',
    description: "Join us for an exclusive Q&A session with acclaimed Korean director Park Chan-wook, discussing his filmmaking journey and the art of visual storytelling.",
    price: 25,
    spots: 50,
    category: 'Talk',
  },
  {
    id: 2,
    title: 'Classic Cinema Night: Hitchcock Marathon',
    date: '2026-02-22',
    time: '6:00 PM',
    venue: 'Blue Room',
    image: '/images/banners/hamnet-banner.jpg',
    description: "Experience three of Hitchcock's greatest masterpieces back-to-back: Vertigo, Psycho, and Rear Window.",
    price: 35,
    spots: 80,
    category: 'Screening',
  },
  {
    id: 3,
    title: 'Film Photography Workshop',
    date: '2026-02-28',
    time: '2:00 PM',
    venue: 'Redrum',
    image: '/images/banners/little-miss-sunshine-banner.jpg',
    description: 'Learn the basics of 35mm film photography with hands-on experience. Camera and film provided.',
    price: 60,
    spots: 20,
    category: 'Workshop',
  },
  {
    id: 4,
    title: 'Singapore Shorts Film Festival',
    date: '2026-03-05',
    time: '4:00 PM',
    venue: 'Green Room',
    image: '/images/banners/sentimental-value-banner.jpg',
    description: 'Celebrating local filmmakers with a curated selection of the best Singaporean short films from the past year.',
    price: 18,
    spots: 120,
    category: 'Festival',
  },
];

const categories = ['All', 'Screening', 'Talk', 'Workshop', 'Festival'];

export default function EventsPage() {
  const formatEventDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return format(date, 'EEEE, d MMMM yyyy');
  };

  const getDateStatus = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isPast(date)) return 'past';
    if (isToday(date)) return 'today';
    return 'upcoming';
  };

  return (
    <div className="min-h-screen" style={{ background: '#DED4CC' }}>
      {/* Hero */}
      <div className="bg-primary text-white py-16">
        <div className="max-w-[1335px] mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">Events</h1>
          <p className="text-xl text-[#DED4CC] max-w-2xl">
            Join us for special screenings, workshops, and community gatherings at Filmhouse.
          </p>
        </div>
      </div>

      {/* Categories Filter */}
      <div className="max-w-[1335px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap gap-2">
          {categories.map((cat, i) => (
            <button
              key={cat}
              className={`px-4 py-2 text-sm font-semibold uppercase transition-all border ${
                i === 0
                  ? 'bg-primary text-[#DED4CC] border-primary'
                  : 'bg-transparent text-primary border-primary hover:bg-primary hover:text-[#DED4CC]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Events List */}
      <div className="max-w-[1335px] mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="space-y-6">
          {events.map((event) => {
            const status = getDateStatus(event.date);
            return (
              <article 
                key={event.id} 
                className="bg-[#0f1223] overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 group"
              >
                <div className="md:flex">
                  {/* Image */}
                  <div className="md:w-2/5 relative h-56 md:h-auto overflow-hidden">
                    <Image
                      src={event.image}
                      alt={event.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute top-4 left-4">
                      <span className={`px-3 py-1 text-xs font-bold uppercase ${
                        event.category === 'Workshop' ? 'bg-purple-500 text-white' :
                        event.category === 'Talk' ? 'bg-blue-500 text-white' :
                        event.category === 'Festival' ? 'bg-amber-500 text-white' :
                        'bg-primary text-white'
                      }`}>
                        {event.category}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="md:w-3/5 p-6 md:p-8">
                    {/* Date & Time Badges */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 bg-[#fcf4d1] text-[#0f1223] font-semibold">
                        <Calendar className="w-4 h-4" />
                        {status === 'today' ? 'Today' : formatEventDate(event.date)}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-sm bg-[#fcf4d1] text-[#0f1223] font-semibold px-3 py-1.5">
                        <Clock className="w-4 h-4" />
                        {event.time}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-sm bg-[#fcf4d1] text-[#0f1223] font-semibold px-3 py-1.5">
                        <MapPin className="w-4 h-4" />
                        {event.venue}
                      </span>
                    </div>
                    
                    <h2 className="text-xl md:text-2xl font-display font-bold text-[#fcf4d1] mb-3 group-hover:text-[#C8AC8F] transition-colors">
                      {event.title}
                    </h2>
                    <p className="text-[#fcf4d1]/80 mb-6 line-clamp-2">{event.description}</p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="text-2xl font-bold text-[#fcf4d1]">${event.price}</span>
                        <span className="text-sm text-[#fcf4d1]/60 flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {event.spots} spots left
                        </span>
                      </div>
                      <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-[#DED4CC] font-semibold uppercase hover:bg-[#DED4CC] hover:text-primary transition-all border border-primary hover:border-primary">
                        Book Now
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* Newsletter CTA */}
        <div className="mt-16 bg-[#0f1223] p-8 md:p-12 text-center">
          <h3 className="text-2xl font-display font-bold text-[#fcf4d1] mb-3">Stay Updated</h3>
          <p className="text-[#fcf4d1]/70 mb-6 max-w-md mx-auto">
            Subscribe to our newsletter to be the first to know about upcoming events.
          </p>
          <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="input flex-1"
            />
            <button type="submit" className="btn btn-primary">
              Subscribe
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
