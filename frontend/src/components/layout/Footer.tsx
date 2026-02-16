import Link from 'next/link';
import { Instagram, Facebook, Mail, MapPin, Phone } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-dark text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About */}
          <div className="md:col-span-2">
            <Link href="/" className="inline-block">
              <h3 className="text-2xl font-display font-bold mb-4 hover:text-primary transition-colors">
                FILMHOUSE
              </h3>
            </Link>
            <p className="text-white/70 text-sm leading-relaxed mb-4 max-w-md">
              Singapore&apos;s dedicated third space for moving visuals, nestled in the iconic Golden Mile Tower. 
              We&apos;re here to bridge perspectives through thoughtful programming; championing films that challenge, 
              provoke, and inspire.
            </p>
            <div className="flex space-x-3">
              <a 
                href="https://instagram.com/filmhousesg" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-10 h-10 bg-white/10 hover:bg-primary rounded-lg flex items-center justify-center transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a 
                href="https://facebook.com/filmhousesg" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 bg-white/10 hover:bg-primary rounded-lg flex items-center justify-center transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Operation Hours */}
          <div>
            <h4 className="font-semibold mb-4 text-white">Operation Hours</h4>
            <div className="space-y-3 text-sm text-white/70">
              <div>
                <p className="font-medium text-white">TUES - FRI:</p>
                <p>Box Office: 4pm - 8:30pm</p>
                <p>Snack Bar: 3:30pm - 8:30pm</p>
              </div>
              <div>
                <p className="font-medium text-white">SAT & SUN/PH:</p>
                <p>Box Office: 1pm - 8:30pm</p>
                <p>Snack Bar: 12:30pm - 8:30pm</p>
              </div>
              <p className="text-primary font-medium">MON - CLOSED</p>
            </div>
          </div>

          {/* Contact & Links */}
          <div>
            <h4 className="font-semibold mb-4 text-white">Find Us</h4>
            <div className="space-y-3 text-sm text-white/70">
              <div className="flex items-start space-x-2">
                <MapPin className="w-4 h-4 mt-1 flex-shrink-0 text-primary" />
                <p>Golden Mile Tower, 6001 Beach Road, #05-00, Singapore 199589</p>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4 flex-shrink-0 text-primary" />
                <a href="mailto:hello@filmhouse.sg" className="hover:text-white transition-colors">
                  hello@filmhouse.sg
                </a>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 flex-shrink-0 text-primary" />
                <a href="tel:+6561234567" className="hover:text-white transition-colors">
                  +65 6123 4567
                </a>
              </div>
            </div>

            <h4 className="font-semibold mt-6 mb-3 text-white">Quick Links</h4>
            <div className="space-y-2 text-sm">
              <Link href="/faq" className="block text-white/70 hover:text-white transition-colors">
                FAQ
              </Link>
              <Link href="/terms" className="block text-white/70 hover:text-white transition-colors">
                Terms of Service
              </Link>
              <Link href="/privacy" className="block text-white/70 hover:text-white transition-colors">
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 mt-10 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-white/50">
            © {new Date().getFullYear()} Filmhouse. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-sm text-white/50">
            <span>Made with ❤️ in Singapore</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
