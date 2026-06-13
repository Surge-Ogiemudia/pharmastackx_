'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Container, TextField, Button, Paper, 
  CircularProgress, Grid, Divider, Select, MenuItem, 
  FormControl, InputLabel, Alert
} from '@mui/material';
import Navbar from '@/app/components/Navbar';
import axios from 'axios';
import { useSession } from '@/context/SessionProvider';
import { useRouter } from 'next/navigation';

export default function AICoFounderDashboard() {
  const { user } = useSession();
  const router = useRouter();

  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const [selectedPharmacy, setSelectedPharmacy] = useState<string>('');
  const [command, setCommand] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [logs, setLogs] = useState<{ time: string, message: string, type: 'info' | 'code' | 'error' | 'success' }[]>([]);

  useEffect(() => {
    // Basic protection: Ensure user is admin (adjust based on your actual auth logic)
    if (user && user.role !== 'admin' && user.role !== 'superadmin') {
      // router.push('/dashboard');
    }
    fetchPharmacies();
  }, [user]);

  const fetchPharmacies = async () => {
    try {
      // Use existing endpoint to fetch all users/pharmacies
      const res = await axios.get('/api/admin/users?role=pharmacy');
      if (res.data && res.data.users) {
        setPharmacies(res.data.users);
      }
    } catch (error) {
      console.error('Error fetching pharmacies:', error);
      // Fallback dummy for testing if endpoint fails
      setPharmacies([{ slug: 'test-pharmacy', username: 'Test Pharmacy' }]);
    }
  };

  const addLog = (message: string, type: 'info' | 'code' | 'error' | 'success' = 'info') => {
    setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), message, type }]);
  };

  const handleSendCommand = async () => {
    if (!selectedPharmacy) {
      addLog('Error: Please select a target pharmacy first.', 'error');
      return;
    }
    if (!command.trim()) return;

    setIsGenerating(true);
    addLog(`Sending command: "${command}" to ${selectedPharmacy}...`, 'info');

    try {
      const res = await axios.post('/api/admin/ai-cofounder', {
        targetPharmacySlug: selectedPharmacy,
        naturalLanguageCommand: command
      });

      addLog('Gemini successfully generated the Omni-Node script:', 'success');
      addLog(res.data.script, 'code');
      addLog('Script pushed to Synkk Desktop via Pusher. Awaiting ACK...', 'info');
      setCommand('');

    } catch (error: any) {
      addLog(`Failed to generate/push script: ${error.response?.data?.error || error.message}`, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Box sx={{ flexGrow: 1, bgcolor: '#f4f6f8', minHeight: '100vh', pb: 10 }}>
      <Navbar />
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ color: '#1a237e' }}>
          AI Co-Founder Terminal (Omni-Node)
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" paragraph>
          Translate natural language into executable JavaScript. Push scripts instantly to any Synkk Desktop client in the world.
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Target Configuration
              </Typography>
              
              <FormControl fullWidth sx={{ mb: 3, mt: 2 }}>
                <InputLabel>Select Target Pharmacy</InputLabel>
                <Select
                  value={selectedPharmacy}
                  label="Select Target Pharmacy"
                  onChange={(e) => setSelectedPharmacy(e.target.value)}
                >
                  {pharmacies.map((pharm) => (
                    <MenuItem key={pharm.slug} value={pharm.slug}>
                      {pharm.username || pharm.slug} ({pharm.slug})
                    </MenuItem>
                  ))}
                  <MenuItem value="fay">Fay Pharmacy (Test)</MenuItem>
                </Select>
              </FormControl>

              <Alert severity="warning" sx={{ mb: 2 }}>
                <strong>God Mode Active:</strong> Scripts generated here will be executed directly on the local operating system of the target pharmacy.
              </Alert>
            </Paper>
          </Grid>

          <Grid item xs={12} md={8}>
            <Paper elevation={2} sx={{ p: 3, borderRadius: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Command Terminal
              </Typography>
              
              <Box sx={{ 
                flexGrow: 1, 
                bgcolor: '#1e1e1e', 
                color: '#00ff00', 
                p: 2, 
                borderRadius: 2, 
                fontFamily: 'monospace',
                minHeight: '300px',
                maxHeight: '400px',
                overflowY: 'auto',
                mb: 3
              }}>
                {logs.length === 0 ? (
                  <Typography variant="body2" sx={{ opacity: 0.5 }}>// Waiting for commands...</Typography>
                ) : (
                  logs.map((log, i) => (
                    <Box key={i} sx={{ mb: 1 }}>
                      <span style={{ color: '#888' }}>[{log.time}] </span>
                      <span style={{ 
                        color: log.type === 'error' ? '#ff5252' : 
                               log.type === 'success' ? '#69f0ae' : 
                               log.type === 'code' ? '#f8bbd0' : '#00ff00',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {log.message}
                      </span>
                    </Box>
                  ))
                )}
              </Box>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField 
                  fullWidth 
                  variant="outlined" 
                  placeholder="e.g. 'Read the first 10 lines of C:/POS/inventory.csv'"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  onKeyPress={(e) => { if (e.key === 'Enter') handleSendCommand(); }}
                  disabled={isGenerating}
                />
                <Button 
                  variant="contained" 
                  color="primary" 
                  onClick={handleSendCommand}
                  disabled={isGenerating || !command.trim()}
                  sx={{ minWidth: '120px', fontWeight: 'bold' }}
                >
                  {isGenerating ? <CircularProgress size={24} color="inherit" /> : 'Execute'}
                </Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
