import { useState, useEffect } from "react";
import { Container, Card, CardContent, TextField, Button, Typography, Box, Alert, Link } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../lib/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.state?.message) {
      setSuccessMsg(location.state.message);
      // Clear the message from history state so it doesn't persist on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const loginWith = async (emailArg: string, passwordArg: string) => {
    localStorage.removeItem('token');
    setError("");
    setLoading(true);

    try {
      const data = await api.post<{ token: string }>('/api/auth/login', {
        email: emailArg,
        password: passwordArg,
      });
      localStorage.setItem('token', data.token);
      // Hard redirect to the dashboard so the route guard re-reads the new token.
      window.location.href = "/";
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginWith(email, password);
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 10 }}>
      <Card elevation={3}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ mb: 3, textAlign: 'center' }}>
            <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
              System Login
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Enter your credentials to access the Enterprise ALM platform.
            </Typography>
          </Box>

          <Alert severity="info" sx={{ mb: 3 }}>
            Public demo — full-admin sandbox. Feel free to change anything; it resets every hour.
          </Alert>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {successMsg && (
            <Alert severity="success" sx={{ mb: 3 }}>
              {successMsg}
            </Alert>
          )}

          <Box component="form" onSubmit={handleLogin} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Email Address"
              type="email"
              variant="outlined"
              fullWidth
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <TextField
              label="Password"
              type="password"
              variant="outlined"
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button 
              type="submit" 
              variant="contained" 
              color="primary" 
              size="large" 
              fullWidth
              disabled={loading}
              sx={{ mt: 2 }}
            >
              {loading ? "Authenticating..." : "Login"}
            </Button>

            <Button
              variant="outlined"
              color="secondary"
              size="large"
              fullWidth
              disabled={loading}
              onClick={() => loginWith("demo@enterprise-alm.app", "Demo!2026")}
            >
              Explore the live demo (full admin)
            </Button>

            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography variant="body2">
                Don't have an account?{' '}
                <Link component="button" variant="body2" onClick={() => navigate('/register')} type="button">
                  Register here
                </Link>
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}