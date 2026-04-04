"use client";
import React, { useState } from "react";
import { TextField, Button, Typography, Box, Alert } from "@mui/material";
import axios from "axios";
import Cookies from "js-cookie"; // Using js-cookie now

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await axios.post("/api/auth", { email, password });
      
      // The FIX: Use cookies to store the session token
      Cookies.set("session_token", res.data.token, { expires: 7 });

      // Redirect to home page after successful login
      window.location.href = "/"; 
    } catch (err: any) {
      setError(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 400, mx: "auto", mt: 8, p: 4, boxShadow: 3, borderRadius: 2 }}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        Login
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <form onSubmit={handleSubmit}>
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          fullWidth
          margin="normal"
          required
        />
        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          fullWidth
          margin="normal"
          required
        />
        <Button
          type="submit"
          variant="contained"
          fullWidth
          disabled={loading}
          sx={{ mt: 2, backgroundColor: 'teal', '&:hover': { backgroundColor: 'darkcyan' } }}
        >
          {loading ? "Logging in..." : "Login"}
        </Button>
      </form>
    </Box>
  );
}
