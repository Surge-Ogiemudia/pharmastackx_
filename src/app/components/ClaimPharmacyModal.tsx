
import { Modal, Box, Typography, Button, List, ListItem, ListItemText } from '@mui/material';

interface Pharmacy {
  _id: string;
  businessName: string;
  businessAddress?: string;
  city?: string;
  state?: string;
}

interface ClaimPharmacyModalProps {
  open: boolean;
  onClose: () => void;
  pharmacies: Pharmacy[];
  onSelectPharmacy: (pharmacy: Pharmacy) => void;
}

export default function ClaimPharmacyModal({ open, onClose, pharmacies, onSelectPharmacy }: ClaimPharmacyModalProps) {
  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={{ 
        position: 'absolute', 
        top: '50%', 
        left: '50%', 
        transform: 'translate(-50%, -50%)', 
        width: 400, 
        bgcolor: 'background.paper', 
        border: '2px solid #000', 
        boxShadow: 24, 
        p: 4 
      }}>
        <Typography variant="h6" component="h2">
          Is this your pharmacy?
        </Typography>
        <List>
          {pharmacies.map((pharmacy) => (
            <ListItem key={pharmacy._id}>
              <ListItemText 
                primary={pharmacy.businessName} 
                secondary={`${pharmacy.businessAddress || ''}, ${pharmacy.city || ''}, ${pharmacy.state || ''}`} 
              />
              <Button onClick={() => onSelectPharmacy(pharmacy)}>Yes, this is my pharmacy</Button>
            </ListItem>
          ))}
        </List>
        <Button onClick={onClose}>No, continue creating my account</Button>
      </Box>
    </Modal>
  );
}

