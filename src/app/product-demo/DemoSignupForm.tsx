'use client';
import React, { useState, useCallback, useEffect } from "react";
import { TextField, Button, MenuItem, Box, Typography, InputAdornment, IconButton, ListSubheader, Alert, CircularProgress } from "@mui/material";
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useSession } from "@/context/SessionProvider";
import axios from "axios";
import CreatePharmacyModal from "../components/CreatePharmacyModal";

const nigerianStates = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT - Abuja", "Gombe",
  "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos",
  "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto",
  "Taraba", "Yobe", "Zamfara"
];

interface Pharmacy {
  _id: string;
  businessName: string;
}

const SuccessView = ({ onRedirect }: { onRedirect: () => void }) => (
  <Box sx={{ textAlign: 'center', p: {xs: 2, md: 4}, border: '1px solid', borderColor: 'success.main', borderRadius: 2, bgcolor: 'success.light' }}>
    <Typography variant="h5" sx={{ fontWeight: 600, color: 'success.dark', mb: 2 }}>
      Registration Successful!
    </Typography>
    <Typography variant="body1" sx={{ mb: 3 }}>
      Your account has been created. We're redirecting you to your dashboard...
    </Typography>
    <Box sx={{ display: 'flex', justifyContent: 'center', maxWidth: 300, margin: 'auto' }}>
      <Button
        variant="contained"
        color="primary"
        onClick={onRedirect}
        fullWidth
        sx={{ bgcolor: '#006D5B', '&:hover': { bgcolor: '#00594C' } }}
      >
        Go to Your Dashboard
      </Button>
    </Box>
  </Box>
);

export default function DemoSignupForm() {
  const [form, setForm] = useState({
    username: "",
    email: "",
    mobile: "",
    password: "",
    licenseNumber: "",
    stateOfPractice: "",
    pharmacy: "",
  });

  const { refreshSession } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [pharmacySearch, setPharmacySearch] = useState("");
  const [isCreatePharmacyModalOpen, setCreatePharmacyModalOpen] = useState(false);

  const fetchPharmacies = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/pharmacies?all=true');
      if (data && Array.isArray(data.pharmacies)) {
        setPharmacies(data.pharmacies);
      } else {
        setError("Failed to load pharmacies list.");
      }
    } catch (error) {
      console.error("Failed to fetch pharmacies", error);
      setError("Failed to load pharmacies list.");
    }
  }, [setError]);

  useEffect(() => {
    fetchPharmacies();
  }, [fetchPharmacies]);

  const redirectToApp = () => {
    window.location.href = '/';
  };

  const handlePharmacySearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPharmacySearch(event.target.value);
  };

  const filteredPharmacies = pharmacies.filter(
    (p) => p && p.businessName && p.businessName.toLowerCase().includes(pharmacySearch.toLowerCase())
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    if (name === 'pharmacy' && value === 'create-new') {
      setCreatePharmacyModalOpen(true);
      return;
    }
    setForm((prevForm) => ({ ...prevForm, [name as string]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Step 1: Create the user account (existing logic)
      await axios.post("/api/auth/signup", { ...form, role: 'pharmacist' });

      // Step 2: Log the user in (existing logic)
      const loginResponse = await axios.post("/api/auth/login", { email: form.email, password: form.password });
      
      if (loginResponse.status === 200) {
        // Step 3: Refresh the session (existing logic)
        await refreshSession();

        // Step 4: Send the notification email (new, non-blocking logic)
        // We don't need to await this; it can happen in the background.
        axios.post("/api/notify-demo-signup", form).catch(err => {
            // Log error to console if notification fails, but don't block user.
            console.error("Failed to send demo signup notification:", err);
        });

        setIsSubmitted(true);
        setTimeout(redirectToApp, 2000); // Redirect after 2 seconds
      } else {
        throw new Error("Login failed after signup.");
      }

    } catch (err: any) {
      const errorMessage = err.response?.data?.error || "Registration failed. Please check your details and try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePharmacyCreated = async (newPharmacy: Pharmacy) => {
    setCreatePharmacyModalOpen(false);
    setForm((prevForm) => ({ ...prevForm, pharmacy: newPharmacy._id }));
    setPharmacySearch("");
    await fetchPharmacies(); // Refetch to include the new pharmacy in the list
  };

  if (isSubmitted) {
    return <SuccessView onRedirect={redirectToApp} />;
  }

  return (
    <>
      {error && (
        <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
          {error}
        </Alert>
      )}
      <form onSubmit={handleSubmit}>
          <TextField label="Full Name" name="username" value={form.username} onChange={handleChange} fullWidth margin="normal" required disabled={loading} />
          <TextField label="Email" name="email" type="email" value={form.email} onChange={handleChange} fullWidth margin="normal" required disabled={loading} />
          <TextField label="Mobile Number" name="mobile" value={form.mobile} onChange={handleChange} fullWidth margin="normal" required disabled={loading} />
          
          <TextField
            label="Password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={form.password}
            onChange={handleChange}
            fullWidth
            margin="normal"
            required
            disabled={loading}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <TextField label="License Number (optional)" name="licenseNumber" value={form.licenseNumber} onChange={handleChange} fullWidth margin="normal" disabled={loading} />
          <TextField select label="State of Practice" name="stateOfPractice" value={form.stateOfPractice} onChange={handleChange} fullWidth margin="normal" required disabled={loading}>
            {nigerianStates.map((state) => <MenuItem key={state} value={state}>{state}</MenuItem>)}
          </TextField>
          <TextField select label="Select Your Pharmacy" name="pharmacy" value={form.pharmacy} onChange={handleChange} fullWidth margin="normal" required disabled={loading}>
            <ListSubheader>
              <TextField size="small" autoFocus placeholder="Type to search..." fullWidth value={pharmacySearch} onChange={handlePharmacySearchChange} onKeyDown={(e) => e.stopPropagation()} variant="standard" />
            </ListSubheader>
            <MenuItem value="create-new" sx={{ fontWeight: 'bold', color: 'darkmagenta' }}>+ Can't find your pharmacy? Add it here.</MenuItem>
            {filteredPharmacies.map((p) => <MenuItem key={p._id} value={p._id}>{p.businessName}</MenuItem>)}
          </TextField>

        <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Button 
                type="submit" 
                variant="contained" 
                size="large"
                disabled={loading}
                fullWidth
                sx={{ 
                    bgcolor: '#006D5B', 
                    '&:hover': { bgcolor: '#00594C' },
                    color: 'white',
                    fontWeight: 'bold',
                    borderRadius: '8px',
                    py: 1.5
                }}
            >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Register for Demo & Sign Up'}
            </Button>
        </Box>
      </form>
      <CreatePharmacyModal
        open={isCreatePharmacyModalOpen}
        onClose={() => setCreatePharmacyModalOpen(false)}
        onPharmacyCreated={handlePharmacyCreated}
        setError={setError}
      />
    </>
  );
}
