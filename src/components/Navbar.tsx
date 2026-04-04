
"use client";

import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Badge,
  Avatar,
  CircularProgress,
} from '@mui/material';
import {
  LocalPharmacy,
  Person,
  BusinessCenter,
  Search,
  Security,
  Menu as MenuIcon,
  ShoppingCart,
  LocalOffer,
  ShoppingBag,
  Chat,
  DeliveryDining,
  Article,
  Create,
} from '@mui/icons-material';
import Link from 'next/link';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useCart } from '../contexts/CartContext';
import { useSession } from '../context/SessionProvider';
import axios from 'axios';

export default function Navbar() {
  const { user, isLoading, logout } = useSession();
  const isAdmin = user?.role === 'admin';
  const isBusinessUser = user?.role && ['admin', 'pharmacy', 'vendor', 'stockManager'].includes(user.role);
  const isAgentOrAdmin = user?.role && ['admin', 'agent'].includes(user.role);
  const isPharmacyOrVendor = user?.role && ['pharmacy', 'vendor'].includes(user.role);
  const isPharmacist = user?.role && ['admin', 'pharmacist', 'pharmacists', 'pharmacy', 'vendor'].includes(user.role);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const router = useRouter();

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleMenuClose();
    await logout();
    router.replace('/auth');
  };

  const [mobileOpen, setMobileOpen] = useState(false);
  const { getTotalItems } = useCart();
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (!pathname) return false;
    if (path === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(path);
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };
  
  const drawerAdminLinks = null;

  const drawer = (
    <Box sx={{
      height: '100%',
      background: 'linear-gradient(180deg, #006D5B 0%, #004D40 50%, #00332B 100%)',
      color: 'white'
    }}>
       <Box
          component={Link}
          href="https://psx.ng"
          sx={{
            p: 2,
            display: 'block',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            textAlign: 'center',
            textDecoration: 'none'
          }}
        >
        <img
          src="https://i.ibb.co/bM86kxhT/psx-logo-removebg-preview.png"
          alt="Pharmastackx Logo"
          style={{
            height: '25px',
            width: 'auto',
            filter: 'brightness(0) invert(1)'
          }}
        />
      </Box>

      <List sx={{ px: 0.5, py: 1 }}>
        <ListItem disablePadding sx={{ mb: 0.5 }}>
          <ListItemButton component={Link} href="/find-medicines" onClick={handleDrawerToggle} sx={{ borderRadius: '8px', mx: 0.5, py: 1, bgcolor: isActive('/find-medicines') ? 'rgba(255, 255, 255, 0.2)' : 'transparent', '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)' } }}>
          <ListItemIcon sx={{ color: 'white', minWidth: '32px' }}><LocalPharmacy fontSize="small" /></ListItemIcon>
            <ListItemText primary="View Catalog" primaryTypographyProps={{ fontWeight: 500, fontSize: '0.8rem', color: 'white' }} />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding sx={{ mb: 0.5 }}>
        <ListItemButton component={Link} href="/?view=orderMedicines" onClick={handleDrawerToggle} sx={{ borderRadius: '8px', mx: 0.5, py: 1, '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)' } }}>
  <ListItemIcon sx={{ color: 'white', minWidth: '32px' }}><DeliveryDining fontSize="small" /></ListItemIcon>
  <ListItemText primary="Find Medicines" primaryTypographyProps={{ fontWeight: 500, fontSize: '0.8rem', color: 'white' }} />
</ListItemButton>

</ListItem>


        <ListItem disablePadding sx={{ mb: 0.5 }}>
          <ListItemButton component={Link} href="/pulse" onClick={handleDrawerToggle} sx={{ borderRadius: '8px', mx: 0.5, py: 1, bgcolor: isActive('/pulse') ? 'rgba(255, 255, 255, 0.2)' : 'transparent', '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)' } }}>
            <ListItemIcon sx={{ color: 'white', minWidth: '32px' }}><Article fontSize="small" /></ListItemIcon>
            <ListItemText primary="Pulse" primaryTypographyProps={{ fontWeight: 500, fontSize: '0.8rem', color: 'white' }} />
          </ListItemButton>
        </ListItem>

        {isAdmin && (
            <ListItem disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton component={Link} href="/blog" onClick={handleDrawerToggle} sx={{ borderRadius: '8px', mx: 0.5, py: 1, bgcolor: isActive('/blog') ? 'rgba(255, 255, 255, 0.2)' : 'transparent', '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)' } }}>
                    <ListItemIcon sx={{ color: 'white', minWidth: '32px' }}><Create fontSize="small" /></ListItemIcon>
                    <ListItemText primary="New Post" primaryTypographyProps={{ fontWeight: 500, fontSize: '0.8rem', color: 'white' }} />
                </ListItemButton>
            </ListItem>
        )}

        {/* Admin drawer links removed */}
        <ListItem disablePadding sx={{ mb: 0.5 }}>
          <ListItemButton component={Link} href="/orders" onClick={handleDrawerToggle} sx={{ borderRadius: '8px', mx: 0.5, py: 1, '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)' } }}>
            <ListItemIcon sx={{ color: 'white', minWidth: '32px' }}><ShoppingBag fontSize="small" /></ListItemIcon>
            <ListItemText primary="Orders" primaryTypographyProps={{ fontWeight: 500, fontSize: '0.8rem', color: 'white' }} />
          </ListItemButton>
        </ListItem>
        {isPharmacist && <ListItem disablePadding sx={{ mb: 0.5 }}>
          <ListItemButton component={Link} href="/requests" onClick={handleDrawerToggle} sx={{ borderRadius: '8px', mx: 0.5, py: 1, bgcolor: isActive('/requests') ? 'rgba(255, 255, 255, 0.2)' : 'transparent', '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)' } }}>
            <ListItemIcon sx={{ color: 'white', minWidth: '32px' }}><Article fontSize="small" /></ListItemIcon>
            <ListItemText primary="Requests" primaryTypographyProps={{ fontWeight: 500, fontSize: '0.8rem', color: 'white' }} />
          </ListItemButton>
        </ListItem>}
        {isAdmin && <ListItem disablePadding sx={{ mb: 0.5 }}>
          <ListItemButton component={Link} href="/carechat" onClick={handleDrawerToggle} sx={{ borderRadius: '8px', mx: 0.5, py: 1, bgcolor: isActive('/carechat') ? 'rgba(255, 255, 255, 0.2)' : 'transparent', '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)' } }}>
            <ListItemIcon sx={{ color: 'white', minWidth: '32px' }}><Chat fontSize="small" /></ListItemIcon>
            <ListItemText primary="CareChat" primaryTypographyProps={{ fontWeight: 500, fontSize: '0.8rem', color: 'white' }} />
          </ListItemButton>
        </ListItem>}

       {drawerAdminLinks}
      </List>

      <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, p: 2, borderTop: '1px solid rgba(255, 255, 255, 0.1)', textAlign: 'center' }}>
        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.7rem' }}>
          © 2025 PharmaStackX
        </Typography>
      </Box>
    </Box>
  );

  const desktopAdminLinks = null;

  const userInitial = user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase();

  return (
    <>
      <AppBar position="sticky" elevation={2} sx={{ bgcolor: '#e0e0e0', color: 'black' }}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ mr: 2, display: 'flex', alignItems: 'center' }}>
          <Link href="https://psx.ng" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
              <img
                src="https://i.ibb.co/bM86kxhT/psx-logo-removebg-preview.png"
                alt="Pharmastackx Logo"
                style={{
                  height: '40px',
                  width: 'auto',
                  objectFit: 'contain'
                }}
              />
            </Link>
          </Box>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }} />
          
          <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
          <Button color="inherit" startIcon={<LocalPharmacy />} component={Link} href="/find-medicines" sx={{ bgcolor: isActive('/find-medicines') ? 'rgba(0, 0, 0, 0.08)' : 'transparent', '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' }, borderRadius: '20px', mx: 0.5 }}>
              View Catalog
            </Button>

            <Button color="inherit" startIcon={<DeliveryDining />} component={Link} href="/?view=orderMedicines" sx={{ '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' }, borderRadius: '20px', mx: 0.5 }}>
  Find Meds
</Button>

            <Button color="inherit" startIcon={<Article />} component={Link} href="/pulse" sx={{ bgcolor: isActive('/pulse') ? 'rgba(0, 0, 0, 0.08)' : 'transparent', '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' }, borderRadius: '20px', mx: 0.5 }}>
              Pulse
            </Button>



            {isAdmin && <Button color="inherit" startIcon={<Chat />} component={Link} href="/carechat" sx={{ bgcolor: isActive('/carechat') ? 'rgba(0, 0, 0, 0.08)' : 'transparent', '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' }, borderRadius: '20px', mx: 0.5 }}>
              CareChat
            </Button>}

            <Button color="inherit" startIcon={<ShoppingBag />} component={Link} href="/orders" sx={{ bgcolor: isActive('/orders') ? 'rgba(0, 0, 0, 0.08)' : 'transparent', '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' }, borderRadius: '20px', mx: 0.5 }}>
              Orders
            </Button>
            {isPharmacist && <Button color="inherit" startIcon={<Article />} component={Link} href="/requests" sx={{ bgcolor: isActive('/requests') ? 'rgba(0, 0, 0, 0.08)' : 'transparent', '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' }, borderRadius: '20px', mx: 0.5 }}>
              Requests
            </Button>}
            <IconButton color="inherit" component={Link} href="/cart" sx={{ mx: 1, bgcolor: isActive('/cart') ? 'rgba(0, 0, 0, 0.08)' : 'transparent', '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' } }}>
              <Badge badgeContent={getTotalItems()} color="error" max={99}>
                <ShoppingCart />
              </Badge>
            </IconButton>
            {/* Admin buttons removed */}

            {isLoading ? (
              <CircularProgress size={24} color="inherit" sx={{ ml: 2 }} />
            ) : user ? (
              <>
                <IconButton onClick={handleMenuOpen} sx={{ p: 0, ml: 1 }}>
                  <Avatar 
                    src={user?.profilePicture} 
                    sx={{ bgcolor: '#E91E63', color: 'white', width: 32, height: 32, fontWeight: 700 }}
                  >
                    {userInitial}
                  </Avatar>
                </IconButton>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                >
                  <MenuItem disabled>{user.email}</MenuItem>
                  {isAdmin && (
                    <MenuItem component={Link} href="/promos" onClick={handleMenuClose}>
                      Promos
                    </MenuItem>
                  )}
                  <MenuItem onClick={handleLogout}>Logout</MenuItem>
                </Menu>
              </>
            ) : (
              <Button color="inherit" startIcon={<Person />} component={Link} href="/auth">
                Login
              </Button>
            )}
          </Box>

                              {/* START: Mobile Right-Side Navigation */}
          <Box sx={{ display: { xs: 'flex', sm: 'none' }, alignItems: 'center', gap: 1, ml: 'auto' }}>
            {isPharmacyOrVendor && user ? (
              // If user is Pharmacy/Vendor, show Store Management
              <Button
                color="inherit"
                component={Link}
                href="/store-management"
                sx={{
                  bgcolor: isActive('/store-management') ? 'rgba(0, 0, 0, 0.12)' : 'transparent',
                  '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.08)' },
                  borderRadius: '16px',
                  px: 1.5,
                  fontWeight: 500,
                  fontSize: '0.8rem',
                  textTransform: 'none',
                }}
              >
                Store Management
              </Button>
            ) : (
              // Otherwise, show the default Find Meds and Cart icons
              <>
                <IconButton color="inherit" component={Link} href="/find-medicines">
                  <LocalPharmacy sx={{ color: '#004D40' }} />
                </IconButton>
      
                <IconButton color="inherit" component={Link} href="/cart" sx={{ ml: -0.5 }}>
                  <Badge badgeContent={getTotalItems()} color="error" max={99}>
                    <ShoppingCart />
                  </Badge>
                </IconButton>
              </>
            )}

            {/* Profile/Login Icon (This part is now shown for ALL mobile users) */}
            {isLoading ? (
              <CircularProgress size={24} color="inherit" />
            ) : user ? (
               <>
                <IconButton onClick={handleMenuOpen} sx={{ p: 0 }}>
                  <Avatar 
                    src={user?.profilePicture} 
                    sx={{ bgcolor: '#E91E63', color: 'white', width: 32, height: 32 }}
                  >
                    {userInitial}
                  </Avatar>
                </IconButton>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                >
                  <MenuItem disabled>{user.email}</MenuItem>
                  {isAdmin && (
                    <MenuItem component={Link} href="/promos" onClick={handleMenuClose}>
                      Promos
                    </MenuItem>
                  )}
                  <MenuItem onClick={handleLogout}>Logout</MenuItem>
                </Menu>
              </>
            ) : (
              <IconButton color="inherit" component={Link} href="/auth">
                <Person />
              </IconButton>
            )}
          </Box>
          {/* END: Mobile Right-Side Navigation */}


        </Toolbar>
      </AppBar>

      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: '140px',
            borderRadius: '0 16px 16px 0',
            border: 'none',
            boxShadow: '4px 0 20px rgba(0, 0, 0, 0.15)'
          },
          '& .MuiBackdrop-root': {
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(4px)'
          }
        }}
      >
        {drawer}
      </Drawer>
    </>
  );
}
