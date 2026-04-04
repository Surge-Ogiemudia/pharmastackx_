'use client';
import React, { useState } from 'react';

const mockOrders: Order[] = [
  {
    id: '1001',
    user: { name: 'John Doe', phone: '08012345678', email: 'john@example.com' },
    orderType: 'Single Order',
    deliveryOption: 'Standard Delivery',
    items: [
      { name: 'Amoxicillin', qty: 2 },
      { name: 'Paracetamol', qty: 1 },
    ],
    businesses: [
      {
        name: 'PharmaPlus',
        phone: '08011112222',
        email: 'pharmaplus@email.com',
      },
      { name: 'MediStore', phone: '08033334444', email: 'medistore@email.com' },
    ],
    totalAmount: 4500,
    status: 'pending',
    timeAccepted: '2025-11-04 10:15',
    timeDispatched: '',
    deliveryAgent: {
      name: 'Agent A',
      phone: '08055556666',
      email: 'agentA@email.com',
    },
    timePickup: '',
    timeDelivered: '',
  },
  {
    id: '1002',
    user: { name: 'Jane Smith', phone: '08087654321', email: 'jane@example.com' },
    orderType: 'Multiple Premium',
    deliveryOption: 'Express Delivery',
    items: [{ name: 'Ibuprofen', qty: 3 }],
    businesses: [
      { name: 'HealthMart', phone: '08022223333', email: 'healthmart@email.com' },
    ],
    totalAmount: 7000,
    status: 'processing',
    timeAccepted: '2025-11-04 11:00',
    timeDispatched: '2025-11-04 11:30',
    deliveryAgent: {
      name: 'Agent B',
      phone: '08077778888',
      email: 'agentB@email.com',
    },
    timePickup: '2025-11-04 11:45',
    timeDelivered: '',
  },
];

type Order = {
  id: string;
  user: { name: string; phone: string; email: string };
  orderType: string;
  deliveryOption: string;
  items: { name: string; qty: number }[];
  businesses: { name: string; phone: string; email: string }[];
  totalAmount: number;
  status: string;
  timeAccepted: string;
  timeDispatched: string;
  deliveryAgent: { name: string; phone: string; email: string };
  timePickup: string;
  timeDelivered: string;
};
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';

import Navbar from '@/components/Navbar';

export default function OrderManagementPage() {
  const [search, setSearch] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [orderType, setOrderType] = useState('');
  const [deliveryOption, setDeliveryOption] = useState('');
  const [tab, setTab] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orders, setOrders] = useState<Order[]>(mockOrders);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTab(newValue);
  };

  const handleOpenOrder = (order: Order) => {
    setSelectedOrder(order);
  };

  const handleCompleteOrder = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: 'completed' } : o))
    );
    setSelectedOrder(null);
  };

  const handleCancelOrder = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: 'cancelled' } : o))
    );
    setSelectedOrder(null);
  };

  const handleCloseOrder = () => {
    setSelectedOrder(null);
  };

  const filterOrders = (ordersArr: Order[], statusArr: string[]) =>
    ordersArr
      .filter((o) => statusArr.includes(o.status))
      .filter((order) => {
        const q = search.toLowerCase();
        const matchesSearch =
          order.user.name.toLowerCase().includes(q) ||
          order.id.toLowerCase().includes(q) ||
          order.items.some((i) => i.name.toLowerCase().includes(q));
        let matchesDate = true;
        if (filterDate) {
          const orderDate = order.timeAccepted.split(' ')[0];
          matchesDate = orderDate === filterDate;
        }
        let matchesType = true;
        if (orderType) {
          matchesType = order.orderType.toLowerCase().includes(orderType);
        }
        let matchesDelivery = true;
        if (deliveryOption) {
          matchesDelivery = order.deliveryOption
            .toLowerCase()
            .includes(deliveryOption);
        }
        return matchesSearch && matchesDate && matchesType && matchesDelivery;
      });

  const renderSearchSortBar = () => (
    <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
      <input
        type='text'
        placeholder='Search by user, order ID, or item...'
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          flex: 1,
          minWidth: 220,
          padding: 8,
          borderRadius: 4,
          border: '1px solid #ccc',
          fontSize: 16,
        }}
      />
      <input
        type='date'
        value={filterDate}
        onChange={(e) => setFilterDate(e.target.value)}
        style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc', fontSize: 16 }}
      />
      <select
        value={orderType}
        onChange={(e) => setOrderType(e.target.value)}
        style={{
          padding: 8,
          borderRadius: 4,
          border: '1px solid #ccc',
          fontSize: 16,
          minWidth: 180,
        }}
      >
        <option value=''>All Order Types</option>
        <option value='single order'>Single Order</option>
        <option value='multiple normal'>Multiple Normal</option>
        <option value='multiple premium'>Multiple Premium</option>
      </select>
      <select
        value={deliveryOption}
        onChange={(e) => setDeliveryOption(e.target.value)}
        style={{
          padding: 8,
          borderRadius: 4,
          border: '1px solid #ccc',
          fontSize: 16,
          minWidth: 180,
        }}
      >
        <option value=''>All Delivery Options</option>
        <option value='standard delivery'>Standard Delivery</option>
        <option value='express delivery'>Express Delivery</option>
      </select>
    </Box>
  );

  return (
    <>
      <Navbar />
      <Box sx={{ p: 4 }}>
        <Typography variant='h4' sx={{ fontWeight: 700, color: '#1B5E20', mb: 3 }}>
          Order Management
        </Typography>
        <Tabs
          value={tab}
          onChange={handleTabChange}
          aria-label='order management tabs'
          sx={{ mb: 2 }}
        >
          <Tab label='Dashboard' />
          <Tab label='Processing' />
          <Tab label='Completed' />
          <Tab label='Cancelled' />
        </Tabs>

        {tab === 0 && (
          <Paper sx={{ p: 3, minHeight: 300, overflow: 'auto' }}>
            <Typography variant='h6' sx={{ mb: 2, color: '#1B5E20' }}>
              All Orders (Extended List)
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Button
                variant='outlined'
                color='primary'
                onClick={() => {
                  /* CSV export logic */
                }}
              >
                Download CSV
              </Button>
            </Box>
            <Box sx={{ width: '100%', height: 500 }}>
              <DataGrid
                rows={orders.map((order, idx) => ({
                  id: order.id,
                  sn: idx + 1,
                  timeAndDate: order.timeAccepted,
                  user: `${order.user.name} (${order.user.phone}, ${order.user.email})`,
                  orderType: order.orderType,
                  deliveryOption: order.deliveryOption,
                  status: order.status.charAt(0).toUpperCase() + order.status.slice(1),
                  items: order.items.map((i) => `${i.name} (qty: ${i.qty})`).join(', '),
                  businesses: order.businesses.map((b) => b.name).join(', '),
                  totalAmount: `₦${order.totalAmount.toLocaleString()}`,
                  fulfilledBy: 'N/A',
                  timeAccepted: order.timeAccepted,
                  timeDispatched: order.timeDispatched,
                  deliveredBy: `${order.deliveryAgent.name}`,
                  timePickup: order.timePickup,
                  timeDelivered: order.timeDelivered,
                }))}
                columns={[
                  { field: 'sn', headerName: 'S/N', width: 70 },
                  { field: 'id', headerName: 'Order ID', width: 120 },
                  { field: 'status', headerName: 'Status', width: 120 },
                  { field: 'timeAndDate', headerName: 'Time & Date', width: 150 },
                  { field: 'user', headerName: 'User', width: 220 },
                  { field: 'orderType', headerName: 'Order Type', width: 140 },
                  { field: 'deliveryOption', headerName: 'Delivery Option', width: 140 },
                  { field: 'items', headerName: 'Items', width: 220 },
                  { field: 'businesses', headerName: 'Businesses', width: 180 },
                  { field: 'totalAmount', headerName: 'Total', width: 120 },
                  { field: 'fulfilledBy', headerName: 'Fulfilled By', width: 220 },
                  { field: 'timeAccepted', headerName: 'Time Accepted', width: 150 },
                  { field: 'timeDispatched', headerName: 'Time Dispatched', width: 150 },
                  { field: 'deliveredBy', headerName: 'Delivered By', width: 220 },
                  { field: 'timePickup', headerName: 'Time of Pickup', width: 150 },
                  { field: 'timeDelivered', headerName: 'Time of Delivery', width: 150 },
                ]}
                initialState={{
                  pagination: {
                    paginationModel: { pageSize: 10, page: 0 },
                  },
                }}
                pageSizeOptions={[10, 25, 50]}
                disableRowSelectionOnClick
              />
            </Box>
          </Paper>
        )}

        {tab === 1 && (
          <>
            <Typography variant='h6' sx={{ mb: 2, color: '#1B5E20' }}>
              Processing Orders
            </Typography>
            {renderSearchSortBar()}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, 1fr)',
                  md: 'repeat(3, 1fr)',
                },
                gap: 2,
              }}
            >
              {filterOrders(orders, ['pending', 'processing']).map((order) => (
                <Card
                  key={order.id}
                  sx={{
                    cursor: 'pointer',
                    borderLeft: '4px solid #E91E63',
                    transition: 'box-shadow 0.2s',
                    '&:hover': { boxShadow: 6 },
                  }}
                  onClick={() => handleOpenOrder(order)}
                >
                  <CardContent sx={{ pb: 1 }}>
                    <Typography variant='subtitle2' sx={{ fontWeight: 700 }}>
                      Order #{order.id}
                    </Typography>
                    <Typography variant='body2'>{order.user.name}</Typography>
                    <Typography variant='body2'>
                      {order.orderType} • {order.deliveryOption}
                    </Typography>
                    <Typography variant='body2'>
                      Items: {order.items.length} • ₦{order.totalAmount.toLocaleString()}
                    </Typography>
                    <Typography variant='caption' color='text.secondary'>
                      Status: {order.status}
                    </Typography>
                  </CardContent>
                  <Box
                    sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, pb: 1, pr: 2 }}
                  >
                    <Button
                      size='small'
                      color='success'
                      variant='contained'
                      onClick={(e) => { e.stopPropagation(); handleCompleteOrder(order.id); }}
                    >
                      Complete
                    </Button>
                    <Button
                      size='small'
                      color='error'
                      variant='outlined'
                      onClick={(e) => { e.stopPropagation(); handleCancelOrder(order.id); }}
                    >
                      Cancel
                    </Button>
                  </Box>
                </Card>
              ))}
            </Box>
          </>
        )}

        {tab === 2 && (
          <>
            <Typography variant='h6' sx={{ mb: 2, color: '#1B5E20' }}>
              Completed Orders
            </Typography>
            {renderSearchSortBar()}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, 1fr)',
                  md: 'repeat(3, 1fr)',
                },
                gap: 2,
              }}
            >
              {filterOrders(orders, ['completed']).map((order) => (
                <Card key={order.id}>
                  <CardContent>
                    <Typography variant='subtitle2' sx={{ fontWeight: 700 }}>
                      Order #{order.id}
                    </Typography>
                    <Typography variant='body2'>{order.user.name}</Typography>
                    <Typography variant='body2'>
                      {order.orderType} • {order.deliveryOption}
                    </Typography>
                    <Typography variant='body2'>
                      Items: {order.items.length} • ₦{order.totalAmount.toLocaleString()}
                    </Typography>
                    <Typography variant='caption' color='text.secondary'>
                      Status: {order.status}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </>
        )}

        {tab === 3 && (
          <>
            <Typography variant='h6' sx={{ mb: 2, color: '#1B5E20' }}>
              Cancelled Orders
            </Typography>
            {renderSearchSortBar()}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, 1fr)',
                  md: 'repeat(3, 1fr)',
                },
                gap: 2,
              }}
            >
              {filterOrders(orders, ['cancelled']).map((order) => (
                <Card key={order.id}>
                  <CardContent>
                    <Typography variant='subtitle2' sx={{ fontWeight: 700 }}>
                      Order #{order.id}
                    </Typography>
                    <Typography variant='body2'>{order.user.name}</Typography>
                    <Typography variant='body2'>
                      {order.orderType} • {order.deliveryOption}
                    </Typography>
                    <Typography variant='body2'>
                      Items: {order.items.length} • ₦{order.totalAmount.toLocaleString()}
                    </Typography>
                    <Typography variant='caption' color='text.secondary'>
                      Status: {order.status}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </>
        )}

        <Dialog open={!!selectedOrder} onClose={handleCloseOrder} maxWidth='md' fullWidth>
          <DialogTitle>Order Details</DialogTitle>
          <DialogContent dividers>
            {selectedOrder && <Stack spacing={1.5}> {/* ... details ... */}</Stack>}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseOrder}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </>
  );
}
