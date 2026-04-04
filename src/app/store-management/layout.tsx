import Navbar from '@/components/Navbar';

export default function StoreManagementLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
}
