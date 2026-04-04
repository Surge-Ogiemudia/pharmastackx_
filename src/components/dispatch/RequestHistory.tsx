'use client';

import { Card, CardContent, Typography, Button, Chip, Box, Grid, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import { useState } from 'react';

const RequestHistory = ({ history, onRefill, setView, setSelectedRequestId }: { history: any[], onRefill: (items: any[]) => void, setView: (view: string) => void, setSelectedRequestId: (id: string) => void }) => {
    const [visibleCount, setVisibleCount] = useState(1);
    const [increment, setIncrement] = useState(3);
    const [open, setOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<any>(null);
    const tileColors = ['#006D5B', '#E91E63']; // Teal and Magenta

    const handleShowMore = () => {
        setVisibleCount(prev => prev + increment);
        setIncrement(prev => prev + 2);
    };

    const handleShowLess = () => {
        setVisibleCount(1);
        setIncrement(3);
    };

    const handleStopSearch = (request: any) => {
        setSelectedRequest(request);
        setOpen(true);
    };

    const handleConfirmStopSearch = async () => {
        if (selectedRequest) {
            try {
                const response = await fetch(`/api/requests/${selectedRequest._id}`,
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'stop-search' })
                });
                if (response.ok) {
                    // You might want to refresh the history here
                    // For now, we just close the dialog
                    setOpen(false);
                    setSelectedRequest(null);
                    window.location.reload(); // Or a more sophisticated state management
                } else {
                    console.error('Failed to stop search');
                }
            } catch (error) {
                console.error('Error stopping search:', error);
            }
        }
    };

    const handleClose = () => {
        setOpen(false);
        setSelectedRequest(null);
    };

    const handleViewRequest = (requestId: string) => {
        setSelectedRequestId(requestId);
        setView('reviewRequest');
    }

    const visibleHistory = history.slice(0, visibleCount);

    return (
        <Box sx={{ mt: 5 }}>
            <Typography variant="h5" sx={{ mb: 3, fontWeight: 600, color: 'rgba(2, 0, 0, 0.7)' }}>Recent Requests</Typography>
            {history.length === 0 ? (
                <Card sx={{ borderRadius: '16px', background: 'rgba(0, 0, 0, 0.03)', border: '1px dashed rgba(0, 0, 0, 0.1)' }}>
                    <CardContent sx={{ textAlign: 'center', color: 'grey.600', py: 5 }}>
                        <Typography>You have no recent requests.</Typography>
                        <Typography variant="body2" sx={{ mt: 1 }}>Your past medicine requests will appear here for quick refills.</Typography>
                    </CardContent>
                </Card>
            ) : (
                <>
                    <Grid container spacing={2}>
                        {visibleHistory.map((request, index) => {
                            const tileColor = tileColors[index % tileColors.length];
                            const isActionable = !['confirmed', 'declined', 'cancelled', 'completed', 'search-stopped'].includes(request.status);
                            const canRefill = ['confirmed', 'declined', 'cancelled', 'completed', 'search-stopped'].includes(request.status);

                            return (
                                <Grid item xs={12} key={request._id}>
                                    <Card sx={{ background: tileColor, color: 'white', borderRadius: '16px' }}>
                                        <CardContent>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <Box>
                                                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>{new Date(request.createdAt).toLocaleString()}</Typography>
                                                    <Chip label={request.status} size="small" sx={{ mt: 1, backgroundColor: 'rgba(255, 255, 255, 0.25)', color: 'white' }} />
                                                </Box>
                                                <Box sx={{ display: 'flex', gap: 1 }}>
                                                    {canRefill && (
                                                        <Button 
                                                            size="small" 
                                                            variant="outlined"
                                                            onClick={() => onRefill(request.items)}
                                                            sx={{ 
                                                                color: 'white', 
                                                                borderColor: 'rgba(255, 255, 255, 0.5)',
                                                                textTransform: 'none',
                                                                '&:hover': { 
                                                                    backgroundColor: 'rgba(255, 255, 255, 0.1)', 
                                                                    borderColor: 'white' 
                                                                }
                                                            }}
                                                        >
                                                            Refill
                                                        </Button>
                                                    )}
                                                    {isActionable && (
                                                        <Button 
                                                            size="small" 
                                                            variant="outlined"
                                                            onClick={() => handleStopSearch(request)}
                                                            sx={{ 
                                                                color: 'white', 
                                                                borderColor: 'rgba(255, 255, 255, 0.5)',
                                                                textTransform: 'none',
                                                                '&:hover': { 
                                                                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                                                    borderColor: 'white' 
                                                                }
                                                            }}
                                                        >
                                                            Stop Search
                                                        </Button>
                                                    )}
                                                    <Button 
                                                        size="small" 
                                                        variant="outlined"
                                                        onClick={() => handleViewRequest(request._id)}
                                                        sx={{ 
                                                            color: 'white', 
                                                            borderColor: 'rgba(255, 255, 255, 0.5)',
                                                            textTransform: 'none',
                                                            '&:hover': { 
                                                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                                                borderColor: 'white'
                                                            }
                                                        }}
                                                    >
                                                        View
                                                    </Button>
                                                </Box>
                                            </Box>
                                            <Box sx={{ mt: 2, pl: 0.5 }}>
                                                {request.items.map((item: any, index: number) => (
                                                    <Typography key={index} variant="body1" sx={{ display: 'block' }}>
                                                        - {item.name} {item.strength && `(${item.strength})`}, Qty: {item.quantity}
                                                    </Typography>
                                                ))}
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            );
                        })}
                    </Grid>
                    {(history.length > 1) && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, gap: 2 }}>
                            {visibleCount > 1 && (
                                <Button
                                    onClick={handleShowLess}
                                    sx={{
                                        color: '#006D5B', // Theme color
                                        textTransform: 'none',
                                        '&:hover': {
                                            backgroundColor: 'rgba(0, 109, 91, 0.08)',
                                        }
                                    }}
                                >
                                    Show Less
                                </Button>
                            )}
                            {visibleCount < history.length && (
                                <Button
                                    onClick={handleShowMore}
                                    sx={{
                                        color: '#006D5B', // Theme color
                                        textTransform: 'none',
                                        '&:hover': {
                                            backgroundColor: 'rgba(0, 109, 91, 0.08)',
                                        }
                                    }}
                                >
                                    Show More
                                </Button>
                            )}
                        </Box>
                    )}
                </>
            )}
            <Dialog
                open={open}
                onClose={handleClose}
            >
                <DialogTitle>Stop Search</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to stop the search for this request? This will cancel the request and you will not receive any more quotes.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>Cancel</Button>
                    <Button onClick={handleConfirmStopSearch} autoFocus>
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default RequestHistory;
