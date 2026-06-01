"use client";

import { usePathname, useRouter } from 'next/navigation';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import { ReactNode, useEffect, useState } from 'react';
import { track } from '@/lib/track';

export default function MainLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isSubdomain, setIsSubdomain] = useState(false);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const sub = ['pharmastackx.com', 'psx.ng'].some(d => hostname.endsWith(d)) && !hostname.startsWith('www.') && !['pharmastackx.com', 'psx.ng', 'localhost'].includes(hostname);
      setIsSubdomain(sub);
    }
  }, []);

  const showNavbar = !isSubdomain && pathname !== '/find-medicines' && pathname !== '/product-demo' && pathname !== '/pulse' && !pathname?.startsWith('/pulse/');
  const router = useRouter();

  // Analytics: fire a page_view event on every route change
  useEffect(() => {
    track('page_view');
  }, [pathname]);

  // This useEffect will run once when the component mounts
  useEffect(() => {
    // Make sure we are in a browser environment
    if ('serviceWorker' in navigator) {
      const handleServiceWorkerMessage = (event: MessageEvent) => {
        // We only care about messages of our specific type
        if (event.data && event.data.type === 'NEW_DISPATCH_REQUEST') {
          console.log('New dispatch request message received from service worker. Refreshing data.');
          // This tells Next.js to re-fetch the data for the current page
          // without a full page reload.
          router.refresh();
        }
      };

      // Set up the event listener
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);

      // Clean up the event listener when the component unmounts
      return () => {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      };
    }
  }, [router]); // Add router to the dependency array


  return (
    <>
      {showNavbar && <Navbar />}
      <AuthModal />
      {children}
    </>
  );
}
