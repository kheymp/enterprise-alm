import { useEffect, useState } from 'react';
import {
    Box, Grid, Card, CardContent, Typography, CircularProgress, Alert,
    Skeleton, Chip, Divider, Avatar, LinearProgress, Button, Paper,
    Table, TableBody, TableCell, TableHead, TableRow, TableContainer,
    useMediaQuery, useTheme, Container, Stack, Tooltip
} from '@mui/material';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import LaptopMacIcon from '@mui/icons-material/LaptopMac';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import EventSeatIcon from '@mui/icons-material/EventSeat';
import WarningIcon from '@mui/icons-material/Warning';
import AddIcon from '@mui/icons-material/Add';
import HistoryIcon from '@mui/icons-material/History';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

/* ── Types ── */
interface DashboardSummary {
    totalAssets: number;
    totalAssetValue: number | null;
    totalLicenses: number;
    totalLicenseCost: number | null;
    assignedAssets: number;
    unassignedAssets: number;
    totalSeatsOwned: number;
    totalSeatsUsed: number;
    expiringLicensesCount: number;
    expiringLicenses: any[];
}

interface AuditLogEntry {
    id: number;
    entityName: string;
    entityId: string;
    action: 'Created' | 'Updated' | 'Deleted';
    performedBy: string | null;
    timestamp: string;
}

/* ── Helpers ── */
function formatCurrency(value: number): string {
    return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
}

function getActionColor(action: string): 'success' | 'warning' | 'error' | 'default' {
    if (action === 'Created') return 'success';
    if (action === 'Updated') return 'warning';
    if (action === 'Deleted') return 'error';
    return 'default';
}

function getTimeAgo(timestamp: string): string {
    const diff = Date.now() - new Date(timestamp).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

function getDaysUntilRenewal(dateString: string): number {
    return Math.ceil((new Date(dateString).getTime() - Date.now()) / (1000 * 3600 * 24));
}

/* ── Skeleton loader for the dashboard ── */
function DashboardSkeleton() {
    return (
        <Box>
            {/* KPI row */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                    <Grid size={{ xs: 12, sm: 6, md: 2.4 }} key={i}>
                        <Card>
                            <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
                                <Skeleton variant="rounded" width={48} height={48} sx={{ borderRadius: 3, mr: 2 }} />
                                <Box sx={{ flex: 1 }}>
                                    <Skeleton variant="text" width="60%" />
                                    <Skeleton variant="text" width="80%" height={36} />
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Charts row */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Skeleton variant="rounded" height={320} sx={{ borderRadius: 3 }} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Skeleton variant="rounded" height={320} sx={{ borderRadius: 3 }} />
                </Grid>
            </Grid>

            {/* Bottom row */}
            <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Skeleton variant="rounded" height={280} sx={{ borderRadius: 3 }} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Skeleton variant="rounded" height={280} sx={{ borderRadius: 3 }} />
                </Grid>
            </Grid>
        </Box>
    );
}

/* ── KPI Card component ── */
function KpiCard({ icon, iconBg, iconShadow, label, value, subtitle }: {
    icon: React.ReactNode;
    iconBg: string;
    iconShadow: string;
    label: string;
    value: string | number;
    subtitle?: React.ReactNode;
}) {
    return (
        <Card sx={{ height: '100%' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
                <Box sx={{
                    p: 1.5, borderRadius: 3,
                    background: iconBg,
                    mr: 2, display: 'flex',
                    boxShadow: iconShadow
                }}>
                    {icon}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                    <Typography color="textSecondary" variant="caption" sx={{ textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.5 }}>
                        {label}
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2 }} noWrap>
                        {value}
                    </Typography>
                    {subtitle}
                </Box>
            </CardContent>
        </Card>
    );
}



/* ════════════════════════════════════════════════════════════════
   Main Dashboard Component
   ════════════════════════════════════════════════════════════════ */
export default function Dashboard() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const navigate = useNavigate();

    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [recentActivity, setRecentActivity] = useState<AuditLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Get user info from JWT
    const token = localStorage.getItem('token');
    let userName = 'User';
    let userRole = 'Viewer';
    if (token) {
        try {
            const decoded: any = jwtDecode(token);
            //userName = decoded.sub || decoded.unique_name || decoded.name || 'User';
            userName = decoded.email;
            userRole = decoded.role || 'Viewer';
        } catch { /* ignore */ }
    }

    useEffect(() => {
        const fetchData = async () => {
            const token = localStorage.getItem('token');
            try {
                setLoading(true);

                // Fetch dashboard summary and recent audit logs in parallel
                const [summaryRes, auditRes] = await Promise.all([
                    fetch('http://localhost:5132/api/dashboard/summary', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    }),
                    fetch('http://localhost:5132/api/auditlogs?page=1&pageSize=8', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    }).catch(() => null) // Non-critical
                ]);

                if (!summaryRes.ok) throw new Error('Failed to fetch dashboard data.');
                const summaryData = await summaryRes.json();
                setSummary(summaryData);

                if (auditRes && auditRes.ok) {
                    const auditData = await auditRes.json();
                    setRecentActivity(auditData);
                }

                setError(null);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return (
            <Container maxWidth="xl" sx={{ mt: 2, px: isMobile ? 1 : undefined }}>
                <Skeleton variant="text" width={300} height={40} sx={{ mb: 1 }} />
                <Skeleton variant="text" width={200} height={20} sx={{ mb: 4 }} />
                <DashboardSkeleton />
            </Container>
        );
    }

    if (error) return <Container maxWidth="xl" sx={{ mt: 4 }}><Alert severity="error">{error}</Alert></Container>;
    if (!summary) return null;

    const assetData = [
        { name: 'Assigned', value: summary.assignedAssets },
        { name: 'Unassigned', value: summary.unassignedAssets }
    ];

    const licenseData = [
        { name: 'Used', value: summary.totalSeatsUsed },
        { name: 'Available', value: Math.max(0, summary.totalSeatsOwned - summary.totalSeatsUsed) }
    ];

    const COLORS = ['#4f46e5', '#e2e8f0'];
    const seatUtilization = summary.totalSeatsOwned > 0
        ? Math.round((summary.totalSeatsUsed / summary.totalSeatsOwned) * 100)
        : 0;

    return (
        <Container maxWidth="xl" sx={{ mt: 2, px: isMobile ? 1 : undefined }}>
            {/* ── Header with welcome + quick actions ── */}
            <Box sx={{ mb: 4, display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', gap: 2 }}>
                <Box>
                    <Typography variant={isMobile ? 'h5' : 'h4'} sx={{ fontWeight: 700, color: '#1e293b' }}>
                        Welcome back, {userName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {userRole} · Enterprise Asset & License Overview
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={() => navigate('/assets')}>
                        Add Asset
                    </Button>
                    <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={() => navigate('/licenses')}>
                        Add License
                    </Button>
                </Box>
            </Box>

            {/* ── KPI Cards Row ── */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                    <KpiCard
                        icon={<LaptopMacIcon sx={{ color: '#fff' }} />}
                        iconBg="linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)"
                        iconShadow="0 4px 14px 0 rgb(79 70 229 / 0.39)"
                        label="Total Assets"
                        value={summary.totalAssets}
                        subtitle={
                            <Typography variant="caption" color="text.secondary">
                                {summary.assignedAssets} assigned
                            </Typography>
                        }
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                    <KpiCard
                        icon={<AttachMoneyIcon sx={{ color: '#fff' }} />}
                        iconBg="linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)"
                        iconShadow="0 4px 14px 0 rgb(2 132 199 / 0.39)"
                        label="Asset Value"
                        value={summary.totalAssetValue !== null ? formatCurrency(summary.totalAssetValue) : 'Hidden'}
                        subtitle={
                            summary.totalAssetValue !== null ? (
                                <Typography variant="caption" color="text.secondary">
                                    Total purchase value
                                </Typography>
                            ) : undefined
                        }
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                    <KpiCard
                        icon={<VpnKeyIcon sx={{ color: '#fff' }} />}
                        iconBg="linear-gradient(135deg, #c084fc 0%, #9333ea 100%)"
                        iconShadow="0 4px 14px 0 rgb(147 51 234 / 0.39)"
                        label="Licenses"
                        value={summary.totalLicenses}
                        subtitle={
                            summary.expiringLicensesCount > 0 ? (
                                <Chip
                                    label={`${summary.expiringLicensesCount} expiring`}
                                    color="warning"
                                    size="small"
                                    variant="outlined"
                                    icon={<WarningIcon />}
                                    sx={{ height: 20, fontSize: '0.65rem' }}
                                />
                            ) : (
                                <Typography variant="caption" color="text.secondary">All current</Typography>
                            )
                        }
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                    <KpiCard
                        icon={<AccountBalanceWalletIcon sx={{ color: '#fff' }} />}
                        iconBg="linear-gradient(135deg, #34d399 0%, #059669 100%)"
                        iconShadow="0 4px 14px 0 rgb(5 150 105 / 0.39)"
                        label="License Cost"
                        value={summary.totalLicenseCost !== null ? formatCurrency(summary.totalLicenseCost) : 'Hidden'}
                        subtitle={
                            summary.totalLicenseCost !== null ? (
                                <Typography variant="caption" color="text.secondary">
                                    Total annual cost
                                </Typography>
                            ) : undefined
                        }
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                    <KpiCard
                        icon={<EventSeatIcon sx={{ color: '#fff' }} />}
                        iconBg="linear-gradient(135deg, #fb923c 0%, #ea580c 100%)"
                        iconShadow="0 4px 14px 0 rgb(234 88 12 / 0.39)"
                        label="Seat Usage"
                        value={`${seatUtilization}%`}
                        subtitle={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                <LinearProgress
                                    variant="determinate"
                                    value={seatUtilization}
                                    color={seatUtilization >= 90 ? 'error' : seatUtilization >= 70 ? 'warning' : 'success'}
                                    sx={{ height: 5, borderRadius: 3, width: 60 }}
                                />
                                <Typography variant="caption" color="text.secondary">
                                    {summary.totalSeatsUsed}/{summary.totalSeatsOwned}
                                </Typography>
                            </Box>
                        }
                    />
                </Grid>
            </Grid>

            {/* ── Charts Row ── */}
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#334155' }}>
                Allocation Overview
            </Typography>
            <Grid container spacing={3} sx={{ mb: 4 }}>
                {/* Asset Allocation */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Card sx={{ p: 3, height: 340, borderRadius: 3, display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, textAlign: 'center' }}>
                            Asset Allocation
                        </Typography>
                        <Box sx={{ flexGrow: 1, position: 'relative' }}>
                            {/* Center label as HTML overlay */}
                            <Box sx={{
                                position: 'absolute', top: 0, left: 0, right: 0, bottom: 36,
                                display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center',
                                pointerEvents: 'none', zIndex: 1
                            }}>
                                <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b', lineHeight: 1.2 }}>
                                    {summary.assignedAssets}/{summary.totalAssets}
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#64748b' }}>
                                    assigned
                                </Typography>
                            </Box>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={assetData}
                                        innerRadius={65}
                                        outerRadius={95}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {assetData.map((_, index) => (
                                            <Cell key={`asset-${index}`} fill={COLORS[index]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        </Box>
                    </Card>
                </Grid>

                {/* License Seat Allocation */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Card sx={{ p: 3, height: 340, borderRadius: 3, display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, textAlign: 'center' }}>
                            License Seat Allocation
                        </Typography>
                        <Box sx={{ flexGrow: 1, position: 'relative' }}>
                            {/* Center label as HTML overlay */}
                            <Box sx={{
                                position: 'absolute', top: 0, left: 0, right: 0, bottom: 36,
                                display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center',
                                pointerEvents: 'none', zIndex: 1
                            }}>
                                <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b', lineHeight: 1.2 }}>
                                    {summary.totalSeatsUsed}/{summary.totalSeatsOwned}
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#64748b' }}>
                                    seats used
                                </Typography>
                            </Box>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={licenseData}
                                        innerRadius={65}
                                        outerRadius={95}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {licenseData.map((_, index) => (
                                            <Cell key={`license-${index}`} fill={COLORS[index]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        </Box>
                    </Card>
                </Grid>
            </Grid>

            {/* ── Bottom Row: Expiring Licenses + Recent Activity ── */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                {/* Expiring Licenses */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Card sx={{ borderRadius: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <Box sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <WarningIcon color="warning" sx={{ fontSize: 20 }} />
                                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                    Expiring Licenses
                                </Typography>
                            </Box>
                            {summary.expiringLicensesCount > 0 && (
                                <Chip label={summary.expiringLicensesCount} color="warning" size="small" />
                            )}
                        </Box>
                        <Divider />
                        <Box sx={{ flex: 1, overflow: 'auto' }}>
                            {summary.expiringLicenses && summary.expiringLicenses.length > 0 ? (
                                <TableContainer>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell><strong>License</strong></TableCell>
                                                <TableCell><strong>Publisher</strong></TableCell>
                                                <TableCell align="right"><strong>Days Left</strong></TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {summary.expiringLicenses.map((license: any, idx: number) => {
                                                const daysLeft = getDaysUntilRenewal(license.renewalDate);
                                                return (
                                                    <TableRow key={idx} hover>
                                                        <TableCell sx={{ fontWeight: 500 }}>{license.name}</TableCell>
                                                        <TableCell>{license.publisher}</TableCell>
                                                        <TableCell align="right">
                                                            <Chip
                                                                label={daysLeft <= 0 ? 'Expired' : `${daysLeft}d`}
                                                                color={daysLeft <= 7 ? 'error' : 'warning'}
                                                                size="small"
                                                                variant="outlined"
                                                            />
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            ) : (
                                <Box sx={{ p: 4, textAlign: 'center' }}>
                                    <Typography variant="body2" color="text.secondary">
                                        ✅ No licenses expiring within the next 30 days.
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                        <Divider />
                        <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'flex-end' }}>
                            <Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => navigate('/licenses')}>
                                View All Licenses
                            </Button>
                        </Box>
                    </Card>
                </Grid>

                {/* Recent Activity */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Card sx={{ borderRadius: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <Box sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <HistoryIcon color="primary" sx={{ fontSize: 20 }} />
                                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                    Recent Activity
                                </Typography>
                            </Box>
                            {recentActivity.length > 0 && (
                                <Chip label="Live" color="success" size="small" variant="outlined" />
                            )}
                        </Box>
                        <Divider />
                        <Box sx={{ flex: 1, overflow: 'auto' }}>
                            {recentActivity.length > 0 ? (
                                <Stack divider={<Divider />}>
                                    {recentActivity.slice(0, 6).map((entry) => (
                                        <Box key={entry.id} sx={{ px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, '&:hover': { bgcolor: 'action.hover' } }}>
                                            <Avatar
                                                sx={{
                                                    width: 32, height: 32, fontSize: 12,
                                                    bgcolor: entry.action === 'Created' ? '#dcfce7' : entry.action === 'Deleted' ? '#fef2f2' : '#fef9c3',
                                                    color: entry.action === 'Created' ? '#16a34a' : entry.action === 'Deleted' ? '#dc2626' : '#ca8a04'
                                                }}
                                            >
                                                {entry.action.charAt(0)}
                                            </Avatar>
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography variant="body2" noWrap>
                                                    <Chip label={entry.action} color={getActionColor(entry.action)} size="small" variant="outlined" sx={{ mr: 1, height: 20, fontSize: '0.65rem' }} />
                                                    <Typography component="span" variant="body2" sx={{ fontWeight: 500 }}>
                                                        {entry.entityName}
                                                    </Typography>
                                                    <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
                                                        #{entry.entityId}
                                                    </Typography>
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {entry.performedBy ?? 'System'} · {getTimeAgo(entry.timestamp)}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    ))}
                                </Stack>
                            ) : (
                                <Box sx={{ p: 4, textAlign: 'center' }}>
                                    <Typography variant="body2" color="text.secondary">
                                        No recent activity to display.
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                        <Divider />
                        <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'flex-end' }}>
                            <Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => navigate('/audit-log')}>
                                View Full Audit Trail
                            </Button>
                        </Box>
                    </Card>
                </Grid>
            </Grid>
        </Container>
    );
}
