'use client';

import { useState } from 'react';
import { Building2, Users, Projector, Mic2, Camera, Mail, Phone, MapPin, Send, Check } from 'lucide-react';
import Image from 'next/image';

const venues = [
  {
    name: 'Green Room',
    capacity: 200,
    features: ['4K Projection', 'Dolby Atmos', 'Stage Area', 'Green Room'],
    image: '/images/banners/hamnet-banner.jpg',
    priceFrom: 2500,
    description: 'Our flagship cinema with premium audiovisual equipment.',
  },
  {
    name: 'Blue Room',
    capacity: 100,
    features: ['2K Projection', '5.1 Surround', 'Intimate Setting'],
    image: '/images/banners/thirst-banner.jpg',
    priceFrom: 1500,
    description: 'Perfect for mid-sized events and private screenings.',
  },
  {
    name: 'Redrum',
    capacity: 80,
    features: ['2K Projection', 'Cozy Atmosphere', 'Private Events'],
    image: '/images/banners/sentimental-value-banner.jpg',
    priceFrom: 1200,
    description: 'An intimate space for exclusive gatherings.',
  },
];

const services = [
  { icon: Projector, title: 'Film Screenings', description: 'Host premieres, private screenings, or film festivals' },
  { icon: Mic2, title: 'Corporate Events', description: 'Town halls, presentations, and team gatherings' },
  { icon: Camera, title: 'Photo & Video', description: 'Unique backdrop for shoots and productions' },
  { icon: Users, title: 'Private Parties', description: 'Birthdays, anniversaries, and celebrations' },
];

export default function HireUsPage() {
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    eventType: 'Film Screening',
    date: '',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate form submission
    setFormSubmitted(true);
    setTimeout(() => setFormSubmitted(false), 3000);
  };

  return (
    <div className="min-h-screen bg-cream">
      {/* Hero */}
      <div className="relative h-[50vh] min-h-[400px]">
        <Image
          src="/images/banners/little-miss-sunshine-banner.jpg"
          alt="Filmhouse Venue"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/30" />
        <div className="absolute inset-0 flex items-center">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-white">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-sm mb-4">
              <Building2 className="w-4 h-4" />
              <span>Venue Hire</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">Hire Our Space</h1>
            <p className="text-xl text-white/80 max-w-2xl">
              Transform your event with Singapore&apos;s most unique cinema venue. 
              Perfect for screenings, corporate events, and private celebrations.
            </p>
          </div>
        </div>
      </div>

      {/* Services */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl font-display font-bold text-center text-text-primary mb-12">What We Offer</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {services.map((service) => (
            <div key={service.title} className="text-center group">
              <div className="w-16 h-16 bg-primary/10 group-hover:bg-primary group-hover:scale-110 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-all duration-300">
                <service.icon className="w-8 h-8 text-primary group-hover:text-white transition-colors" />
              </div>
              <h3 className="font-semibold text-text-primary mb-2">{service.title}</h3>
              <p className="text-sm text-text-muted">{service.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Venues */}
      <div className="bg-white py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-display font-bold text-center text-text-primary mb-12">Our Venues</h2>
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {venues.map((venue) => (
              <div 
                key={venue.name} 
                className="bg-cream rounded-2xl overflow-hidden group hover:shadow-xl transition-all duration-300"
              >
                <div className="relative h-48 overflow-hidden">
                  <Image
                    src={venue.image}
                    alt={venue.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-xl font-bold text-white">{venue.name}</h3>
                    <p className="text-sm text-white/80 flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      Up to {venue.capacity} guests
                    </p>
                  </div>
                </div>
                <div className="p-5">
                  <p className="text-sm text-text-secondary mb-4">{venue.description}</p>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {venue.features.map((f) => (
                      <span key={f} className="text-xs bg-white px-2.5 py-1 rounded-full border border-gray-200 text-text-muted">
                        {f}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div>
                      <span className="text-xs text-text-muted">From</span>
                      <span className="text-xl font-bold text-primary ml-1">${venue.priceFrom}</span>
                    </div>
                    <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-dark transition-colors">
                      Enquire
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Contact Form */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm">
          <h2 className="text-2xl font-display font-bold text-text-primary mb-6 text-center">Get in Touch</h2>
          
          {formSubmitted ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-xl font-semibold text-text-primary mb-2">Enquiry Sent!</h3>
              <p className="text-text-secondary">We&apos;ll get back to you within 24 hours.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">Name</label>
                  <input 
                    type="text" 
                    className="input w-full" 
                    placeholder="Your name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">Email</label>
                  <input 
                    type="email" 
                    className="input w-full" 
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">Event Type</label>
                  <select 
                    className="input w-full"
                    value={formData.eventType}
                    onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                  >
                    <option>Film Screening</option>
                    <option>Corporate Event</option>
                    <option>Private Party</option>
                    <option>Photo/Video Shoot</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">Preferred Date</label>
                  <input 
                    type="date" 
                    className="input w-full"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Message</label>
                <textarea 
                  className="input w-full h-32 resize-none" 
                  placeholder="Tell us about your event..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                />
              </div>
              <button 
                type="submit" 
                className="w-full py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-all flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Send Enquiry
              </button>
            </form>
          )}
        </div>

        {/* Contact Info */}
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <a href="mailto:events@filmhouse.sg" className="flex flex-col items-center p-6 bg-white rounded-xl hover:shadow-md transition-shadow">
            <Mail className="w-6 h-6 text-primary mb-2" />
            <p className="text-text-secondary text-sm">events@filmhouse.sg</p>
          </a>
          <a href="tel:+6561234567" className="flex flex-col items-center p-6 bg-white rounded-xl hover:shadow-md transition-shadow">
            <Phone className="w-6 h-6 text-primary mb-2" />
            <p className="text-text-secondary text-sm">+65 6123 4567</p>
          </a>
          <div className="flex flex-col items-center p-6 bg-white rounded-xl">
            <MapPin className="w-6 h-6 text-primary mb-2" />
            <p className="text-text-secondary text-sm text-center">Golden Mile Tower, Singapore</p>
          </div>
        </div>
      </div>
    </div>
  );
}
