
"use client";
import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Switch,
  FormControlLabel,
  Stack,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  CircularProgress
} from "@mui/material";
import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";
import { useSession } from "@/context/SessionProvider";

// Sample order type (should match business dashboard)
type Order = {
  id: string;
  customer: string;
  customerPhone: string;
  timeAgo: string;
  total: number;
  status: "pending" | "processing" | "completed" | "cancelled";
  deliveryAgent: string | null;
  items: { name: string; quantity: number; price: number }[];
  acceptedAt?: string;
  pickedUpAt?: string;
  completedAt?: string;
  cancelledAt?: string;
};

const sampleOrders: Order[] = [
  {
    id: "1",
    customer: "John Doe",
    customerPhone: "08012345678",
    timeAgo: "5m ago",
    total: 5000,
    status: "pending",
    deliveryAgent: null,
    items: [
      { name: "Paracetamol", quantity: 2, price: 1000 },
      { name: "Amoxicillin", quantity: 1, price: 3000 },
    ],
    // timestamps will be set as actions occur
  },
  {
    id: "2",
    customer: "Jane Smith",
    customerPhone: "08087654321",
    timeAgo: "10m ago",
    total: 2500,
    status: "processing",
    deliveryAgent: "Agent A",
    items: [
      { name: "Ibuprofen", quantity: 1, price: 1500 },
      { name: "Vitamin C", quantity: 2, price: 500 },
    ],
    acceptedAt: undefined,
    pickedUpAt: undefined,
    completedAt: undefined,
    cancelledAt: undefined,
  },
];


export default function DeliveryAgentsDashboard() {
  const [online, setOnline] = useState(false);
  const [orders, setOrders] = useState<Order[]>(sampleOrders);
  const [agentName] = useState("Agent A");
  const [orderStatus, setOrderStatus] = useState("");
  const [openItems, setOpenItems] = useState<{ [orderId: string]: boolean }>({});
  
  const router = useRouter();
  const { user, isLoading } = useSession();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/auth'); // Redirect to login if not authenticated
      } else if (user.role !== 'admin' && user.role !== 'agent') {
        router.push('/'); // Redirect to home if not authorized
      }
    }
  }, [user, isLoading, router]);


  // Toggle online/offline
  const handleToggleOnline = () => setOnline((prev) => !prev);


  // Accept order (assign to self)
  const handleAcceptOrder = (orderId: string) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + now.toLocaleDateString();
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId && order.status === "pending"
          ? { ...order, status: "processing", deliveryAgent: agentName, acceptedAt: timeStr }
          : order
      )
    );
  };

  // Reject order (move to cancelled)
  const handleRejectOrder = (orderId: string) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + now.toLocaleDateString();
    setOrders((prev) =>
      prev.map((order) =>
        (order.id === orderId && (order.status === "pending" || order.status === "processing"))
          ? { ...order, status: "cancelled", deliveryAgent: null, cancelledAt: timeStr }
          : order
      )
    );
  };

  // Mark order as completed
  const handleCompleteOrder = (orderId: string) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + now.toLocaleDateString();
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId && order.status === "processing" && order.deliveryAgent === agentName
          ? { ...order, status: "completed", completedAt: timeStr }
          : order
      )
    );
  };

  // Picked up handler
  const handlePickedUp = (orderId: string) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + now.toLocaleDateString();
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId && order.status === "processing"
          ? { ...order, pickedUpAt: timeStr }
          : order
      )
    );
  };

  if (isLoading || !user || (user.role !== 'admin' && user.role !== 'agent')) {
    return (
      <>
        <Navbar />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 64px)' }}>
          <CircularProgress />
        </Box>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <Box sx={{ p: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: "#1B5E20", mb: 2 }}>
          Delivery Agent Dashboard
        </Typography>
        <Paper sx={{ p: 2, mb: 4 }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <FormControlLabel
              control={<Switch checked={online} onChange={handleToggleOnline} color="success" />}
              label={online ? "Online" : "Offline"}
            />
            <Typography variant="subtitle1">Welcome, {user.name}</Typography>
          </Stack>
        </Paper>
        <Typography variant="h6" sx={{ fontWeight: 700, color: "#1B5E20", mb: 2 }}>
          Manage Orders
        </Typography>
        {/* Responsive MUI Select dropdown */}
        <Box sx={{ mb: 2, width: '100%', maxWidth: 400, mx: 'auto' }}>
          <FormControl fullWidth size="small">
            <InputLabel id="dropdown-label">Order Status</InputLabel>
            <Select
              labelId="dropdown-label"
              id="dropdown"
              label="Order Status"
              value={orderStatus}
              onChange={(e) => setOrderStatus(e.target.value)}
              MenuProps={{
                PaperProps: {
                  sx: {
                    maxWidth: '100%',
                  }
                }
              }}
            >
              <MenuItem value="">All Orders</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="processing">Processing</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>
        </Box>
        <Stack spacing={2} sx={{ width: '100%', maxWidth: 400, mx: 'auto' }}>
          {orders
            .filter(order => !orderStatus || order.status === orderStatus)
            .map((order) => (
              <Paper key={order.id} sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1, borderLeft: 4, borderColor: order.status === 'pending' ? '#E91E63' : order.status === 'processing' ? '#1B5E20' : '#888', boxShadow: 2 }}>
                {order.status === 'pending' ? (
                  <>
                    <Typography variant="subtitle2" fontWeight={700} color="#E91E63">Order ID: {order.id}</Typography>
                    {/* FROM section (Business) */}
                    <Box sx={{ mb: 1, p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                      <Typography variant="caption" fontWeight={700} color="#1B5E20">From (Business):</Typography>
                      <Typography variant="body2">PharmaStackX Pharmacy</Typography>
                      <Typography variant="body2">Phone: 08090000000</Typography>
                        <Typography variant="body2">Address: 123 Health Ave, Lagos</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>Coords: 6.5244° N, 3.3792° E</Typography>
                    </Box>
                    {/* TO section (Customer) */}
                    <Box sx={{ mb: 1, p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                      <Typography variant="caption" fontWeight={700} color="#E91E63">To (Customer):</Typography>
                      <Typography variant="body2">{order.customer}</Typography>
                      <Typography variant="body2">Phone: {order.customerPhone}</Typography>
                        <Typography variant="body2">Address: 45 Customer St, Lagos</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>Coords: 6.6000° N, 3.3500° E</Typography>
                    </Box>
                    <Box sx={{ mt: 1, mb: 1 }}>
                      <Typography variant="body2" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => setOpenItems(prev => ({ ...prev, [order.id]: !prev[order.id] }))}>
                        Items
                        <span style={{ marginLeft: 6, fontSize: 16 }}>{openItems[order.id] ? '▲' : '▼'}</span>
                      </Typography>
                      {openItems[order.id] && (
                        <ul style={{ margin: 0, paddingLeft: 18 }}>
                          {order.items.map((item, idx) => (
                            <li key={idx} style={{ fontSize: '0.95em' }}>{item.name} x{item.quantity}</li>
                          ))}
                        </ul>
                      )}
                    </Box>
                    <Typography variant="body2" color="text.secondary">Distance: 3.2km</Typography>
                    <Typography variant="body2" color="text.secondary">Delivery Fee: ₦500</Typography>
                    {order.acceptedAt && (
                      <Typography variant="body2" color="text.secondary">Order accepted at: {order.acceptedAt}</Typography>
                    )}
                    {online && (
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          variant="contained"
                          color="primary"
                          size="small"
                          onClick={() => handleAcceptOrder(order.id)}
                          fullWidth
                        >
                          Accept
                        </Button>
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          onClick={() => handleRejectOrder(order.id)}
                          fullWidth
                        >
                          Reject
                        </Button>
                      </Box>
                    )}
                  </>
                ) : order.status === 'processing' ? (
                  <>
                    <Typography variant="subtitle2" fontWeight={700} color="#1B5E20">Order ID: {order.id}</Typography>
                    {/* FROM section (Business) */}
                    <Box sx={{ mb: 1, p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                      <Typography variant="caption" fontWeight={700} color="#1B5E20">From (Business):</Typography>
                      <Typography variant="body2">PharmaStackX Pharmacy</Typography>
                      <Typography variant="body2">Phone: 08090000000</Typography>
                      <Typography variant="body2">Address: 123 Health Ave, Lagos</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>Coords: 6.5244° N, 3.3792° E</Typography>
                    </Box>
                    {/* TO section (Customer) */}
                    <Box sx={{ mb: 1, p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                      <Typography variant="caption" fontWeight={700} color="#E91E63">To (Customer):</Typography>
                      <Typography variant="body2">{order.customer}</Typography>
                      <Typography variant="body2">Phone: {order.customerPhone}</Typography>
                      <Typography variant="body2">Address: 45 Customer St, Lagos</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>Coords: 6.6000° N, 3.3500° E</Typography>
                    </Box>
                    <Box sx={{ mt: 1, mb: 1 }}>
                      <Typography variant="body2" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => setOpenItems(prev => ({ ...prev, [order.id]: !prev[order.id] }))}>
                        Items
                        <span style={{ marginLeft: 6, fontSize: 16 }}>{openItems[order.id] ? '▲' : '▼'}</span>
                      </Typography>
                      {openItems[order.id] && (
                        <ul style={{ margin: 0, paddingLeft: 18 }}>
                          {order.items.map((item, idx) => (
                            <li key={idx} style={{ fontSize: '0.95em' }}>{item.name} x{item.quantity}</li>
                          ))}
                        </ul>
                      )}
                    </Box>
                    {order.acceptedAt && (
                      <Typography variant="body2" color="text.secondary">Order accepted at: {order.acceptedAt}</Typography>
                    )}
                    {order.pickedUpAt && (
                      <Typography variant="body2" color="text.secondary">Pick up time: {order.pickedUpAt}</Typography>
                    )}
                    <Typography variant="body2" color="text.secondary">Distance: 3.2km</Typography>
                    <Typography variant="body2" color="text.secondary">Delivery Fee: ₦500</Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                      <Button
                        variant="contained"
                        color="info"
                        size="small"
                        onClick={() => handlePickedUp(order.id)}
                        fullWidth
                        disabled={!!order.pickedUpAt}
                      >
                        {order.pickedUpAt ? 'Picked Up' : 'Pick Up'}
                      </Button>
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        onClick={() => handleCompleteOrder(order.id)}
                        fullWidth
                      >
                        Complete
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        onClick={() => handleRejectOrder(order.id)}
                        fullWidth
                      >
                        Cancelled
                      </Button>
                    </Box>
                  </>
                ) : order.status === 'completed' ? (
                  <>
                    <Typography variant="subtitle2" fontWeight={700} color="#1B5E20">Order ID: {order.id}</Typography>
                    {/* FROM section (Business) */}
                    <Box sx={{ mb: 1, p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                      <Typography variant="caption" fontWeight={700} color="#1B5E20">From (Business):</Typography>
                      <Typography variant="body2">PharmaStackX Pharmacy</Typography>
                      <Typography variant="body2">Phone: 08090000000</Typography>
                      <Typography variant="body2">Address: 123 Health Ave, Lagos</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>Coords: 6.5244° N, 3.3792° E</Typography>
                    </Box>
                    {/* TO section (Customer) */}
                    <Box sx={{ mb: 1, p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                      <Typography variant="caption" fontWeight={700} color="#E91E63">To (Customer):</Typography>
                      <Typography variant="body2">{order.customer}</Typography>
                      <Typography variant="body2">Phone: {order.customerPhone}</Typography>
                      <Typography variant="body2">Address: 45 Customer St, Lagos</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>Coords: 6.6000° N, 3.3500° E</Typography>
                    </Box>
                    <Box sx={{ mt: 1, mb: 1 }}>
                      <Typography variant="body2" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => setOpenItems(prev => ({ ...prev, [order.id]: !prev[order.id] }))}>
                        Items
                        <span style={{ marginLeft: 6, fontSize: 16 }}>{openItems[order.id] ? '▲' : '▼'}</span>
                      </Typography>
                      {openItems[order.id] && (
                        <ul style={{ margin: 0, paddingLeft: 18 }}>
                          {order.items.map((item, idx) => (
                            <li key={idx} style={{ fontSize: '0.95em' }}>{item.name} x{item.quantity}</li>
                          ))}
                        </ul>
                      )}
                    </Box>
                    {order.acceptedAt && (
                      <Typography variant="body2" color="text.secondary">Order accepted at: {order.acceptedAt}</Typography>
                    )}
                    {order.pickedUpAt && (
                      <Typography variant="body2" color="text.secondary">Pick up time: {order.pickedUpAt}</Typography>
                    )}
                    {order.completedAt && (
                      <Typography variant="body2" color="text.secondary">Completed at: {order.completedAt}</Typography>
                    )}
                    <Typography variant="body2" color="text.secondary">Distance: 3.2km</Typography>
                    <Typography variant="body2" color="text.secondary">Delivery Fee: ₦500</Typography>
                  </>
                ) : order.status === 'cancelled' ? (
                  <>
                    <Typography variant="subtitle2" fontWeight={700} color="#E91E63">Order ID: {order.id}</Typography>
                    {/* FROM section (Business) */}
                    <Box sx={{ mb: 1, p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                      <Typography variant="caption" fontWeight={700} color="#1B5E20">From (Business):</Typography>
                      <Typography variant="body2">PharmaStackX Pharmacy</Typography>
                      <Typography variant="body2">Phone: 08090000000</Typography>
                      <Typography variant="body2">Address: 123 Health Ave, Lagos</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>Coords: 6.5244° N, 3.3792° E</Typography>
                    </Box>
                    {/* TO section (Customer) */}
                    <Box sx={{ mb: 1, p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                      <Typography variant="caption" fontWeight={700} color="#E91E63">To (Customer):</Typography>
                      <Typography variant="body2">{order.customer}</Typography>
                      <Typography variant="body2">Phone: {order.customerPhone}</Typography>
                      <Typography variant="body2">Address: 45 Customer St, Lagos</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>Coords: 6.6000° N, 3.3500° E</Typography>
                    </Box>
                    <Box sx={{ mt: 1, mb: 1 }}>
                      <Typography variant="body2" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => setOpenItems(prev => ({ ...prev, [order.id]: !prev[order.id] }))}>
                        Items
                        <span style={{ marginLeft: 6, fontSize: 16 }}>{openItems[order.id] ? '▲' : '▼'}</span>
                      </Typography>
                      {openItems[order.id] && (
                        <ul style={{ margin: 0, paddingLeft: 18 }}>
                          {order.items.map((item, idx) => (
                            <li key={idx} style={{ fontSize: '0.95em' }}>{item.name} x{item.quantity}</li>
                          ))}
                        </ul>
                      )}
                    </Box>
                    {order.acceptedAt && (
                      <Typography variant="body2" color="text.secondary">Order accepted at: {order.acceptedAt}</Typography>
                    )}
                    {order.pickedUpAt && (
                      <Typography variant="body2" color="text.secondary">Pick up time: {order.pickedUpAt}</Typography>
                    )}
                    {order.cancelledAt && (
                      <Typography variant="body2" color="error">Cancelled at: {order.cancelledAt}</Typography>
                    )}
                    <Typography variant="body2" color="text.secondary">Distance: 3.2km</Typography>
                    <Typography variant="body2" color="text.secondary">Delivery Fee: ₦500</Typography>
                  </>
                ) : (
                  <>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle1" fontWeight={600}>{order.customer}</Typography>
                      <Typography variant="caption" color="text.secondary">{order.timeAgo}</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">Phone: {order.customerPhone}</Typography>
                    <Typography variant="body2" color="text.secondary">Total: ₦{order.total.toLocaleString()}</Typography>
                    <Typography variant="body2" color="text.secondary">Status: <b style={{ color: order.status === 'processing' ? '#1B5E20' : '#888' }}>{order.status}</b></Typography>
                    <Box sx={{ mt: 1 }}>
                      {order.status === "processing" && order.deliveryAgent === agentName && (
                        <Button
                          variant="contained"
                          color="success"
                          size="small"
                          onClick={() => handleCompleteOrder(order.id)}
                          fullWidth
                        >
                          Complete
                        </Button>
                      )}
                      {order.status === "completed" && order.deliveryAgent === agentName && (
                        <Typography color="success.main" align="center">Delivered</Typography>
                      )}
                    </Box>
                  </>
                )}
              </Paper>
            ))}
        </Stack>
      </Box>
    </>
  );
}
