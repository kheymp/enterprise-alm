import { useState, useEffect } from 'react';
import {
    Container, Typography, Box, TableContainer, Table,
    TableHead, TableRow, TableCell, TableBody, Paper,
    CircularProgress, Alert, Chip, Divider, TextField,
    MenuItem, Select, FormControl, InputLabel, Pagination,
    Tooltip, IconButton, Collapse
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

const API_BASE = 'http://localhost:5132/api/auditlogs';

interface AuditLogEntry {
    id: number;
    entityName: string;
    entityId: string;
    action: 'Created' | 'Updated' | 'Deleted';
    oldValues: string | null;
    newValues: string | null;
    changedColumns: string | null;
    performedBy: string | null;
    timestamp: string;
}

function parseJson(value: string | null): Record<string, any> | null {
    if (!value) return null;
    try { return JSON.parse(value); } catch { return null; }
}

function getActionColor(action: string): 'success' | 'warning' | 'error' | 'default' {
    if (action === 'Created') return 'success';
    if (action === 'Updated') return 'warning';
    if (action === 'Deleted') return 'error';
    return 'default';
}

function DetailPanel({ log }: { log: AuditLogEntry }) {
    const [open, setOpen] = useState(false);
    const oldVals = parseJson(log.oldValues);
    const newVals = parseJson(log.newValues);
    const changedCols: string[] | null = log.changedColumns ? JSON.parse(log.changedColumns) : null;

    const hasDetail = oldVals || newVals;

    return (
        <>
            <TableRow hover>
                <TableCell>
                    {hasDetail && (
                        <Tooltip title={open ? 'Hide details' : 'Show old/new values'}>
                            <IconButton size="small" onClick={() => setOpen(!open)}>
                                {open ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                            </IconButton>
                        </Tooltip>
                    )}
                </TableCell>
                <TableCell>
                    <Chip
                        label={log.action}
                        color={getActionColor(log.action)}
                        size="small"
                        variant="outlined"
                    />
                </TableCell>
                <TableCell sx={{ fontWeight: 500 }}>{log.entityName}</TableCell>
                <TableCell>{log.entityId}</TableCell>
                <TableCell>
                    {changedCols ? (
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {changedCols.map(col => (
                                <Chip key={col} label={col} size="small" variant="outlined" />
                            ))}
                        </Box>
                    ) : '—'}
                </TableCell>
                <TableCell>{log.performedBy ?? 'System'}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {new Date(log.timestamp).toLocaleString()}
                </TableCell>
            </TableRow>

            {hasDetail && (
                <TableRow>
                    <TableCell colSpan={7} sx={{ py: 0, bgcolor: 'action.hover' }}>
                        <Collapse in={open} timeout="auto" unmountOnExit>
                            <Box sx={{ p: 2, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                {oldVals && (
                                    <Box>
                                        <Typography variant="caption" color="error" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                                            Before
                                        </Typography>
                                        {Object.entries(oldVals).map(([k, v]) => (
                                            <Typography key={k} variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                                <strong>{k}:</strong> {String(v)}
                                            </Typography>
                                        ))}
                                    </Box>
                                )}
                                {newVals && (
                                    <Box>
                                        <Typography variant="caption" color="success.main" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                                            After
                                        </Typography>
                                        {Object.entries(newVals).map(([k, v]) => (
                                            <Typography key={k} variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                                <strong>{k}:</strong> {String(v)}
                                            </Typography>
                                        ))}
                                    </Box>
                                )}
                            </Box>
                        </Collapse>
                    </TableCell>
                </TableRow>
            )}
        </>
    );
}

export default function AuditLog() {
    const [logs, setLogs] = useState<AuditLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [entityName, setEntityName] = useState('');
    const [entityId, setEntityId] = useState('');

    const [page, setPage] = useState(1);
    const pageSize = 20;
    const [hasMore, setHasMore] = useState(true);

    const ENTITY_OPTIONS = ['', 'Asset', 'SoftwareLicense', 'LicenseAllocation', 'User', 'MaintenanceRecord'];

    const fetchLogs = async (currentPage = 1, nameFilter = entityName, idFilter = entityId) => {
        const token = localStorage.getItem('token');
        try {
            setLoading(true);

            const params = new URLSearchParams();
            if (nameFilter) params.set('entityName', nameFilter);
            if (idFilter) params.set('entityId', idFilter);
            params.set('page', String(currentPage));
            params.set('pageSize', String(pageSize));

            const res = await fetch(`${API_BASE}?${params}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!res.ok) throw new Error('Failed to fetch audit logs.');

            const data: AuditLogEntry[] = await res.json();
            setLogs(data);
            setHasMore(data.length === pageSize);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'An error occurred.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs(page);
    }, [page]);

    const handleFilterApply = () => {
        setPage(1);
        fetchLogs(1, entityName, entityId);
    };

    const handleFilterClear = () => {
        setEntityName('');
        setEntityId('');
        setPage(1);
        fetchLogs(1, '', '');
    };

    return (
        <Container maxWidth="xl" sx={{ mt: 2 }}>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h5" color="text.primary" gutterBottom sx={{ fontWeight: 600 }}>
                    Audit Trail
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    A complete, tamper-evident record of all system changes. Restricted to Admins.
                </Typography>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Filter Bar */}
            <Paper elevation={2} sx={{ p: 2, mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel>Entity Type</InputLabel>
                    <Select
                        value={entityName}
                        label="Entity Type"
                        onChange={(e) => setEntityName(e.target.value)}
                    >
                        {ENTITY_OPTIONS.map(opt => (
                            <MenuItem key={opt} value={opt}>{opt || 'All'}</MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <TextField
                    label="Entity ID"
                    size="small"
                    value={entityId}
                    onChange={(e) => setEntityId(e.target.value)}
                    placeholder="e.g. 5"
                    sx={{ width: 130 }}
                />

                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip label="Apply" color="primary" onClick={handleFilterApply} clickable />
                    <Chip label="Clear" variant="outlined" onClick={handleFilterClear} clickable />
                </Box>

                <Box sx={{ flexGrow: 1 }} />
                {loading && <CircularProgress size={20} />}
            </Paper>

            {/* Audit Log Table */}
            <TableContainer component={Paper} elevation={2}>
                <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 500 }}>Change History</Typography>
                </Box>
                <Divider />

                <Table size="small" aria-label="audit log table">
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                        <TableRow>
                            <TableCell width={48} />
                            <TableCell><strong>Action</strong></TableCell>
                            <TableCell><strong>Entity Type</strong></TableCell>
                            <TableCell><strong>Record ID</strong></TableCell>
                            <TableCell><strong>Changed Fields</strong></TableCell>
                            <TableCell><strong>Performed By</strong></TableCell>
                            <TableCell><strong>Timestamp</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {logs.length === 0 && !loading ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        No audit log entries found.
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            logs.map(log => <DetailPanel key={log.id} log={log} />)
                        )}
                    </TableBody>
                </Table>

                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                    <Pagination
                        count={hasMore ? page + 1 : page}
                        page={page}
                        onChange={(_, val) => setPage(val)}
                        color="primary"
                        siblingCount={1}
                    />
                </Box>
            </TableContainer>
        </Container>
    );
}
