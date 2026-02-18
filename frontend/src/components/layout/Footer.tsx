import Link from 'next/link';
import { Instagram, Facebook, Mail, MapPin, Phone } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-[#1a1a1a] text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3 sm:gap-10">
          {/* Operation Hours */}
          <div>
            <h4 className="text-xs font-bold tracking-widest uppercase mb-4 text-white">
              OPERATION HOURS
            </h4>
            <div className="space-y-3 text-sm text-white/70 leading-relaxed">
              <div>
                <p className="font-medium text-white/90">TUES - FRI:</p>
                <p>Box Office: 4pm - 8:30pm</p>
                <p>Snack Bar: 3:30pm - 8:30pm</p>
              </div>
              <div>
                <p className="font-medium text-white/90">SAT &amp; SUN/PH:</p>
                <p>Box Office: 1pm - 8:30pm</p>
                <p>Snack Bar: 12:30pm - 8:30pm</p>
              </div>
              <p className="text-primary font-medium">MON - CLOSED</p>
            </div>
          </div>

          {/* Find Us */}
          <div>
            <h4 className="text-xs font-bold tracking-widest uppercase mb-4 text-white">
              FIND US
            </h4>
            <div className="space-y-3 text-sm text-white/70">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                <p>Golden Mile Tower, 6001 Beach Road, #05-00, Singapore 199589</p>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 shrink-0 text-primary" />
                <a href="mailto:hello@filmhouse.sg" className="hover:text-white transition-colors">
                  hello@filmhouse.sg
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 shrink-0 text-primary" />
                <a href="tel:+6561234567" className="hover:text-white transition-colors">
                  +65 6123 4567
                </a>
              </div>
            </div>
            <div className="flex gap-2.5 mt-5">
              <a
                href="https://instagram.com/filmhousesg"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 bg-white/10 hover:bg-primary rounded flex items-center justify-center transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="https://facebook.com/filmhousesg"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 bg-white/10 hover:bg-primary rounded flex items-center justify-center transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Quick Link */}
          <div>
            <h4 className="text-xs font-bold tracking-widest uppercase mb-4 text-white">
              QUICK LINK
            </h4>
            <div className="space-y-2.5 text-sm">
              <Link href="/faq" className="block text-white/70 hover:text-white transition-colors">
                FAQ
              </Link>
              <Link href="/terms" className="block text-white/70 hover:text-white transition-colors">
                Terms of Service
              </Link>
              <Link href="/privacy" className="block text-white/70 hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link href="/mailing-list" className="block text-white/70 hover:text-white transition-colors">
                Join Our Mailing List
              </Link>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-white/10 mt-8 sm:mt-10 pt-6 text-center">
          <p className="text-xs text-white/40">
            &copy; {new Date().getFullYear()} Filmhouse. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}