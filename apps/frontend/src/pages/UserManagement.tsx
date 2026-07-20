import { useState, useEffect, useMemo } from 'react';
import {
    Container, Typography, Box, TextField, Button, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Paper, Avatar,
    CircularProgress, Alert, IconButton, Divider, Chip,
    FormControl, FormControlLabel, Switch, InputLabel, Select, MenuItem, FormHelperText,
    Stack, Card, CardContent, CardActions,
    useMediaQuery, useTheme,
    Dialog, DialogTitle, DialogContent, DialogActions,
    Snackbar, Skeleton, InputAdornment, Pagination, Tooltip,
    Menu, ListItemIcon, ListItemText
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import EditIcon from '@mui/icons-material/Edit';
import ClearIcon from '@mui/icons-material/Clear';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import GroupIcon from '@mui/icons-material/Group';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { api } from '../lib/api';

/* ── Types ── */
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
    { id: 3, name: 'Viewer', description: 'Read-only access to monitoring dashboards.' }
];

const PAGE_SIZE = 8;

/* ── Helpers ── */
function getRoleName(id: number): string {
    const found = SYSTEM_ROLES.find(r => r.id === id);
    return found ? found.name : `Unknown (${id})`;
}

function getRoleAvatarColor(roleId: number): string {
    switch (roleId) {
        case 1: return '#7c3aed';   // Admin  – purple
        case 2: return '#2563eb';   // Manager – blue
        default: return '#64748b';  // Viewer  – slate
    }
}

/* ── User Form Dialog ── */
function UserFormDialog({ open, onClose, editingUser, onSaved }: {
    open: boolean;
    onClose: () => void;
    editingUser: User | null;
    onSaved: (message: string) => void;
}) {
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [department, setDepartment] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [roleId, setRoleId] = useState(3);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    // Populate fields when dialog opens or editingUser changes
    useEffect(() => {
        if (open) {
            if (editingUser) {
                setUsername(editingUser.username);
                setEmail(editingUser.email);
                setDepartment(editingUser.department);
                setIsActive(editingUser.isActive);
                setRoleId(editingUser.roleId);
            } else {
                setUsername('');
                setEmail('');
                setDepartment('');
                setIsActive(true);
                setRoleId(3);
            }
            setFormError(null);
        }
    }, [open, editingUser]);

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
        try {
            setSaving(true);

            if (editingUser) {
                await api.put(`/api/users/${editingUser.id}`, payload);
            } else {
                await api.post('/api/users', payload);
            }

            onSaved(editingUser ? `"${username}" updated successfully.` : `"${username}" registered successfully.`);
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
                {editingUser ? <EditIcon color="primary" /> : <PersonAddIcon color="primary" />}
                {editingUser ? 'Modify User Identity' : 'Register New User'}
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

                    <TextField
                        label="Username"
                        variant="outlined"
                        fullWidth
                        size="small"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        autoFocus
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
                    />
                </DialogContent>

                <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                    <Button
                        variant="outlined"
                        color="inherit"
                        onClick={onClose}
                        startIcon={<ClearIcon />}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        color={editingUser ? "success" : "primary"}
                        startIcon={saving ? <CircularProgress size={16} color="inherit" /> : (editingUser ? <SaveIcon /> : <PersonAddIcon />)}
                        disabled={saving}
                    >
                        {editingUser ? 'Save Changes' : 'Register'}
                    </Button>
                </DialogActions>
            </Box>
        </Dialog>
    );
}

/* ── Delete Confirmation Dialog ── */
function DeleteConfirmDialog({ open, user, onClose, onConfirm, deleting }: {
    open: boolean;
    user: User | null;
    onClose: () => void;
    onConfirm: () => void;
    deleting: boolean;
}) {
    if (!user) return null;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main', fontWeight: 600 }}>
                <WarningAmberIcon />
                Delete User
            </DialogTitle>
            <Divider />
            <DialogContent sx={{ pt: 3 }}>
                <Typography variant="body1" gutterBottom>
                    Are you sure you want to permanently delete this user?
                </Typography>

                <Paper variant="outlined" sx={{ p: 2, mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: getRoleAvatarColor(user.roleId), width: 40, height: 40, fontSize: 16 }}>
                        {user.username.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{user.username}</Typography>
                        <Typography variant="caption" color="text.secondary">{user.email}</Typography>
                    </Box>
                </Paper>

                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                    This action cannot be undone. All associated data will be removed.
                </Typography>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                <Button variant="outlined" color="inherit" onClick={onClose}>
                    Cancel
                </Button>
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

/* ── Skeleton loader rows for the table ── */
function TableSkeletonRows({ count = 5 }: { count?: number }) {
    return (
        <>
            {Array.from({ length: count }).map((_, i) => (
                <TableRow key={i}>
                    <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Skeleton variant="circular" width={32} height={32} />
                            <Skeleton variant="text" width={80} />
                        </Box>
                    </TableCell>
                    <TableCell><Skeleton variant="text" width={160} /></TableCell>
                    <TableCell><Skeleton variant="text" width={100} /></TableCell>
                    <TableCell align="center"><Skeleton variant="rounded" width={60} height={24} sx={{ mx: 'auto' }} /></TableCell>
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

/* ── Mobile skeleton cards ── */
function MobileSkeletonCards({ count = 4 }: { count?: number }) {
    return (
        <Stack spacing={0}>
            {Array.from({ length: count }).map((_, i) => (
                <Card variant="outlined" sx={{ mb: 1.5 }} key={i}>
                    <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                            <Skeleton variant="circular" width={36} height={36} />
                            <Box sx={{ flex: 1 }}>
                                <Skeleton variant="text" width="50%" />
                                <Skeleton variant="text" width="70%" />
                            </Box>
                            <Skeleton variant="rounded" width={56} height={24} />
                        </Box>
                        <Skeleton variant="text" width="40%" />
                    </CardContent>
                </Card>
            ))}
        </Stack>
    );
}

/* ── Mobile: card per user ── */
function MobileUserCard({ user, onEdit, onDelete }: {
    user: User;
    onEdit: (user: User) => void;
    onDelete: (user: User) => void;
}) {
    return (
        <Card variant="outlined" sx={{ mb: 1.5 }}>
            <CardContent sx={{ pb: 0 }}>
                {/* Top row: avatar + username + status chip */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <Avatar sx={{ bgcolor: getRoleAvatarColor(user.roleId), width: 36, height: 36, fontSize: 15 }}>
                        {user.username.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body1" sx={{ fontWeight: 600, lineHeight: 1.3 }} noWrap>
                            {user.username}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                            {user.email}
                        </Typography>
                    </Box>
                    <Chip
                        label={user.isActive ? 'Active' : 'Suspended'}
                        color={user.isActive ? 'success' : 'error'}
                        size="small"
                        variant="outlined"
                    />
                </Box>

                {/* Department + Role */}
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Chip
                        label={getRoleName(user.roleId)}
                        size="small"
                        color={user.roleId === 1 ? 'secondary' : 'default'}
                    />
                    <Typography variant="caption" color="text.secondary">
                        {user.department || 'Unassigned'}
                    </Typography>
                </Box>
            </CardContent>

            <CardActions sx={{ justifyContent: 'flex-end', pt: 0.5 }}>
                <Button size="small" color="primary" startIcon={<EditIcon />} onClick={() => onEdit(user)}>
                    Edit
                </Button>
                <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => onDelete(user)}>
                    Delete
                </Button>
            </CardActions>
        </Card>
    );
}

/* ── Row actions overflow menu ── */
function UserRowActions({ user, onEdit, onDelete }: {
    user: User;
    onEdit: (user: User) => void;
    onDelete: (user: User) => void;
}) {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);
    const handleClose = () => setAnchorEl(null);

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
                slotProps={{ paper: { sx: { minWidth: 160 } } }}
            >
                <MenuItem onClick={() => { handleClose(); onEdit(user); }}>
                    <ListItemIcon><EditIcon fontSize="small" color="primary" /></ListItemIcon>
                    <ListItemText>Edit</ListItemText>
                </MenuItem>
                <Divider />
                <MenuItem onClick={() => { handleClose(); onDelete(user); }} sx={{ color: 'error.main' }}>
                    <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
                    <ListItemText>Delete</ListItemText>
                </MenuItem>
            </Menu>
        </>
    );
}

/* ════════════════════════════════════════════════════════════════
   Main Page Component
   ════════════════════════════════════════════════════════════════ */
export default function UserManagement() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Dialog state
    const [formOpen, setFormOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Search + pagination
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);

    // Toast
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false, message: '', severity: 'success'
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const data = await api.get<User[]>('/api/users');
            setUsers(data);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'An error occured while talking to the API.');
        } finally {
            setLoading(false);
        }
    };

    /* ── Filtered + paginated users ── */
    const filteredUsers = useMemo(() => {
        if (!searchQuery.trim()) return users;
        const q = searchQuery.toLowerCase();
        return users.filter(u =>
            u.username.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q) ||
            u.department.toLowerCase().includes(q) ||
            getRoleName(u.roleId).toLowerCase().includes(q)
        );
    }, [users, searchQuery]);

    const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
    const paginatedUsers = useMemo(() => {
        const start = (page - 1) * PAGE_SIZE;
        return filteredUsers.slice(start, start + PAGE_SIZE);
    }, [filteredUsers, page]);

    // Reset to page 1 when search changes
    useEffect(() => { setPage(1); }, [searchQuery]);

    /* ── Handlers ── */
    const handleOpenCreate = () => {
        setEditingUser(null);
        setFormOpen(true);
    };

    const handleOpenEdit = (user: User) => {
        setEditingUser(user);
        setFormOpen(true);
    };

    const handleFormSaved = (message: string) => {
        setSnackbar({ open: true, message, severity: 'success' });
        fetchUsers();
    };

    const handleOpenDelete = (user: User) => {
        setUserToDelete(user);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!userToDelete?.id) return;
        try {
            setDeleting(true);
            await api.del(`/api/users/${userToDelete.id}`);
            setSnackbar({ open: true, message: `"${userToDelete.username}" deleted successfully.`, severity: 'success' });
            setDeleteDialogOpen(false);
            setUserToDelete(null);
            fetchUsers();
        } catch (err: any) {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        } finally {
            setDeleting(false);
        }
    };

    return (
        <Container maxWidth="xl" sx={{ mt: 2, px: isMobile ? 1 : undefined }}>
            {/* ── Page header ── */}
            <Box sx={{ mb: 3, display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'flex-start', gap: 2 }}>
                <Box>
                    <Typography variant={isMobile ? 'h6' : 'h5'} color="text.primary" gutterBottom sx={{ fontWeight: 600 }}>
                        System User Management
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Manage corporate infrastructure identities, department designations, and operational access roles.
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<PersonAddIcon />}
                    onClick={handleOpenCreate}
                    sx={{ whiteSpace: 'nowrap', alignSelf: isMobile ? 'stretch' : 'flex-start' }}
                >
                    Add User
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* ── Toolbar: search + count ── */}
            <Paper elevation={2} sx={{ p: 2, mb: 3, display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 2, alignItems: isMobile ? 'stretch' : 'center' }}>
                <TextField
                    placeholder="Search by username, email, department, or role…"
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
                        icon={<GroupIcon />}
                        label={`${filteredUsers.length} user${filteredUsers.length !== 1 ? 's' : ''}${searchQuery ? ' found' : ''}`}
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
                    ) : paginatedUsers.length === 0 ? (
                        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
                            <GroupIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                            <Typography variant="body2" color="text.secondary">
                                {searchQuery
                                    ? `No users match "${searchQuery}".`
                                    : 'No active security entities mapped to the local database.'}
                            </Typography>
                        </Paper>
                    ) : (
                        <Stack spacing={0}>
                            {paginatedUsers.map((user) => (
                                <MobileUserCard
                                    key={user.id}
                                    user={user}
                                    onEdit={handleOpenEdit}
                                    onDelete={handleOpenDelete}
                                />
                            ))}
                        </Stack>
                    )}
                </Box>
            ) : (
                <TableContainer component={Paper} elevation={2}>
                    <Table aria-label="users structural database grid" size="small">
                        <TableHead sx={{ bgcolor: 'action.hover' }}>
                            <TableRow>
                                <TableCell><strong>User</strong></TableCell>
                                <TableCell><strong>Email</strong></TableCell>
                                <TableCell><strong>Department</strong></TableCell>
                                <TableCell align="center"><strong>Status</strong></TableCell>
                                <TableCell align="center"><strong>Role</strong></TableCell>
                                <TableCell align="right"><strong>Actions</strong></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableSkeletonRows />
                            ) : paginatedUsers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                                        <GroupIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                                        <Typography variant="body2" color="text.secondary">
                                            {searchQuery
                                                ? `No users match "${searchQuery}".`
                                                : 'No active security entities mapped to the local database.'}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedUsers.map((user) => (
                                    <TableRow key={user.id} hover>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                <Avatar sx={{ bgcolor: getRoleAvatarColor(user.roleId), width: 32, height: 32, fontSize: 14 }}>
                                                    {user.username.charAt(0).toUpperCase()}
                                                </Avatar>
                                                <Typography variant="body2" sx={{ fontWeight: 500 }}>{user.username}</Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>
                                            {user.department || <Typography variant="caption" color="text.disabled">Unassigned</Typography>}
                                        </TableCell>

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
                                            <UserRowActions
                                                user={user}
                                                onEdit={handleOpenEdit}
                                                onDelete={handleOpenDelete}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <>
                            <Divider />
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 1.5 }}>
                                <Pagination
                                    count={totalPages}
                                    page={page}
                                    onChange={(_, val) => setPage(val)}
                                    color="primary"
                                    size={isMobile ? 'small' : 'medium'}
                                    siblingCount={isMobile ? 0 : 1}
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
            <UserFormDialog
                open={formOpen}
                onClose={() => setFormOpen(false)}
                editingUser={editingUser}
                onSaved={handleFormSaved}
            />

            <DeleteConfirmDialog
                open={deleteDialogOpen}
                user={userToDelete}
                onClose={() => { setDeleteDialogOpen(false); setUserToDelete(null); }}
                onConfirm={handleConfirmDelete}
                deleting={deleting}
            />

            {/* ── Success / Error toast ── */}
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