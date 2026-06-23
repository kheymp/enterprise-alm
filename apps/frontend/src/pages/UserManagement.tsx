import { useState, useEffect } from 'react';
import {
    Container, Typography, Box, Card, CardContent, Grid,
    TextField, Button, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Paper,
    CircularProgress, Alert, IconButton, Divider, Chip, FormControl, FormControlLabel, Switch, InputLabel, Select, MenuItem, FormHelperText
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import EditIcon from '@mui/icons-material/Edit';
import ClearIcon from '@mui/icons-material/Clear';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';

interface User {
    id?: number;
    username: string;
    email: string;
    department: string;
    isActive: boolean;
    roleId: number;
}

interface RoleDefinition {
    id: number;
    name: string;
    description: string;
}

const SYSTEM_ROLES: RoleDefinition[] = [
    { id: 1, name: 'Admin', description: 'Full system authorization & rule control.' },
    { id: 2, name: 'Manager', description: 'Read/Write assets, licenses, and seats.' },
    { id: 3, name: 'Viewer', description: 'Read-only access to monitoring dashboards.' },
    { id: 4, name: 'Employee', description: 'No system access. For assignment tracking only.' }
];

const API_BASE = 'http://localhost:5132/api/users';

export default function UserManagement() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Form State
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [department, setDepartment] = useState('');
    const [isActive, setIsActive] = useState<boolean>(true);
    const [roleId, setRoleId] = useState<number>(4);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    useEffect(() => {
        // Only attempt to fetch if we actually have a token to send
        const currentToken = localStorage.getItem("token");
        if (currentToken) {
            fetchUsers();
        } else {
            setLoading(false);
        }
    }, []);

    const fetchUsers = async () => {
        const currentToken = localStorage.getItem("token");
        try {
            setLoading(true);
            const res = await fetch(API_BASE, {
                headers: {
                    "Authorization": `Bearer ${currentToken}`
                }
            });
            if (!res.ok) throw new Error('Failed to fetch system users');
            const data = await res.json();
            setUsers(data);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'An error occured while talking to the API.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username || !email || !department || !roleId) return;

        const payload: User = {
            id: editingUser ? editingUser.id : undefined,
            username,
            email,
            department,
            isActive,
            roleId
        };
        const url = editingUser ? `${API_BASE}/${editingUser.id}` : API_BASE;
        const method = editingUser ? 'PUT' : 'POST';
        const currentToken = localStorage.getItem("token");

        try {
            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    "Authorization": `Bearer ${currentToken}`
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error('Failed to save user data.');

            handleCancelEdit();
            fetchUsers();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleEditClick = (user: User) => {
        setEditingUser(user);
        setUsername(user.username);
        setEmail(user.email);
        setDepartment(user.department);
        setIsActive(user.isActive);
        setRoleId(user.roleId);
    }

    const handleCancelEdit = () => {
        setEditingUser(null);
        setUsername('');
        setEmail('');
        setDepartment('');
        setIsActive(true);
        setRoleId(4);
    };

    const handleDelete = async (id?: number) => {
        if (!id || !window.confirm('Are you sure you want to delete this user?')) return;
        const currentToken = localStorage.getItem("token");
        try {
            const res = await fetch(`${API_BASE}/${id}`, {
                method: 'DELETE',
                headers: {
                    "Authorization": `Bearer ${currentToken}`
                }
            });
            if (!res.ok) throw new Error('Failed to delete user.');
            fetchUsers();
        } catch (err: any) {
            setError(err.message)
        }
    };

    const getRoleName = (id: number): string => {
        const found = SYSTEM_ROLES.find(r => r.id === id);
        return found ? found.name : `Unknown (${id})`;
    };

    return (
        <Container maxWidth={'xl'} sx={{ mt: 2 }}>
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-start' }}>
                <Box>
                    <Typography variant="h5" color="text.primary" gutterBottom sx={{ fontWeight: 600 }}>
                        System User Management
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Manage corporate infrastructure identities, department designations, and operational access roles.
                    </Typography>
                </Box>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            <Grid container spacing={3}>
                {/* Identity Form */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <Card elevation={2}>
                        <CardContent>
                            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, fontWeight: 500 }}>
                                {editingUser ? <EditIcon color="primary" /> : <PersonAddIcon color="primary" />}
                                {editingUser ? 'Modify User Identity' : 'Register New User'}
                            </Typography>
                            <Divider sx={{ mb: 2 }} />

                            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <TextField
                                    label="Username"
                                    variant="outlined"
                                    fullWidth
                                    size="small"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                />
                                <TextField
                                    label="Email Address"
                                    type="email"
                                    variant="outlined"
                                    fullWidth
                                    size="small"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                                <TextField
                                    label="Department"
                                    variant="outlined"
                                    fullWidth
                                    size="small"
                                    value={department}
                                    onChange={(e) => setDepartment(e.target.value)}
                                    placeholder="e.g., Engineering, HR, Legal"
                                    required
                                />

                                {/* Refactored Dropdown Component replacing raw number text field */}
                                <FormControl fullWidth size="small">
                                    <InputLabel id="role-select-label">Security Role Access</InputLabel>
                                    <Select
                                        labelId="role-select-label"
                                        value={roleId}
                                        label="Security Role Access"
                                        onChange={(e) => setRoleId(Number(e.target.value))}
                                    >
                                        {SYSTEM_ROLES.map((role) => (
                                            <MenuItem key={role.id} value={role.id}>
                                                {role.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                    {/* Render the current role description contextually as helper text! */}
                                    <FormHelperText>
                                        {SYSTEM_ROLES.find(r => r.id === roleId)?.description}
                                    </FormHelperText>
                                </FormControl>

                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={isActive}
                                            onChange={(e) => setIsActive(e.target.checked)}
                                            color="primary"
                                        />
                                    }
                                    label={isActive ? "Account Active" : "Account Suspended"}
                                    sx={{ mt: 0.5 }}
                                />

                                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        color={editingUser ? "success" : "primary"}
                                        fullWidth
                                        startIcon={editingUser ? <SaveIcon /> : <PersonAddIcon />}
                                    >
                                        {editingUser ? 'Save' : 'Register'}
                                    </Button>

                                    {editingUser && (
                                        <Button
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

                {/* Accounts Grid */}
                <Grid size={{ xs: 12, md: 8 }}>
                    <TableContainer component={Paper} elevation={2}>
                        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="h6" sx={{ fontWeight: 500 }}>
                                Active Security Accounts
                            </Typography>
                            {loading && <CircularProgress size={24} />}
                        </Box>
                        <Divider />
                        <Table aria-label="users structural database grid" size="small">
                            <TableHead sx={{ bgcolor: 'action.hover' }}>
                                <TableRow>
                                    <TableCell><strong>Username</strong></TableCell>
                                    <TableCell><strong>Email</strong></TableCell>
                                    <TableCell><strong>Department</strong></TableCell>
                                    <TableCell align="center"><strong>Status</strong></TableCell>
                                    <TableCell align="center"><strong>Role</strong></TableCell>
                                    <TableCell align="right"><strong>Actions</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {users.length === 0 && !loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                                            <Typography variant="body2" color="text.secondary">
                                                No active security entities mapped to the local database.
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    users.map((user) => (
                                        <TableRow key={user.id} hover>
                                            <TableCell sx={{ fontWeight: 500 }}>{user.username}</TableCell>
                                            <TableCell>{user.email}</TableCell>
                                            <TableCell>{user.department || <Typography variant="caption" color="text.disabled">Unassigned</Typography>}</TableCell>

                                            <TableCell align="center">
                                                <Chip
                                                    label={user.isActive ? "Active" : "Suspended"}
                                                    color={user.isActive ? "success" : "error"}
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            </TableCell>

                                            <TableCell align="center">
                                                <Chip
                                                    label={getRoleName(user.roleId)}
                                                    size="small"
                                                    color={user.roleId === 1 ? "secondary" : "default"}
                                                />
                                            </TableCell>

                                            <TableCell align="right">
                                                <IconButton color="primary" size="small" onClick={() => handleEditClick(user)} sx={{ mr: 0.5 }}>
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                                <IconButton color="error" size="small" onClick={() => handleDelete(user.id)}>
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
        </Container>
    )
}