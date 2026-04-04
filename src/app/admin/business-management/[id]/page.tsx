"use client";
import React, { useState } from "react";
import { Box, Typography, Tabs, Tab, Paper, Card, CardContent, Avatar, Button, Table, TableBody, TableCell, TableHead, TableRow, Stack } from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import Navbar from "@/components/Navbar";

export default function BusinessDetailPage() {
  const [tab, setTab] = useState(0);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTab(newValue);
  };

  return (
    <>
      <Navbar />
      <Box sx={{ p: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: "#1B5E20", mb: 3 }}>
          Business Details
        </Typography>
        <Tabs value={tab} onChange={handleTabChange} aria-label="business detail tabs" sx={{ mb: 2 }}>
          <Tab label="Dashboard" id="business-detail-tab-0" aria-controls="business-detail-tabpanel-0" />
          <Tab label="Logs" id="business-detail-tab-1" aria-controls="business-detail-tabpanel-1" />
        </Tabs>
        {tab === 0 && (
          <>
            {/* Key Personnel Section */}
            <Card sx={{ background: 'linear-gradient(135deg, #2196F3 0%, #1B5E20 100%)', color: 'white', boxShadow: '0 4px 20px rgba(33, 150, 243, 0.3)', width: '100%', mb: 3 }}>
              <CardContent sx={{ py: 2, px: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)', width: 36, height: 36 }}>
                      <PersonIcon sx={{ fontSize: '1.3rem' }} />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: 'white' }}>
                        Key Personnel
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.9, color: 'rgba(255, 255, 255, 0.8)' }}>
                        Superintendent Pharmacist assigned
                      </Typography>
                    </Box>
                  </Box>
                  <Button
                    variant="outlined"
                    size="small"
                    sx={{
                      borderColor: 'rgba(255, 255, 255, 0.5)',
                      color: 'white',
                      '&:hover': { borderColor: 'white', bgcolor: 'rgba(255, 255, 255, 0.1)' },
                      textTransform: 'none',
                      fontSize: '0.75rem'
                    }}
                  >
                    Edit
                  </Button>
                </Box>
                {/* Personnel Display */}
                <Card sx={{ bgcolor: 'white', mb: 1 }}>
                  <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                      <Avatar 
                        src={"/api/placeholder/60/60"}
                        sx={{ width: 50, height: 50, border: '2px solid #1B5E20' }}
                      >
                        <PersonIcon sx={{ fontSize: '1.5rem', color: '#1B5E20' }} />
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1B5E20', fontSize: '0.9rem' }}>
                          Dr. Jane Doe
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#E91E63', fontSize: '0.8rem', mb: 0.5 }}>
                          Superintendent Pharmacist
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#666', fontSize: '0.75rem', display: 'block' }}>
                          10 years • Community Pharmacy
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#666', fontSize: '0.7rem', display: 'block' }}>
                          📧 jane.doe@email.com • 📞 08012345678
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
            {/* View CareChat Placeholder */}
            <Card sx={{ background: 'linear-gradient(135deg, #E91E63 0%, #1B5E20 100%)', color: 'white', boxShadow: '0 4px 20px rgba(233, 30, 99, 0.2)', width: '100%', mb: 3 }}>
              <CardContent sx={{ py: 2, px: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)', width: 36, height: 36 }}>
                      {/* You can use a chat icon here if desired */}
                      <span role="img" aria-label="chat">💬</span>
                    </Avatar>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: 'white' }}>
                        View CareChat
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.9, color: 'rgba(255, 255, 255, 0.8)' }}>
                        3rd party view of chat between key personnel and patient (coming soon)
                      </Typography>
                    </Box>
                  </Box>
                  <Button
                    variant="contained"
                    size="small"
                    sx={{
                      bgcolor: '#E91E63',
                      color: 'white',
                      '&:hover': { bgcolor: '#c2185b' },
                      textTransform: 'none',
                      fontSize: '0.75rem'
                    }}
                    disabled
                  >
                    Open Chat
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </>
        )}
        {tab === 1 && (
          <Paper sx={{ p: 3, minHeight: 300, mt: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#1B5E20' }}>
                Activity Logs
              </Typography>
              <Button variant="outlined" color="primary" size="small" onClick={() => {/* TODO: implement CSV download */}}>
                Download Logs (CSV)
              </Button>
            </Stack>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Timestamp</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>User</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Details</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {/* Example log entries, replace with real-time data as needed */}
                <TableRow>
                  <TableCell>2025-11-04 10:15</TableCell>
                  <TableCell>Jane Doe</TableCell>
                  <TableCell>Order Placed</TableCell>
                  <TableCell>Order #12345 for Amoxicillin 500mg</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>2025-11-04 10:18</TableCell>
                  <TableCell>Jane Doe</TableCell>
                  <TableCell>Inventory Updated</TableCell>
                  <TableCell>Added 20 packs of Paracetamol</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>2025-11-04 10:20</TableCell>
                  <TableCell>Admin</TableCell>
                  <TableCell>Account Updated</TableCell>
                  <TableCell>Changed business address</TableCell>
                </TableRow>
                {/* ...more logs... */}
              </TableBody>
            </Table>
          </Paper>
        )}
      </Box>
    </>
  );
}
