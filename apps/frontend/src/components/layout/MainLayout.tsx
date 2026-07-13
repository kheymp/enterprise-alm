import React, { useState } from 'react';
import {
    Box, AppBar, Toolbar, Typography, Drawer, List,
    ListItem, ListItemButton, ListItemIcon, ListItemText,
    Divider, IconButton, useTheme, useMediaQuery, Button
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import PeopleIcon from '@mui/icons-material/People';
import LogoutIcon from '@mui/icons-material/Logout';
import LaptopMacIcon from '@mui/icons-material/LaptopMac';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import DashboardIcon from '@mui/icons-material/Dashboard';
import { jwtDecode } from "jwt-decode";
import { useNavigate, useLocation } from "react-router-dom";


const drawerWidth = 260;

interface MainLayoutProps {
    children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
    const token = localStorage.getItem("token");
    const navigate = useNavigate();
    const location = useLocation();

    let userRole = null;
    if (token) {
        const decoded: any = jwtDecode(token);
        userRole = decoded.role;   // "Admin", "Manager", "Viewer", or "Employee"
    }

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [mobileOpen, setMobileOpen] = useState(false);

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        navigate('/login');
    };

    const currentPath = location.pathname;

    const drawerContent = (
        <Box sx={{ overflow: 'auto', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 64 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.main', letterSpacing: '-0.02em' }}>
                    Enterprise ALM
                </Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <List sx={{ px: 1 }}>
                <ListItem disablePadding>
                    <ListItemButton selected={currentPath === '/'} onClick={() => navigate('/')}>
                        <ListItemIcon><DashboardIcon /></ListItemIcon>
                        <ListItemText primary="Dashboard" />
                    </ListItemButton>
                </ListItem>

                {["Admin", "Manager", "Viewer"].includes(userRole) && (
                    <ListItem disablePadding>
                        <ListItemButton selected={currentPath === '/assets'} onClick={() => navigate('/assets')}>
                            <ListItemIcon><LaptopMacIcon /></ListItemIcon>
                            <ListItemText primary="Assets" />
                        </ListItemButton>
                    </ListItem>
                )}

                {["Admin", "Manager", "Viewer"].includes(userRole) && (
                    <ListItem disablePadding>
                        <ListItemButton selected={currentPath === '/licenses'} onClick={() => navigate('/licenses')}>
                            <ListItemIcon><VpnKeyIcon /></ListItemIcon>
                            <ListItemText primary="Software Licenses" />
                        </ListItemButton>
                    </ListItem>
                )}
            </List>

            <Box sx={{ flexGrow: 1 }} />

            <List sx={{ px: 1, mb: 2 }}>
                {userRole === "Admin" && (
                    <ListItem disablePadding>
                        <ListItemButton selected={currentPath === '/users'} onClick={() => navigate('/users')}>
                            <ListItemIcon><PeopleIcon /></ListItemIcon>
                            <ListItemText primary="User Management" />
                        </ListItemButton>
                    </ListItem>
                )}
            </List>
        </Box>
    );

    return (
        <Box sx={{ display: 'flex' }}>
            <AppBar position="fixed" sx={{ zIndex: theme.zIndex.drawer + 1 }}>
                <Toolbar>
                    <IconButton
                        color="inherit"
                        aria-label="open navigation menu drawre"
                        edge="start"
                        onClick={handleDrawerToggle}
                        sx={{ mr: 2, display: { md: 'none' } }}
                    >
                        <MenuIcon />
                    </IconButton>
                    <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
                        Enterprise Asset and License Manager
                    </Typography>
                    <Button
                        color="inherit"
                        onClick={handleLogout}
                        startIcon={<LogoutIcon />}
                        sx={{ borderRadius: '8px', px: 2, py: 1 }}
                    >
                        Logout
                    </Button>
                </Toolbar>
            </AppBar>

            {/* Responsive Structural Sidebar Shell */}
            <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
                {/* Mobile View: Slide-out temporary overlay drawer */}
                {isMobile ? (
                    <Drawer
                        variant="temporary"
                        open={mobileOpen}
                        onClose={handleDrawerToggle}
                    >
                        {drawerContent}
                    </Drawer>
                ) : (
                    /* Desktop View: Static, locked structural permanent sidebar */
                    <Drawer
                        variant="permanent"
                        sx={{
                            display: { xs: 'none', md: 'block' },
                            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
                        }}
                        open
                    >
                        {drawerContent}
                    </Drawer>
                )}
            </Box>

            {/* Main App Content View Container */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: 4,
                    bgcolor: 'background.default',
                    minHeight: '100vh',
                    width: { md: `calc(100% - ${drawerWidth}px)` }
                }}
            >
                {/* Invisible Toolbar spacing to push content below the AppBar */}
                <Toolbar />
                {children}
            </Box>
        </Box>
    );
}
