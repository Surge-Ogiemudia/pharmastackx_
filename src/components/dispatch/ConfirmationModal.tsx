'use client';

import { 
    Dialog, 
    DialogTitle, 
    DialogContent, 
    DialogActions, 
    Button, 
    List, 
    ListItem, 
    ListItemAvatar, 
    ListItemText, 
    Avatar,
    Typography,
    Box,
    Chip,
    CircularProgress,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    FormHelperText
} from '@mui/material';
import { useState } from 'react';

interface DrugRequest {
  id: number;
  name: string;
  form: string;
  strength: string;
  quantity: number;
  notes: string;
  image: string | null;
}

interface ConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (phoneNumber: string, state: string) => void;
  requests: DrugRequest[];
  isSubmitting: boolean;
}

const nigerianStates = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT - Abuja", "Gombe",
  "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos",
  "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto",
  "Taraba", "Yobe", "Zamfara"
];

export default function ConfirmationModal({ open, onClose, onConfirm, requests, isSubmitting }: ConfirmationModalProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState(false);
  const [state, setState] = useState('');
  const [stateError, setStateError] = useState(false);

  const handleConfirm = () => {
    let hasError = false;
    if (phoneNumber.trim() === '') {
      setPhoneError(true);
      hasError = true;
    } else {
      setPhoneError(false);
    }

    if (state.trim() === '') {
      setStateError(true);
      hasError = true;
    } else {
      setStateError(false);
    }

    if (!hasError) {
      onConfirm(phoneNumber, state);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 600, borderBottom: '1px solid #ddd' }}>Confirm Your Request</DialogTitle>
      <DialogContent sx={{py: 2}}>
        <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>
            Please review the items below. Once confirmed, we will begin searching for the best options for you.
        </Typography>
        <List>
          {requests.map((drug) => {
            const isImageBased = drug.name.startsWith('Prescription') || drug.name.startsWith('Image');
            return (
              <ListItem key={drug.id} divider>
                <ListItemAvatar>
                  <Avatar src={drug.image || undefined} sx={{ bgcolor: !drug.image ? '#006D5B' : 'transparent' }}>
                      {!drug.image && drug.name.charAt(0).toUpperCase()}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={<Typography variant="body1" sx={{fontWeight: '500'}}>{drug.name}</Typography>}
                  secondary={
                      !isImageBased ? (
                          <Box component="span" sx={{display: 'flex', flexWrap: 'wrap', gap: 0.5, pt: 0.5}}>
                              <Chip component="span" label={drug.strength || 'No Strength'} size="small" />
                              <Chip component="span" label={drug.form || 'No Form'} size="small" />
                              <Chip component="span" label={`Qty: ${drug.quantity}`} size="small" />
                              {drug.notes && <Chip component="span" label="Has Notes" size="small" variant="outlined" />}
                          </Box>
                      ) : (drug.notes ? <Chip component="span" label="Has Notes" size="small" variant="outlined" sx={{mt: 0.5}}/> : null)
                  }
                />
              </ListItem>
            )
          })}
        </List>
        
        <TextField
          autoFocus
          margin="dense"
          id="phone"
          label="Add Phone Number"
          type="tel"
          fullWidth
          variant="outlined"
          value={phoneNumber}
          onChange={(e) => {
            setPhoneNumber(e.target.value);
            if(phoneError) setPhoneError(false);
          }}
          required
          error={phoneError}
          helperText={phoneError ? "A phone number is required." : "Add a phone number."}
          sx={{mt: 2}}
        />

        <FormControl fullWidth margin="dense" sx={{ mt: 2 }} required error={stateError}>
          <InputLabel id="state-select-label">Your State</InputLabel>
          <Select
            labelId="state-select-label"
            id="state"
            value={state}
            label="Your State"
            onChange={(e) => {
              setState(e.target.value);
              if(stateError) setStateError(false);
            }}
          >
            {nigerianStates.map((stateName) => (
              <MenuItem key={stateName} value={stateName}>
                {stateName}
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>{stateError ? "Your state is required." : "The search will start state-wide before nationwide."}</FormHelperText>
        </FormControl>

      </DialogContent>
      <DialogActions sx={{ p: '16px 24px', borderTop: '1px solid #ddd' }}>
        <Button onClick={onClose} color="inherit" disabled={isSubmitting}>Go Back</Button>
        <Button onClick={handleConfirm} variant="contained" autoFocus sx={{ bgcolor: '#006D5B', '&:hover': { bgcolor: '#004D3F' }, minWidth: 130 }} disabled={isSubmitting || !phoneNumber || !state}>
          {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Begin Search'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
