'use client';
import React, { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { TextField, Button, InputAdornment, IconButton, Box, Typography, Alert } from "@mui/material";
import { Visibility, VisibilityOff } from '@mui/icons-material';
import axios from "axios";
import { useSession } from "@/context/SessionProvider"; // Import useSession

export default function LoginForm({
  redirectUrl,
  prefilledCredentials,
}: {
  redirectUrl: string | null;
  prefilledCredentials?: { email: string; password:string };
}) {
  const router = useRouter();
  const { refreshSession } = useSession(); // Get the refresh function
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (prefilledCredentials?.email) {
      setEmail(prefilledCredentials.email);
    }
    if (prefilledCredentials?.password) {
      setPassword(prefilledCredentials.password);
    }
  }, [prefilledCredentials]);

  const handleClickShowPassword = () => setShowPassword((show) => !show);
  const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await axios.post("/api/auth/login", { email, password });
      // --- Start of The Fix ---
      // The server now sets the session cookie, so we no longer need to set it here.
      // Cookies.set("session_token", res.data.token, { expires: 7 });
      // --- End of The Fix ---
      setSuccess("Success!");
      
      // Hard redirect to ensure a full page reload and session update
      // This is faster than waiting for a separate refreshSession() call
      window.location.href = '/';

    } catch (err: any) {
      setError(err.response?.data?.error || "Login failed. Please check your credentials.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      <TextField
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        fullWidth
        margin="normal"
        required
        disabled={loading}
      />
      <TextField
        label="Password"
        type={showPassword ? 'text' : 'password'}
        value={password}
        onChange={e => setPassword(e.target.value)}
        fullWidth
        margin="normal"
        required
        disabled={loading}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label="toggle password visibility"
                onClick={handleClickShowPassword}
                onMouseDown={handleMouseDownPassword}
                edge="end"
              >
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
      <Button
        type="submit"
        variant="contained"
        fullWidth
        disabled={loading}
        sx={{ mt: 1, py: 1.5, backgroundColor: 'teal', '&:hover': { backgroundColor: 'darkcyan' } }}
      >
        {loading ? "Logging in..." : "Login"}
      </Button>
    </form>
  );
}
