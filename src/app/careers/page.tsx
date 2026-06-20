'use client'

import {
  Typography,
  Container,
  Box,
  Paper,
  Chip,
  Divider,
} from '@mui/material';
import Navbar from '../../components/Navbar';

export default function Careers() {
  return (
    <Box>
      <Navbar />

      <Container maxWidth="md" sx={{ py: 6 }}>

        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 5 }}>
          <Typography variant="h3" sx={{ fontWeight: 700, mb: 2, color: '#006D5B' }}>
            We&apos;re Hiring
          </Typography>
          <Typography variant="body1" sx={{ color: '#555', fontSize: '1.1rem' }}>
            Join us in building the infrastructure that makes medicine findable across Nigeria.
          </Typography>
        </Box>

        {/* Job Card */}
        <Paper elevation={3} sx={{ borderRadius: '16px', overflow: 'hidden' }}>

          {/* Job Title Banner */}
          <Box sx={{ bgcolor: '#006D5B', p: 4, color: 'white' }}>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
              Field Sales Officer
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2 }}>
              <Chip label="Full Time" sx={{ bgcolor: 'white', color: '#006D5B', fontWeight: 600 }} />
              <Chip label="Benin City, Edo State" sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'white' }} />
              <Chip label="Health Technology" sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'white' }} />
            </Box>
          </Box>

          <Box sx={{ p: 4 }}>

            {/* About */}
            <Section title="About PharmaStackX">
              <Typography variant="body1" sx={bodyStyle}>
                PharmaStackX is a real-time medicine discovery network connecting patients and pharmacists across
                Nigeria. We are building the infrastructure that makes medicine findable so no Nigerian goes without
                their medicine because they couldn&apos;t find who had it. We are an early stage startup actively
                growing our pharmacy network across Edo State.
              </Typography>
            </Section>

            <Divider sx={{ my: 3 }} />

            {/* The Role */}
            <Section title="The Role">
              <Typography variant="body1" sx={bodyStyle}>
                We are looking for our first Field Sales Officer. A sharp, confident, and organised individual who
                will be the face of PharmaStackX on the ground in Benin City.
              </Typography>
              <Typography variant="body1" sx={{ ...bodyStyle, mt: 1.5 }}>
                You will visit pharmacies, present our product, close installations, follow up on leads, and report
                daily. This is a field role. You will spend most of your time outside the office talking to pharmacy
                owners and staff.
              </Typography>
            </Section>

            <Divider sx={{ my: 3 }} />

            {/* What You Will Do */}
            <Section title="What You Will Do">
              <BulletList items={[
                'Visit pharmacies across Benin City and surrounding areas daily.',
                'Present PharmaStackX to pharmacy owners and decision makers.',
                'Close installations and onboard new pharmacies onto the network.',
                'Follow up on pending leads until they convert.',
                'Train pharmacy staff on the platform after installation.',
                'Chase payments and confirm subscriptions.',
                'Report daily on visits, conversations, and outcomes.',
              ]} />
            </Section>

            <Divider sx={{ my: 3 }} />

            {/* What We Are Looking For */}
            <Section title="What We Are Looking For">
              <BulletList items={[
                'Young professional with demonstrable sales experience. Experience in field sales, direct sales, or business development preferred. Fresh graduates with a proven sales track record are welcome.',
                'Background in pharmacy, health sciences, life sciences, or business preferred.',
                'Confident communicator who is comfortable walking into a business and starting a conversation.',
                'Organised and consistent with follow up.',
                'Honest and self-motivated. You will work independently most of the time.',
                'Based in Benin City or willing to relocate immediately.',
              ]} />
              <Paper sx={{ mt: 2.5, p: 2.5, bgcolor: '#f0faf7', borderLeft: '4px solid #006D5B', borderRadius: '8px' }}>
                <Typography variant="body1" sx={{ fontWeight: 600, color: '#006D5B', mb: 0.5 }}>
                  Has actually sold something to someone before.
                </Typography>
                <Typography variant="body2" sx={{ color: '#444' }}>
                  We don&apos;t care what — insurance, products, services, anything. If you have closed a deal you
                  are already ahead.
                </Typography>
              </Paper>
              <Paper sx={{ mt: 1.5, p: 2.5, bgcolor: '#fff8e1', borderLeft: '4px solid #F9A825', borderRadius: '8px' }}>
                <Typography variant="body2" sx={{ color: '#5d4037', fontStyle: 'italic' }}>
                  You do not need to be a pharmacist. You need to be sharp, confident, and hungry.
                </Typography>
              </Paper>
            </Section>

            <Divider sx={{ my: 3 }} />

            {/* Compensation */}
            <Section title="Compensation">
              <BulletList items={[
                'Base salary: ₦60,000 to ₦80,000 monthly.',
                'Commission paid per pharmacy successfully onboarded and active on the network.',
                'Total earnings grow significantly with pharmacy closures.',
              ]} />
            </Section>

            <Divider sx={{ my: 3 }} />

            {/* How To Apply */}
            <Section title="How To Apply">
              <Paper sx={{ p: 3, bgcolor: '#006D5B', borderRadius: '12px', color: 'white' }}>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  Send your <strong>CV</strong> and a <strong>short voice note</strong> introducing yourself and
                  why you want this role to:
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                  pharmastackX@gmail.com
                </Typography>
                <Typography variant="body2" sx={{ mb: 2, opacity: 0.9 }}>
                  Subject line: <strong>Field Sales Officer — PharmaStackX</strong>
                </Typography>
                <Typography variant="body2" sx={{ bgcolor: 'rgba(0,0,0,0.2)', p: 1.5, borderRadius: '8px' }}>
                  ⚠️ Applications without a voice note will not be considered.
                </Typography>
              </Paper>
            </Section>

          </Box>
        </Paper>

        {/* Footer note */}
        <Typography variant="body2" sx={{ textAlign: 'center', mt: 4, color: '#999' }}>
          PharmaStackX · Benin City, Edo State, Nigeria · pharmastackX@gmail.com
        </Typography>

      </Container>
    </Box>
  );
}

const bodyStyle = { fontSize: '1rem', lineHeight: 1.75, color: '#333' };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: '#1a1a1a' }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <Box component="ul" sx={{ pl: 2.5, m: 0 }}>
      {items.map((item, i) => (
        <Box component="li" key={i} sx={{ mb: 1, fontSize: '1rem', lineHeight: 1.75, color: '#333' }}>
          {item}
        </Box>
      ))}
    </Box>
  );
}
