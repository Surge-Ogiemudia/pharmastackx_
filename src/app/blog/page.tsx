"use client";

import { useState } from 'react';
import { Box, Container, Typography, TextField, Button, Paper, CircularProgress, Alert } from '@mui/material';
import Navbar from '../../components/Navbar';
import { useSession } from '../../context/SessionProvider';

// A simple rich text editor component could be used here in a real app
// For this example, a multiline TextField will suffice.

export default function BlogPage() {
  const { user, isLoading: isSessionLoading } = useSession();
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!title || !content || !category) {
      setError('Title, Content, and Category are required.');
      return;
    }

    setIsSubmitting(true);
    // In a real application, you would send this data to your API
    // to save it to the database.
    console.log({ title, content, category, imageUrl });

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    // For now, we just log it and reset the form
    setSuccess(`Successfully posted article: "${title}"`);
    setTitle('');
    setContent('');
    setCategory('');
    setImageUrl('');
    setIsSubmitting(false);
  };

  if (isSessionLoading) {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <CircularProgress />
        </Box>
    );
  }

  // This is a client-side check. Route protection should also be implemented on the server/middleware.
  if (user?.role !== 'admin') {
    return (
      <>
        <Navbar />
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Alert severity="error" sx={{ mt: 4 }}>
                <Typography variant="h6">Permission Denied</Typography>
                You do not have the necessary permissions to access this page.
            </Alert>
        </Container>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <Box sx={{ bgcolor: 'grey.50', minHeight: 'calc(100vh - 64px)' }}>
        <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
            {/* Page Header */}
            <Typography variant="h3" component="h1" sx={{ fontWeight: 700, mb: 4, color: '#004D40' }}>
                Create New Blog Post
            </Typography>

            <Paper 
                component="form" 
                onSubmit={handleSubmit} 
                elevation={2}
                sx={{ p: { xs: 3, md: 4 }, borderRadius: '16px' }}
            >
                <Box sx={{ display: 'grid', gap: 3 }}>
                    <TextField 
                        label="Article Title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        fullWidth
                        required
                        variant="outlined"
                    />
                    <TextField 
                        label="Category (e.g., Wellness, Medication 101)"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        fullWidth
                        required
                        variant="outlined"
                    />
                    <TextField 
                        label="Featured Image URL"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        fullWidth
                        variant="outlined"
                        placeholder="https://example.com/image.jpg"
                    />
                    <TextField 
                        label="Article Content"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        fullWidth
                        required
                        multiline
                        rows={12}
                        variant="outlined"
                        placeholder="Write your article here. You can use Markdown for formatting..."
                    />

                    {error && <Alert severity="error">{error}</Alert>}
                    {success && <Alert severity="success">{success}</Alert>}

                    <Button 
                        type="submit"
                        variant="contained"
                        disabled={isSubmitting}
                        sx={{ 
                            py: 1.5, 
                            bgcolor: '#006D5B', 
                            '&:hover': { bgcolor: '#004D40' },
                            fontSize: '1rem'
                        }}
                    >
                        {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Publish Article'}
                    </Button>
                </Box>
            </Paper>
        </Container>
      </Box>
    </>
  );
}
''