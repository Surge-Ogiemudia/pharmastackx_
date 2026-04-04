'use client'

import {
  Typography,
  Box,
} from '@mui/material';

export default function PrivacyContent() {
  return (
    <Box sx={{ p: 1 }}>
      <Typography variant="h5" sx={{ 
        fontWeight: 700, 
        mb: 2, 
        color: '#006D5B',
        fontFamily: 'Sora, sans-serif'
      }}>
        Privacy Policy
      </Typography>
      
      <Typography variant="body2" sx={{ 
        color: '#666', 
        mb: 3,
        fontWeight: 600
      }}>
        Last Updated: 3rd November 2025
      </Typography>

      <Box sx={{ 
        '& h6': { 
          color: '#006D5B', 
          fontWeight: 700, 
          mt: 3, 
          mb: 1,
          fontFamily: 'Sora, sans-serif'
        },
        '& p': { 
          mb: 2, 
          lineHeight: 1.6, 
          color: '#444',
          fontSize: '0.9rem'
        }
      }}>
        
        <p>
          PharmaStackX ("we", "our", or "us") operates an online platform that enables customers in Nigeria to discover, order, and receive pharmaceutical products from licensed pharmacies. We are committed to protecting your privacy and handling your personal information in a lawful, transparent, and secure manner in accordance with the Nigeria Data Protection Regulation (NDPR) and the Nigeria Data Protection Act 2023 (NDPA).
        </p>

        <Typography variant="h6">Information We Collect</Typography>
        <p>
          When you use PharmaStackX, we collect certain personal information that you voluntarily provide, such as your name, phone number, email address, delivery address, login details, and any information submitted while creating an account, placing an order, or contacting support. If you are a pharmacy partner, we may also collect business details required to verify and provide access to the platform.
        </p>

        <Typography variant="h6">How We Use Your Information</Typography>
        <p>
          We collect this information so we can operate the marketplace, process and deliver orders, verify pharmacies, provide customer support, personalize your experience, and comply with Nigerian legal and regulatory obligations. We do not sell or rent your personal data to third parties.
        </p>

        <Typography variant="h6">Payment Security</Typography>
        <p>
          Payments made on PharmaStackX are processed securely by Paystack. We do not store or have access to your debit or credit card details at any time. All card information you provide is encrypted and handled directly by Paystack in compliance with global payment security standards.
        </p>

        <Typography variant="h6">Data Security</Typography>
        <p>
          Your personal information is stored securely and protected against unauthorized access using industry-standard safeguards. We retain data only for as long as necessary to fulfil the purposes outlined in this policy, comply with legal obligations, and resolve disputes.
        </p>

        <Typography variant="h6">Your Rights</Typography>
        <p>
          As a user in Nigeria, you have the right to request access to the personal data we hold about you, request corrections, or request deletion. All privacy-related requests may be made by emailing <strong>pharmastackx@gmail.com</strong>.
        </p>
        
      </Box>

      <Box sx={{ 
        mt: 4, 
        pt: 3, 
        borderTop: '1px solid rgba(0,0,0,0.05)',
        textAlign: 'center',
        opacity: 0.7
      }}>
        <Typography variant="caption">
          If you have any questions about this Privacy Policy, please contact us via WhatsApp at +234 905 006 6638
        </Typography>
      </Box>
    </Box>
  );
}
