'use client'

import { Typography, Box, Paper, Icon, IconButton } from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import InstagramIcon from '@mui/icons-material/Instagram';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';


export default function ContactContent() {
  return (
    <Paper elevation={3} sx={{ p: { xs: 2, sm: 4 }, bgcolor: 'white', color: 'black', borderRadius: '16px', width: '100%', maxWidth: '800px', margin: 'auto' }}>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 500, mb: 2, color: '#004d40' }}>
          Get in Touch
        </Typography>
        <Typography variant="h6" sx={{ color: 'grey.700' }}>
          We'd love to hear from you. Here's how you can reach us.
        </Typography>
      </Box>

      <Box sx={{ p: { xs: 2, sm: 3 }, borderRadius: '12px', background: '#e8f5e9' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Icon component={EmailIcon} sx={{ color: '#1b5e20', mr: 2, fontSize: '2rem' }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1b5e20' }}>
              Email Us
            </Typography>
            <Typography variant="body1" sx={{ color: 'grey.800' }}>
              <a href="mailto:pharmastackx@gmail.com" style={{ color: '#33691e' }}>pharmastackx@gmail.com</a>
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
  <Icon component={PhoneIcon} sx={{ color: '#1b5e20', mr: 2, fontSize: '2rem' }} />
  <Box sx={{ flexGrow: 1 }}>
    <Typography variant="h6" sx={{ fontWeight: 600, color: '#1b5e20' }}>
      Call Us / Text Us On Whatsapp
    </Typography>
    <Typography variant="body1" sx={{ color: 'grey.800' }}>
      <a href="tel:+2349134589572" style={{ textDecoration: 'none', color: 'inherit' }}>
        +234 91 345 89572
      </a>
    </Typography>
  </Box>
  <IconButton
    component="a"
    href="https://wa.me/2349134589572"
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Chat on WhatsApp"
  >
    <WhatsAppIcon sx={{ color: '#25D366', fontSize: '2.5rem' }} />
  </IconButton>
</Box>


        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Icon component={InstagramIcon} sx={{ color: '#1b5e20', mr: 2, fontSize: '2rem' }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1b5e20' }}>
              Follow Us
            </Typography>
            <Typography variant="body1" sx={{ color: 'grey.800' }}>
              <a href="https://www.instagram.com/pharmastackx" target="_blank" rel="noopener noreferrer" style={{ color: '#33691e' }}>@pharmastackx</a>
            </Typography>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
}
