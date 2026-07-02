import { Dialog, DialogTitle, DialogContent, DialogActions, Select, MenuItem, InputLabel, FormControl, Box, Button, Card, CardContent, Container, Grid, IconButton, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography, FormControlLabel, Switch, Chip } from "@mui/material";
import React, { useEffect, useState } from "react";
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';

import AddIcon from '@mui/icons-material/Add';
import ClearIcon from '@mui/icons-material/Clear';
import SaveIcon from '@mui/icons-material/Save';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import WarningIcon from '@mui/icons-material/Warning';


export default function Licenses() {

    interface License {
        id?: number;
        name: string;
        publisher: string;
        totalSeats: number;
        costPerSeat: number;
        renewalDate: string;
        isActive: boolean;
        allocations: any[];
    }

    const [softwareLicenses, setSoftwareLicenses] = useState<License[]>([]);

    const [name, setName] = useState('');
    const [publisher, setPublisher] = useState('');
    const [totalSeats, setTotalSeats] = useState<number | ''>('');
    const [costPerSeat, setCostPerSeat] = useState<number | ''>('');
    const [renewalDate, setRenewalDate] = useState(new Date().toISOString().split('T')[0]);
    const [isActive, setIsActive] = useState<boolean>(true);
    const [editingSoftwareLicenseId, setEditingSoftwareLicenseId] = useState<number | null>(null);

    const [, setError] = useState('');
    const [showInactive, setShowInactive] = useState(false);

    /* UseState for license allocation */

    const [isAssignModalOpen, setIsAssignModelOpen] = useState<boolean>(false);
    const [selectedLicenseId, setSelectedLicenseId] = useState<number | null>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<number | ''>('');
    // const selectedLicense = softwareLicenses.find(sl => sl.id === selectedLicenseId);


    const handleEditClick = (softwareLicense: any) => {
        setName(softwareLicense.name);
        setPublisher(softwareLicense.publisher);
        setTotalSeats(softwareLicense.totalSeats);
        setCostPerSeat(softwareLicense.costPerSeat);
        setRenewalDate(softwareLicense.renewalDate.split('T')[0]);
        setIsActive(softwareLicense.isActive);
        setEditingSoftwareLicenseId(softwareLicense.id);
    }

    const handleCancelEdit = () => {
        setEditingSoftwareLicenseId(null);
        setName('');
        setPublisher('');
        setTotalSeats('');
        setCostPerSeat('');
        setRenewalDate(new Date().toISOString().split('T')[0]);
    }

    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to permanently delete this software license?')) return;

        const token = localStorage.getItem("token");

        try {
            const res = await fetch(`http://localhost:5132/api/licenses/${id}`, {
                method: 'DELETE',
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (!res.ok) throw new Error('Failed to delete asset. (Are you an Admin?)');

            fetchSoftwareLicenses();
        } catch (err: any) {
            setError(err.message);
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name || !publisher || !totalSeats || !costPerSeat || !renewalDate) return;

        const payload = {
            name,
            publisher,
            totalSeats: Number(totalSeats),
            costPerSeat: Number(costPerSeat),
            renewalDate,
            isActive
        };

        const token = localStorage.getItem("token");

        try {
            const url = editingSoftwareLicenseId ? `http://localhost:5132/api/licenses/${editingSoftwareLicenseId}` : `http://localhost:5132/api/licenses`;
            const method = editingSoftwareLicenseId ? 'PUT' : 'POST'

            const res = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error("Failed to save software license data.");
            handleCancelEdit();
            fetchSoftwareLicenses();

        } catch (err: any) {
            setError(err.message);
        }
    }

    const fetchSoftwareLicenses = async () => {

        const token = localStorage.getItem('token');

        const res = await fetch(`http://localhost:5132/api/licenses?showInactive=${showInactive}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (res.ok) {
            const data = await res.json();
            setSoftwareLicenses(data);
        }

    };

    const fetchUsers = async () => {
        const token = localStorage.getItem('token');
        const res = await fetch("http://localhost:5132/api/users", {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            setUsers(data);
        }
    }

    const handleAssignSeat = async () => {
        if (!selectedLicenseId || !selectedUserId) return;
        const token = localStorage.getItem('token');

        try {
            const res = await fetch(`http://localhost:5132/api/licenses/${selectedLicenseId}/allocate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ userId: selectedUserId })
            });
            if (!res.ok) throw new Error("Failed to assign seat. Are there any seats left?");

            // Close modal, reset state, and refresh table!
            setIsAssignModelOpen(false);
            setSelectedUserId('');
            fetchSoftwareLicenses();
        } catch (err: any) {
            setError(err.message);
        }
    }

    const handleRemoveAllocation = async (licenseId: number, userId: number) => {
        if (!window.confirm("Are you sure you want to remove this user from the license?")) return;
        
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`http://localhost:5132/api/licenses/${licenseId}/allocate/${userId}`, {
                method: 'DELETE',
                headers: { "Authorization": `Bearer ${token}` }
            });
            
            if (!res.ok) throw new Error("Failed to remove allocation.");
            
            fetchSoftwareLicenses(); // Refresh the table and modal!
        } catch (err: any) {
            setError(err.message);
        }
    }

    useEffect(() => {
        fetchSoftwareLicenses();
        fetchUsers();
    }, [showInactive])

    const isExpiringSoon = (dateString: string) => {
        // Calculate the difference in milliseconds, then convert to days
        const daysLeft = (new Date(dateString).getTime() - new Date().getTime()) / (1000 * 3600 * 24);
        return daysLeft > 0 && daysLeft <= 30;
    };

    return (
        <Container maxWidth="xl" sx={{ mt: 2 }}>

            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                Enterprise Software Licenses Management
            </Typography>



            <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 4 }}>
                    <Card elevation={2}>
                        <CardContent>
                            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, fontWeight: 500 }}>
                                {editingSoftwareLicenseId ? <EditIcon color="primary" /> : <AddIcon color="primary" />}
                                {editingSoftwareLicenseId ? "Edit Software License" : "Register New Software License"}
                            </Typography>

                            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <TextField
                                    label="Name"
                                    variant="outlined"
                                    size="small"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                                <TextField
                                    label="Publisher"
                                    variant="outlined"
                                    size="small"
                                    value={publisher}
                                    onChange={(e) => setPublisher(e.target.value)}
                                    required
                                />
                                <TextField
                                    label="Total Seats"
                                    variant="outlined"
                                    size="small"
                                    type="number"
                                    value={totalSeats}
                                    onChange={(e) => setTotalSeats(e.target.value === '' ? '' : Number(e.target.value))}
                                    slotProps={{ htmlInput: { min: 0 } }}
                                    required
                                />
                                <TextField
                                    label="Cost Per Seat"
                                    variant="outlined"
                                    size="small"
                                    type="number"
                                    value={costPerSeat}
                                    onChange={(e) => setCostPerSeat(e.target.value === '' ? '' : Number(e.target.value))}
                                    slotProps={{ htmlInput: { min: 0 } }}
                                    required
                                />
                                <TextField
                                    label="Renewal Date"
                                    type="date"
                                    variant="outlined"
                                    size="small"
                                    value={renewalDate}
                                    onChange={(e) => setRenewalDate(e.target.value)}
                                    required
                                />

                                <FormControlLabel
                                    control={
                                        <Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} color="primary" />
                                    }
                                    label={isActive ? "Status: Active" : "Status: Inactive"}
                                />

                                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                    <Button type="submit" variant="contained" color={editingSoftwareLicenseId ? "success" : "primary"} startIcon={editingSoftwareLicenseId ? <SaveIcon /> : <AddIcon />} fullWidth>
                                        {editingSoftwareLicenseId ? "Update Software License" : "Save Software License"}
                                    </Button>
                                    {editingSoftwareLicenseId && (
                                        <Button
                                            type="button"
                                            variant="outlined"
                                            color="inherit"
                                            onClick={handleCancelEdit}
                                            startIcon={<ClearIcon />}
                                        >
                                            Cancel
                                        </Button>
                                    )}
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid size={{ xs: 12, md: 8 }}>
                    <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={showInactive}
                                    onChange={(e) => setShowInactive(e.target.checked)}
                                    color="primary"
                                />
                            }
                            label="Show Inactive Licenses"
                        />
                    </Box>
                    <TableContainer component={Paper} elevation={2}>
                        <Table>
                            <TableHead sx={{ bgcolor: "action.hover" }}>
                                <TableRow>
                                    <TableCell><strong>Software Name</strong></TableCell>
                                    <TableCell><strong>Publisher</strong></TableCell>
                                    <TableCell><strong>Seats Used</strong></TableCell>
                                    <TableCell><strong>Cost Per Seat</strong></TableCell>
                                    <TableCell><strong>Renewal Date</strong></TableCell>
                                    <TableCell align="center"><strong>Status</strong></TableCell>
                                    <TableCell align="right"><strong>Actions</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {softwareLicenses.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                                            No software licenses found in the database.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    softwareLicenses.map((softwareLicense) => (
                                        <TableRow key={softwareLicense.id}>
                                            <TableCell>{softwareLicense.name}</TableCell>
                                            <TableCell>{softwareLicense.publisher}</TableCell>
                                            <TableCell>{softwareLicense.allocations?.length || 0} / {softwareLicense.totalSeats}</TableCell>
                                            <TableCell>${softwareLicense.costPerSeat.toFixed(2)}</TableCell>
                                            <TableCell>
                                                {new Date(softwareLicense.renewalDate).toLocaleDateString()}
                                                {isExpiringSoon(softwareLicense.renewalDate) && (
                                                    <WarningIcon color="warning" sx={{ ml: 1, verticalAlign: 'middle' }} titleAccess="Expiring within 30 days!" />
                                                )}
                                            </TableCell>
                                            <TableCell align="center">
                                                <Chip
                                                    label={softwareLicense.isActive ? "Active" : "Inactive"}
                                                    color={softwareLicense.isActive ? "success" : "error"}
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            </TableCell>
                                            <TableCell align="right">
                                                <IconButton
                                                    color="success"
                                                    size="small"
                                                    title="Assign Seat"
                                                    onClick={() => {
                                                        setSelectedLicenseId(softwareLicense.id!);
                                                        setIsAssignModelOpen(true);
                                                    }}
                                                >
                                                    <PersonAddIcon fontSize="small" />
                                                </IconButton>

                                                {/* 2. Edit Icon */}
                                                <IconButton color="primary" size="small" onClick={() => handleEditClick(softwareLicense)}>
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                                {/* 3. Delete Icon (Triggers Soft Delete) */}
                                                <IconButton color="error" size="small" onClick={() => handleDelete(softwareLicense.id!)}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )
                                }
                            </TableBody>

                        </Table>
                    </TableContainer>
                </Grid>
            </Grid>

            {/* ASSIGN SEAT MODAL */}
            {(() => {
                const selectedLicense = softwareLicenses.find(sl => sl.id === selectedLicenseId);

                return (
                    <Dialog open={isAssignModalOpen} onClose={() => setIsAssignModelOpen(false)} maxWidth="sm" fullWidth>
                        <DialogTitle>Assign Software Seat</DialogTitle>
                        <DialogContent>
                            
                            {/* Show Current Users */}
                            {selectedLicense?.allocations && selectedLicense.allocations.length > 0 && (
                                <Box sx={{ mb: 3, mt: 1 }}>
                                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                        Currently Assigned To ({selectedLicense.allocations.length} / {selectedLicense.totalSeats} seats):
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                        {selectedLicense.allocations.map((allocation: any) => {
                                            const assignedUser = users.find(u => u.id === allocation.userId);
                                            return (
                                                <Chip 
                                                    key={allocation.id || allocation.userId} 
                                                    label={assignedUser ? assignedUser.username : `User ID: ${allocation.userId}`} 
                                                    size="small" 
                                                    color="info" 
                                                    variant="outlined" 
                                                    onDelete={() => handleRemoveAllocation(selectedLicenseId!, allocation.userId)}
                                                />
                                            );
                                        })}
                                    </Box>
                                </Box>
                            )}
                            
                            {/* Dropdown Box */}
                            <Box sx={{ mt: 2 }}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Select Employee</InputLabel>
                                    <Select
                                        value={selectedUserId}
                                        label="Select Employee"
                                        onChange={(e) => setSelectedUserId(Number(e.target.value))}
                                    >
                                        {users.map((user) => {
                                            const isAlreadyAssigned = selectedLicense?.allocations?.some((a: any) => a.userId === user.id);
                                            return (
                                                <MenuItem key={user.id} value={user.id} disabled={isAlreadyAssigned}>
                                                    {user.username} ({user.department}) {isAlreadyAssigned ? "- Already Assigned" : ""}
                                                </MenuItem>
                                            );
                                        })}
                                    </Select>
                                </FormControl>
                            </Box>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setIsAssignModelOpen(false)} color="inherit">Cancel</Button>
                            <Button onClick={handleAssignSeat} variant="contained" color="success">
                                Confirm Assignment
                            </Button>
                        </DialogActions>
                    </Dialog>
                );
            })()}

        </Container>
    )
}