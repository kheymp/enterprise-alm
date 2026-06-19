import { useState, useEffect } from 'react';
import { Container, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Grid, Card, CardContent, Box, TextField, FormControlLabel, Switch, Button, Alert } from '@mui/material';


export default function Assets() {
    const [assets, setAssets] = useState<any[]>([]);

    const [name, setName] = useState('');
    const [serialNumber, setSerialNumber] = useState('');
    const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
    const [isActive, setIsActive] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAssets = async () => {
        const token = localStorage.getItem('token');
        const res = await fetch("http://localhost:5132/api/assets", {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (res.ok) {
            const data = await res.json();
            setAssets(data);
        }
    };

    useEffect(() => {
        fetchAssets();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !serialNumber) return;

        const payload = {
            name,
            serialNumber,
            purchaseDate,
            isActive
        };

        const token = localStorage.getItem("token");

        try {
            const res = await fetch("http://localhost:5132/api/assets", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error('Failed to save asset data. (Are you an Admin?)');

            setName('');
            setSerialNumber('');

            fetchAssets();
        } catch (err: any) {
            setError(err.message);
        }
    }

    return (
        <Container maxWidth="xl" sx={{ mt: 2 }}>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                Enterprise Assets Management
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}

            <Grid container spacing={3}>

                {/* LEFT COLUMN: The Form */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <Card elevation={2}>
                        <CardContent>
                            <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
                                Register New Asset
                            </Typography>

                            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <TextField
                                    label="Asset Name"
                                    variant="outlined"
                                    size="small"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                                <TextField
                                    label="Serial Number"
                                    variant="outlined"
                                    size="small"
                                    value={serialNumber}
                                    onChange={(e) => setSerialNumber(e.target.value)}
                                    required
                                />
                                <TextField
                                    label="Purchase Date"
                                    type="date"
                                    variant="outlined"
                                    size="small"
                                    value={purchaseDate}
                                    onChange={(e) => setPurchaseDate(e.target.value)}
                                    required
                                />
                                <FormControlLabel
                                    control={
                                        <Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} color="primary" />
                                    }
                                    label={isActive ? "Status: Active" : "Status: Inactive"}
                                />
                                <Button type="submit" variant="contained" color="primary" fullWidth>
                                    Save Asset
                                </Button>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* RIGHT COLUMN: The Table */}
                <Grid size={{ xs: 12, md: 8 }}>
                    <TableContainer component={Paper} elevation={2}>
                        <Table>
                            <TableHead sx={{ bgcolor: 'action.hover' }}>
                                <TableRow>
                                    <TableCell><strong>Asset Name</strong></TableCell>
                                    <TableCell><strong>Serial Number</strong></TableCell>
                                    <TableCell><strong>Status</strong></TableCell>
                                    <TableCell><strong>Assigned To</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {assets.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                                            No assets found in the database.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    assets.map((asset) => (
                                        <TableRow key={asset.id} hover>
                                            <TableCell>{asset.name}</TableCell>
                                            <TableCell>{asset.serialNumber}</TableCell>
                                            <TableCell>{asset.isActive ? "Active" : "Inactive"}</TableCell>
                                            <TableCell>{asset.assignedUser ? asset.assignedUser.username : "Unassigned"}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Grid>

            </Grid>
        </Container>
    )

}