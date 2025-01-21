import type { Metadata } from "next";
import Image from 'next/image';
import Script from 'next/script';
import "./globals.css";

export const metadata: Metadata = {
  title: "Cadabams Consult",
  description: "Mental health consultation and assessment platform by Cadabams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Load Google APIs with proper error handling */}
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="beforeInteractive"
          onError={(e) => {
            console.error('Error loading Google Identity Services:', e);
          }}
          onLoad={() => {
            console.log('Google Identity Services loaded');
          }}
        />
        
        <Script
          src="https://apis.google.com/js/api.js"
          strategy="beforeInteractive"
          onError={(e) => {
            console.error('Error loading Google API Client:', e);
          }}
          onLoad={() => {
            console.log('Google API Client loaded');
            // Initialize APIs when loaded
            window.dispatchEvent(new Event('googleAPIsLoaded'));
          }}
        />

        {/* Initialize Google APIs */}
        <Script id="google-init" strategy="afterInteractive">
          {`
            function initGoogleAPIs() {
              if (window.gapi && window.google) {
                console.log('Google APIs available');
                window.dispatchEvent(new Event('googleAPIsLoaded'));
              } else {
                console.log('Waiting for Google APIs...');
                setTimeout(initGoogleAPIs, 100);
              }
            }
            
            window.addEventListener('load', initGoogleAPIs);
          `}
        </Script>

        <meta
          name="google-signin-client_id"
          content={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}
        />
        
        {/* Fathom Analytics */}
        <Script
          src="https://cdn.usefathom.com/script.js"
          data-site="ONYOCTXK"
          strategy="afterInteractive"
          defer
        />
      </head>
      <body className="bg-white text-gray-800">
        {/* Header with gradient border bottom */}
        <div className="border-b-4 border-red-500 bg-white shadow-sm">
          <div className="flex mx-auto justify-between items-center px-4 py-3 max-w-[1206px]">
            <Image
              src="https://cdn.prod.website-files.com/6067e9cc04d7b901547a284e/669b63600521ea1779b61d34_62a2dea737ece30511d5f9a8_Logo%20for%20headder%20(1).webp"
              alt="Cadabams logo"
              width={180}
              height={50}
              priority={true}
              unoptimized={false} // Enable image optimization
            />
            <div className="flex gap-4">
              <a 
                href="tel:+918025273377" 
                className="hidden md:flex items-center text-red-600 hover:text-red-700 transition-colors duration-200"
                rel="noopener"
              >
                <svg 
                  className="w-4 h-4 mr-2" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="2" 
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
                +91 8025273377
              </a>
              <a
                href="mailto:enquiry@cadabamshospitals.com"
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors duration-200"
                rel="noopener"
              >
                Contact Us
              </a>
            </div>
          </div>
        </div>
        
        {/* Main content */}
        <main className="max-w-[1206px] mx-auto px-4 py-6">
          {children}
        </main>
        
        {/* Footer */}
        <footer className="bg-gray-50 border-t border-gray-200 mt-8">
          <div className="max-w-[1206px] mx-auto px-4 py-6 text-sm text-gray-600">
            © {new Date().getFullYear()} Cadabams Hospitals. All rights reserved.
          </div>
        </footer>
      </body>
    </html>
  );
}
