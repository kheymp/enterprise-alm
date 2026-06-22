import { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Chip, IconButton, Container, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Grid, Card, CardContent, Box, TextField, FormControlLabel, Switch, Button, Alert } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import InfoIcon from '@mui/icons-material/Info';


export default function Assets() {
    const [assets, setAssets] = useState<any[]>([]);

    const [name, setName] = useState('');
    const [serialNumber, setSerialNumber] = useState('');
    const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
    const [isActive, setIsActive] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [editingAssetId, setEditingAssetId] = useState<number | null>(null);

    const [purchasePrice, setPurchasePrice] = useState<number | ''>('');
    const [expectedLifespanMonths, setExpectedLifespanMonths] = useState<number | ''>('');
    const [salvageValue, setSalvageValue] = useState<number | ''>('');

    // States for the Details Modal
    const [selectedAssetId, setSelectedAssetId] = useState<number | ''>(null);
    const [assetDetails, setAssetDetails] = useState<any>(null);

    // States for the Maintenance Form
    const [maintenanceDate, setMaintenanceDate] = useState(new Date().toISOString().split('T')[0]);
    const [maintenanceDescription, setMaintenanceDescription] = useState('');
    const [maintenanceCost, setMaintenanceCost] = useState<number | ''>('');




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
            isActive,
            purchasePrice: Number(purchasePrice),
            expectedLifespanMonths: Number(expectedLifespanMonths),
            salvageValue: Number(salvageValue)
        };

        const token = localStorage.getItem("token");

        try {
            const url = editingAssetId ? `http://localhost:5132/api/assets/${editingAssetId}` : "http://localhost:5132/api/assets";
            const method = editingAssetId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error('Failed to save asset data.');
            // Reset everything back to normal!
            setName('');
            setSerialNumber('');
            setEditingAssetId(null); // Leave edit mode
            setPurchasePrice('');
            setExpectedLifespanMonths('');
            setSalvageValue('');

            fetchAssets();
        } catch (err: any) {
            setError(err.message);
        }
    }

    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to permanently delete this asset?')) return;

        const token = localStorage.getItem("token");

        try {
            const res = await fetch(`http://localhost:5132/api/assets/${id}`, {
                method: 'DELETE',
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (!res.ok) throw new Error('Failed to delete asset. (Are you an Admin?)');

            fetchAssets();
        } catch (err: any) {
            setError(err.message);
        }
    }

    const handleEditClick = (asset: any) => {
        setName(asset.name);
        setSerialNumber(asset.serialNumber);
        setPurchaseDate(asset.purchaseDate.split('T')[0]);
        setIsActive(asset.isActive);
        setPurchasePrice(asset.purchasePrice);
        setExpectedLifespanMonths(asset.expectedLifespanMonths);
        setSalvageValue(asset.salvageValue);
        setEditingAssetId(asset.id);
    }

    const fetchAssetDetails = async (id: number) => {
        const token = localStorage.getItem('token');

        try {
            const res = await fetch(`http://localhost:5132/api/assets/${id}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setAssetDetails(data);
                setSelectedAssetId(id);
            } else {
                throw new Error('Failed to fetch asset details.');
            };
        } catch (err: any) {
            setError(err.message);
        }
    }

    const handleAddMaintenance = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAssetId || !maintenanceDescription) return;

        const token = localStorage.getItem('token');
        try {
            const payload = {
                datePerformed: maintenanceDate,
                description: maintenanceDescription,
                cost: Number(maintenanceCost)
            };

            const res = await fetch(`http://localhost:5132/api/assets/${selectedAssetId}/maintenance`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error('Failed to add maintenance record.');

            setMaintenanceDescription('');
            setMaintenanceCost('');
            fetchAssetDetails(selectedAssetId);
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
                                {editingAssetId ? "Edit Asset" : "Register New Asset"}
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
                                <TextField
                                    label="Purchase Price"
                                    type="number"
                                    variant="outlined"
                                    size="small"
                                    value={purchasePrice}
                                    onChange={(e) => setPurchasePrice(e.target.value === '' ? '' : Number(e.target.value))}
                                    slotProps={{ htmlInput: { min: 0 } }}
                                    required
                                />
                                <TextField
                                    label="Expected Lifespan (Months)"
                                    type="number"
                                    variant="outlined"
                                    size="small"
                                    value={expectedLifespanMonths}
                                    onChange={(e) => setExpectedLifespanMonths(e.target.value === '' ? '' : Number(e.target.value))}
                                    slotProps={{ htmlInput: { min: 0 } }}
                                    required
                                />
                                <TextField
                                    label="Salvage Value"
                                    type="number"
                                    variant="outlined"
                                    size="small"
                                    onChange={(e) => setSalvageValue(e.target.value === '' ? '' : Number(e.target.value))}
                                    slotProps={{ htmlInput: { min: 0 } }}
                                    required
                                />
                                <FormControlLabel
                                    control={
                                        <Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} color="primary" />
                                    }
                                    label={isActive ? "Status: Active" : "Status: Inactive"}
                                />
                                <Button type="submit" variant="contained" color="primary" fullWidth>
                                    {editingAssetId ? "Update Asset" : "Save Asset"}
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
                                    <TableCell align="center"><strong>Status</strong></TableCell>
                                    <TableCell><strong>Assigned To</strong></TableCell>
                                    <TableCell align="right"><strong>Actions</strong></TableCell>
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
                                            <TableCell align="center">
                                                <Chip
                                                    label={asset.isActive ? "Active" : "Inactive"}
                                                    color={asset.isActive ? "success" : "error"}
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            </TableCell>
                                            <TableCell>{asset.assignedUser ? asset.assignedUser.username : "Unassigned"}</TableCell>
                                            <TableCell align="right">
                                                <IconButton color="info" size="small" onClick={() => fetchAssetDetails(asset.id)}>
                                                    <InfoIcon fontSize="small" />
                                                </IconButton>
                                                <IconButton color="primary" size="small" onClick={() => handleEditClick(asset)}>
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                                <IconButton color="error" size="small" onClick={() => handleDelete(asset.id)}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>

                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Grid>

            </Grid>

            {/* ASSET DETAILS MODAL */}
            <Dialog open={selectedAssetId !== null} onClose={() => setSelectedAssetId(null)} maxWidth="md" fullWidth>
                <DialogTitle>Asset Details & Depreciation</DialogTitle>
                <DialogContent dividers>
                    {assetDetails && (
                        <Grid container spacing={4}>
                            {/* Depreciation Info */}
                            <Grid size={{ xs: 12, md: 5 }}>
                                <Typography variant="h6" gutterBottom>Financial Overview</Typography>
                                <Typography variant="body1"><strong>Purchase Price:</strong> ${assetDetails.asset.purchasePrice}</Typography>
                                <Typography variant="body1"><strong>Salvage Value:</strong> ${assetDetails.asset.salvageValue}</Typography>
                                <Typography variant="body1"><strong>Lifespan:</strong> {assetDetails.asset.expectedLifespanMonths} months</Typography>


                                <Box sx={{ mt: 3, p: 2, bgcolor: 'primary.light', color: 'primary.contrastText', borderRadius: 1 }}>
                                    <Typography variant="subtitle1">Calculated Current Value</Typography>
                                    <Typography variant="h4">${assetDetails.calculatedCurrentValue.toFixed(2)}</Typography>
                                </Box>
                            </Grid>

                            {/* Maintenance History */}
                            <Grid size={{ xs: 12, md: 8 }}>
                                <Typography variant="h6" gutterBottom>Maintenance History</Typography>
                                {/* List of existing records */}
                                <Table size="small" sx={{ mb: 3 }}>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Date</TableCell>
                                            <TableCell>Description</TableCell>
                                            <TableCell align="right">Cost</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {assetDetails.asset.maintenanceRecords?.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={3} align="center" sx={{ py: 2 }}>No Maintenance</TableCell>
                                            </TableRow>
                                        ) : (
                                            assetDetails.asset.maintenanceRecords?.map((record: any) => (
                                                <TableRow key={record.id}>
                                                    <TableCell>{record.datePerformed.split('T')[0]}</TableCell>
                                                    <TableCell>{record.description}</TableCell>
                                                    <TableCell align="right">${record.cost}</TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>

                                {/* Form to add a new record */}
                                <Typography variant="subtitle2" gutterBottom>Add Maintenance Record</Typography>
                                <Box component="form" onSubmit={handleAddMaintenance} sx={{ display: 'flex', gap: 1 }}>
                                    <TextField
                                        type="date"
                                        size="small"
                                        value={maintenanceDate}
                                        onChange={(e) => setMaintenanceDate(e.target.value)}
                                        required
                                    />
                                    <TextField
                                        label="Description"
                                        size="small"
                                        value={maintenanceDescription}
                                        onChange={(e) => setMaintenanceDescription(e.target.value)}
                                        required
                                    />
                                    <TextField
                                        label="Cost"
                                        type="number"
                                        size="small"
                                        value={maintenanceCost}
                                        onChange={(e) => setMaintenanceCost(e.target.value === '' ? '' : Number(e.target.value))}
                                        slotProps={{ htmlInput: { min: 0 } }}
                                        required
                                        sx={{ width: 140 }}
                                    />
                                    <Button type="submit" variant="contained" size="small">Save</Button>
                                </Box>
                            </Grid>
                        </Grid>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSelectedAssetId(null)}>Close</Button>
                </DialogActions>
            </Dialog>
        </Container>
    )

}