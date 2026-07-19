import { useState, useEffect, useMemo } from 'react';
import {
    Container, Typography, Box, TextField, Button, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Paper, Avatar, MenuItem,
    CircularProgress, Alert, IconButton, Divider, Chip,
    FormControlLabel, Switch,
    Stack, Card, CardContent, CardActions,
    useMediaQuery, useTheme,
    Dialog, DialogTitle, DialogContent, DialogActions,
    Snackbar, Skeleton, InputAdornment, Pagination, Tooltip,
    LinearProgress, Grid
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import ClearIcon from '@mui/icons-material/Clear';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InfoIcon from '@mui/icons-material/Info';
import DevicesIcon from '@mui/icons-material/Devices';
import BuildIcon from '@mui/icons-material/Build';
import { jwtDecode } from 'jwt-decode';

const API_BASE = 'http://localhost:5132/api/assets';
const USERS_API = 'http://localhost:5132/api/users';
const PAGE_SIZE = 8;

/* ── Helpers ── */
function calculateCurrentValue(asset: any): number {
    const { purchasePrice, salvageValue, expectedLifespanMonths, purchaseDate } = asset;
    if (!purchasePrice || !expectedLifespanMonths || expectedLifespanMonths === 0) return purchasePrice ?? 0;

    const start = new Date(purchaseDate).getTime();
    const now = Date.now();
    const monthsElapsed = Math.max(0, (now - start) / (1000 * 60 * 60 * 24 * 30.44)); // avg days/month
    const depreciationPerMonth = (purchasePrice - (salvageValue ?? 0)) / expectedLifespanMonths;
    const totalDepreciation = depreciationPerMonth * Math.min(monthsElapsed, expectedLifespanMonths);
    return Math.max(salvageValue ?? 0, purchasePrice - totalDepreciation);
}

function getDepreciationPct(asset: any): number {
    if (!asset.purchasePrice || asset.purchasePrice === 0) return 0;
    const currentValue = asset.calculatedCurrentValue ?? calculateCurrentValue(asset);
    return Math.max(0, Math.min(100, (currentValue / asset.purchasePrice) * 100));
}

function getDepreciationColor(pct: number): 'success' | 'warning' | 'error' {
    if (pct >= 50) return 'success';
    if (pct >= 20) return 'warning';
    return 'error';
}

/* ── Asset Form Dialog ── */
function AssetFormDialog({ open, onClose, editingAsset, users, onSaved, canModify }: {
    open: boolean;
    onClose: () => void;
    editingAsset: any | null;
    users: any[];
    onSaved: (message: string) => void;
    canModify: boolean;
}) {
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

    const [name, setName] = useState('');
    const [serialNumber, setSerialNumber] = useState('');
    const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
    const [purchasePrice, setPurchasePrice] = useState<number | ''>('');
    const [expectedLifespanMonths, setExpectedLifespanMonths] = useState<number | ''>('');
    const [salvageValue, setSalvageValue] = useState<number | ''>('');
    const [assignedUserId, setAssignedUserId] = useState<number | ''>('');
    const [isActive, setIsActive] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            if (editingAsset) {
                setName(editingAsset.name);
                setSerialNumber(editingAsset.serialNumber);
                setPurchaseDate(editingAsset.purchaseDate.split('T')[0]);
                setPurchasePrice(editingAsset.purchasePrice);
                setExpectedLifespanMonths(editingAsset.expectedLifespanMonths);
                setSalvageValue(editingAsset.salvageValue);
                setAssignedUserId(editingAsset.assignedUserId || '');
                setIsActive(editingAsset.isActive);
            } else {
                setName('');
                setSerialNumber('');
                setPurchaseDate(new Date().toISOString().split('T')[0]);
                setPurchasePrice('');
                setExpectedLifespanMonths('');
                setSalvageValue('');
                setAssignedUserId('');
                setIsActive(true);
            }
            setFormError(null);
        }
    }, [open, editingAsset]);

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
            salvageValue: Number(salvageValue),
            assignedUserId: assignedUserId === '' ? null : assignedUserId
        };

        const token = localStorage.getItem('token');
        const url = editingAsset ? `${API_BASE}/${editingAsset.id}` : API_BASE;
        const method = editingAsset ? 'PUT' : 'POST';

        try {
            setSaving(true);
            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error('Failed to save asset data.');

            onSaved(editingAsset ? `"${name}" updated successfully.` : `"${name}" registered successfully.`);
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
                {editingAsset ? <EditIcon color="primary" /> : <AddIcon color="primary" />}
                {editingAsset ? 'Edit Asset' : 'Register New Asset'}
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

                    <TextField label="Asset Name" variant="outlined" fullWidth size="small" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
                    <TextField label="Serial Number" variant="outlined" fullWidth size="small" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} required />
                    <TextField label="Purchase Date" type="date" variant="outlined" fullWidth size="small" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} required />
                    <TextField
                        label="Purchase Price"
                        type="number"
                        variant="outlined"
                        fullWidth
                        size="small"
                        value={purchasePrice}
                        onChange={(e) => setPurchasePrice(e.target.value === '' ? '' : Number(e.target.value))}
                        slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> }, htmlInput: { min: 0, step: '0.01' } }}
                        required
                    />
                    <TextField
                        label="Expected Lifespan (Months)"
                        type="number"
                        variant="outlined"
                        fullWidth
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
                        fullWidth
                        size="small"
                        value={salvageValue}
                        onChange={(e) => setSalvageValue(e.target.value === '' ? '' : Number(e.target.value))}
                        slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> }, htmlInput: { min: 0, step: '0.01' } }}
                        required
                    />
                    <TextField
                        select
                        label="Assigned To (User)"
                        variant="outlined"
                        fullWidth
                        size="small"
                        value={assignedUserId}
                        onChange={(e) => setAssignedUserId(e.target.value === '' ? '' : Number(e.target.value))}
                    >
                        <MenuItem value="">
                            <em>Unassigned</em>
                        </MenuItem>
                        {users.map((user) => (
                            <MenuItem key={user.id} value={user.id}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Avatar sx={{ width: 24, height: 24, fontSize: 11 }}>
                                        {user.username.charAt(0).toUpperCase()}
                                    </Avatar>
                                    {user.username} ({user.email})
                                </Box>
                            </MenuItem>
                        ))}
                    </TextField>

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
                                color={editingAsset ? 'success' : 'primary'}
                                startIcon={saving ? <CircularProgress size={16} color="inherit" /> : (editingAsset ? <SaveIcon /> : <AddIcon />)}
                                disabled={saving || !canModify}
                            >
                                {editingAsset ? 'Save Changes' : 'Register'}
                            </Button>
                        </span>
                    </Tooltip>
                </DialogActions>
            </Box>
        </Dialog>
    );
}

/* ── Delete Confirmation Dialog ── */
function DeleteConfirmDialog({ open, asset, onClose, onConfirm, deleting }: {
    open: boolean;
    asset: any | null;
    onClose: () => void;
    onConfirm: () => void;
    deleting: boolean;
}) {
    if (!asset) return null;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main', fontWeight: 600 }}>
                <WarningAmberIcon />
                Delete Asset
            </DialogTitle>
            <Divider />
            <DialogContent sx={{ pt: 3 }}>
                <Typography variant="body1" gutterBottom>
                    Are you sure you want to permanently delete this asset?
                </Typography>

                <Paper variant="outlined" sx={{ p: 2, mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: '#2563eb', width: 40, height: 40, fontSize: 16 }}>
                        <DevicesIcon fontSize="small" />
                    </Avatar>
                    <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{asset.name}</Typography>
                        <Typography variant="caption" color="text.secondary">S/N: {asset.serialNumber}</Typography>
                    </Box>
                </Paper>

                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                    This action cannot be undone. All maintenance records will also be removed.
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

/* ── Asset Details Dialog (polished) ── */
function AssetDetailsDialog({ open, assetDetails, canModify, onClose, onMaintenanceAdded }: {
    open: boolean;
    assetDetails: any | null;
    canModify: boolean;
    onClose: () => void;
    onMaintenanceAdded: () => void;
}) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [maintenanceDate, setMaintenanceDate] = useState(new Date().toISOString().split('T')[0]);
    const [maintenanceDescription, setMaintenanceDescription] = useState('');
    const [maintenanceCost, setMaintenanceCost] = useState<number | ''>('');
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    if (!assetDetails) return null;

    const asset = assetDetails.asset;
    const currentValue = assetDetails.calculatedCurrentValue ?? 0;
    const depPct = getDepreciationPct({ ...asset, calculatedCurrentValue: currentValue });

    const handleAddMaintenance = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!maintenanceDescription) return;

        const token = localStorage.getItem('token');
        try {
            setSaving(true);
            const res = await fetch(`${API_BASE}/${asset.id}/maintenance`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    datePerformed: maintenanceDate,
                    description: maintenanceDescription,
                    cost: Number(maintenanceCost)
                })
            });

            if (!res.ok) throw new Error('Failed to add maintenance record.');

            setMaintenanceDescription('');
            setMaintenanceCost('');
            setMaintenanceDate(new Date().toISOString().split('T')[0]);
            onMaintenanceAdded();
        } catch (err: any) {
            setFormError(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth fullScreen={isMobile}>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}>
                <InfoIcon color="primary" />
                {asset.name}
                <Chip label={asset.serialNumber} size="small" variant="outlined" sx={{ ml: 1 }} />
                <Box sx={{ flexGrow: 1 }} />
                <IconButton size="small" onClick={onClose}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <Divider />
            <DialogContent sx={{ pt: 3 }}>
                <Grid container spacing={3}>
                    {/* Left: Overview + Financials */}
                    <Grid size={{ xs: 12, md: 5 }}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>Overview</Typography>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2" color="text.secondary">Assigned To</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {asset.assignedUserName || 'Unassigned'}
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2" color="text.secondary">Purchase Date</Typography>
                                <Typography variant="body2">{new Date(asset.purchaseDate).toLocaleDateString()}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2" color="text.secondary">Status</Typography>
                                <Chip label={asset.isActive ? 'Active' : 'Inactive'} color={asset.isActive ? 'success' : 'error'} size="small" variant="outlined" />
                            </Box>
                        </Box>

                        <Divider sx={{ my: 2 }} />

                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>Financials</Typography>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2" color="text.secondary">Purchase Price</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>${asset.purchasePrice.toFixed(2)}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2" color="text.secondary">Salvage Value</Typography>
                                <Typography variant="body2">${asset.salvageValue.toFixed(2)}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2" color="text.secondary">Lifespan</Typography>
                                <Typography variant="body2">{asset.expectedLifespanMonths} months</Typography>
                            </Box>
                        </Box>

                        {/* Current Value highlight */}
                        <Paper
                            variant="outlined"
                            sx={{
                                p: 2,
                                mt: 2,
                                borderColor: depPct > 50 ? 'success.main' : depPct > 20 ? 'warning.main' : 'error.main',
                                bgcolor: 'action.hover',
                                borderRadius: 2
                            }}
                        >
                            <Typography variant="caption" color="text.secondary">Current Book Value</Typography>
                            <Typography variant="h4" sx={{ fontWeight: 700, my: 0.5 }}>
                                ${currentValue.toFixed(2)}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <LinearProgress
                                    variant="determinate"
                                    value={depPct}
                                    color={getDepreciationColor(depPct)}
                                    sx={{ height: 6, borderRadius: 3, flex: 1 }}
                                />
                                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                    {depPct.toFixed(0)}%
                                </Typography>
                            </Box>
                        </Paper>
                    </Grid>

                    {/* Right: Maintenance History */}
                    <Grid size={{ xs: 12, md: 7 }}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <BuildIcon sx={{ fontSize: 16 }} />
                            Maintenance History
                        </Typography>

                        <TableContainer component={Paper} variant="outlined" sx={{ mb: 3, maxHeight: 240 }}>
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell><strong>Date</strong></TableCell>
                                        <TableCell><strong>Description</strong></TableCell>
                                        <TableCell align="right"><strong>Cost</strong></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {assetDetails.maintenanceRecords?.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={3} align="center" sx={{ py: 3 }}>
                                                <Typography variant="caption" color="text.secondary">No maintenance records yet.</Typography>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        assetDetails.maintenanceRecords?.map((record: any) => (
                                            <TableRow key={record.id}>
                                                <TableCell sx={{ whiteSpace: 'nowrap' }}>{new Date(record.datePerformed).toLocaleDateString()}</TableCell>
                                                <TableCell>{record.description}</TableCell>
                                                <TableCell align="right">${Number(record.cost).toFixed(2)}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        {/* Add maintenance form */}
                        {canModify && (
                            <>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    Add Record
                                </Typography>

                                {formError && (
                                    <Alert severity="error" sx={{ mb: 1 }} onClose={() => setFormError(null)}>
                                        {formError}
                                    </Alert>
                                )}

                                <Box component="form" onSubmit={handleAddMaintenance} sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                                        <TextField
                                            type="date"
                                            size="small"
                                            label="Date"
                                            value={maintenanceDate}
                                            onChange={(e) => setMaintenanceDate(e.target.value)}
                                            required
                                            sx={{ minWidth: 150 }}
                                        />
                                        <TextField
                                            label="Cost"
                                            type="number"
                                            size="small"
                                            value={maintenanceCost}
                                            onChange={(e) => setMaintenanceCost(e.target.value === '' ? '' : Number(e.target.value))}
                                            slotProps={{
                                                htmlInput: { min: 0, step: '0.01' },
                                                input: { startAdornment: <InputAdornment position="start">$</InputAdornment> },
                                            }}
                                            required
                                            sx={{ width: 130 }}
                                        />
                                    </Box>
                                    <TextField
                                        label="Description"
                                        size="small"
                                        fullWidth
                                        value={maintenanceDescription}
                                        onChange={(e) => setMaintenanceDescription(e.target.value)}
                                        required
                                    />
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        size="small"
                                        startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <AddIcon />}
                                        disabled={saving}
                                        sx={{ alignSelf: 'flex-end' }}
                                    >
                                        Add Record
                                    </Button>
                                </Box>
                            </>
                        )}
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} variant="outlined" color="inherit">Close</Button>
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
                    <TableCell><Skeleton variant="text" width={140} /></TableCell>
                    <TableCell><Skeleton variant="text" width={70} /></TableCell>
                    <TableCell>
                        <Skeleton variant="text" width={50} sx={{ mb: 0.5 }} />
                        <Skeleton variant="rounded" width="100%" height={6} />
                    </TableCell>
                    <TableCell align="center"><Skeleton variant="rounded" width={56} height={24} sx={{ mx: 'auto' }} /></TableCell>
                    <TableCell><Skeleton variant="text" width={80} /></TableCell>
                    <TableCell align="right">
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                            <Skeleton variant="circular" width={28} height={28} />
                            <Skeleton variant="circular" width={28} height={28} />
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

/* ── Mobile: card per asset ── */
function MobileAssetCard({ asset, canModify, canDelete, onDetails, onEdit, onDelete }: {
    asset: any;
    canModify: boolean;
    canDelete: boolean;
    onDetails: (asset: any) => void;
    onEdit: (asset: any) => void;
    onDelete: (asset: any) => void;
}) {
    return (
        <Card variant="outlined" sx={{ mb: 1.5 }}>
            <CardContent sx={{ pb: 0 }}>
                {/* Top row: name + status */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <Avatar sx={{ bgcolor: '#2563eb', width: 36, height: 36, fontSize: 14 }}>
                        <DevicesIcon sx={{ fontSize: 18 }} />
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body1" sx={{ fontWeight: 600, lineHeight: 1.3 }} noWrap>
                            {asset.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                            S/N: {asset.serialNumber}
                        </Typography>
                    </Box>
                    <Chip
                        label={asset.isActive ? 'Active' : 'Inactive'}
                        color={asset.isActive ? 'success' : 'error'}
                        size="small"
                        variant="outlined"
                    />
                </Box>

                {/* Details */}
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center', mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                        ${asset.purchasePrice?.toFixed(2) || '0.00'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        Assigned: {asset.assignedUserName || 'Unassigned'}
                    </Typography>
                </Box>
            </CardContent>

            <CardActions sx={{ justifyContent: 'flex-end', pt: 0.5 }}>
                <Button size="small" color="info" startIcon={<InfoIcon />} onClick={() => onDetails(asset)}>
                    Details
                </Button>
                <Button size="small" color="primary" startIcon={<EditIcon />} onClick={() => onEdit(asset)} disabled={!canModify}>
                    Edit
                </Button>
                <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => onDelete(asset)} disabled={!canDelete}>
                    Delete
                </Button>
            </CardActions>
        </Card>
    );
}

/* ════════════════════════════════════════════════════════════════
   Main Page Component
   ════════════════════════════════════════════════════════════════ */
export default function Assets() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const [assets, setAssets] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);

    // Dialogs
    const [formOpen, setFormOpen] = useState(false);
    const [editingAsset, setEditingAsset] = useState<any | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [assetToDelete, setAssetToDelete] = useState<any | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [assetDetails, setAssetDetails] = useState<any | null>(null);

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
    const canDelete = userRole === 'Admin';

    /* ── Data fetching ── */
    const fetchAssets = async () => {
        const token = localStorage.getItem('token');
        try {
            setLoading(true);
            const res = await fetch(API_BASE, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch assets.');
            const data = await res.json();
            setAssets(data);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'An error occurred.');
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(USERS_API, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch {
            // Non-critical
        }
    };

    const fetchAssetDetails = async (id: number) => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_BASE}/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch asset details.');
            const data = await res.json();
            setAssetDetails(data);
            setDetailsOpen(true);
        } catch (err: any) {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        }
    };

    useEffect(() => {
        fetchAssets();
        fetchUsers();
    }, []);

    /* ── Filtered + paginated ── */
    const filteredAssets = useMemo(() => {
        if (!searchQuery.trim()) return assets;
        const q = searchQuery.toLowerCase();
        return assets.filter(a =>
            a.name.toLowerCase().includes(q) ||
            a.serialNumber.toLowerCase().includes(q) ||
            (a.assignedUserName || '').toLowerCase().includes(q)
        );
    }, [assets, searchQuery]);

    const totalPages = Math.max(1, Math.ceil(filteredAssets.length / PAGE_SIZE));
    const paginatedAssets = useMemo(() => {
        const start = (page - 1) * PAGE_SIZE;
        return filteredAssets.slice(start, start + PAGE_SIZE);
    }, [filteredAssets, page]);

    useEffect(() => { setPage(1); }, [searchQuery]);

    /* ── Handlers ── */
    const handleOpenCreate = () => {
        setEditingAsset(null);
        setFormOpen(true);
    };

    const handleOpenEdit = (asset: any) => {
        setEditingAsset(asset);
        setFormOpen(true);
    };

    const handleFormSaved = (message: string) => {
        setSnackbar({ open: true, message, severity: 'success' });
        fetchAssets();
    };

    const handleOpenDelete = (asset: any) => {
        setAssetToDelete(asset);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!assetToDelete?.id) return;
        const token = localStorage.getItem('token');
        try {
            setDeleting(true);
            const res = await fetch(`${API_BASE}/${assetToDelete.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to delete asset. (Are you an Admin?)');
            setSnackbar({ open: true, message: `"${assetToDelete.name}" deleted successfully.`, severity: 'success' });
            setDeleteDialogOpen(false);
            setAssetToDelete(null);
            fetchAssets();
        } catch (err: any) {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        } finally {
            setDeleting(false);
        }
    };

    const handleMaintenanceAdded = () => {
        setSnackbar({ open: true, message: 'Maintenance record added.', severity: 'success' });
        if (assetDetails) {
            fetchAssetDetails(assetDetails.asset.id);
        }
    };

    return (
        <Container maxWidth="xl" sx={{ mt: 2, px: isMobile ? 1 : undefined }}>
            {/* ── Page header ── */}
            <Box sx={{ mb: 3, display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'flex-start', gap: 2 }}>
                <Box>
                    <Typography variant={isMobile ? 'h6' : 'h5'} color="text.primary" gutterBottom sx={{ fontWeight: 600 }}>
                        Enterprise Assets Management
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Track hardware assets, assignments, depreciation values, and maintenance history.
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
                            Add Asset
                        </Button>
                    </span>
                </Tooltip>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* ── Toolbar ── */}
            <Paper elevation={2} sx={{ p: 2, mb: 3, display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 2, alignItems: isMobile ? 'stretch' : 'center' }}>
                <TextField
                    placeholder="Search by name, serial number, or assigned user…"
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

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Chip
                        icon={<DevicesIcon />}
                        label={`${filteredAssets.length} asset${filteredAssets.length !== 1 ? 's' : ''}${searchQuery ? ' found' : ''}`}
                        variant="outlined"
                        size="small"
                    />
                    {loading && <CircularProgress size={20} />}
                </Box>
            </Paper>

            {/* ── Content ── */}
            {isMobile ? (
                <Box>
                    {loading ? (
                        <MobileSkeletonCards />
                    ) : paginatedAssets.length === 0 ? (
                        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
                            <DevicesIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                            <Typography variant="body2" color="text.secondary">
                                {searchQuery
                                    ? `No assets match "${searchQuery}".`
                                    : 'No assets found in the database.'}
                            </Typography>
                        </Paper>
                    ) : (
                        <Stack spacing={0}>
                            {paginatedAssets.map((asset) => (
                                <MobileAssetCard
                                    key={asset.id}
                                    asset={asset}
                                    canModify={canModify}
                                    canDelete={canDelete}
                                    onDetails={() => fetchAssetDetails(asset.id)}
                                    onEdit={handleOpenEdit}
                                    onDelete={handleOpenDelete}
                                />
                            ))}
                        </Stack>
                    )}
                </Box>
            ) : (
                <TableContainer component={Paper} elevation={2}>
                    <Table aria-label="assets table" size="small">
                        <TableHead sx={{ bgcolor: 'action.hover' }}>
                            <TableRow>
                                <TableCell><strong>Asset Name</strong></TableCell>
                                <TableCell><strong>Serial Number</strong></TableCell>
                                <TableCell><strong>Purchase Price</strong></TableCell>
                                <TableCell sx={{ minWidth: 110 }}><strong>Value</strong></TableCell>
                                <TableCell align="center"><strong>Status</strong></TableCell>
                                <TableCell><strong>Assigned To</strong></TableCell>
                                <TableCell align="right"><strong>Actions</strong></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableSkeletonRows />
                            ) : paginatedAssets.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 5 }}>
                                        <DevicesIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                                        <Typography variant="body2" color="text.secondary">
                                            {searchQuery
                                                ? `No assets match "${searchQuery}".`
                                                : 'No assets found in the database.'}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedAssets.map((asset) => (
                                    <TableRow key={asset.id} hover>
                                        <TableCell sx={{ fontWeight: 500 }}>{asset.name}</TableCell>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                                {asset.serialNumber}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>${asset.purchasePrice?.toFixed(2) || '0.00'}</TableCell>
                                        <TableCell>
                                            {(() => {
                                                const curVal = calculateCurrentValue(asset);
                                                const pct = getDepreciationPct(asset);
                                                return (
                                                    <Tooltip title={`${pct.toFixed(0)}% of original value remaining`}>
                                                        <Box>
                                                            <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.3 }}>
                                                                ${curVal.toFixed(2)}
                                                            </Typography>
                                                            <LinearProgress
                                                                variant="determinate"
                                                                value={pct}
                                                                color={getDepreciationColor(pct)}
                                                                sx={{ height: 5, borderRadius: 3 }}
                                                            />
                                                        </Box>
                                                    </Tooltip>
                                                );
                                            })()}
                                        </TableCell>
                                        <TableCell align="center">
                                            <Chip
                                                label={asset.isActive ? 'Active' : 'Inactive'}
                                                color={asset.isActive ? 'success' : 'error'}
                                                size="small"
                                                variant="outlined"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            {asset.assignedUserName ? (
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Avatar sx={{ width: 24, height: 24, fontSize: 11, bgcolor: '#64748b' }}>
                                                        {asset.assignedUserName.charAt(0).toUpperCase()}
                                                    </Avatar>
                                                    <Typography variant="body2">{asset.assignedUserName}</Typography>
                                                </Box>
                                            ) : (
                                                <Typography variant="caption" color="text.disabled">Unassigned</Typography>
                                            )}
                                        </TableCell>
                                        <TableCell align="right">
                                            <Tooltip title="View details & depreciation">
                                                <IconButton color="info" size="small" onClick={() => fetchAssetDetails(asset.id)}>
                                                    <InfoIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title={!canModify ? 'Requires Admin or Manager role' : 'Edit'}>
                                                <span>
                                                    <IconButton color="primary" size="small" disabled={!canModify} onClick={() => handleOpenEdit(asset)}>
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                            <Tooltip title={!canDelete ? 'Requires Admin role' : 'Delete'}>
                                                <span>
                                                    <IconButton color="error" size="small" disabled={!canDelete} onClick={() => handleOpenDelete(asset)}>
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))
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
            <AssetFormDialog
                open={formOpen}
                onClose={() => setFormOpen(false)}
                editingAsset={editingAsset}
                users={users}
                onSaved={handleFormSaved}
                canModify={canModify}
            />

            <DeleteConfirmDialog
                open={deleteDialogOpen}
                asset={assetToDelete}
                onClose={() => { setDeleteDialogOpen(false); setAssetToDelete(null); }}
                onConfirm={handleConfirmDelete}
                deleting={deleting}
            />

            <AssetDetailsDialog
                open={detailsOpen}
                assetDetails={assetDetails}
                canModify={canModify}
                onClose={() => { setDetailsOpen(false); setAssetDetails(null); }}
                onMaintenanceAdded={handleMaintenanceAdded}
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