'use client';

import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  Chip,
  IconButton,
  Divider,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
} from '@mui/material';
import {
  AccessTime,
  Loop,
  CheckCircle,
  Cancel,
  LocalPharmacy,
  LocationOn,
  MoreVert,
  Visibility,
  PhoneCallback,
  LocalShipping,
} from '@mui/icons-material';
import Navbar from '@/components/Navbar';
import { useOrders, Order } from '@/contexts/OrderContext';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`orders-tabpanel-${index}`}
      aria-labelledby={`orders-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const OrderCard = ({ order }: { order: Order }) => {
  const { updateOrderStatus } = useOrders();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleStatusUpdate = (newStatus: Order['status']) => {
    updateOrderStatus(order._id, newStatus);
    handleMenuClose();
  };

  const handleViewDetails = () => {
    alert(`Viewing details for order ${order._id}`);
    handleMenuClose();
  };

  const handleContactCustomer = () => {
    window.open(`https://wa.me/${order.user.phone}?text=Hi%2C%20regarding%20your%20order%20${order._id}`, '_blank');
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'Pending': return '#FF9800';
      case 'Accepted': return '#2196F3';
      case 'Dispatched': return '#FFC107';
      case 'In Transit': return '#9C27B0';
      case 'Completed': return '#4CAF50';
      case 'Cancelled': return '#F44336';
      default: return '#757575';
    }
  };

  const getStatusIcon = (status: Order['status']) => {
    switch (status) {
      case 'Pending': return <AccessTime />;
      case 'Accepted': return <Loop />;
      case 'Dispatched': return <LocalShipping />;
      case 'In Transit': return <LocationOn />;
      case 'Completed': return <CheckCircle />;
      case 'Cancelled': return <Cancel />;
      default: return <AccessTime />;
    }
  };

  return (
    <Card sx={{ mb: 2, borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#006D5B', mb: 0.5 }}>
              {order._id}
            </Typography>
            <Chip 
              icon={getStatusIcon(order.status)}
              label={order.status}
              sx={{ bgcolor: getStatusColor(order.status), color: 'white', fontWeight: 600, '& .MuiChip-icon': { color: 'white' } }}
              size="small"
            />
          </Box>
          <IconButton size="small" onClick={handleMenuClick}>
            <MoreVert />
          </IconButton>
          <Menu anchorEl={anchorEl} open={menuOpen} onClose={handleMenuClose}>
            <MenuItem onClick={() => handleStatusUpdate('Accepted')}>Mark as Accepted</MenuItem>
            <MenuItem onClick={() => handleStatusUpdate('Dispatched')}>Mark as Dispatched</MenuItem>
            <MenuItem onClick={() => handleStatusUpdate('In Transit')}>Mark as In Transit</MenuItem>
            <MenuItem onClick={() => handleStatusUpdate('Completed')}>Mark as Completed</MenuItem>
            <MenuItem onClick={() => handleStatusUpdate('Cancelled')}>Cancel Order</MenuItem>
            <Divider />
            <MenuItem onClick={handleViewDetails}><ListItemIcon><Visibility fontSize="small" /></ListItemIcon>View Details</MenuItem>
            <MenuItem onClick={handleContactCustomer}><ListItemIcon><PhoneCallback fontSize="small" /></ListItemIcon>Contact Customer</MenuItem>
          </Menu>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Avatar sx={{ bgcolor: '#006D5B', mr: 2 }}><LocalPharmacy /></Avatar>
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                {order.businesses.length > 1 ? `From ${order.businesses.length} businesses:` : 'Business:'}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {order.businesses.map((business, index) => (
                      <Chip key={index} label={business.name} size="small" />
                  ))}
              </Box>
            </Box>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Items ({order.items.length}):
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {order.items.map((item, index) => (
              <Chip key={index} label={`${item.name} (x${item.qty})`} size="small" />
            ))}
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="body2" color="text.secondary">Order Date</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {new Date(order.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </Typography>
          </Box>
          <Box textAlign="right">
            <Typography variant="body2" color="text.secondary">Total Amount</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#006D5B' }}>
               ₦{order.totalAmount ? order.totalAmount.toLocaleString() : '0.00'}
            </Typography>
          </Box>
        </Box>

        <Box sx={{mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1, fontSize: '0.8rem', color: 'text.secondary'}}>
          {order.acceptedAt && <Chip size="small" label={`Accepted: ${new Date(order.acceptedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`} />}
          {order.dispatchedAt && <Chip size="small" label={`Dispatched: ${new Date(order.dispatchedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`} />}
          {order.pickedUpAt && <Chip size="small" label={`In Transit: ${new Date(order.pickedUpAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`} />}
          {order.completedAt && <Chip size="small" label={`Completed: ${new Date(order.completedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`} />}
        </Box>

      </CardContent>
    </Card>
  );
};

export default function OrdersPage() {
  const { orders, loading } = useOrders();
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const processingOrders = orders.filter(order => ['Pending', 'Accepted', 'Dispatched', 'In Transit'].includes(order.status));
  const completedOrders = orders.filter(order => order.status === 'Completed');
  const cancelledOrders = orders.filter(order => order.status === 'Cancelled');

  const tabConfig = [
    { label: 'Processing', count: processingOrders.length, color: '#2196F3' },
    { label: 'Completed', count: completedOrders.length, color: '#4CAF50' },
    { label: 'Cancelled', count: cancelledOrders.length, color: '#F44336' },
  ];

  if (loading) {
      return (
          <>
            <Navbar />
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
              <CircularProgress />
              <Typography sx={{ml: 2}}>Loading Orders...</Typography>
            </Box>
          </>
      )
  }

  return (
    <>
      <Navbar />
      <Box sx={{ bgcolor: '#f8f9fa', minHeight: '100vh', pt: 10 }}>
        <Container maxWidth="lg">
          <Box sx={{ mb: 4 }}>
            <Typography variant="h3" sx={{ fontWeight: 800, color: '#006D5B' }}>My Orders</Typography>
            <Typography variant="body1" color="text.secondary">Track and manage all your medication orders</Typography>
          </Box>

          <Tabs value={tabValue} onChange={handleTabChange} variant="fullWidth" sx={{ bgcolor: 'white', borderRadius: '20px 20px 0 0'}}>
              {tabConfig.map((tab, index) => (
                <Tab
                  key={index}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {tab.label}
                      <Chip label={tab.count} size="small" sx={{ bgcolor: tab.color, color: 'white'}} />
                    </Box>
                  }
                />
              ))}
          </Tabs>

          <TabPanel value={tabValue} index={0}>
            {processingOrders.length > 0 ? 
                processingOrders.map((order) => <OrderCard key={order._id} order={order} />) :
                <Typography>No orders in process.</Typography>}
          </TabPanel>
          <TabPanel value={tabValue} index={1}>
            {completedOrders.length > 0 ? 
                completedOrders.map((order) => <OrderCard key={order._id} order={order} />) :
                <Typography>No completed orders.</Typography>}
          </TabPanel>
          <TabPanel value={tabValue} index={2}>
            {cancelledOrders.length > 0 ?
                cancelledOrders.map((order) => <OrderCard key={order._id} order={order} />) :
                <Typography>No cancelled orders.</Typography>}
          </TabPanel>

        </Container>
      </Box>
    </>
  );
}