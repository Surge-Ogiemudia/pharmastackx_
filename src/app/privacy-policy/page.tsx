'use client'

import {
  Typography,
  Container,
  Box,
  Paper,
} from '@mui/material';
import Navbar from '../../components/Navbar';

export default function PrivacyPolicy() {
  return (
    <Box>
      <Navbar />
      
      {/* Privacy Policy Content */}
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper elevation={1} sx={{ p: 4, borderRadius: '16px' }}>
          <Typography variant="h4" sx={{ 
            fontWeight: 500, 
            mb: 2, 
            color: '#006D5B',
            textAlign: 'center'
          }}>
            PHARMASTACKX PRIVACY POLICY
          </Typography>
          
          <Typography variant="body1" sx={{ 
            color: '#666', 
            mb: 4,
            textAlign: 'center',
            fontWeight: 'bold'
          }}>
            Last Updated: 3rd November 2025
          </Typography>

          <Box sx={{ 
            '& h4': { 
              color: '#006D5B', 
              fontWeight: 600, 
              mt: 3, 
              mb: 2 
            },
            '& p': { 
              mb: 2, 
              lineHeight: 1.6, 
              color: '#333' 
            },
            '& ul': { 
              mb: 2, 
              pl: 3 
            },
            '& li': { 
              mb: 1, 
              color: '#333' 
            }
          }}>
            
            <Typography variant="body1" sx={{ mb: 3, lineHeight: 1.8, color: '#333', textAlign: 'justify' }}>
              PharmaStackX ("we", "our", or "us") operates an online platform that enables customers in Nigeria to discover, order, and receive pharmaceutical products from licensed pharmacies. We are committed to protecting your privacy and handling your personal information in a lawful, transparent, and secure manner in accordance with the Nigeria Data Protection Regulation (NDPR) and the Nigeria Data Protection Act 2023 (NDPA). By accessing or using our website or services, you consent to the data practices described in this Privacy Policy.
            </Typography>

            <Typography variant="h5" component="h4" sx={{ mt: 4, mb: 2, fontWeight: 'bold', color: '#006D5B' }}>
              Information We Collect
            </Typography>
            <Typography variant="body1" sx={{ mb: 3, lineHeight: 1.8, color: '#333', textAlign: 'justify' }}>
              When you use PharmaStackX, we collect certain personal information that you voluntarily provide, such as your name, phone number, email address, delivery address, login details, and any information submitted while creating an account, placing an order, or contacting support. If you are a pharmacy partner, we may also collect business details required to verify and provide access to the platform. We also automatically collect technical information such as your IP address, device type, browser details, and usage data through cookies and analytics tools in order to improve our service and maintain platform security.
            </Typography>

            <Typography variant="h5" component="h4" sx={{ mt: 4, mb: 2, fontWeight: 'bold', color: '#006D5B' }}>
              How We Use Your Information
            </Typography>
            <Typography variant="body1" sx={{ mb: 3, lineHeight: 1.8, color: '#333', textAlign: 'justify' }}>
              We collect this information so we can operate the marketplace, process and deliver orders, verify pharmacies, provide customer support, personalize your experience, improve our service, and comply with Nigerian legal and regulatory obligations. Your information may also be used for fraud prevention, service optimisation, platform analytics, and important communications such as order confirmations, delivery updates, or policy notifications. We do not sell or rent your personal data to third parties.
            </Typography>

            <Typography variant="h5" component="h4" sx={{ mt: 4, mb: 2, fontWeight: 'bold', color: '#006D5B' }}>
              Payment Security
            </Typography>
            <Typography variant="body1" sx={{ mb: 3, lineHeight: 1.8, color: '#333', textAlign: 'justify' }}>
              Payments made on PharmaStackX are processed securely by Paystack. We do not store or have access to your debit or credit card details at any time. All card information you provide is encrypted and handled directly by Paystack in compliance with global payment security standards.
            </Typography>

            <Typography variant="h5" component="h4" sx={{ mt: 4, mb: 2, fontWeight: 'bold', color: '#006D5B' }}>
              Information Sharing
            </Typography>
            <Typography variant="body1" sx={{ mb: 3, lineHeight: 1.8, color: '#333', textAlign: 'justify' }}>
              We may share limited personal data with trusted third-party service providers when necessary to operate the platform. These include Paystack for payment processing, hosting and infrastructure providers for platform operation, analytics providers for performance monitoring, and registered pharmacy partners for order fulfillment. We only share the minimum information required for each party to perform its function, and all partners are obligated to process data in accordance with applicable Nigerian data protection laws.
            </Typography>

            <Typography variant="h5" component="h4" sx={{ mt: 4, mb: 2, fontWeight: 'bold', color: '#006D5B' }}>
              Cookies and Tracking
            </Typography>
            <Typography variant="body1" sx={{ mb: 3, lineHeight: 1.8, color: '#333', textAlign: 'justify' }}>
              We use cookies and similar tracking technologies to enhance user experience, enable core functionality such as login sessions, and analyse platform usage. You may disable cookies through your browser settings, but certain features of the website may not function properly as a result.
            </Typography>

            <Typography variant="h5" component="h4" sx={{ mt: 4, mb: 2, fontWeight: 'bold', color: '#006D5B' }}>
              Data Security and Retention
            </Typography>
            <Typography variant="body1" sx={{ mb: 3, lineHeight: 1.8, color: '#333', textAlign: 'justify' }}>
              Your personal information is stored securely and protected against unauthorized access using industry-standard safeguards. We retain data only for as long as necessary to fulfil the purposes outlined in this policy, comply with legal obligations, resolve disputes, and enforce agreements. Data that is no longer required is securely deleted or anonymized.
            </Typography>

            <Typography variant="h5" component="h4" sx={{ mt: 4, mb: 2, fontWeight: 'bold', color: '#006D5B' }}>
              Your Rights
            </Typography>
            <Typography variant="body1" sx={{ mb: 3, lineHeight: 1.8, color: '#333', textAlign: 'justify' }}>
              As a user in Nigeria, you have the right to request access to the personal data we hold about you, request corrections or updates, request deletion of your data, withdraw consent where applicable, object to processing for direct marketing, or file a complaint with the Nigeria Data Protection Commission (NDPC). All privacy-related requests may be made by emailing <strong>pharmastackx@gmail.com</strong> with the subject line "Privacy Request – PharmaStackX."
            </Typography>

            <Typography variant="h5" component="h4" sx={{ mt: 4, mb: 2, fontWeight: 'bold', color: '#006D5B' }}>
              Age Restrictions
            </Typography>
            <Typography variant="body1" sx={{ mb: 3, lineHeight: 1.8, color: '#333', textAlign: 'justify' }}>
              PharmaStackX is intended for users who are 18 years or older. We do not knowingly collect personal information from minors, and if such data is discovered, it will be deleted.
            </Typography>

            <Typography variant="h5" component="h4" sx={{ mt: 4, mb: 2, fontWeight: 'bold', color: '#006D5B' }}>
              Policy Updates
            </Typography>
            <Typography variant="body1" sx={{ mb: 3, lineHeight: 1.8, color: '#333', textAlign: 'justify' }}>
              We may update this Privacy Policy from time to time, and any changes will be posted on this page with a revised "Last Updated" date. Continued use of the platform after changes are published constitutes acceptance of the updated policy.
            </Typography>

            <Typography variant="h5" component="h4" sx={{ mt: 4, mb: 2, fontWeight: 'bold', color: '#006D5B' }}>
              Contact Us
            </Typography>
            <Typography variant="body1" sx={{ mb: 3, lineHeight: 1.8, color: '#333', textAlign: 'justify' }}>
              If you have any questions, concerns, or requests relating to this Privacy Policy or the handling of your personal data, you may contact us at: <strong>pharmastackx@gmail.com</strong>
            </Typography>
            
          </Box>

          <Box sx={{ 
            mt: 4, 
            pt: 3, 
            borderTop: '1px solid #e0e0e0',
            textAlign: 'center'
          }}>
            <Typography variant="body2" sx={{ color: '#666' }}>
              Last updated: November 3, 2025
            </Typography>
            <Typography variant="body2" sx={{ color: '#666', mt: 1 }}>
              If you have any questions about this Privacy Policy, please contact us via WhatsApp at +234 905 006 6638
            </Typography>
          </Box>
        </Paper>
      </Container>

      {/* Footer */}
      <Box sx={{ 
        bgcolor: '#e0e0e0', 
        py: 2, 
        mt: 4,
        borderTop: '1px solid #d0d0d0'
      }}>
        <Container maxWidth="lg">
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: 2
          }}>
            <Box sx={{ display: 'flex', gap: 3 }}>
              <Typography variant="body2" sx={{ 
                color: '#006D5B', 
                fontSize: '0.85rem', 
                cursor: 'pointer',
                '&:hover': { textDecoration: 'underline' }
              }}>
                Privacy Policy
              </Typography>
              <Typography 
                variant="body2" 
                component="a"
                href="https://wa.me/2349050066638?text=Hi%2C%20I%20need%20help%20with%20finding%20medicines%20on%20Pharmastackx"
                target="_blank"
                rel="noopener noreferrer"
                sx={{ 
                  color: '#006D5B', 
                  fontSize: '0.85rem', 
                  cursor: 'pointer',
                  textDecoration: 'none',
                  '&:hover': { textDecoration: 'underline' }
                }}
              >
                Need Help?
              </Typography>
              <Typography 
                variant="body2" 
                component="a"
                href="https://wa.me/2349050066638?text=Hello%2C%20I%20would%20like%20to%20get%20in%20touch%20regarding%20Pharmastackx"
                target="_blank"
                rel="noopener noreferrer"
                sx={{ 
                  color: '#006D5B', 
                  fontSize: '0.85rem', 
                  cursor: 'pointer',
                  textDecoration: 'none',
                  '&:hover': { textDecoration: 'underline' }
                }}
              >
                Contact
              </Typography>
            </Box>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}