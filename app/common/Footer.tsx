import React, { JSX } from "react";
import Link from "next/link";

export default function Footer(): JSX.Element {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-surface-variant text-black mt-auto">
      {/* Main Footer Content */}
      <div className="px-8 py-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="font-roboto font-bold text-xl mb-4 text-black">Davao Toyozu Inc.</h3>
            <p className="font-roboto text-sm text-black mb-4 leading-relaxed">
              Your trusted partner in inventory management and database solutions. Streamlining operations
              with precision and reliability.
            </p>
            <div className="flex flex-col gap-2 text-sm font-roboto text-black">
              <div>📍 Monteverde Street, Davao City, Philippines</div>
              <div>📞 Sun - 09224207115, Globe - 09362616264</div>
              <div>✉️ Toyozu@yahoo.com</div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-roboto font-bold text-lg mb-4 text-black">Quick Links</h4>
            <ul className="flex flex-col gap-2 font-roboto text-sm">
              <li>
                <Link href="/">{/* Landing page */}Landing Page</Link>
              </li>
              <li>
                <Link href="/categories">Categories</Link>
              </li>
              <li>
                <Link href="/brands">Brands</Link>
              </li>
              <li>
                <Link href="/products">Index</Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-roboto font-bold text-lg mb-4 text-black">Support</h4>
            <ul className="flex flex-col gap-2 font-roboto text-sm">
              <li>
                <a href="#" className="text-black hover:text-gray-700 hover:underline">
                  Help Center
                </a>
              </li>
              <li>
                <a href="#" className="text-black hover:text-gray-700 hover:underline">
                  Documentation
                </a>
              </li>
              <li>
                <a href="#" className="text-black hover:text-gray-700 hover:underline">
                  Contact Support
                </a>
              </li>
              <li>
                <a href="#" className="text-black hover:text-gray-700 hover:underline">
                  System Status
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="font-roboto text-sm text-black">© {currentYear} Toyozu Company. All rights reserved.</div>
          <div className="flex gap-6 font-roboto text-sm">
            <a href="#" className="text-black hover:underline">
              Privacy Policy
            </a>
            <a href="#" className="text-black hover:underline">
              Terms of Service
            </a>
            <a href="#" className="text-black hover:underline">
              Cookie Policy
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}