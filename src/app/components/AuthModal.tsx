'use client';

import React from 'react';
import { Modal, Box, IconButton, Backdrop, Fade } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useAuthModal } from '@/contexts/AuthModalContext';
import ModalAuthContent from './ModalAuthContent'; // Import the new content component

export default function AuthModal() {
    const { isOpen, closeModal } = useAuthModal();

    return (
        <Modal
            open={isOpen}
            onClose={closeModal}
            closeAfterTransition
            slots={{ backdrop: Backdrop }}
            slotProps={{
                backdrop: {
                    timeout: 500,
                    sx: { backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)' }
                },
            }}
            aria-labelledby="auth-modal-title"
            aria-describedby="auth-modal-description"
        >
            <Fade in={isOpen}>
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100vh',
                    width: '100vw',
                    p: 2,
                }}>
                    <Box sx={{
                        position: 'relative',
                    }}>
                        <IconButton
                            aria-label="close"
                            onClick={closeModal}
                            sx={{
                                position: 'absolute',
                                top: 8,
                                right: 8,
                                zIndex: 10,
                                color: (theme) => theme.palette.grey[500],
                            }}
                        >
                            <CloseIcon />
                        </IconButton>
                        <ModalAuthContent />
                    </Box>
                </Box>
            </Fade>
        </Modal>
    );
}
