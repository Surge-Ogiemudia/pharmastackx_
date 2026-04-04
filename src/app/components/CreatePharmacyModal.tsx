'use client';
import React, { useState } from 'react';
import { Modal, Box, Typography, TextField, Button, MenuItem } from '@mui/material';
import axios from 'axios';

const nigerianStates = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT - Abuja", "Gombe",
  "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos",
  "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto",
  "Taraba", "Yobe", "Zamfara"
];

const style = {
  position: 'absolute' as 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
  maxHeight: '90vh',
  overflowY: 'auto',
};

interface CreatePharmacyModalProps {
  open: boolean;
  onClose: () => void;
  onPharmacyCreated: (pharmacy: any) => void;
  setError: (msg: string) => void;
}

const CreatePharmacyModal: React.FC<CreatePharmacyModalProps> = ({ open, onClose, onPharmacyCreated, setError }) => {
  const [form, setForm] = useState({
    businessName: "",
    state: "",
    city: "",
    businessAddress: "",
    phoneNumber: "",
    license: "",
  });
  const [creating, setCreating] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    setForm({ ...form, [e.target.name as string]: e.target.value });
  };

  const handleCreate = async () => {
    setError("");
    setCreating(true);
    try {
      const response = await axios.post("/api/auth/signup", {
        email: `${Date.now()}@pharmacy.placeholder`,
        password: "defaultPassword",
        username: form.businessName,
        role: 'pharmacy',
        ...form,
      });
      onPharmacyCreated(response.data);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create pharmacy");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={style}>
        <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
          Add your Pharmacy
        </Typography>
        <TextField label="Whats your Pharmacy Name" name="businessName" value={form.businessName} onChange={handleChange} fullWidth margin="normal" required />
        <TextField select label="State" name="state" value={form.state} onChange={handleChange} fullWidth margin="normal" required>
          {nigerianStates.map((state) => (
            <MenuItem key={state} value={state}>{state}</MenuItem>
          ))}
        </TextField>
        <TextField label="City" name="city" value={form.city} onChange={handleChange} fullWidth margin="normal" required />
        <TextField label="Whats the Address of your Pharmacy" name="businessAddress" value={form.businessAddress} onChange={handleChange} fullWidth margin="normal" required />
        <TextField label="Phone Number of the MD/Superintendent" name="phoneNumber" value={form.phoneNumber} onChange={handleChange} fullWidth margin="normal" required />
        <TextField label="License of the Pharmacy (optional)" name="license" value={form.license} onChange={handleChange} fullWidth margin="normal" />
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button onClick={onClose} color="secondary">Cancel</Button>
          <Button onClick={handleCreate} variant="contained" disabled={creating}>
            {creating ? 'Creating...' : 'Create'}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default CreatePharmacyModal;
