import { useEffect, useState } from 'react';
import { Box, Grid, Card, CardContent, Typography, CircularProgress, Alert } from '@mui/material';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import LaptopMacIcon from '@mui/icons-material/LaptopMac';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';

interface DashboardSummary {
    totalAssets: number;
    totalAssetValue: number | null; // Nullable for Viewers
    totalLicenses: number;
    totalLicenseCost: number | null; // Nullable for Viewers
    assignedAssets: number;
    unassignedAssets: number;
    totalSeatsOwned: number;
    totalSeatsUsed: number;
    expiringLicensesCount: number;
    expiringLicenses: any[];
}

export default function Dashboard() {
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchSummary = async () => {
            const token = localStorage.getItem('token');
            try {
                const response = await fetch("http://localhost:5132/api/dashboard/summary", {
                    headers: { "Authorization": `Bearer ${token}` }
                });

                if (!response.ok) {
                    throw new Error("Failed to fetch dashboard data.");
                }

                const data = await response.json();
                setSummary(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchSummary();
    }, []);

    if (loading) return <CircularProgress />;
    if (error) return <Alert severity="error">{error}</Alert>;
    if (!summary) return null;

    const assetData = [
        { name: 'Assigned', value: summary.assignedAssets },
        { name: 'Unassigned', value: summary.unassignedAssets }
    ];

    const licenseData = [
        { name: 'Assigned', value: summary.totalSeatsUsed },
        { name: 'Unassigned', value: summary.totalSeatsOwned - summary.totalSeatsUsed }
    ];

    const COLORS = ['#4f46e5', '#cbd5e1']; // Indigo for Assigned, Light Slate for Unassigned

    return (
        <Box>
            <Typography variant="h4" gutterBottom sx={{ mb: 4, fontWeight: 700, color: '#1e293b' }}>
                Analytics Dashboard
            </Typography>
            
            {/* 5. TOP ROW: We use a Material UI Grid to neatly display KPI Cards side-by-side */}
            <Grid container spacing={4} sx={{ mb: 5 }}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card>
                        <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
                            <Box sx={{ p: 1.5, borderRadius: 3, background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', mr: 2, display: 'flex', boxShadow: '0 4px 14px 0 rgb(79 70 229 / 0.39)' }}>
                                <LaptopMacIcon sx={{ color: '#fff' }} />
                            </Box>
                            <Box>
                                <Typography color="textSecondary" variant="subtitle2">Total Assets</Typography>
                                <Typography variant="h4" sx={{ fontWeight: 700 }}>{summary.totalAssets}</Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card>
                        <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
                            <Box sx={{ p: 1.5, borderRadius: 3, background: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)', mr: 2, display: 'flex', boxShadow: '0 4px 14px 0 rgb(2 132 199 / 0.39)' }}>
                                <AttachMoneyIcon sx={{ color: '#fff' }} />
                            </Box>
                            <Box>
                                <Typography color="textSecondary" variant="subtitle2" gutterBottom>Asset Value</Typography>
                                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                                    {summary.totalAssetValue !== null ? `$${summary.totalAssetValue}` : 'Hidden'}
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card>
                        <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
                            <Box sx={{ p: 1.5, borderRadius: 3, background: 'linear-gradient(135deg, #c084fc 0%, #9333ea 100%)', mr: 2, display: 'flex', boxShadow: '0 4px 14px 0 rgb(147 51 234 / 0.39)' }}>
                                <VpnKeyIcon sx={{ color: '#fff' }} />
                            </Box>
                            <Box>
                                <Typography color="textSecondary" variant="subtitle2" gutterBottom>Total Licenses</Typography>
                                <Typography variant="h4" sx={{ fontWeight: 700 }}>{summary.totalLicenses}</Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card>
                        <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
                            <Box sx={{ p: 1.5, borderRadius: 3, background: 'linear-gradient(135deg, #34d399 0%, #059669 100%)', mr: 2, display: 'flex', boxShadow: '0 4px 14px 0 rgb(5 150 105 / 0.39)' }}>
                                <AccountBalanceWalletIcon sx={{ color: '#fff' }} />
                            </Box>
                            <Box>
                                <Typography color="textSecondary" variant="subtitle2" gutterBottom>License Cost</Typography>
                                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                                    {summary.totalLicenseCost !== null ? `$${summary.totalLicenseCost}` : 'Hidden'}
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* 6. MIDDLE ROW: Recharts Donut Graphs visually displaying our data */}
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#334155' }}>Allocation Overview</Typography>
            <Grid container spacing={4} sx={{ mb: 5 }}>
                {/* Asset Allocation */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Card sx={{ p: 3, height: 350, borderRadius: 4, display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, textAlign: 'center' }}>Asset Allocation</Typography>
                        <Box sx={{ flexGrow: 1 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={assetData}
                                        innerRadius={70}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {assetData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                    <Legend verticalAlign="bottom" height={36}/>
                                </PieChart>
                            </ResponsiveContainer>
                        </Box>
                    </Card>
                </Grid>
                
                {/* License Allocation */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Card sx={{ p: 3, height: 350, borderRadius: 4, display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, textAlign: 'center' }}>License Allocation</Typography>
                        <Box sx={{ flexGrow: 1 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={licenseData}
                                        innerRadius={70}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {licenseData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                    <Legend verticalAlign="bottom" height={36}/>
                                </PieChart>
                            </ResponsiveContainer>
                        </Box>
                    </Card>
                </Grid>
            </Grid>

            {/* 7. BOTTOM ROW: Proactive Alert box for expiring licenses */}
            {summary.expiringLicensesCount > 0 && (
                <Alert severity="warning" sx={{ borderRadius: 3, '& .MuiAlert-message': { fontWeight: 500 } }}>
                    You have {summary.expiringLicensesCount} software license(s) expiring within the next 30 days.
                </Alert>
            )}

        </Box>
    )
}
