
import type { Metadata, Viewport } from "next";
import { Poppins, Sora, DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/context/SessionProvider";
import { CartProvider } from "@/contexts/CartContext";
import { PromoProvider } from "@/contexts/PromoContext";
import { OrderProvider } from "@/contexts/OrderContext";
import Script from "next/script";
import { Suspense } from "react";
import { AuthModalProvider } from "@/contexts/AuthModalContext"; // Import the provider
import MainLayout from "./MainLayout";
import ThemeRegistry from "./ThemeRegistry";
import SplashOverlay from "./SplashOverlay";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const sora = Sora({ subsets: ["latin"], weight: ["300", "400", "600", "700", "800"], variable: '--font-sora' });
const dmSans = DM_Sans({ subsets: ["latin"], weight: ["300", "400", "500"], variable: '--font-dm-sans' });
const fraunces = Fraunces({ subsets: ["latin"], style: ['normal', 'italic'], variable: '--font-fraunces' });

export const metadata: Metadata = {
  title: "Pharmastackx",
  description: "Find Medicines Near You",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Pharmastackx",
  },
};

export const viewport: Viewport = {
  themeColor: "#006D5B",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Google tag (gtag.js) */}
        <Script
          strategy="afterInteractive"
          src="https://www.googletagmanager.com/gtag/js?id=G-TBR3LZNH70"
        />
        <Script
          id="google-analytics"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-TBR3LZNH70');
            `,
          }}
        />
      </head>
      <body className={`${poppins.className} ${sora.variable} ${dmSans.variable} ${fraunces.variable}`}>
        {/* Splash overlay — pure inline styles, zero emotion/MUI dependency, renders instantly */}
        <div
          id="psx-splash"
          style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            background: '#ffffff',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: '16px',
            transition: 'opacity 0.35s ease',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192x192.png" alt="PharmaStackX" style={{ width: 80, height: 80, borderRadius: '20px' }} />
          <div style={{ fontSize: '13px', color: '#aaa', fontFamily: 'sans-serif', letterSpacing: '0.05em' }}>Loading…</div>
        </div>
        <SplashOverlay />

        <ThemeRegistry>
          <Suspense fallback={null}>
            <SessionProvider>
              {/* Wrap with AuthModalProvider */}
              <AuthModalProvider>
                <PromoProvider>
                  <OrderProvider>
                    <CartProvider>
                      <MainLayout>{children}</MainLayout>
                    </CartProvider>
                  </OrderProvider>
                </PromoProvider>
              </AuthModalProvider>
            </SessionProvider>
          </Suspense>
        </ThemeRegistry>

        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(registration) {
                    console.log('PWA service worker registered.');
                  }).catch(function(err) {
                    console.error('PWA service worker registration failed: ', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
