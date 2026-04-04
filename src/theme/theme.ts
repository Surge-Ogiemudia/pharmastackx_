'use client'

import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#1B5E20', // Dark Green
      light: '#4CAF50',
      dark: '#0D3B0D',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#7B1FA2', // Darker Magenta/Purple
      light: '#9c27b0',
      dark: '#4A148C',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#FAFAFA',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1B5E20',
      secondary: '#666666',
    },
  },
  typography: {
    fontFamily: '"Poppins", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      fontSize: '2.5rem',
      color: '#1B5E20',
    },
    h2: {
      fontWeight: 600,
      fontSize: '2rem',
      color: '#1B5E20',
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.75rem',
      color: '#1B5E20',
    },
    h4: {
      fontWeight: 500,
      fontSize: '1.5rem',
      color: '#1B5E20',
    },
    h5: {
      fontWeight: 500,
      fontSize: '1.25rem',
      color: '#1B5E20',
    },
    h6: {
      fontWeight: 500,
      fontSize: '1rem',
      color: '#1B5E20',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
        },
        containedPrimary: {
          backgroundColor: '#1B5E20',
          '&:hover': {
            backgroundColor: '#2E7D32',
          },
        },
        containedSecondary: {
          backgroundColor: '#7B1FA2',
          '&:hover': {
            backgroundColor: '#4A148C',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#1B5E20',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        },
      },
    },
  },
});
