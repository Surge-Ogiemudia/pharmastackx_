'use client';
import React, { useState } from "react";
import { TextField, Button, Box, Typography, Alert } from "@mui/material";
import axios from "axios";

interface ForgotPasswordFormProps {
  onSuccess: () => void;
}

export default function ForgotPasswordForm({ onSuccess }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await axios.post("/api/auth/forgot-password", { email });
      setSuccess("Password reset link sent! Please check your email.");
      setLoading(false);
      onSuccess(); 
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to send reset link. Please check the email address.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Typography variant="h6" sx={{ mb: 2 }}>Forgot Password</Typography>
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
      <Button
        type="submit"
        variant="contained"
        fullWidth
        disabled={loading}
        sx={{ mt: 1, py: 1.5, backgroundColor: 'teal', '&:hover': { backgroundColor: 'darkcyan' } }}
      >
        {loading ? "Sending..." : "Send Reset Link"}
      </Button>
    </form>
  );
}
