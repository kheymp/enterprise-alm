import { useState } from "react";
import { Container, Card, CardContent, TextField, Button, Typography, Box, Alert } from "@mui/material";
import { api } from "../lib/api";

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirm) { setError("New passwords do not match."); return; }
    if (newPassword.length < 8) { setError("New password must be at least 8 characters."); return; }

    setLoading(true);
    try {
      const data = await api.post<{ token: string }>('/api/auth/change-password', {
        currentPassword, newPassword,
      });
      localStorage.setItem('token', data.token); // fresh token: mustChangePassword now false
      window.location.href = '/';
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 10 }}>
      <Card elevation={3}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ mb: 3, textAlign: 'center' }}>
            <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
              Set a New Password
            </Typography>
            <Typography variant="body2" color="text.secondary">
              You're using a temporary password. Choose a new one to continue.
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Temporary Password" type="password" fullWidth required
              value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            <TextField label="New Password" type="password" fullWidth required
              value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <TextField label="Confirm New Password" type="password" fullWidth required
              value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            <Button type="submit" variant="contained" size="large" fullWidth disabled={loading} sx={{ mt: 2 }}>
              {loading ? "Saving..." : "Update Password"}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}