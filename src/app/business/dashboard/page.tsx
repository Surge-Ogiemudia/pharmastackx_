"use client";
// Inventory product type
// ...existing code...

// Bulk batch type
type BulkBatch = {
  id: string;
  fileName: string;
  date: string;
  products: InventoryProduct[];
};

// ...existing code...
// ...existing code...
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Avatar,
  Stack,
  AppBar,
  Toolbar,
  IconButton,
  Tab,
  Tabs,
  TextField,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Menu,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  FormControlLabel,
  Checkbox,
} from '@mui/material';


import {
  LocalPharmacy,
  Dashboard,
  Upload,
  Add,
  CloudUpload,
  Analytics,
  Inventory,
  Person,
  Logout,
  ContentCopy,
  Store,
  Link,
  LocationOn,
  ShoppingBag,
  ArrowDropDown,
  Phone,
  DeliveryDining,
} from '@mui/icons-material';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Navbar from '../../../components/Navbar';
import { normalizeProductCsvRow, ProductCsvRow } from '../../../utils/csvProductNormalizer';

interface InventoryProduct extends ProductCsvRow {
  id: string;
  business: string;
  location: string;
  image?: string;
}
// @ts-ignore
import Papa from 'papaparse';

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
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function BusinessDashboard() {
  // Inventory state
  const [inventoryProducts, setInventoryProducts] = useState<InventoryProduct[]>([]);
  // Bulk batches state
  const [bulkBatches, setBulkBatches] = useState<BulkBatch[]>([]);
  // CSV upload state
  const [csvPreview, setCsvPreview] = useState<ProductCsvRow[] | null>(null);
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [csvFileName, setCsvFileName] = useState("");

  // --- Edit Product Dialog State & Handlers ---
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editProductIndex, setEditProductIndex] = useState<number | null>(null);
  const [editProductForm, setEditProductForm] = useState<InventoryProduct | null>(null);

  const handleEditProduct = (idx: number) => {
    setEditProductIndex(idx);
    setEditProductForm({ ...inventoryProducts[idx] });
    setEditDialogOpen(true);
  };

  const handleEditProductFormChange = (field: keyof InventoryProduct, value: string) => {
    setEditProductForm((prev) => prev ? { ...prev, [field]: value } : prev);
  };

  const handleSaveEditProduct = () => {
    if (editProductIndex !== null && editProductForm) {
      setInventoryProducts((prev) => prev.map((p, i) => i === editProductIndex ? { ...editProductForm } : p));
      setEditDialogOpen(false);
      setEditProductIndex(null);
      setEditProductForm(null);
    }
  };

  const handleCancelEditProduct = () => {
    setEditDialogOpen(false);
    setEditProductIndex(null);
    setEditProductForm(null);
  };
  const [tabValue, setTabValue] = useState(0);
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [csvUploadOpen, setCsvUploadOpen] = useState(false);
  const [addPersonnelOpen, setAddPersonnelOpen] = useState(false);
  const [keyPersonnel, setKeyPersonnel] = useState<{
    name: string;
    title: string;
    experience: string;
    specialization: string;
    email: string;
    phone: string;
    image?: string;
  } | null>(null);

  // Personnel form state
  const [personnelForm, setPersonnelForm] = useState({
    name: '',
    title: 'Superintendent Pharmacist',
    experience: '',
    specialization: '',
    email: '',
    phone: ''
  });

  // Product form state
  const [productForm, setProductForm] = useState({
    name: '',
    activeIngredient: '',
    drugClass: '',
    amount: '',
    price: '',
    description: '',
    manufacturer: '',
    dosage: '',
    prescriptionRequired: false,
    expiryDate: ''
  });

  // Shared inventory state
  interface InventoryProduct {
    name: string;
    active: string;
    class: string;
    price: string;
    business: string;
    location: string;
    image?: string;
  }
  // Duplicate removed

  // CSV upload preview state
  // Duplicate removed
  const [csvReady, setCsvReady] = useState(false);

  // Business info (in real app, this would come from user/business data)
  const businessName = "medplus"; // This would be dynamic
  const storeUrl = `psx.ng/${businessName}`;

  // Location state
  const [businessLocation, setBusinessLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  // Order filter state
  const [orderFilter, setOrderFilter] = useState<'pending' | 'processing' | 'completed' | 'cancelled'>('pending');
  const [filterMenuAnchor, setFilterMenuAnchor] = useState<null | HTMLElement>(null);

  // Mock orders data with different statuses
  const [allOrders] = useState([
    // Pending Orders
    {
      id: 'ORD001',
      customer: 'John Doe',
      customerPhone: '+234 801 234 5678',
      timeAgo: '5 min ago',
      total: 12500,
      status: 'pending' as const,
      deliveryAgent: null,
      items: [
        { name: 'Paracetamol 500mg', quantity: 2, price: 2500 },
        { name: 'Amoxicillin 250mg', quantity: 1, price: 10000 }
      ]
    },
    {
      id: 'ORD002',
      customer: 'Sarah Williams',
      customerPhone: '+234 802 345 6789',
      timeAgo: '12 min ago',
      total: 8750,
      status: 'pending' as const,
      deliveryAgent: null,
      items: [
        { name: 'Vitamin C Tablets', quantity: 3, price: 4500 },
        { name: 'Cough Syrup', quantity: 1, price: 4250 }
      ]
    },
    {
      id: 'ORD003',
      customer: 'Michael Johnson',
      customerPhone: '+234 803 456 7890',
      timeAgo: '18 min ago',
      total: 15200,
      status: 'pending' as const,
      deliveryAgent: null,
      items: [
        { name: 'Blood Pressure Monitor', quantity: 1, price: 15200 }
      ]
    },
    // Processing Orders
    {
      id: 'ORD005',
      customer: 'Alice Brown',
      customerPhone: '+234 805 567 8901',
      timeAgo: '1 hour ago',
      total: 9500,
      status: 'processing' as const,
      deliveryAgent: { name: 'Ahmed Musa', phone: '+234 901 234 5678' },
      items: [
        { name: 'Antibiotics Pack', quantity: 1, price: 9500 }
      ]
    },
    {
      id: 'ORD006',
      customer: 'Robert Wilson',
      customerPhone: '+234 806 678 9012',
      timeAgo: '2 hours ago',
      total: 14200,
      status: 'processing' as const,
      deliveryAgent: { name: 'Fatima Ibrahim', phone: '+234 902 345 6789' },
      items: [
        { name: 'Diabetes Kit', quantity: 1, price: 14200 }
      ]
    },
    // Completed Orders
    {
      id: 'ORD007',
      customer: 'Lisa Garcia',
      customerPhone: '+234 807 789 0123',
      timeAgo: '1 day ago',
      total: 7800,
      status: 'completed' as const,
      deliveryAgent: { name: 'Emeka Okafor', phone: '+234 903 456 7890' },
      items: [
        { name: 'Pain Relief Gel', quantity: 2, price: 3900 }
      ]
    },
    {
      id: 'ORD008',
      customer: 'David Martinez',
      customerPhone: '+234 808 890 1234',
      timeAgo: '2 days ago',
      total: 16500,
      status: 'completed' as const,
      deliveryAgent: { name: 'Aisha Hassan', phone: '+234 904 567 8901' },
      items: [
        { name: 'First Aid Kit', quantity: 1, price: 16500 }
      ]
    },
    // Cancelled Orders
    {
      id: 'ORD009',
      customer: 'Jennifer Lee',
      customerPhone: '+234 809 901 2345',
      timeAgo: '3 days ago',
      total: 5400,
      status: 'cancelled' as const,
      deliveryAgent: null,
      items: [
        { name: 'Vitamin D3', quantity: 3, price: 1800 }
      ]
    }
  ]);

  // Filter orders based on selected status
  const filteredOrders = allOrders.filter(order => order.status === orderFilter);

  // State to manage orders (converting to mutable state)
  const [orders, setOrders] = useState(allOrders);
  
  // Update filtered orders to use the mutable orders state
  const currentFilteredOrders = orders.filter(order => order.status === orderFilter);

  const handleCopyStoreUrl = async () => {
    try {
      await navigator.clipboard.writeText(`https://${storeUrl}`);
      // In a real app, you'd show a toast notification here
      alert('Store URL copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const handleTakeLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setBusinessLocation(location);
        setLocationLoading(false);
        // In a real app, you'd save this to your backend/database
        alert(`Location captured: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`);
      },
      (error) => {
        setLocationLoading(false);
        let errorMessage = 'Unable to get location. ';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += 'Location access denied by user.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage += 'Location request timed out.';
            break;
          default:
            errorMessage += 'An unknown error occurred.';
            break;
        }
        alert(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  const handleOrderAction = (orderId: string, action: 'accept' | 'reject') => {
    // Update the order status in the orders array
    setOrders(prevOrders => 
      prevOrders.map(order => {
        if (order.id === orderId) {
          if (action === 'accept') {
            // Move to processing status and assign a delivery agent
            const deliveryAgents = [
              { name: 'Ahmed Musa', phone: '+234 901 234 5678' },
              { name: 'Fatima Ibrahim', phone: '+234 902 345 6789' },
              { name: 'Emeka Okafor', phone: '+234 903 456 7890' },
              { name: 'Aisha Hassan', phone: '+234 904 567 8901' },
            ];
            const randomAgent = deliveryAgents[Math.floor(Math.random() * deliveryAgents.length)];
            
            return {
              ...order,
              status: 'processing' as const,
              deliveryAgent: randomAgent
            };
          } else {
            // Move to cancelled status
            return {
              ...order,
              status: 'cancelled' as const,
              deliveryAgent: null
            };
          }
        }
        return order;
      })
    );

    // Show notification and switch filter view
    if (action === 'accept') {
      alert(`Order ${orderId} has been accepted! Customer will be notified. Delivery agent assigned.`);
      // Switch to processing filter to show the updated order
      setTimeout(() => setOrderFilter('processing'), 1000);
    } else {
      alert(`Order ${orderId} has been rejected and moved to cancelled orders.`);
      // Switch to cancelled filter to show the updated order
      setTimeout(() => setOrderFilter('cancelled'), 1000);
    }
  };

  const handleOrderStatusUpdate = (orderId: string, newStatus: 'dispatched' | 'completed' | 'cancelled') => {
    // Update the order status in the orders array
    setOrders(prevOrders =>
      prevOrders.map(order => {
        if (order.id === orderId) {
          if (newStatus === 'completed') {
            // Only allow completed if deliveryAgent is present
            if (order.deliveryAgent) {
              return { ...order, status: 'completed' as const, deliveryAgent: order.deliveryAgent };
            } else {
              // If no deliveryAgent, do not change status to completed
              return order;
            }
          } else if (newStatus === 'cancelled') {
            return { ...order, status: 'cancelled' as const, deliveryAgent: null };
          }
          // For 'dispatched', we keep it in processing but could add a dispatched flag
          return order;
        }
        return order;
      })
    );

    // Show notification and switch filter view
    if (newStatus === 'dispatched') {
      alert(`Order ${orderId} has been dispatched! Customer will receive tracking info.`);
    } else if (newStatus === 'completed') {
      alert(`Order ${orderId} has been marked as completed!`);
      // Switch to completed filter to show the updated order
      setTimeout(() => setOrderFilter('completed'), 1000);
    } else if (newStatus === 'cancelled') {
      alert(`Order ${orderId} has been marked as failed/cancelled.`);
      // Switch to cancelled filter to show the updated order
      setTimeout(() => setOrderFilter('cancelled'), 1000);
    }
  };

  const handleFilterMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setFilterMenuAnchor(event.currentTarget);
  };

  const handleFilterMenuClose = () => {
    setFilterMenuAnchor(null);
  };

  const handleFilterChange = (newFilter: 'pending' | 'processing' | 'completed' | 'cancelled') => {
    setOrderFilter(newFilter);
    handleFilterMenuClose();
  };

  const getFilterLabel = (filter: string) => {
    switch (filter) {
      case 'pending': return 'Pending';
      case 'processing': return 'Processing';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return 'Pending';
    }
  };

  const getFilterColor = (filter: string) => {
    switch (filter) {
      case 'pending': return '#FF9800';
      case 'processing': return '#2196F3';
      case 'completed': return '#4CAF50';
      case 'cancelled': return '#F44336';
      default: return '#FF9800';
    }
  };

  const handlePersonnelFormChange = (field: string, value: string) => {
    setPersonnelForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddPersonnel = () => {
    if (personnelForm.name && personnelForm.email && personnelForm.phone && personnelForm.experience && personnelForm.specialization) {
      setKeyPersonnel({
        ...personnelForm
      });
      // Reset form
      setPersonnelForm({
        name: '',
        title: 'Superintendent Pharmacist',
        experience: '',
        specialization: '',
        email: '',
        phone: ''
      });
      setAddPersonnelOpen(false);
      alert('Key personnel added successfully!');
    } else {
      alert('Please fill in all required fields.');
    }
  };

  const handleProductFormChange = (field: string, value: string | boolean) => {
    setProductForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Single product upload handler (update inventory on add)
  const handleAddProduct = () => {
    if (productForm.name && productForm.activeIngredient && productForm.drugClass && productForm.price) {
      setInventoryProducts((prev) => [
        ...prev,
        {
          name: productForm.name || 'N/A',
          active: productForm.activeIngredient || 'N/A',
          class: productForm.drugClass || 'N/A',
          price: productForm.price || 'N/A',
          business: businessName,
          location: businessLocation ? `${businessLocation.lat.toFixed(6)}, ${businessLocation.lng.toFixed(6)}` : 'N/A',
          image: undefined,
        },
      ]);
      alert(`Product "${productForm.name}" added successfully! It will now appear in the find-medicines page.`);
      // Reset form
      setProductForm({
        name: '',
        activeIngredient: '',
        drugClass: '',
        amount: '',
        price: '',
        description: '',
        manufacturer: '',
        dosage: '',
        prescriptionRequired: false,
        expiryDate: ''
      });
      setAddProductOpen(false);
    } else {
      alert('Please fill in all required fields (Name, Active Ingredient, Drug Class, Price).');
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length === 0) return;
      const file = acceptedFiles[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result;
        if (typeof text === 'string') {
          Papa.parse(text, {
            header: true,
            skipEmptyLines: true,
            complete: (results: any) => {
              const normalized: ProductCsvRow[] = results.data.map((row: any) => normalizeProductCsvRow(row));
              setCsvPreview(normalized);
              setCsvReady(true);
            },
            error: (err: any) => {
              alert('Error parsing CSV: ' + err.message);
            }
          });
        }
      };
      reader.readAsText(file);
    }
  });

  // Sample data
  const products = [
    { id: 1, name: 'Aspirin 100mg', category: 'Pain Relief', stock: 250, price: '$5.99', status: 'Active' },
    { id: 2, name: 'Ibuprofen 200mg', category: 'Pain Relief', stock: 180, price: '$8.49', status: 'Active' },
    { id: 3, name: 'Vitamin D3', category: 'Supplements', stock: 300, price: '$12.99', status: 'Active' },
    { id: 4, name: 'Blood Pressure Monitor', category: 'Devices', stock: 25, price: '$79.99', status: 'Low Stock' },
  ];

  // ...existing code...

  const handleEditBatch = (idx: number) => {
    // TODO: Implement batch edit logic
    alert('Batch edit feature coming soon!');
  };

  const handleDeleteBatch = (idx: number) => {
    setBulkBatches((prev) => prev.filter((_, i) => i !== idx));
    alert('Batch deleted successfully!');
  };

  return (
    <Box>
      {/* Main Navbar */}
      <Navbar />
      
      {/* Business Dashboard Header */}
      <Box sx={{ bgcolor: '#f5f5f5', py: 2, borderBottom: '1px solid #e0e0e0' }}>
        <Container maxWidth="lg">
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#006D5B' }}>
            Business Dashboard
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Manage your pharmacy inventory and orders
          </Typography>
        </Container>
      </Box>

      {/* Navigation Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Container maxWidth="lg">
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
              minHeight: '48px',
              '& .MuiTab-root': {
                minHeight: '48px',
                fontSize: '0.875rem',
                fontWeight: 500,
                textTransform: 'none',
                py: 1,
                minWidth: 'auto',
                px: 2
              },
              '& .MuiSvgIcon-root': {
                fontSize: '1.2rem'
              },
              '& .MuiTabs-scrollButtons': {
                '&.Mui-disabled': {
                  opacity: 0.3
                }
              }
            }}
          >
            <Tab icon={<Dashboard />} label="Dashboard" />
            <Tab icon={<Inventory />} label="Inventory" />
            <Tab icon={<Upload />} label="Upload Products" />
            <Tab icon={<Analytics />} label="Analytics" />
          </Tabs>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ mt: 1, mb: 4 }}>
        {/* Dashboard Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Store Link Section */}
            <Card sx={{ 
              background: 'linear-gradient(135deg, #006D5B 0%, #004D40 100%)', 
              color: 'white',
              boxShadow: '0 4px 20px rgba(0, 109, 91, 0.3)'
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)' }}>
                      <Store />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5, color: 'white' }}>
                        Your Store Link
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.9, color: 'rgba(255, 255, 255, 0.8)' }}>
                        Share this link with your customers to access your store
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    bgcolor: 'rgba(255, 255, 255, 0.1)', 
                    borderRadius: '8px', 
                    px: 2, 
                    py: 1,
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    gap: 1
                  }}>
                    <Link sx={{ fontSize: '1rem', color: 'rgba(255, 255, 255, 0.8)' }} />
                    <Typography variant="body1" sx={{ fontFamily: 'monospace', fontWeight: 500, flex: 1 }}>
                      {storeUrl}
                    </Typography>
                    <IconButton
                      onClick={handleCopyStoreUrl}
                      sx={{
                        color: 'rgba(255, 255, 255, 0.8)',
                        '&:hover': {
                          bgcolor: 'rgba(255, 255, 255, 0.1)',
                        },
                        p: 0.5
                      }}
                      size="small"
                    >
                      <ContentCopy fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              </CardContent>
            </Card>
            
            {/* Take Location Section */}
            <Card sx={{ 
              background: 'linear-gradient(135deg, #E91E63 0%, #AD1457 100%)', 
              color: 'white',
              boxShadow: '0 4px 20px rgba(233, 30, 99, 0.3)',
              width: '100%'
            }}>
              <CardContent sx={{ py: 1, px: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)', width: 32, height: 32 }}>
                      <LocationOn sx={{ fontSize: '1.2rem' }} />
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'white', fontSize: '0.9rem' }}>
                        Take Location
                      </Typography>
                      <Typography variant="caption" sx={{ opacity: 0.9, color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.75rem' }}>
                        {businessLocation ? `${businessLocation.lat.toFixed(6)}, ${businessLocation.lng.toFixed(6)}` : 'Set your store location'}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Button
                    variant="contained"
                    startIcon={<LocationOn />}
                    onClick={handleTakeLocation}
                    disabled={locationLoading}
                    sx={{
                      bgcolor: 'rgba(255, 255, 255, 0.15)',
                      color: 'white',
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.25)',
                      },
                      '&:disabled': {
                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                        color: 'rgba(255, 255, 255, 0.6)',
                      },
                      borderRadius: '6px',
                      textTransform: 'none',
                      fontSize: '0.8rem',
                      py: 0.5,
                      px: 1.5
                    }}
                  >
                    {locationLoading ? 'Getting...' : businessLocation ? 'Update' : 'Get Location'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
            
            {/* Manage Orders Section */}
            <Card sx={{ 
              background: 'linear-gradient(135deg, #1B5E20 0%, #E91E63 100%)', 
              color: 'white',
              boxShadow: '0 4px 20px rgba(27, 94, 32, 0.3)',
              width: '100%'
            }}>
              <CardContent sx={{ py: 2, px: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)', width: 36, height: 36 }}>
                      <ShoppingBag sx={{ fontSize: '1.3rem' }} />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: 'white' }}>
                        Manage Orders
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.9, color: 'rgba(255, 255, 255, 0.8)' }}>
                        {currentFilteredOrders.length} {orderFilter} orders
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Chip 
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <span>{currentFilteredOrders.length} {getFilterLabel(orderFilter)}</span>
                        <ArrowDropDown sx={{ fontSize: '1rem' }} />
                      </Box>
                    }
                    onClick={handleFilterMenuOpen}
                    sx={{
                      bgcolor: 'rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.3)',
                      }
                    }}
                  />
                </Box>

                {/* Orders List */}
                {currentFilteredOrders.length > 0 ? (
                  <Box sx={{ maxHeight: '300px', overflowY: 'auto', mb: 1 }}>
                    {currentFilteredOrders.slice(0, 3).map((order) => (
                      <Card key={order.id} sx={{ mb: 1.5, bgcolor: 'white', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }}>
                        <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1B5E20', fontSize: '0.85rem' }}>
                                Order #{order.id}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#666', fontSize: '0.7rem', display: 'block' }}>
                                {order.customer} • {order.items.length} item(s) • ₦{order.total.toLocaleString()}
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                <Phone sx={{ fontSize: '0.7rem', color: '#666' }} />
                                <Typography variant="caption" sx={{ color: '#666', fontSize: '0.65rem' }}>
                                  {order.customerPhone}
                                </Typography>
                              </Box>
                              {order.deliveryAgent && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.3 }}>
                                  <DeliveryDining sx={{ fontSize: '0.7rem', color: '#1B5E20' }} />
                                  <Typography variant="caption" sx={{ color: '#1B5E20', fontSize: '0.65rem' }}>
                                    {order.deliveryAgent.name}: {order.deliveryAgent.phone}
                                  </Typography>
                                </Box>
                              )}
                              {!order.deliveryAgent && order.status !== 'pending' && order.status !== 'cancelled' && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.3 }}>
                                  <DeliveryDining sx={{ fontSize: '0.7rem', color: '#999' }} />
                                  <Typography variant="caption" sx={{ color: '#999', fontSize: '0.65rem', fontStyle: 'italic' }}>
                                    No delivery agent assigned
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                            <Chip 
                              label={order.timeAgo}
                              size="small"
                              sx={{
                                bgcolor: '#E91E63',
                                color: 'white',
                                fontSize: '0.6rem',
                                height: '20px'
                              }}
                            />
                          </Box>
                          
                          <Box sx={{ mb: 1.5 }}>
                            {order.items.map((item, idx) => (
                              <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5 }}>
                                <Typography variant="caption" sx={{ color: '#333', fontSize: '0.7rem' }}>
                                  {item.name} x{item.quantity}
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#1B5E20', fontWeight: 500, fontSize: '0.7rem' }}>
                                  ₦{item.price.toLocaleString()}
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                          
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            {order.status === 'pending' && (
                              <>
                                <Button
                                  variant="contained"
                                  size="small"
                                  onClick={() => handleOrderAction(order.id, 'accept')}
                                  sx={{
                                    bgcolor: '#1B5E20',
                                    '&:hover': { bgcolor: '#2E7D32' },
                                    color: 'white',
                                    textTransform: 'none',
                                    fontSize: '0.7rem',
                                    py: 0.5,
                                    px: 1.5,
                                    flex: 1
                                  }}
                                >
                                  Accept Order
                                </Button>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  onClick={() => handleOrderAction(order.id, 'reject')}
                                  sx={{
                                    borderColor: '#E91E63',
                                    color: '#E91E63',
                                    '&:hover': { 
                                      borderColor: '#E91E63',
                                      bgcolor: 'rgba(233, 30, 99, 0.1)'
                                    },
                                    textTransform: 'none',
                                    fontSize: '0.7rem',
                                    py: 0.5,
                                    px: 1.5,
                                    flex: 1
                                  }}
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                            {order.status === 'processing' && (
                              <Box sx={{ display: 'flex', gap: 0.5, width: '100%' }}>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  onClick={() => handleOrderStatusUpdate(order.id, 'dispatched')}
                                  sx={{
                                    borderColor: '#FF9800',
                                    color: '#FF9800',
                                    '&:hover': { 
                                      borderColor: '#FF9800',
                                      bgcolor: 'rgba(255, 152, 0, 0.1)'
                                    },
                                    textTransform: 'none',
                                    fontSize: '0.6rem',
                                    py: 0.3,
                                    px: 1,
                                    flex: 1,
                                    minWidth: 'auto'
                                  }}
                                >
                                  Dispatched
                                </Button>
                                <Button
                                  variant="contained"
                                  size="small"
                                  onClick={() => handleOrderStatusUpdate(order.id, 'completed')}
                                  sx={{
                                    bgcolor: '#4CAF50',
                                    '&:hover': { bgcolor: '#66BB6A' },
                                    color: 'white',
                                    textTransform: 'none',
                                    fontSize: '0.6rem',
                                    py: 0.3,
                                    px: 1,
                                    flex: 1,
                                    minWidth: 'auto'
                                  }}
                                >
                                  Completed
                                </Button>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  onClick={() => handleOrderStatusUpdate(order.id, 'cancelled')}
                                  sx={{
                                    borderColor: '#F44336',
                                    color: '#F44336',
                                    '&:hover': { 
                                      borderColor: '#F44336',
                                      bgcolor: 'rgba(244, 67, 54, 0.1)'
                                    },
                                    textTransform: 'none',
                                    fontSize: '0.6rem',
                                    py: 0.3,
                                    px: 1,
                                    flex: 1,
                                    minWidth: 'auto'
                                  }}
                                >
                                  Failed
                                </Button>
                              </Box>
                            )}
                            {order.status === 'completed' && (
                              <Chip 
                                label="Delivered Successfully"
                                size="small"
                                sx={{
                                  bgcolor: '#4CAF50',
                                  color: 'white',
                                  fontSize: '0.7rem',
                                  width: '100%'
                                }}
                              />
                            )}
                            {order.status === 'cancelled' && (
                              <Chip 
                                label="Order Cancelled"
                                size="small"
                                sx={{
                                  bgcolor: '#F44336',
                                  color: 'white',
                                  fontSize: '0.7rem',
                                  width: '100%'
                                }}
                              />
                            )}
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 2 }}>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.8rem' }}>
                      No pending orders at the moment
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* Filter Menu */}
            <Menu
              anchorEl={filterMenuAnchor}
              open={Boolean(filterMenuAnchor)}
              onClose={handleFilterMenuClose}
              PaperProps={{
                sx: {
                  mt: 1,
                  minWidth: 150,
                }
              }}
            >
              <MenuItem 
                onClick={() => handleFilterChange('pending')}
                sx={{ 
                  color: orderFilter === 'pending' ? '#FF9800' : 'inherit',
                  fontWeight: orderFilter === 'pending' ? 600 : 400
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box 
                    sx={{ 
                      width: 8, 
                      height: 8, 
                      borderRadius: '50%', 
                      bgcolor: '#FF9800' 
                    }} 
                  />
                  Pending ({orders.filter(o => o.status === 'pending').length})
                </Box>
              </MenuItem>
              <MenuItem 
                onClick={() => handleFilterChange('processing')}
                sx={{ 
                  color: orderFilter === 'processing' ? '#2196F3' : 'inherit',
                  fontWeight: orderFilter === 'processing' ? 600 : 400
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box 
                    sx={{ 
                      width: 8, 
                      height: 8, 
                      borderRadius: '50%', 
                      bgcolor: '#2196F3' 
                    }} 
                  />
                  Processing ({orders.filter(o => o.status === 'processing').length})
                </Box>
              </MenuItem>
              <MenuItem 
                onClick={() => handleFilterChange('completed')}
                sx={{ 
                  color: orderFilter === 'completed' ? '#4CAF50' : 'inherit',
                  fontWeight: orderFilter === 'completed' ? 600 : 400
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box 
                    sx={{ 
                      width: 8, 
                      height: 8, 
                      borderRadius: '50%', 
                      bgcolor: '#4CAF50' 
                    }} 
                  />
                  Completed ({orders.filter(o => o.status === 'completed').length})
                </Box>
              </MenuItem>
              <MenuItem 
                onClick={() => handleFilterChange('cancelled')}
                sx={{ 
                  color: orderFilter === 'cancelled' ? '#F44336' : 'inherit',
                  fontWeight: orderFilter === 'cancelled' ? 600 : 400
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box 
                    sx={{ 
                      width: 8, 
                      height: 8, 
                      borderRadius: '50%', 
                      bgcolor: '#F44336' 
                    }} 
                  />
                  Cancelled ({orders.filter(o => o.status === 'cancelled').length})
                </Box>
              </MenuItem>
            </Menu>
            
            {/* Key Personnel Section */}
            <Card sx={{ 
              background: 'linear-gradient(135deg, #2196F3 0%, #1B5E20 100%)', 
              color: 'white',
              boxShadow: '0 4px 20px rgba(33, 150, 243, 0.3)',
              width: '100%'
            }}>
              <CardContent sx={{ py: 2, px: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)', width: 36, height: 36 }}>
                      <Person sx={{ fontSize: '1.3rem' }} />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: 'white' }}>
                        Key Personnel
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.9, color: 'rgba(255, 255, 255, 0.8)' }}>
                        {keyPersonnel ? 'Superintendent Pharmacist assigned' : 'Add your superintendent pharmacist'}
                      </Typography>
                    </Box>
                  </Box>
                  
                  {!keyPersonnel && (
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => setAddPersonnelOpen(true)}
                      sx={{
                        borderColor: 'rgba(255, 255, 255, 0.5)',
                        color: 'white',
                        '&:hover': { 
                          borderColor: 'white',
                          bgcolor: 'rgba(255, 255, 255, 0.1)'
                        },
                        textTransform: 'none',
                        fontSize: '0.75rem'
                      }}
                    >
                      Add Personnel
                    </Button>
                  )}
                </Box>

                {/* Personnel Display or Empty State */}
                {keyPersonnel ? (
                  <Card sx={{ bgcolor: 'white', mb: 1 }}>
                    <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                        <Avatar 
                          src={keyPersonnel.image || '/api/placeholder/60/60'}
                          sx={{ 
                            width: 50, 
                            height: 50,
                            border: '2px solid #1B5E20'
                          }}
                        >
                          <Person sx={{ fontSize: '1.5rem', color: '#1B5E20' }} />
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1B5E20', fontSize: '0.9rem' }}>
                            {keyPersonnel.name}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#E91E63', fontSize: '0.8rem', mb: 0.5 }}>
                            {keyPersonnel.title}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#666', fontSize: '0.75rem', display: 'block' }}>
                            {keyPersonnel.experience} • {keyPersonnel.specialization}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#666', fontSize: '0.7rem', display: 'block' }}>
                            📧 {keyPersonnel.email} • 📞 {keyPersonnel.phone}
                          </Typography>
                        </Box>
                        <Button
                          variant="text"
                          size="small"
                          onClick={() => setKeyPersonnel(null)}
                          sx={{
                            color: '#E91E63',
                            minWidth: 'auto',
                            fontSize: '0.7rem'
                          }}
                        >
                          Remove
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 2 }}>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.8rem' }}>
                      No key personnel added yet. Click "Add Personnel" to get started.
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
            
            {/* CareChat Button Container */}
            <Card sx={{ 
              background: 'linear-gradient(135deg, #9C27B0 0%, #673AB7 100%)', 
              color: 'white',
              boxShadow: '0 4px 20px rgba(156, 39, 176, 0.3)',
              width: '100%',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 25px rgba(156, 39, 176, 0.4)',
              }
            }}>
              <CardContent sx={{ py: 3, px: 3, textAlign: 'center' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ 
                    bgcolor: 'rgba(255, 255, 255, 0.2)', 
                    width: 60, 
                    height: 60,
                    mb: 1
                  }}>
                    <Analytics sx={{ fontSize: '2rem' }} />
                  </Avatar>
                  
                  <Box>
                    <Typography variant="h4" sx={{ 
                      fontWeight: 700, 
                      color: 'white',
                      mb: 1,
                      fontSize: { xs: '1.5rem', sm: '2rem' }
                    }}>
                      CareChat
                    </Typography>
                    <Typography variant="body1" sx={{ 
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontSize: '1rem',
                      maxWidth: '400px',
                      mx: 'auto',
                      lineHeight: 1.5
                    }}>
                      Connect with your patients and provide pharmaceutical consultations
                    </Typography>
                  </Box>

                  <Button
                    variant="contained"
                    size="large"
                    onClick={() => {
                      // TODO: Navigate to CareChat page when created
                      alert('CareChat feature coming soon! This will navigate to the CareChat interface.');
                    }}
                    sx={{
                      bgcolor: 'rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      '&:hover': { 
                        bgcolor: 'rgba(255, 255, 255, 0.3)',
                      },
                      textTransform: 'none',
                      fontSize: '1rem',
                      py: 1.5,
                      px: 4,
                      mt: 1,
                      borderRadius: 3,
                      fontWeight: 600,
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    Launch CareChat
                  </Button>
                </Box>
              </CardContent>
            </Card>
            

          </Box>
        </TabPanel>

        {/* Inventory Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box display="flex" alignItems="center" mb={3}>
            <Typography variant="h5" fontWeight="600">
              Inventory Management
            </Typography>
          </Box>

          {/* Bulk Management Section */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="600" gutterBottom>Bulk Management</Typography>
              {bulkBatches && bulkBatches.length === 0 ? (
                <Typography color="textSecondary">No bulk uploads yet.</Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>File Name</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Products</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {bulkBatches.map((batch, idx) => (
                        <TableRow key={batch.id}>
                          <TableCell>{batch.fileName}</TableCell>
                          <TableCell>{batch.date}</TableCell>
                          <TableCell>{batch.products.length}</TableCell>
                          <TableCell>
                            <Button size="small" color="primary" variant="outlined" style={{ marginRight: 8 }} onClick={() => handleEditBatch(idx)}>Edit</Button>
                            <Button size="small" color="error" variant="outlined" onClick={() => handleDeleteBatch(idx)}>Delete</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>

          {inventoryProducts.length === 0 ? (
            <Typography color="textSecondary">No products in inventory yet.</Typography>
          ) : (
            <Card>
              <CardContent>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Product Name</TableCell>
                        <TableCell>Active</TableCell>
                        <TableCell>Class</TableCell>
                        <TableCell>Amount</TableCell>
                <TableCell>Business</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Image</TableCell>
                <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {inventoryProducts.map((product, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{product.name}</TableCell>
                          <TableCell>{product.active}</TableCell>
                          <TableCell>{product.class}</TableCell>
                          <TableCell>{product.price}</TableCell>
                  <TableCell>{product.business}</TableCell>
                  <TableCell>{product.location}</TableCell>
                  <TableCell>
                    {product.image ? (
                      <img src={product.image} alt={product.name} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} />
                    ) : (
                      <span style={{ color: '#aaa' }}>No Image</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button size="small" color="primary" variant="outlined" style={{ marginRight: 8 }} onClick={() => handleEditProduct(idx)}>Edit</Button>

      {/* Edit Product Dialog */}
      <Dialog open={editDialogOpen} onClose={handleCancelEditProduct} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Product</DialogTitle>
        <DialogContent>
          {editProductForm && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Product Name"
                fullWidth
                value={editProductForm.name}
                onChange={e => handleEditProductFormChange('name', e.target.value)}
              />
              <TextField
                label="Active Ingredient"
                fullWidth
                value={editProductForm.active}
                onChange={e => handleEditProductFormChange('active', e.target.value)}
              />
              <TextField
                label="Class"
                fullWidth
                value={editProductForm.class}
                onChange={e => handleEditProductFormChange('class', e.target.value)}
              />
              <TextField
                label="Price"
                fullWidth
                value={editProductForm.price}
                onChange={e => handleEditProductFormChange('price', e.target.value)}
              />
              <TextField
                label="Business"
                fullWidth
                value={editProductForm.business}
                onChange={e => handleEditProductFormChange('business', e.target.value)}
              />
              <TextField
                label="Location"
                fullWidth
                value={editProductForm.location}
                onChange={e => handleEditProductFormChange('location', e.target.value)}
              />
              <TextField
                label="Image URL"
                fullWidth
                value={editProductForm.image || ''}
                onChange={e => handleEditProductFormChange('image', e.target.value)}
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelEditProduct}>Cancel</Button>
          <Button onClick={handleSaveEditProduct} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
      {/* Edit Product Dialog */}
      <Dialog open={editDialogOpen} onClose={handleCancelEditProduct} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Product</DialogTitle>
        <DialogContent>
          {editProductForm && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Product Name"
                fullWidth
                value={editProductForm.name}
                onChange={e => handleEditProductFormChange('name', e.target.value)}
              />
              <TextField
                label="Active Ingredient"
                fullWidth
                value={editProductForm.active}
                onChange={e => handleEditProductFormChange('active', e.target.value)}
              />
              <TextField
                label="Class"
                fullWidth
                value={editProductForm.class}
                onChange={e => handleEditProductFormChange('class', e.target.value)}
              />
              <TextField
                label="Price"
                fullWidth
                value={editProductForm.price}
                onChange={e => handleEditProductFormChange('price', e.target.value)}
              />
              <TextField
                label="Business"
                fullWidth
                value={editProductForm.business}
                onChange={e => handleEditProductFormChange('business', e.target.value)}
              />
              <TextField
                label="Location"
                fullWidth
                value={editProductForm.location}
                onChange={e => handleEditProductFormChange('location', e.target.value)}
              />
              <TextField
                label="Image URL"
                fullWidth
                value={editProductForm.image || ''}
                onChange={e => handleEditProductFormChange('image', e.target.value)}
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelEditProduct}>Cancel</Button>
          <Button onClick={handleSaveEditProduct} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
                    <Button size="small" color="error" variant="outlined" onClick={() => {
                      setInventoryProducts((prev) => prev.filter((_, i) => i !== idx));
                    }}>Delete</Button>
                  </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          )}
        </TabPanel>

        {/* Upload Products Tab */}
        <TabPanel value={tabValue} index={2}>
          <Typography variant="h5" fontWeight="600" gutterBottom>
            Upload Products
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Single Product Upload
                  </Typography>
                  <Typography color="textSecondary" paragraph>
                    Add products one at a time with detailed information
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => setAddProductOpen(true)}
                    fullWidth
                  >
                    Add Single Product
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Bulk CSV Upload
                  </Typography>
                  <Typography color="textSecondary" paragraph>
                    Upload multiple products using CSV files
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<CloudUpload />}
                    onClick={() => setCsvUploadOpen(true)}
                    fullWidth
                  >
                    Upload CSV File
                  </Button>
                </CardContent>
              </Card>
            </Box>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  CSV Upload Instructions
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                  Your CSV file should include the following columns:
                </Typography>
                <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, fontFamily: 'monospace' }}>
                  product_name, active, class, amount
                </Box>
                <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
                  • File formats supported: CSV, XLS, XLSX<br/>
                  • Maximum file size: 10MB<br/>
                  • Maximum 1000 products per upload
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </TabPanel>

        {/* Analytics Tab */}
        <TabPanel value={tabValue} index={3}>
          <Typography variant="h5" fontWeight="600" gutterBottom>
            Analytics & Reports
          </Typography>
          
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h6" gutterBottom>
                  Sales This Month
                </Typography>
                <Typography variant="h3" color="primary" fontWeight="bold">
                  $18,547
                </Typography>
                <Typography color="success.main">
                  +12% from last month
                </Typography>
              </CardContent>
            </Card>

            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h6" gutterBottom>
                  Top Category
                </Typography>
                <Typography variant="h4" color="secondary" fontWeight="bold">
                  Pain Relief
                </Typography>
                <Typography color="textSecondary">
                  45% of total sales
                </Typography>
              </CardContent>
            </Card>

            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h6" gutterBottom>
                  Avg. Order Value
                </Typography>
                <Typography variant="h3" color="primary" fontWeight="bold">
                  $24.99
                </Typography>
                <Typography color="success.main">
                  +8% from last month
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </TabPanel>
      </Container>

      {/* Add Product Dialog */}
      <Dialog open={addProductOpen} onClose={() => setAddProductOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: '#1B5E20', color: 'white' }}>
          Add New Medicine
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={3}>
            {/* Basic Information */}
            <Box>
              <Typography variant="h6" sx={{ mb: 2, color: '#1B5E20' }}>Basic Information</Typography>
              <Stack spacing={2}>
                <TextField 
                  fullWidth 
                  label="Medicine Name *" 
                  placeholder="e.g., Paracetamol"
                  value={productForm.name}
                  onChange={(e) => handleProductFormChange('name', e.target.value)}
                  sx={{
                    '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#1B5E20',
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: '#1B5E20',
                    }
                  }}
                />
                <TextField 
                  fullWidth 
                  label="Active Ingredient *" 
                  placeholder="e.g., Acetaminophen"
                  value={productForm.activeIngredient}
                  onChange={(e) => handleProductFormChange('activeIngredient', e.target.value)}
                  sx={{
                    '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#1B5E20',
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: '#1B5E20',
                    }
                  }}
                />
                <FormControl fullWidth>
                  <InputLabel sx={{ '&.Mui-focused': { color: '#1B5E20' } }}>Drug Class *</InputLabel>
                  <Select
                    value={productForm.drugClass}
                    onChange={(e) => handleProductFormChange('drugClass', e.target.value)}
                    label="Drug Class *"
                    sx={{
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#1B5E20',
                      }
                    }}
                  >
                    <MenuItem value="Analgesics">Analgesics (Pain Relief)</MenuItem>
                    <MenuItem value="Antibiotics">Antibiotics</MenuItem>
                    <MenuItem value="Antacids">Antacids</MenuItem>
                    <MenuItem value="Antihistamines">Antihistamines</MenuItem>
                    <MenuItem value="Anti-inflammatory">Anti-inflammatory</MenuItem>
                    <MenuItem value="Cardiovascular">Cardiovascular</MenuItem>
                    <MenuItem value="Diabetes">Diabetes Management</MenuItem>
                    <MenuItem value="Respiratory">Respiratory</MenuItem>
                    <MenuItem value="Vitamins">Vitamins & Supplements</MenuItem>
                    <MenuItem value="Others">Others</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </Box>

            {/* Product Details */}
            <Box>
              <Typography variant="h6" sx={{ mb: 2, color: '#1B5E20' }}>Product Details</Typography>
              <Stack spacing={2}>
                <TextField 
                  fullWidth 
                  label="Price (₦) *" 
                  type="number"
                  placeholder="e.g., 2500"
                  value={productForm.price}
                  onChange={(e) => handleProductFormChange('price', e.target.value)}
                  sx={{
                    '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#1B5E20',
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: '#1B5E20',
                    }
                  }}
                />
                <FormControlLabel
                  control={
                    <Checkbox 
                      checked={productForm.prescriptionRequired}
                      onChange={(e) => handleProductFormChange('prescriptionRequired', e.target.checked)}
                      sx={{
                        '&.Mui-checked': {
                          color: '#1B5E20',
                        }
                      }}
                    />
                  }
                  label="Prescription Required"
                />
              </Stack>
            </Box>

            {/* Business Information */}
            <Box>
              <Typography variant="h6" sx={{ mb: 2, color: '#1B5E20' }}>Business Information</Typography>
              <Stack spacing={2}>
                <TextField 
                  fullWidth 
                  label="Business Name" 
                  value={businessName}
                  disabled
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'grey.100',
                    }
                  }}
                />
                <TextField 
                  fullWidth 
                  label="Location" 
                  value="Auto-detected from business profile"
                  disabled
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'grey.100',
                    }
                  }}
                />
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddProductOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleAddProduct}
            variant="contained"
            sx={{
              bgcolor: '#1B5E20',
              '&:hover': { bgcolor: '#2E7D32' }
            }}
          >
            Add Medicine
          </Button>
        </DialogActions>
      </Dialog>

      {/* CSV Upload Dialog */}
      <Dialog open={csvUploadOpen} onClose={() => { setCsvUploadOpen(false); setCsvPreview(null); setCsvReady(false); }} maxWidth="md" fullWidth>
        <DialogTitle>Upload CSV File</DialogTitle>
        <DialogContent>
          {csvPreview && csvReady ? (
            <>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>Preview Products to Upload</Typography>
              <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Active Ingredient</TableCell>
                      <TableCell>Class</TableCell>
                      <TableCell>Price</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {csvPreview.map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{row.name}</TableCell>
                        <TableCell>{row.active}</TableCell>
                        <TableCell>{row.class}</TableCell>
                        <TableCell>{row.price}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                {csvPreview.length} products detected. Please review before sending to inventory.
              </Typography>
            </>
          ) : (
            <Box
              {...getRootProps()}
              sx={{
                border: '2px dashed',
                borderColor: isDragActive ? 'primary.main' : 'grey.300',
                borderRadius: 2,
                p: 4,
                textAlign: 'center',
                cursor: 'pointer',
                bgcolor: isDragActive ? 'primary.50' : 'background.paper',
                mt: 2
              }}
            >
              <input {...getInputProps()} />
              <CloudUpload sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                {isDragActive ? 'Drop the file here' : 'Drag & drop your CSV file here'}
              </Typography>
              <Typography color="textSecondary">
                or click to browse files
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setCsvUploadOpen(false); setCsvPreview(null); setCsvReady(false); }}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!csvPreview || !csvReady}
            onClick={() => {
              if (!csvPreview) return;
              setInventoryProducts((prev) => [
                ...prev,
                ...csvPreview.map(row => ({
                  name: row.name,
                  active: row.active,
                  class: row.class,
                  price: row.price,
                  business: businessName,
                  location: businessLocation ? `${businessLocation.lat.toFixed(6)}, ${businessLocation.lng.toFixed(6)}` : 'N/A',
                  image: undefined,
                }))
              ]);
              setCsvUploadOpen(false);
              setCsvPreview(null);
              setCsvReady(false);
            }}
          >
            Send to Inventory
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Personnel Dialog */}
      <Dialog open={addPersonnelOpen} onClose={() => setAddPersonnelOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#1B5E20', color: 'white' }}>
          Add Key Personnel
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={2}>
            <TextField
              label="Full Name *"
              variant="outlined"
              fullWidth
              value={personnelForm.name}
              onChange={(e) => handlePersonnelFormChange('name', e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#1B5E20',
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: '#1B5E20',
                }
              }}
            />
            <TextField
              label="Title"
              variant="outlined"
              fullWidth
              value={personnelForm.title}
              onChange={(e) => handlePersonnelFormChange('title', e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#1B5E20',
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: '#1B5E20',
                }
              }}
            />
            <TextField
              label="Years of Experience *"
              variant="outlined"
              fullWidth
              placeholder="e.g., 10+ years"
              value={personnelForm.experience}
              onChange={(e) => handlePersonnelFormChange('experience', e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#1B5E20',
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: '#1B5E20',
                }
              }}
            />
            <TextField
              label="Specialization *"
              variant="outlined"
              fullWidth
              placeholder="e.g., Clinical Pharmacy, Drug Information"
              value={personnelForm.specialization}
              onChange={(e) => handlePersonnelFormChange('specialization', e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#1B5E20',
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: '#1B5E20',
                }
              }}
            />
            <TextField
              label="Email Address *"
              variant="outlined"
              fullWidth
              type="email"
              value={personnelForm.email}
              onChange={(e) => handlePersonnelFormChange('email', e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#1B5E20',
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: '#1B5E20',
                }
              }}
            />
            <TextField
              label="Phone Number *"
              variant="outlined"
              fullWidth
              value={personnelForm.phone}
              onChange={(e) => handlePersonnelFormChange('phone', e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#1B5E20',
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: '#1B5E20',
                }
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddPersonnelOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleAddPersonnel}
            variant="contained"
            sx={{
              bgcolor: '#1B5E20',
              '&:hover': { bgcolor: '#2E7D32' }
            }}
          >
            Add Personnel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}