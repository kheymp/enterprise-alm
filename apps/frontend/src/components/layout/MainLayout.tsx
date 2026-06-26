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
import { useNavigate } from "react-router-dom";


const drawerWidth = 240;

interface MainLayoutProps {
    children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
    const token = localStorage.getItem("token");
    const navigate = useNavigate();
    let roleId = null;

    if (token) {
        const decoded: any = jwtDecode(token);
        roleId = decoded.RoleId;
    }



    const theme = useTheme();
    // Automatically detects if the screen size is smaller than the 'md' (960px) breakpoint
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [mobileOpen, setMobileOpen] = useState(false);

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        navigate('/login');
    };

    // Extracted navigation list items to prevent duplication between drawers
    const drawerContent = (
        <Box sx={{ overflow: 'auto' }}>
            <Toolbar />
            <List>
                <ListItem disablePadding>
                    <ListItemButton disabled>
                        <ListItemIcon><DashboardIcon /></ListItemIcon>
                        <ListItemText primary="Dashboard (M2)" />
                    </ListItemButton>
                </ListItem>

                {["1", "2", "3"].includes(roleId) && (
                    <ListItem disablePadding>
                        <ListItemButton onClick={() => navigate('/assets')}>
                            <ListItemIcon><LaptopMacIcon /></ListItemIcon>
                            <ListItemText primary="Assets (M2)" />
                        </ListItemButton>
                    </ListItem>
                )}

                {["1", "2", "3"].includes(roleId) && (
                    <ListItem disablePadding>
                        <ListItemButton onClick={() => navigate('/licenses')}>
                            <ListItemIcon><LaptopMacIcon /></ListItemIcon>
                            <ListItemText primary="Software Licenses" />
                        </ListItemButton>
                    </ListItem>
                )}

                <ListItem disablePadding>
                    <ListItemButton disabled>
                        <ListItemIcon><VpnKeyIcon /></ListItemIcon>
                        <ListItemText primary="Access Control (M2)" />
                    </ListItemButton>
                </ListItem>
            </List>
            <Divider />
            <List>

                {roleId === "1" && (
                    <ListItem disablePadding>
                        <ListItemButton onClick={() => navigate('/users')}>
                            <ListItemIcon><PeopleIcon /></ListItemIcon>
                            <ListItemText primary="Users Management" />
                        </ListItemButton>
                    </ListItem>)}

            </List>
        </Box>
    )

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
                    <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
                        Enterprise Asset and License Manager (ALM)
                    </Typography>
                    <Button color="inherit" onClick={handleLogout} startIcon={<LogoutIcon />}>
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
                    p: 3,
                    bgcolor: 'background.default',
                    minHeight: '100vh',
                    width: { md: `calc(100% - ${drawerWidth}px)` }
                }}
            >
                <Toolbar /> {/* Generates padding space below the fixed App Bar */}
                {children}
            </Box>
        </Box>



    )
}
