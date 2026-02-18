import Link from 'next/link';
import { Instagram, Facebook, Mail, MapPin, Phone } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-[#24231D] text-white mt-auto">
      <div className="max-w-[1335px] mx-auto px-4 sm:px-6 lg:px-8 py-[50px]">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4 sm:gap-10">
          {/* Logo & About */}
          <div>
            <div className="mb-6">
              <Link href="/">
                <span className="text-[#C8AC8F] text-lg font-semibold uppercase tracking-wide">Filmhouse</span>
              </Link>
            </div>
            <p className="text-[16px] font-[400] leading-[24px] text-white">
              Singapore&apos;s dedicated third space for moving visuals.
            </p>
            <div className="flex gap-3 mt-5">
              <a
                href="https://instagram.com/filmhousesg"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 bg-[#C8AC8F] hover:bg-[#C8AC8F]/80 rounded-full flex items-center justify-center transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-[22px] h-[22px] text-black" />
              </a>
              <a
                href="https://facebook.com/filmhousesg"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 bg-[#C8AC8F] hover:bg-[#C8AC8F]/80 rounded-full flex items-center justify-center transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-[22px] h-[22px] text-black" />
              </a>
            </div>
          </div>

          {/* Operation Hours */}
          <div>
            <h4 className="text-[22px] font-semibold uppercase text-[#C8AC8F] mb-4">
              Operation Hours
            </h4>
            <div className="space-y-3 text-[16px] text-white leading-relaxed">
              <div>
                <p className="font-semibold">TUES - FRI:</p>
                <p className="font-[400]">Box Office: 4pm - 8:30pm</p>
                <p className="font-[400]">Snack Bar: 3:30pm - 8:30pm</p>
              </div>
              <div>
                <p className="font-semibold">SAT &amp; SUN/PH:</p>
                <p className="font-[400]">Box Office: 1pm - 8:30pm</p>
                <p className="font-[400]">Snack Bar: 12:30pm - 8:30pm</p>
              </div>
              <p className="font-semibold text-primary">MON - CLOSED</p>
            </div>
          </div>

          {/* Find Us */}
          <div>
            <h4 className="text-[22px] font-semibold uppercase text-[#C8AC8F] mb-4">
              Find Us
            </h4>
            <div className="space-y-3 text-[16px] text-white">
              <div className="flex items-start gap-[10px]">
                <MapPin className="w-[19px] h-[19px] mt-0.5 shrink-0 text-white" />
                <p className="font-[500]">Golden Mile Tower, 6001 Beach Road, #05-00, Singapore 199589</p>
              </div>
              <div className="flex items-center gap-[10px]">
                <Mail className="w-[19px] h-[19px] shrink-0 text-white" />
                <a href="mailto:hello@filmhouse.sg" className="font-[500] hover:text-[#C8AC8F] transition-colors">
                  hello@filmhouse.sg
                </a>
              </div>
              <div className="flex items-center gap-[10px]">
                <Phone className="w-[19px] h-[19px] shrink-0 text-white" />
                <a href="tel:+6561234567" className="font-[500] hover:text-[#C8AC8F] transition-colors">
                  +65 6123 4567
                </a>
              </div>
            </div>
          </div>

          {/* Quick Link */}
          <div>
            <h4 className="text-[22px] font-semibold uppercase text-[#C8AC8F] mb-4">
              Quick Link
            </h4>
            <nav className="space-y-[2px]">
              <Link href="/faq" className="block text-[16px] font-[500] text-white py-[2px] hover:text-[#C8AC8F] transition-colors">
                FAQ
              </Link>
              <Link href="/terms" className="block text-[16px] font-[500] text-white py-[2px] hover:text-[#C8AC8F] transition-colors">
                Terms of Service
              </Link>
              <Link href="/privacy" className="block text-[16px] font-[500] text-white py-[2px] hover:text-[#C8AC8F] transition-colors">
                Privacy Policy
              </Link>
              <Link href="/mailing-list" className="block text-[16px] font-[500] text-white py-[2px] hover:text-[#C8AC8F] transition-colors">
                Join Our Mailing List
              </Link>
            </nav>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-[#343329] mt-8 pt-5 flex flex-wrap items-center justify-center gap-[5px]">
          <p className="text-[14px] font-[400] text-white">
            &copy; {new Date().getFullYear()} Filmhouse.
          </p>
          <p className="text-[14px] font-[400] text-white">
            All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
