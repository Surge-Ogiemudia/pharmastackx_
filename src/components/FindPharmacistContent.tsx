
"use client";
import { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Button, CircularProgress, Paper, Grid, TextField, Avatar } from '@mui/material';
import { debounce } from 'lodash';

interface Pharmacist {
  _id: string;
  username: string;
  email: string;
  role: string;
  profilePicture?: string;
  specialties?: string[];
}

interface FindPharmacistContentProps {
  onPharmacistSelect: (pharmacist: Pharmacist) => void;
}

const FindPharmacistContent = ({ onPharmacistSelect }: FindPharmacistContentProps) => {
  const [pharmacists, setPharmacists] = useState<Pharmacist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchPharmacists = useCallback(debounce(async (search: string, pageNum: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/pharmacists?search=${search}&page=${pageNum}&limit=10`);
      if (!response.ok) {
        throw new Error('Failed to fetch pharmacists');
      }
      const data = await response.json();
      setPharmacists(prev => pageNum === 0 ? data.pharmacists : [...prev, ...data.pharmacists]);
      setHasMore(data.pharmacists.length > 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, 300), []);

  useEffect(() => {
    fetchPharmacists(searchQuery, 0);
    setPage(0);
    setPharmacists([]);
  }, [searchQuery, fetchPharmacists]);

  const handleLoadMore = () => {
    const newPage = page + 1;
    setPage(newPage);
    fetchPharmacists(searchQuery, newPage);
  };

  return (
    <Box sx={{ bgcolor: 'white', p: { xs: 2, sm: 3 }, borderRadius: '16px', color: 'black' }}>
      <TextField
        fullWidth
        variant="outlined"
        placeholder="Search for a pharmacist by name or specialty..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        sx={{ 
          mb: 3, 
          input: { color: 'black' }, 
          '& .MuiOutlinedInput-root': { 
            '& fieldset': { borderColor: 'rgba(0,0,0,0.23)' }, 
            '&:hover fieldset': { borderColor: 'black' } 
          } 
        }}
      />
      
      {isLoading && page === 0 && <CircularProgress sx={{ display: 'block', margin: 'auto', mt: 4 }} />}
      
      {error && <Typography color="error" sx={{ mt: 2, textAlign: 'center' }}>{error}</Typography>}

      <Grid container spacing={2}>
        {pharmacists.map((pharmacist) => (
          <Grid item xs={12} key={pharmacist._id}>
            <Paper 
              elevation={0}
              onClick={() => onPharmacistSelect(pharmacist)}
              sx={{ 
                p: 2, 
                display: 'flex', 
                alignItems: 'center', 
                gap: 2, 
                cursor: 'pointer', 
                bgcolor: '#f5f5f5', 
                '&:hover': { bgcolor: '#e0e0e0' }, 
                color: 'black',
                border: '1px solid rgba(0,0,0,0.12)',
                borderRadius: '12px'
              }}
            >
              <Avatar src={pharmacist.profilePicture} alt={pharmacist.username} />
              <Box>
                <Typography variant="h6">{pharmacist.username}</Typography>
                <Typography variant="body2" sx={{ color: 'grey.700' }}>
                  {pharmacist.specialties?.join(', ') || 'General Pharmacist'}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>
      
      {hasMore && !isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Button variant="contained" onClick={handleLoadMore}>Load More</Button>
        </Box>
      )}

      {!hasMore && pharmacists.length === 0 && !isLoading && (
        <Typography sx={{ mt: 4, textAlign: 'center', color: 'grey.600' }}>
          No pharmacists found.
        </Typography>
      )}
    </Box>
  );
};

export default FindPharmacistContent;
