'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Button,
} from '@mui/material';
import { useSession } from "@/context/SessionProvider";

export default function Navbar() {
  const { user, isLoading } = useSession();
  const pathname = usePathname();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // We now apply the high-contrast light theme globally across all components
  const logoColor = '#111';
  const logoXColor = '#C84B8F';
  const btnColor = '#0F6E56';
  const btnBorderColor = 'rgba(15, 110, 86, 0.5)';
  const btnHoverBg = 'rgba(15, 110, 86, 0.05)';
  const circularProgressColor = '#0F6E56';

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleMenuClose();
    try {
        const response = await fetch('/api/auth/logout', { method: 'POST' });
        if (response.ok) {
            window.location.href = '/auth';
        } else {
            console.error('Logout failed');
        }
    } catch (error) {
        console.error('An error occurred during logout:', error);
    }
  };

  const userInitial = user?.email?.charAt(0)?.toUpperCase() || '';

  return (
    <Box
      component={Paper}
      elevation={0}
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        p: 2,
        zIndex: 1301,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(250, 250, 248, 0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
      }}
    >
            <Typography variant="h6" component={Link} href="/" sx={{ color: logoColor, fontWeight: 'bold', textDecoration: 'none' }}>
        PharmaStack<span style={{ color: logoXColor }}>X</span>
      </Typography>

      {isLoading ? (
        <CircularProgress size={24} sx={{ color: circularProgressColor }} />
      ) : user ? (
        <>
          <IconButton onClick={handleMenuOpen} sx={{ p: 0 }}>
            <Avatar sx={{ bgcolor: 'rgba(59, 4, 66, 0.88)', color: 'white', fontWeight: 'bold' }}>
              {userInitial}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            sx={{ mt: 1 }}
          >
            <MenuItem disabled>{user.email}</MenuItem>
            <MenuItem onClick={handleLogout}>Logout</MenuItem>
          </Menu>
        </>
      ) : (
        <Button
          variant="outlined"
          component={Link}
          href="/auth"
          sx={{
            borderRadius: '20px',
            borderColor: btnBorderColor,
            color: btnColor,
            textTransform: 'uppercase',
            fontWeight: 'bold',
            '&:hover': {
              borderColor: btnColor,
              backgroundColor: btnHoverBg,
            },
          }}
        >
          Sign In
        </Button>
      )}
    </Box>
  );
}
