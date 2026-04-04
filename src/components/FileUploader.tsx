'use client'

import { Box, Button, Typography, IconButton } from "@mui/material";
import { AddAPhoto, CameraAlt, Clear } from "@mui/icons-material";
import { useRef, useState, ChangeEvent } from "react";

interface FileUploaderProps {
    onFileSelect: (file: File) => void;
    onClear: () => void;
}

export default function FileUploader({ onFileSelect, onClear }: FileUploaderProps) {
    const [file, setFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            const selectedFile = event.target.files[0];
            if (selectedFile) {
                setFile(selectedFile);
                onFileSelect(selectedFile);
            }
        }
    };

    const handleClear = () => {
        setFile(null);
        onClear();
        // Also clear the input value so the same file can be selected again
        if (fileInputRef.current) fileInputRef.current.value = "";
        if (cameraInputRef.current) cameraInputRef.current.value = "";
    };

    return (
        <Box>
            <Box
                sx={{
                    border: '2px dashed #006D5B',
                    borderRadius: '10px',
                    p: 3,
                    textAlign: 'center',
                    cursor: 'pointer',
                    '&:hover': {
                        backgroundColor: '#f0f7f4'
                    }
                }}
            >
                {/* Hidden input for file gallery selection */}
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                />
                {/* Hidden input for camera selection */}
                <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                    ref={cameraInputRef}
                    style={{ display: 'none' }}
                />
                <Box>
                    <Button
                        variant="contained"
                        onClick={() => fileInputRef.current?.click()}
                        startIcon={<AddAPhoto />}
                        sx={{
                            mr: 2,
                            bgcolor: '#006D5B',
                            '&:hover': { bgcolor: '#004D3F' }
                        }}
                    >
                        Upload
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => cameraInputRef.current?.click()}
                        startIcon={<CameraAlt />}
                        sx={{
                            bgcolor: '#E91E63',
                            '&:hover': { bgcolor: '#C2185B' }
                        }}
                    >
                        Camera
                    </Button>
                </Box>
                {file && (
                    <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                        <Typography 
                            variant="body1" 
                            sx={{ 
                                whiteSpace: 'nowrap', 
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis',
                                maxWidth: 'calc(100% - 48px)'
                            }}
                        >
                            {file.name}
                        </Typography>
                        <IconButton
                            onClick={handleClear}
                            size="small"
                            sx={{
                                position: 'absolute',
                                right: -10,
                                top: '50%',
                                transform: 'translateY(-50%)'
                            }}
                        >
                            <Clear />
                        </IconButton>
                    </Box>
                )}
            </Box>
        </Box>
    );
}
