import { useState, useEffect, useMemo } from 'react';
import {
    Container, Typography, Box, TextField, Button, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Paper, Avatar,
    CircularProgress, Alert, IconButton, Divider, Chip,
    FormControl, FormControlLabel, Switch, InputLabel, Select, MenuItem,
    Stack, Card, CardContent, CardActions,
    useMediaQuery, useTheme,
    Dialog, DialogTitle, DialogContent, DialogActions,
    Snackbar, Skeleton, InputAdornment, Pagination, Tooltip,
    LinearProgress, Menu, ListItemIcon, ListItemText
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import ClearIcon from '@mui/icons-material/Clear';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import WarningIcon from '@mui/icons-material/Warning';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import KeyIcon from '@mui/icons-material/Key';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { jwtDecode } from 'jwt-decode';
import { api } from '../lib/api';

/* ── Types ── */
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

const PAGE_SIZE = 8;

/* ── Helpers ── */
function getDaysUntilRenewal(dateString: string): number {
    return (new Date(dateString).getTime() - new Date().getTime()) / (1000 * 3600 * 24);
}

function isExpiringSoon(dateString: string): boolean {
    const days = getDaysUntilRenewal(dateString);
    return days > 0 && days <= 30;
}

function isExpired(dateString: string): boolean {
    return getDaysUntilRenewal(dateString) <= 0;
}

function getSeatUtilization(license: License): number {
    const used = license.allocations?.length || 0;
    if (license.totalSeats === 0) return 0;
    return (used / license.totalSeats) * 100;
}

function getSeatColor(pct: number): 'success' | 'warning' | 'error' {
    if (pct >= 90) return 'error';
    if (pct >= 70) return 'warning';
    return 'success';
}

function getRenewalChip(dateString: string) {
    const date = new Date(dateString).toLocaleDateString();
    if (isExpired(dateString)) {
        return <Chip label={`Expired ${date}`} color="error" size="small" variant="outlined" icon={<WarningIcon />} />;
    }
    if (isExpiringSoon(dateString)) {
        const days = Math.ceil(getDaysUntilRenewal(dateString));
        return <Chip label={`${date} (${days}d left)`} color="warning" size="small" variant="outlined" icon={<WarningIcon />} />;
    }
    return <Typography variant="body2">{date}</Typography>;
}

/* ── License Form Dialog ── */
function LicenseFormDialog({ open, onClose, editingLicense, onSaved, canModify }: {
    open: boolean;
    onClose: () => void;
    editingLicense: License | null;
    onSaved: (message: string) => void;
    canModify: boolean;
}) {
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

    const [name, setName] = useState('');
    const [publisher, setPublisher] = useState('');
    const [totalSeats, setTotalSeats] = useState<number | ''>('');
    const [costPerSeat, setCostPerSeat] = useState<number | ''>('');
    const [renewalDate, setRenewalDate] = useState(new Date().toISOString().split('T')[0]);
    const [isActive, setIsActive] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            if (editingLicense) {
                setName(editingLicense.name);
                setPublisher(editingLicense.publisher);
                setTotalSeats(editingLicense.totalSeats);
                setCostPerSeat(editingLicense.costPerSeat);
                setRenewalDate(editingLicense.renewalDate.split('T')[0]);
                setIsActive(editingLicense.isActive);
            } else {
                setName('');
                setPublisher('');
                setTotalSeats('');
                setCostPerSeat('');
                setRenewalDate(new Date().toISOString().split('T')[0]);
                setIsActive(true);
            }
            setFormError(null);
        }
    }, [open, editingLicense]);

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

        try {
            setSaving(true);

            if (editingLicense) {
                await api.put(`/api/licenses/${editingLicense.id}`, payload);
            } else {
                await api.post('/api/licenses', payload);
            }

            onSaved(editingLicense ? `"${name}" updated successfully.` : `"${name}" registered successfully.`);
            onClose();
        } catch (err: any) {
            setFormError(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullScreen={fullScreen}
            maxWidth="sm"
            fullWidth
            slotProps={{ paper: { sx: { borderRadius: fullScreen ? 0 : 2 } } }}
        >
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}>
                {editingLicense ? <EditIcon color="primary" /> : <AddIcon color="primary" />}
                {editingLicense ? 'Edit Software License' : 'Register New Software License'}
                <Box sx={{ flexGrow: 1 }} />
                <IconButton size="small" onClick={onClose} aria-label="close">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <Divider />

            <Box component="form" onSubmit={handleSubmit}>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 3 }}>
                    {formError && (
                        <Alert severity="error" onClose={() => setFormError(null)}>
                            {formError}
                        </Alert>
                    )}

                    <TextField label="Name" variant="outlined" fullWidth size="small" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
                    <TextField label="Publisher" variant="outlined" fullWidth size="small" value={publisher} onChange={(e) => setPublisher(e.target.value)} required />
                    <TextField
                        label="Total Seats"
                        variant="outlined"
                        fullWidth
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
                        fullWidth
                        size="small"
                        type="number"
                        value={costPerSeat}
                        onChange={(e) => setCostPerSeat(e.target.value === '' ? '' : Number(e.target.value))}
                        slotProps={{
                            htmlInput: { min: 0, step: '0.01' },
                            input: {
                                startAdornment: <InputAdornment position="start">$</InputAdornment>,
                            },
                        }}
                        required
                    />
                    <TextField
                        label="Renewal Date"
                        type="date"
                        variant="outlined"
                        fullWidth
                        size="small"
                        value={renewalDate}
                        onChange={(e) => setRenewalDate(e.target.value)}
                        required
                    />

                    <FormControlLabel
                        control={<Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} color="primary" />}
                        label={isActive ? 'Status: Active' : 'Status: Inactive'}
                    />
                </DialogContent>

                <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                    <Button variant="outlined" color="inherit" onClick={onClose} startIcon={<ClearIcon />}>
                        Cancel
                    </Button>
                    <Tooltip title={!canModify ? 'Requires Admin or Manager role' : ''}>
                        <span>
                            <Button
                                type="submit"
                                variant="contained"
                                color={editingLicense ? 'success' : 'primary'}
                                startIcon={saving ? <CircularProgress size={16} color="inherit" /> : (editingLicense ? <SaveIcon /> : <AddIcon />)}
                                disabled={saving || !canModify}
                            >
                                {editingLicense ? 'Save Changes' : 'Register'}
                            </Button>
                        </span>
                    </Tooltip>
                </DialogActions>
            </Box>
        </Dialog>
    );
}

/* ── Delete Confirmation Dialog ── */
function DeleteConfirmDialog({ open, license, onClose, onConfirm, deleting }: {
    open: boolean;
    license: License | null;
    onClose: () => void;
    onConfirm: () => void;
    deleting: boolean;
}) {
    if (!license) return null;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main', fontWeight: 600 }}>
                <WarningAmberIcon />
                Delete License
            </DialogTitle>
            <Divider />
            <DialogContent sx={{ pt: 3 }}>
                <Typography variant="body1" gutterBottom>
                    Are you sure you want to permanently delete this software license?
                </Typography>

                <Paper variant="outlined" sx={{ p: 2, mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: '#7c3aed', width: 40, height: 40, fontSize: 16 }}>
                        <KeyIcon fontSize="small" />
                    </Avatar>
                    <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{license.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{license.publisher} · {license.allocations?.length || 0} seats assigned</Typography>
                    </Box>
                </Paper>

                {(license.allocations?.length || 0) > 0 && (
                    <Alert severity="warning" sx={{ mt: 2 }}>
                        This license has {license.allocations.length} active seat allocation(s). Deleting it will remove all assignments.
                    </Alert>
                )}

                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                    This action cannot be undone.
                </Typography>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                <Button variant="outlined" color="inherit" onClick={onClose}>Cancel</Button>
                <Button
                    variant="contained"
                    color="error"
                    onClick={onConfirm}
                    startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}
                    disabled={deleting}
                >
                    Delete
                </Button>
            </DialogActions>
        </Dialog>
    );
}

/* ── Assign Seat Dialog (polished) ── */
function AssignSeatDialog({ open, license, users, canModify, onClose, onAssign, onRemove }: {
    open: boolean;
    license: License | null;
    users: any[];
    canModify: boolean;
    onClose: () => void;
    onAssign: (licenseId: number, userId: number) => Promise<void>;
    onRemove: (licenseId: number, userId: number) => Promise<void>;
}) {
    const [selectedUserId, setSelectedUserId] = useState<number | ''>('');
    const [assigning, setAssigning] = useState(false);

    useEffect(() => {
        if (open) setSelectedUserId('');
    }, [open]);

    if (!license) return null;

    const utilization = getSeatUtilization(license);
    const usedSeats = license.allocations?.length || 0;
    const isFull = usedSeats >= license.totalSeats;

    const handleAssign = async () => {
        if (!selectedUserId || !license.id) return;
        setAssigning(true);
        try {
            await onAssign(license.id, selectedUserId as number);
            setSelectedUserId('');
        } finally {
            setAssigning(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}>
                <PersonAddIcon color="primary" />
                Assign Seat — {license.name}
                <Box sx={{ flexGrow: 1 }} />
                <IconButton size="small" onClick={onClose}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <Divider />
            <DialogContent sx={{ pt: 3 }}>
                {/* Seat capacity bar */}
                <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">Seat Utilization</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                            {usedSeats} / {license.totalSeats}
                        </Typography>
                    </Box>
                    <LinearProgress
                        variant="determinate"
                        value={Math.min(utilization, 100)}
                        color={getSeatColor(utilization)}
                        sx={{ height: 8, borderRadius: 4 }}
                    />
                    {isFull && (
                        <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                            All seats are occupied. Remove an assignment before adding a new one.
                        </Typography>
                    )}
                </Paper>

                {/* Current allocations */}
                {license.allocations && license.allocations.length > 0 && (
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Currently Assigned
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {license.allocations.map((allocation: any) => {
                                const assignedUser = users.find(u => u.id === allocation.userId);
                                return (
                                    <Chip
                                        key={allocation.id || allocation.userId}
                                        avatar={
                                            <Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>
                                                {(assignedUser?.username || '?').charAt(0).toUpperCase()}
                                            </Avatar>
                                        }
                                        label={assignedUser ? assignedUser.username : `User #${allocation.userId}`}
                                        size="small"
                                        color="info"
                                        variant="outlined"
                                        onDelete={canModify ? () => onRemove(license.id!, allocation.userId) : undefined}
                                    />
                                );
                            })}
                        </Box>
                    </Box>
                )}

                {/* User selector */}
                {!isFull && (
                    <FormControl fullWidth size="small">
                        <InputLabel>Select User</InputLabel>
                        <Select
                            value={selectedUserId}
                            label="Select User"
                            onChange={(e) => setSelectedUserId(Number(e.target.value))}
                        >
                            {users.map((user) => {
                                const isAlreadyAssigned = license.allocations?.some((a: any) => a.userId === user.id);
                                return (
                                    <MenuItem key={user.id} value={user.id} disabled={isAlreadyAssigned}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Avatar sx={{ width: 24, height: 24, fontSize: 11 }}>
                                                {user.username.charAt(0).toUpperCase()}
                                            </Avatar>
                                            {user.username} ({user.department})
                                            {isAlreadyAssigned && <Chip label="Assigned" size="small" sx={{ ml: 1 }} />}
                                        </Box>
                                    </MenuItem>
                                );
                            })}
                        </Select>
                    </FormControl>
                )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                <Button onClick={onClose} color="inherit" variant="outlined">Close</Button>
                {!isFull && (
                    <Tooltip title={!canModify ? 'Requires Admin or Manager role' : ''}>
                        <span>
                            <Button
                                onClick={handleAssign}
                                variant="contained"
                                color="success"
                                disabled={!canModify || !selectedUserId || assigning}
                                startIcon={assigning ? <CircularProgress size={16} color="inherit" /> : <PersonAddIcon />}
                            >
                                Assign Seat
                            </Button>
                        </span>
                    </Tooltip>
                )}
            </DialogActions>
        </Dialog>
    );
}

/* ── Skeleton loaders ── */
function TableSkeletonRows({ count = 5 }: { count?: number }) {
    return (
        <>
            {Array.from({ length: count }).map((_, i) => (
                <TableRow key={i}>
                    <TableCell><Skeleton variant="text" width={120} /></TableCell>
                    <TableCell><Skeleton variant="text" width={80} /></TableCell>
                    <TableCell>
                        <Skeleton variant="text" width={50} sx={{ mb: 0.5 }} />
                        <Skeleton variant="rounded" width="100%" height={6} />
                    </TableCell>
                    <TableCell><Skeleton variant="text" width={60} /></TableCell>
                    <TableCell><Skeleton variant="rounded" width={100} height={24} /></TableCell>
                    <TableCell align="center"><Skeleton variant="rounded" width={60} height={24} sx={{ mx: 'auto' }} /></TableCell>
                    <TableCell align="right">
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <Skeleton variant="circular" width={28} height={28} />
                        </Box>
                    </TableCell>
                </TableRow>
            ))}
        </>
    );
}

function MobileSkeletonCards({ count = 4 }: { count?: number }) {
    return (
        <Stack spacing={0}>
            {Array.from({ length: count }).map((_, i) => (
                <Card variant="outlined" sx={{ mb: 1.5 }} key={i}>
                    <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                            <Skeleton variant="circular" width={36} height={36} />
                            <Box sx={{ flex: 1 }}>
                                <Skeleton variant="text" width="60%" />
                                <Skeleton variant="text" width="40%" />
                            </Box>
                            <Skeleton variant="rounded" width={56} height={24} />
                        </Box>
                        <Skeleton variant="rounded" width="100%" height={6} sx={{ mb: 1 }} />
                        <Skeleton variant="text" width="50%" />
                    </CardContent>
                </Card>
            ))}
        </Stack>
    );
}

/* ── Mobile: card per license ── */
function MobileLicenseCard({ license, canModify, onEdit, onDelete, onAssign }: {
    license: License;
    canModify: boolean;
    onEdit: (license: License) => void;
    onDelete: (license: License) => void;
    onAssign: (license: License) => void;
}) {
    const usedSeats = license.allocations?.length || 0;
    const utilization = getSeatUtilization(license);

    return (
        <Card variant="outlined" sx={{ mb: 1.5 }}>
            <CardContent sx={{ pb: 0 }}>
                {/* Top row: name + status */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <Avatar sx={{ bgcolor: '#7c3aed', width: 36, height: 36, fontSize: 14 }}>
                        <KeyIcon sx={{ fontSize: 18 }} />
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body1" sx={{ fontWeight: 600, lineHeight: 1.3 }} noWrap>
                            {license.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                            {license.publisher}
                        </Typography>
                    </Box>
                    <Chip
                        label={license.isActive ? 'Active' : 'Inactive'}
                        color={license.isActive ? 'success' : 'error'}
                        size="small"
                        variant="outlined"
                    />
                </Box>

                {/* Seat progress */}
                <Box sx={{ mb: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                        <Typography variant="caption" color="text.secondary">Seats</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>{usedSeats} / {license.totalSeats}</Typography>
                    </Box>
                    <LinearProgress
                        variant="determinate"
                        value={Math.min(utilization, 100)}
                        color={getSeatColor(utilization)}
                        sx={{ height: 6, borderRadius: 3 }}
                    />
                </Box>

                {/* Details row */}
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                        ${license.costPerSeat.toFixed(2)}/seat
                    </Typography>
                    {getRenewalChip(license.renewalDate)}
                </Box>
            </CardContent>

            <CardActions sx={{ justifyContent: 'flex-end', pt: 0.5 }}>
                <Button size="small" color="success" startIcon={<PersonAddIcon />} onClick={() => onAssign(license)} disabled={!canModify}>
                    Assign
                </Button>
                <Button size="small" color="primary" startIcon={<EditIcon />} onClick={() => onEdit(license)} disabled={!canModify}>
                    Edit
                </Button>
                <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => onDelete(license)} disabled={!canModify}>
                    Delete
                </Button>
            </CardActions>
        </Card>
    );
}

/* ── Row actions overflow menu ── */
function LicenseRowActions({ license, canModify, onAssign, onEdit, onDelete }: {
    license: License;
    canModify: boolean;
    onAssign: (license: License) => void;
    onEdit: (license: License) => void;
    onDelete: (license: License) => void;
}) {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);
    const handleClose = () => setAnchorEl(null);
    const gateNote = !canModify ? 'Requires Admin or Manager' : undefined;

    return (
        <>
            <Tooltip title="Actions">
                <IconButton
                    size="small"
                    aria-label="Row actions"
                    aria-haspopup="true"
                    aria-expanded={open ? 'true' : undefined}
                    onClick={(e) => setAnchorEl(e.currentTarget)}
                >
                    <MoreVertIcon fontSize="small" />
                </IconButton>
            </Tooltip>
            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{ paper: { sx: { minWidth: 180 } } }}
            >
                <MenuItem disabled={!canModify} onClick={() => { handleClose(); onAssign(license); }}>
                    <ListItemIcon><PersonAddIcon fontSize="small" color={canModify ? 'success' : 'disabled'} /></ListItemIcon>
                    <ListItemText primary="Assign seat" secondary={gateNote} />
                </MenuItem>
                <MenuItem disabled={!canModify} onClick={() => { handleClose(); onEdit(license); }}>
                    <ListItemIcon><EditIcon fontSize="small" color={canModify ? 'primary' : 'disabled'} /></ListItemIcon>
                    <ListItemText primary="Edit" secondary={gateNote} />
                </MenuItem>
                <Divider />
                <MenuItem
                    disabled={!canModify}
                    onClick={() => { handleClose(); onDelete(license); }}
                    sx={{ color: canModify ? 'error.main' : undefined }}
                >
                    <ListItemIcon><DeleteIcon fontSize="small" color={canModify ? 'error' : 'disabled'} /></ListItemIcon>
                    <ListItemText primary="Delete" secondary={gateNote} />
                </MenuItem>
            </Menu>
        </>
    );
}

/* ════════════════════════════════════════════════════════════════
   Main Page Component
   ════════════════════════════════════════════════════════════════ */
export default function Licenses() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const [softwareLicenses, setSoftwareLicenses] = useState<License[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [showInactive, setShowInactive] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);

    // Dialogs
    const [formOpen, setFormOpen] = useState(false);
    const [editingLicense, setEditingLicense] = useState<License | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [licenseToDelete, setLicenseToDelete] = useState<License | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [assignDialogOpen, setAssignDialogOpen] = useState(false);
    const [selectedLicense, setSelectedLicense] = useState<License | null>(null);

    const [users, setUsers] = useState<any[]>([]);

    // Toast
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false, message: '', severity: 'success'
    });

    // Role check
    const token = localStorage.getItem('token');
    let userRole: string | null = null;
    if (token) {
        const decoded: any = jwtDecode(token);
        userRole = decoded.role;
    }
    const canModify = userRole === 'Admin' || userRole === 'Manager';

    /* ── Data fetching ── */
    const fetchSoftwareLicenses = async () => {
        try {
            setLoading(true);
            const data = await api.get<License[]>(`/api/licenses?showInactive=${showInactive}`);
            setSoftwareLicenses(data);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'An error occurred.');
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const data = await api.get<any[]>('/api/users');
            setUsers(data);
        } catch {
            // Users fetch failure is non-critical
        }
    };

    useEffect(() => {
        fetchSoftwareLicenses();
        fetchUsers();
    }, [showInactive]);

    /* ── Filtered + paginated licenses ── */
    const filteredLicenses = useMemo(() => {
        if (!searchQuery.trim()) return softwareLicenses;
        const q = searchQuery.toLowerCase();
        return softwareLicenses.filter(l =>
            l.name.toLowerCase().includes(q) ||
            l.publisher.toLowerCase().includes(q)
        );
    }, [softwareLicenses, searchQuery]);

    const totalPages = Math.max(1, Math.ceil(filteredLicenses.length / PAGE_SIZE));
    const paginatedLicenses = useMemo(() => {
        const start = (page - 1) * PAGE_SIZE;
        return filteredLicenses.slice(start, start + PAGE_SIZE);
    }, [filteredLicenses, page]);

    useEffect(() => { setPage(1); }, [searchQuery]);

    /* ── Handlers ── */
    const handleOpenCreate = () => {
        setEditingLicense(null);
        setFormOpen(true);
    };

    const handleOpenEdit = (license: License) => {
        setEditingLicense(license);
        setFormOpen(true);
    };

    const handleFormSaved = (message: string) => {
        setSnackbar({ open: true, message, severity: 'success' });
        fetchSoftwareLicenses();
    };

    const handleOpenDelete = (license: License) => {
        setLicenseToDelete(license);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!licenseToDelete?.id) return;
        try {
            setDeleting(true);
            await api.del(`/api/licenses/${licenseToDelete.id}`);
            setSnackbar({ open: true, message: `"${licenseToDelete.name}" deleted successfully.`, severity: 'success' });
            setDeleteDialogOpen(false);
            setLicenseToDelete(null);
            fetchSoftwareLicenses();
        } catch (err: any) {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        } finally {
            setDeleting(false);
        }
    };

    const handleOpenAssign = (license: License) => {
        setSelectedLicense(license);
        setAssignDialogOpen(true);
    };

    const handleAssignSeat = async (licenseId: number, userId: number) => {
        try {
            await api.post(`/api/licenses/${licenseId}/allocate`, { userId });
            setSnackbar({ open: true, message: 'Seat assigned successfully.', severity: 'success' });
            await fetchSoftwareLicenses();
            // Refresh selected license in the assign dialog
            const updated = await api.get<License[]>(`/api/licenses?showInactive=${showInactive}`);
            const refreshed = updated.find(l => l.id === licenseId);
            if (refreshed) setSelectedLicense(refreshed);
        } catch (err: any) {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        }
    };

    const handleRemoveAllocation = async (licenseId: number, userId: number) => {
        try {
            await api.del(`/api/licenses/${licenseId}/allocate/${userId}`);
            setSnackbar({ open: true, message: 'Seat removed successfully.', severity: 'success' });
            await fetchSoftwareLicenses();
            // Refresh selected license in the assign dialog
            const updated = await api.get<License[]>(`/api/licenses?showInactive=${showInactive}`);
            const refreshed = updated.find(l => l.id === licenseId);
            if (refreshed) setSelectedLicense(refreshed);
        } catch (err: any) {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        }
    };

    return (
        <Container maxWidth="xl" sx={{ mt: 2, px: isMobile ? 1 : undefined }}>
            {/* ── Page header ── */}
            <Box sx={{ mb: 3, display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'flex-start', gap: 2 }}>
                <Box>
                    <Typography variant={isMobile ? 'h6' : 'h5'} color="text.primary" gutterBottom sx={{ fontWeight: 600 }}>
                        Enterprise Software Licenses
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Manage software license registrations, seat allocations, and renewal tracking.
                    </Typography>
                </Box>
                <Tooltip title={!canModify ? 'Requires Admin or Manager role' : ''}>
                    <span>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={handleOpenCreate}
                            disabled={!canModify}
                            sx={{ whiteSpace: 'nowrap', alignSelf: isMobile ? 'stretch' : 'flex-start' }}
                        >
                            Add License
                        </Button>
                    </span>
                </Tooltip>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* ── Toolbar: search + filters ── */}
            <Paper elevation={2} sx={{ p: 2, mb: 3, display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 2, alignItems: isMobile ? 'stretch' : 'center' }}>
                <TextField
                    placeholder="Search by name or publisher…"
                    size="small"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    sx={{ flex: 1, minWidth: 200 }}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon color="action" />
                                </InputAdornment>
                            ),
                            endAdornment: searchQuery ? (
                                <InputAdornment position="end">
                                    <IconButton size="small" onClick={() => setSearchQuery('')}>
                                        <ClearIcon fontSize="small" />
                                    </IconButton>
                                </InputAdornment>
                            ) : null,
                        }
                    }}
                />

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                    <FormControlLabel
                        control={<Switch checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} color="primary" size="small" />}
                        label={<Typography variant="body2">Show Inactive</Typography>}
                        sx={{ mr: 0 }}
                    />
                    <Chip
                        icon={<KeyIcon />}
                        label={`${filteredLicenses.length} license${filteredLicenses.length !== 1 ? 's' : ''}${searchQuery ? ' found' : ''}`}
                        variant="outlined"
                        size="small"
                    />
                    {loading && <CircularProgress size={20} />}
                </Box>
            </Paper>

            {/* ── Content: table (desktop) or cards (mobile) ── */}
            {isMobile ? (
                <Box>
                    {loading ? (
                        <MobileSkeletonCards />
                    ) : paginatedLicenses.length === 0 ? (
                        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
                            <KeyIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                            <Typography variant="body2" color="text.secondary">
                                {searchQuery
                                    ? `No licenses match "${searchQuery}".`
                                    : 'No software licenses found in the database.'}
                            </Typography>
                        </Paper>
                    ) : (
                        <Stack spacing={0}>
                            {paginatedLicenses.map((license) => (
                                <MobileLicenseCard
                                    key={license.id}
                                    license={license}
                                    canModify={canModify}
                                    onEdit={handleOpenEdit}
                                    onDelete={handleOpenDelete}
                                    onAssign={handleOpenAssign}
                                />
                            ))}
                        </Stack>
                    )}
                </Box>
            ) : (
                <TableContainer component={Paper} elevation={2}>
                    <Table aria-label="software licenses table" size="small">
                        <TableHead sx={{ bgcolor: 'action.hover' }}>
                            <TableRow>
                                <TableCell><strong>Software Name</strong></TableCell>
                                <TableCell><strong>Publisher</strong></TableCell>
                                <TableCell><strong>Seats</strong></TableCell>
                                <TableCell><strong>Cost / Seat</strong></TableCell>
                                <TableCell><strong>Renewal</strong></TableCell>
                                <TableCell align="center"><strong>Status</strong></TableCell>
                                <TableCell align="right"><strong>Actions</strong></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableSkeletonRows />
                            ) : paginatedLicenses.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 5 }}>
                                        <KeyIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                                        <Typography variant="body2" color="text.secondary">
                                            {searchQuery
                                                ? `No licenses match "${searchQuery}".`
                                                : 'No software licenses found in the database.'}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedLicenses.map((license) => {
                                    const usedSeats = license.allocations?.length || 0;
                                    const utilization = getSeatUtilization(license);

                                    return (
                                        <TableRow key={license.id} hover>
                                            <TableCell sx={{ fontWeight: 500 }}>{license.name}</TableCell>
                                            <TableCell>{license.publisher}</TableCell>
                                            <TableCell sx={{ minWidth: 120 }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {usedSeats} / {license.totalSeats}
                                                    </Typography>
                                                </Box>
                                                <LinearProgress
                                                    variant="determinate"
                                                    value={Math.min(utilization, 100)}
                                                    color={getSeatColor(utilization)}
                                                    sx={{ height: 6, borderRadius: 3 }}
                                                />
                                            </TableCell>
                                            <TableCell>${license.costPerSeat.toFixed(2)}</TableCell>
                                            <TableCell>{getRenewalChip(license.renewalDate)}</TableCell>
                                            <TableCell align="center">
                                                <Chip
                                                    label={license.isActive ? 'Active' : 'Inactive'}
                                                    color={license.isActive ? 'success' : 'error'}
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            </TableCell>
                                            <TableCell align="right">
                                                <LicenseRowActions
                                                    license={license}
                                                    canModify={canModify}
                                                    onAssign={handleOpenAssign}
                                                    onEdit={handleOpenEdit}
                                                    onDelete={handleOpenDelete}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>

                    {totalPages > 1 && (
                        <>
                            <Divider />
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 1.5 }}>
                                <Pagination
                                    count={totalPages}
                                    page={page}
                                    onChange={(_, val) => setPage(val)}
                                    color="primary"
                                    siblingCount={1}
                                />
                            </Box>
                        </>
                    )}
                </TableContainer>
            )}

            {/* Mobile pagination */}
            {isMobile && totalPages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                    <Pagination
                        count={totalPages}
                        page={page}
                        onChange={(_, val) => setPage(val)}
                        color="primary"
                        size="small"
                        siblingCount={0}
                    />
                </Box>
            )}

            {/* ── Dialogs ── */}
            <LicenseFormDialog
                open={formOpen}
                onClose={() => setFormOpen(false)}
                editingLicense={editingLicense}
                onSaved={handleFormSaved}
                canModify={canModify}
            />

            <DeleteConfirmDialog
                open={deleteDialogOpen}
                license={licenseToDelete}
                onClose={() => { setDeleteDialogOpen(false); setLicenseToDelete(null); }}
                onConfirm={handleConfirmDelete}
                deleting={deleting}
            />

            <AssignSeatDialog
                open={assignDialogOpen}
                license={selectedLicense}
                users={users}
                canModify={canModify}
                onClose={() => { setAssignDialogOpen(false); setSelectedLicense(null); }}
                onAssign={handleAssignSeat}
                onRemove={handleRemoveAllocation}
            />

            {/* ── Toast ── */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar(s => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    severity={snackbar.severity}
                    onClose={() => setSnackbar(s => ({ ...s, open: false }))}
                    variant="filled"
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Container>
    );
}