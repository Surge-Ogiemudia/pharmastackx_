
"use client";

import { useState } from 'react';
import { Button, Box, Typography, TextField } from "@mui/material";
import { UploadFile } from '@mui/icons-material';

interface FileUploadProps {
    onFileSelect: (file: File) => void;
}

const FileUpload = ({ onFileSelect }: FileUploadProps) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            onFileSelect(file);
        }
    };

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
            <Button
                variant="outlined"
                component="label"
                startIcon={<UploadFile />}
            >
                Choose File
                <input
                    type="file"
                    hidden
                    onChange={handleFileChange}
                    accept=".pdf,.jpg,.jpeg,.png"
                />
            </Button>
            {selectedFile && (
                <Typography variant="body2">{selectedFile.name}</Typography>
            )}
        </Box>
    );
};

export default FileUpload;
