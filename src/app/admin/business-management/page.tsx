"use client";
import React, { useState } from "react";
import { Box, Typography, Paper, Stack, Link as MuiLink, Grid, Tabs, Tab, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, CircularProgress, Table, TableBody, TableCell, TableHead, TableRow, InputLabel, InputAdornment } from "@mui/material";
import { useRouter } from "next/navigation";
import SearchIcon from "@mui/icons-material/Search";
import Papa from "papaparse";
import Navbar from "@/components/Navbar";
import { mockBusinesses } from "./mockBusinesses";
import { mockProducts, Product } from "./mockProducts";
import ProductTable from "@/components/ProductTable";
import { mockBulkUploads, BulkUpload } from "./mockBulkUploads";
import BulkTable from "@/components/BulkTable";

function TabPanel(props: { children?: React.ReactNode; value: number; index: number }) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`business-tabpanel-${index}`}
      aria-labelledby={`business-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}


export default function BusinessManagementPage() {
  const router = useRouter();
  const [businesses, setBusinesses] = useState(
    mockBusinesses.map(biz => ({ ...biz, active: true })) // Add active status if not present
  );
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Product>>({});
  const [editOpen, setEditOpen] = useState(false);
  // Product search state for Manage Products tab
  const [searchProduct, setSearchProduct] = useState("");
  // Bulk state
  const [bulks, setBulks] = useState<BulkUpload[]>(mockBulkUploads);
  const [bulkEditId, setBulkEditId] = useState<string | null>(null);
  const [bulkEditForm, setBulkEditForm] = useState<Partial<BulkUpload>>({});
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  // CSV preview state
  const [csvPreview, setCsvPreview] = useState<string[][]>([]);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);
  // Bulk handlers
  const handleEditBulk = (id: string) => {
    const bulk = bulks.find((b) => b.id === id);
    if (bulk) {
      setBulkEditId(id);
      setBulkEditForm({ ...bulk });
      setBulkEditOpen(true);
      // Fetch and parse CSV for preview
      setCsvPreview([]);
      setCsvError(null);
      setCsvLoading(true);
      Papa.parse(bulk.csvUrl, {
        download: true,
        complete: (result) => {
          setCsvPreview(result.data as string[][]);
          setCsvLoading(false);
        },
        error: (err) => {
          setCsvError("Failed to load CSV preview");
          setCsvLoading(false);
        },
      });
    }
  };
  const handleBulkEditFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setBulkEditForm((prev) => ({ ...prev, [name]: value }));
  };
  const handleBulkEditSave = () => {
    if (!bulkEditId) return;
    setBulks((prev) => prev.map((b) => b.id === bulkEditId ? { ...b, ...bulkEditForm } as BulkUpload : b));
    setBulkEditOpen(false);
    setBulkEditId(null);
    setBulkEditForm({});
  };
  const handleBulkEditCancel = () => {
    setBulkEditOpen(false);
    setBulkEditId(null);
    setBulkEditForm({});
    setCsvPreview([]);
    setCsvError(null);
    setCsvLoading(false);
  };
  const handleDeleteBulk = (id: string) => {
    setBulks((prev) => prev.filter((b) => b.id !== id));
  };
  // Handlers for edit and delete
  const handleEditProduct = (id: string) => {
    const prod = products.find((p) => p.id === id);
    if (prod) {
      setEditId(id);
      setEditForm({ ...prod });
      setEditOpen(true);
    }
  };

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSave = () => {
    if (!editId) return;
    setProducts((prev) => prev.map((p) => p.id === editId ? { ...p, ...editForm } as Product : p));
    setEditOpen(false);
    setEditId(null);
    setEditForm({});
  };

  const handleEditCancel = () => {
    setEditOpen(false);
    setEditId(null);
    setEditForm({});
  };
  const handleDeleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };
  const [tab, setTab] = useState(0);
  const [inventoryTab, setInventoryTab] = useState(0);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTab(newValue);
  };
  const handleInventoryTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setInventoryTab(newValue);

    


  };



  return (
    <>
      <Navbar />
      <Box sx={{ p: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: "#1B5E20", mb: 3 }}>
          Business Management
        </Typography>
        <Tabs value={tab} onChange={handleTabChange} aria-label="business management tabs" sx={{ mb: 2 }}>
          <Tab label="All Businesses" id="business-tab-0" aria-controls="business-tabpanel-0" />
          <Tab label="Manage Inventory" id="business-tab-1" aria-controls="business-tabpanel-1" />
        </Tabs>
        <TabPanel value={tab} index={0}>
          <TextField
            placeholder="Search businesses..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            fullWidth
            sx={{ mb: 3, maxWidth: 400 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <Grid container spacing={3}>
            {businesses
              .filter(biz => {
                const q = search.trim().toLowerCase();
                if (!q) return true;
                return (
                  biz.name.toLowerCase().includes(q) ||
                  (biz.email && biz.email.toLowerCase().includes(q)) ||
                  (biz.phone && biz.phone.toLowerCase().includes(q))
                );
              })
              .map((biz, idx) => {
              const storeSlug = biz.name.toLowerCase().replace(/\s+/g, "-");
              const storeUrl = `https://psx.ng/${storeSlug}`;
              return (
                <Box sx={{ width: { xs: '100%', sm: '50%', md: '33.33%' }, padding: 2 }} key={biz.id}>
                  <Paper
                    onClick={() => router.push(`/admin/business-management/${biz.id}`)}
                    sx={{
                      p: 2,
                      borderLeft: 4,
                      borderColor: biz.active ? "#1B5E20" : "#E91E63",
                      minHeight: 260,
                      maxHeight: 260,
                      height: 260,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      textDecoration: "none",
                      cursor: "pointer",
                      transition: "box-shadow 0.2s",
                      '&:hover': { boxShadow: 6, bgcolor: '#f5f5f5' }
                    }}
                    elevation={3}
                  >
                    <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>{biz.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      <b>Store Link:</b> {storeUrl}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <b>Phone:</b> {biz.phone}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <b>Email:</b> {biz.email}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <b>Address:</b> {biz.address}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <b>Joined:</b> {biz.joined}
                    </Typography>
                    <Button
                      variant="contained"
                      color={biz.active ? "error" : "success"}
                      sx={{ mt: 2, fontWeight: 600 }}
                      onClick={e => {
                        e.preventDefault(); e.stopPropagation();
                        setBusinesses(prev => prev.map((b, i) => i === idx ? { ...b, active: !b.active } : b));
                      }}
                    >
                      {biz.active ? "Deactivate" : "Activate"}
                    </Button>
                    <Button
                      variant="outlined"
                      color="primary"
                      sx={{ mt: 1, fontWeight: 600 }}
                      onClick={e => { e.stopPropagation(); window.open(storeUrl, '_blank'); }}
                    >
                      Visit Store
                    </Button>
                  </Paper>
                </Box>
              );
            })}
          </Grid>
        </TabPanel>
        <TabPanel value={tab} index={1}>
          <Tabs value={inventoryTab} onChange={handleInventoryTabChange} aria-label="manage inventory tabs" sx={{ mb: 2 }}>
            <Tab label="Manage Products" id="inventory-tab-0" aria-controls="inventory-tabpanel-0" />
            <Tab label="Manage Bulk" id="inventory-tab-1" aria-controls="inventory-tabpanel-1" />
          </Tabs>
          <TabPanel value={inventoryTab} index={0}>
            <TextField
              placeholder="Search products..."
              value={searchProduct || ''}
              onChange={e => setSearchProduct(e.target.value)}
              fullWidth
              sx={{ mb: 3, maxWidth: 400 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            <ProductTable
              products={products.filter(product => {
                const q = (searchProduct || '').trim().toLowerCase();
                if (!q) return true;
                return (
                  product.name.toLowerCase().includes(q) ||
                  product.active.toLowerCase().includes(q) ||
                  product.class.toLowerCase().includes(q) ||
                  product.business.toLowerCase().includes(q) ||
                  product.location.toLowerCase().includes(q)
                );
              })}
              onEdit={handleEditProduct}
              onDelete={handleDeleteProduct}
              onToggleActive={() => {}}
            />
            <Dialog open={editOpen} onClose={handleEditCancel} maxWidth="sm" fullWidth>
              <DialogTitle>Edit Product</DialogTitle>
              <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                  <TextField
                    label="Product Name"
                    name="name"
                    value={editForm.name || ''}
                    onChange={handleEditFormChange}
                    fullWidth
                  />
                  <TextField
                    label="Active Ingredient"
                    name="active"
                    value={editForm.active || ''}
                    onChange={handleEditFormChange}
                    fullWidth
                  />
                  <TextField
                    label="Class"
                    name="class"
                    value={editForm.class || ''}
                    onChange={handleEditFormChange}
                    fullWidth
                  />
                  <TextField
                    label="Amount"
                    name="amount"
                    type="number"
                    value={editForm.amount || ''}
                    onChange={handleEditFormChange}
                    fullWidth
                  />
                  <TextField
                    label="Business"
                    name="business"
                    value={editForm.business || ''}
                    onChange={handleEditFormChange}
                    fullWidth
                  />
                  <TextField
                    label="Location"
                    name="location"
                    value={editForm.location || ''}
                    onChange={handleEditFormChange}
                    fullWidth
                  />
                  <TextField
                    label="Image URL"
                    name="image"
                    value={editForm.image || ''}
                    onChange={handleEditFormChange}
                    fullWidth
                  />
                </Stack>
              </DialogContent>
              <DialogActions>
                <Button onClick={handleEditCancel}>Cancel</Button>
                <Button onClick={handleEditSave} variant="contained" color="primary">Save</Button>
              </DialogActions>
            </Dialog>
          </TabPanel>
          <TabPanel value={inventoryTab} index={1}>
            <BulkTable
              bulks={bulks}
              onEdit={handleEditBulk}
              onDelete={handleDeleteBulk}
            />
            <Dialog open={bulkEditOpen} onClose={handleBulkEditCancel} maxWidth="md" fullWidth>
              <DialogTitle>Edit Bulk Upload</DialogTitle>
              <DialogContent>
                <Stack spacing={2} sx={{ mt: 1, mb: 2 }}>
                  <TextField
                    label="CSV Name"
                    name="csvName"
                    value={bulkEditForm.csvName || ''}
                    onChange={handleBulkEditFormChange}
                    fullWidth
                  />
                  <TextField
                    label="Business"
                    name="business"
                    value={bulkEditForm.business || ''}
                    onChange={handleBulkEditFormChange}
                    fullWidth
                  />
                  <TextField
                    label="Timestamp"
                    name="timestamp"
                    value={bulkEditForm.timestamp || ''}
                    onChange={handleBulkEditFormChange}
                    fullWidth
                  />
                  <InputLabel shrink htmlFor="csv-upload-input">Upload CSV File</InputLabel>
                  <input
                    id="csv-upload-input"
                    type="file"
                    accept=".csv,text/csv"
                    style={{ marginBottom: 16 }}
                    onChange={e => {
                      const file = e.target.files && e.target.files[0];
                      if (file) {
                        setCsvPreview([]);
                        setCsvError(null);
                        setCsvLoading(true);
                        Papa.parse(file, {
                          complete: (result) => {
                            setCsvPreview(result.data as string[][]);
                            setCsvLoading(false);
                          },
                          error: () => {
                            setCsvError("Failed to load CSV preview");
                            setCsvLoading(false);
                          },
                        });
                        setBulkEditForm((prev) => ({ ...prev, csvName: file.name }));
                      }
                    }}
                  />
                </Stack>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>CSV Preview</Typography>
                {csvLoading && <CircularProgress size={24} />}
                {csvError && <Typography color="error">{csvError}</Typography>}
                {!csvLoading && !csvError && csvPreview.length > 0 && (
                  <Table size="small" sx={{ mb: 2 }}>
                    <TableHead>
                      <TableRow>
                        {csvPreview[0].map((cell, idx) => (
                          <TableCell key={idx}>{cell}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {csvPreview.slice(1).map((row, rIdx) => (
                        <TableRow key={rIdx}>
                          {row.map((cell, cIdx) => (
                            <TableCell key={cIdx}>
                              <TextField
                                value={cell}
                                variant="standard"
                                onChange={e => {
                                  const newVal = e.target.value;
                                  setCsvPreview(prev => {
                                    const updated = prev.map(arr => [...arr]);
                                    updated[rIdx + 1][cIdx] = newVal;
                                    return updated;
                                  });
                                }}
                                fullWidth
                              />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </DialogContent>
              <DialogActions>
                <Button onClick={handleBulkEditCancel}>Cancel</Button>
                <Button onClick={handleBulkEditSave} variant="contained" color="primary">Save</Button>
              </DialogActions>
            </Dialog>
          </TabPanel>
        </TabPanel>
      </Box>
    </>
  );
}
