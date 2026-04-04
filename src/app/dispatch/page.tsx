'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const DispatchRedirect = () => {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the homepage with the specific view for ordering medicines
    router.replace('/?view=orderMedicines');
  }, [router]);

  // Return a simple loading state or null while redirecting
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <p>Redirecting to our new and improved medicine ordering page...</p>
    </div>
  );
};

export default DispatchRedirect;
