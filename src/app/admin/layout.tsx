'use client';
import { Box, CircularProgress, Typography } from '@mui/material';
import Navbar from '@/components/Navbar';
import { useSession } from '@/context/SessionProvider';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useSession();

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // After loading, if there is no user or the user is not an admin, deny access.
  if (!user || user.role !== 'admin') {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h4" color="error">Forbidden</Typography>
        <Typography variant="body1">You do not have permission to access this page.</Typography>
      </Box>
    );
  }

  // If the user is an admin, render the admin layout with Navbar and content.
  return (
    <Box>
      <Navbar />
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        {children}
      </Box>
    </Box>
  );
}