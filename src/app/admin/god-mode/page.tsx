'use client';

import { useState, useEffect } from 'react';
import { useSession } from '@/context/SessionProvider';
import { 
    Box, Typography, Container, Alert, CircularProgress, Button, Paper, 
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
    Select, MenuItem, FormControl, InputLabel, TextField, Modal, IconButton,
    Grid, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
    Link, Collapse, Tabs, Tab
} from '@mui/material';
import Navbar from '@/app/components/Navbar';
import { 
    Close as CloseIcon, 
    NavigateBefore, 
    NavigateNext, 
    Edit as EditIcon, 
    Delete as DeleteIcon, 
    CheckCircle, 
    Cancel, 
    WhatsApp as WhatsAppIcon, 
    KeyboardArrowDown as KeyboardArrowDownIcon,
    KeyboardArrowUp as KeyboardArrowUpIcon
} from '@mui/icons-material';
import axios from 'axios';
import './GodMode.css';
import { useRouter } from 'next/navigation';

const modalStyle = {
  position: 'absolute' as 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 600,
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
  maxHeight: '80vh',
  overflowY: 'auto',
};

function useDebounce(value: string, delay: number) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
}


const UserRow = ({ user, index, page, limit, onEdit, onDelete }: { user: any, index: number, page: number, limit: number, onEdit: (doc: any) => void, onDelete: (doc: any) => void }) => {
    const [open, setOpen] = useState(false);
    const phoneNumber = user.role === 'pharmacist' ? user.mobile : user.phoneNumber;

    const formatWhatsAppNumber = (phone: string) => {
        if (!phone) return '';
        // Remove all non-numeric characters
        const cleaned = String(phone).replace(/[^0-9]/g, '');
        // If the number starts with 0, replace it with the country code 234
        if (cleaned.startsWith('0')) {
            return `234${cleaned.substring(1)}`;
        }
        // Otherwise, return the cleaned number as is
        return cleaned;
    };

    const message = `Good afternoon, Pharm ${user.username} from ${user.stateOfPractice || 'your state'},

Thank you for signing up on PharmaStackX.

To ensure you receive important updates and medicine requests without interruption, please save this number on your phone and reply DONE once completed.`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${formatWhatsAppNumber(phoneNumber)}?text=${encodedMessage}`;

    // Fields that are either sensitive or already displayed in the main row
    const mainFields = ['_id', 'username', 'email', 'phoneNumber', 'mobile', 'role', 'isPWA', 'fcmTokens', '__v', 'salt', 'hash', 'verificationToken', 'verificationTokenExpires'];
    const extraDetails = Object.entries(user).filter(([key]) => !mainFields.includes(key));

    return (
        <>
            <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
                 <TableCell>{((page - 1) * limit) + index + 1}</TableCell>
                <TableCell>{user.username}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                    {phoneNumber ? (
                        <Link 
                        href={whatsappUrl}
                            target="_blank" 
                            rel="noopener noreferrer" 
                            sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'inherit', '&:hover': { textDecoration: 'underline'} }}
                        >
                            <WhatsAppIcon sx={{ color: '#25D366', mr: 1 }} />
                            {phoneNumber}
                        </Link>
                    ) : '-'}
                </TableCell>
                <TableCell>{user.role}</TableCell>
                <TableCell align="center">
                    {user.isPWA ? <CheckCircle color="success" /> : <Cancel color="error" />}
                </TableCell>
                <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.fcmTokens && user.fcmTokens.length > 0 ? user.fcmTokens.join(', ') : '-'}
                </TableCell>
                <TableCell>
                    <IconButton onClick={() => onEdit(user)} size="small" sx={{ color: '#0F6E56' }}><EditIcon fontSize="small" /></IconButton>
                    <IconButton onClick={() => onDelete(user)} size="small" sx={{ color: '#C84B8F' }}><DeleteIcon fontSize="small" /></IconButton>
                     <IconButton
                        aria-label="expand row"
                        size="small"
                        onClick={() => setOpen(!open)}
                        sx={{ ml: 1 }}
                    >
                        {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    </IconButton>
                </TableCell>
            </TableRow>
            <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0, border: 'none' }} colSpan={8}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 2, p: 3, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: '20px', border: '1px solid rgba(0,0,0,0.05)' }}>
                            <Typography variant="h6" gutterBottom component="div" sx={{ fontFamily: 'Fraunces', fontWeight: 900 }}>
                                Profile Details
                            </Typography>
                            {extraDetails.length > 0 ? (
                                <Grid container spacing={2}>
                                    {extraDetails.map(([key, value]) => (
                                        <Grid item xs={12} sm={6} md={4} key={key}>
                                            <Typography variant="caption" sx={{ fontWeight: 800, color: '#999', textTransform: 'uppercase', letterSpacing: 1 }}>{key}</Typography>
                                            <Typography variant="body2" sx={{ wordBreak: 'break-all', background: '#fff', p: 1.5, borderRadius: '12px', mt: 0.5, border: '1px solid #eee' }}>
                                                {typeof value === 'object' && value !== null ? JSON.stringify(value, null, 2) : String(value)}
                                            </Typography>
                                        </Grid>
                                    ))}
                                </Grid>
                            ) : (
                                <Typography variant="body2" sx={{ color: '#999' }}>No additional details available.</Typography>
                            )}
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </>
    );
};


// Specific component for rendering the Users table
const UsersTable = ({ data, page, limit, onEdit, onDelete }: { data: any[], page: number, limit: number, onEdit: (doc: any) => void, onDelete: (doc: any) => void }) => {
    return (
        <div className="modern-table-container">
            <Table stickyHeader className="modern-table">
                <TableHead>
                    <TableRow>
                        <TableCell>S/N</TableCell>
                        <TableCell>Username</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Phone</TableCell>
                        <TableCell>Role</TableCell>
                        <TableCell align="center">PWA</TableCell>
                        <TableCell>FCM Tokens</TableCell>
                        <TableCell>Actions</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                     {data.map((user, index) => (
                        <UserRow key={user._id} user={user} index={index} page={page} limit={limit} onEdit={onEdit} onDelete={onDelete} />
                    ))}
                </TableBody>
            </Table>
        </div>
    );
};

// Generic component for rendering other collections
const GenericTable = ({ data, page, limit, onEdit, onDelete, onOpenModal }: { data: any[], page: number, limit: number, onEdit: (doc: any) => void, onDelete: (doc: any) => void, onOpenModal: (data: any) => void }) => {
    if (data.length === 0) {
        return (
            <Typography sx={{ textAlign: 'center', py: 8, color: '#999', fontFamily: 'Sora' }}>
                No records found matching your criteria.
            </Typography>
        );
    }
    return (
        <div className="modern-table-container">
            <Table stickyHeader className="modern-table">
                <TableHead>
                    <TableRow>
                        <TableCell>S/N</TableCell>
                        {Object.keys(data[0]).map(key => (
                            <TableCell key={key}>{key}</TableCell>
                        ))}
                        <TableCell>Actions</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {data.map((item, index) => (
                        <TableRow key={item._id || index} hover>
                            <TableCell>{((page - 1) * limit) + index + 1}</TableCell>
                            {Object.entries(item).map(([key, value]: [string, any]) => (
                                <TableCell key={key} sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {typeof value === 'object' && value !== null ? (
                                        <Button 
                                            size="small" 
                                            onClick={() => onOpenModal(value)}
                                            sx={{ color: '#0F6E56', textTransform: 'none', fontWeight: 600 }}
                                        >
                                            View JSON
                                        </Button>
                                    ) : String(value)}
                                </TableCell>
                            ))}
                            <TableCell>
                                <IconButton onClick={() => onEdit(item)} size="small" sx={{ color: '#0F6E56' }}><EditIcon fontSize="small" /></IconButton>
                                <IconButton onClick={() => onDelete(item)} size="small" sx={{ color: '#C84B8F' }}><DeleteIcon fontSize="small" /></IconButton>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
};

interface DemoUser {
    _id: string;
    username: string;
    email: string;
    mobile: string;
    stateOfPractice: string;
    pharmacy: {
        businessName: string;
    }
}

const RegisteredUsersView = () => {
    const [users, setUsers] = useState<DemoUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await axios.get('/api/admin/users');
                if (res.data && Array.isArray(res.data)) {
                    setUsers(res.data);
                } else {
                    setError('Failed to load registered users.');
                }
            } catch (err: any) {
                if (err.response?.status === 403) {
                    setError('You do not have permission to view this page.');
                } else {
                    setError('An error occurred while fetching registrations.');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, []);

    if (loading) {
        return <CircularProgress />;
    }

    if (error) {
        return <Alert severity="error">{error}</Alert>;
    }

    return (
        <div className="modern-table-container">
            <Table className="modern-table">
                <TableHead>
                    <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Mobile</TableCell>
                        <TableCell>State of Practice</TableCell>
                        <TableCell>Pharmacy</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {users.map((user) => (
                        <TableRow key={user._id}>
                            <TableCell sx={{ fontWeight: 600 }}>{user.username}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>{user.mobile}</TableCell>
                            <TableCell>{user.stateOfPractice}</TableCell>
                            <TableCell>{user.pharmacy?.businessName || 'N/A'}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}


const GodModePage = () => {
    const { user, isLoading: sessionLoading } = useSession();
    const router = useRouter();

    const [selectedTab, setSelectedTab] = useState(0);
    const [collections, setCollections] = useState<string[]>([]);
    const [selectedCollection, setSelectedCollection] = useState<string>('');
    const [collectionData, setCollectionData] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    const [modalOpen, setModalOpen] = useState(false);
    const [modalData, setModalData] = useState<string>('');
    const [editingDoc, setEditingDoc] = useState<any | null>(null);

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [docToDelete, setDocToDelete] = useState<any | null>(null);
    
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [limit, setLimit] = useState(100);
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

    useEffect(() => {
        const fetchCollections = async () => {
            try {
                const res = await fetch('/api/admin/god-mode');
                if (res.ok) {
                    const data = await res.json();
                    setCollections(data);
                } else {
                    setError('Failed to fetch collections.');
                }
            } catch (err) {
                setError('An error occurred while fetching collections.');
            }
            setLoading(false);
        };
        if (user?.role === 'admin') {
            fetchCollections();
        }
    }, [user]);

    const fetchCollectionData = async (collection: string, newPage: number = 1, sort: 'desc' | 'asc' = 'desc', search: string = '') => {
        if (!collection) return;
        setLoading(true);
        setError(null);
        setSuccess(null);
        try {
            const res = await fetch(`/api/admin/god-mode?collection=${collection}&page=${newPage}&sort=${sort}&search=${search}`);
            if (res.ok) {
                const { data, total, limit } = await res.json();
                setCollectionData(data);
                setTotal(total);
                setLimit(limit);
                setPage(newPage);
            } else {
                setError(`Failed to fetch data for ${collection}.`);
            }
        } catch (err) {
            setError(`An error occurred while fetching data for ${collection}.`);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (selectedCollection) {
            fetchCollectionData(selectedCollection, 1, sortOrder, debouncedSearchTerm);
        }
    }, [debouncedSearchTerm]);

    const handleOpenModal = (data: any) => {
        setModalData(JSON.stringify(data, null, 2));
        setModalOpen(true);
    };
    const handleCloseModal = () => {
        setModalOpen(false);
        setEditingDoc(null);
    }

    const handleCollectionChange = (collection: string) => {
        setSelectedCollection(collection);
        setSearchTerm(''); 
        fetchCollectionData(collection, 1, sortOrder, '');
    }
    
    const handleSortChange = (newSortOrder: 'desc' | 'asc') => {
        setSortOrder(newSortOrder);
        if(selectedCollection) {
            fetchCollectionData(selectedCollection, 1, newSortOrder, debouncedSearchTerm);
        }
    }

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setSelectedTab(newValue);
    };

    const handleEdit = (doc: any) => {
        setEditingDoc(doc);
        setModalData(JSON.stringify(doc, null, 2));
        setModalOpen(true);
    };

    const handleDelete = (doc: any) => {
        setDocToDelete(doc);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!docToDelete || !selectedCollection) return;
        try {
            const res = await fetch(`/api/admin/god-mode/${selectedCollection}/${docToDelete._id}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                setSuccess('Document deleted successfully.');
                fetchCollectionData(selectedCollection, page, sortOrder, debouncedSearchTerm);
            } else {
                const data = await res.json();
                setError(data.message || 'Failed to delete document.');
            }
        } catch (err) {
            setError('An error occurred while deleting the document.');
        }
        setDeleteDialogOpen(false);
        setDocToDelete(null);
    };

    const handleSave = async () => {
        if (!editingDoc || !selectedCollection) return;
        try {
            const updatedData = JSON.parse(modalData);
            const res = await fetch(`/api/admin/god-mode/${selectedCollection}/${editingDoc._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedData),
            });
            if (res.ok) {
                setSuccess('Document updated successfully.');
                fetchCollectionData(selectedCollection, page, sortOrder, debouncedSearchTerm);
            } else {
                const data = await res.json();
                setError(data.message || 'Failed to update document.');
            }
        } catch (err) {
            setError('Invalid JSON format or error updating the document.');
        }
        handleCloseModal();
    };

    if (sessionLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
    }

    if (user?.role !== 'admin') {
        return (
            <>
                <Navbar />
                <Container maxWidth="lg" sx={{ py: 4 }}>
                    <Alert severity="error" sx={{ mt: 4 }}><Typography variant="h6">Permission Denied</Typography>You do not have the necessary permissions to access this page.</Alert>
                </Container>
            </>
        );
    }
    
    const totalPages = Math.ceil(total / limit);

    const renderMainContent = () => {
        if (selectedTab === 1) {
            return <RegisteredUsersView />
        }
        
        // Original content for the "Database Collections" tab
        return (
            <>
                 <div className="glass-panel control-bar" style={{ padding: '20px' }}>
                        <FormControl sx={{ minWidth: 240, flexGrow: 1}}>
                        <InputLabel id="collection-select-label">Select Domain</InputLabel>
                        <Select
                            labelId="collection-select-label"
                            value={selectedCollection}
                            label="Select Domain"
                            sx={{ borderRadius: '16px' }}
                            onChange={(e) => handleCollectionChange(e.target.value as string)}
                        >
                            <MenuItem value="">
                                <em>None</em>
                            </MenuItem>
                            {collections.map(collection => (
                                <MenuItem key={collection} value={collection}>{collection}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField 
                        label="Search All Fields"
                        variant="outlined"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        sx={{ flexGrow: 2, minWidth: 300, '& .MuiOutlinedInput-root': { borderRadius: '16px' } }}
                        disabled={!selectedCollection}
                    />
                    <FormControl sx={{ minWidth: 150 }} disabled={!selectedCollection}>
                        <InputLabel id="sort-order-label">Sort By</InputLabel>
                        <Select
                            labelId="sort-order-label"
                            value={sortOrder}
                            label="Sort By"
                            sx={{ borderRadius: '16px' }}
                            onChange={(e) => handleSortChange(e.target.value as 'desc' | 'asc')}
                        >
                            <MenuItem value="desc">Latest</MenuItem>
                            <MenuItem value="asc">Oldest</MenuItem>
                        </Select>
                    </FormControl>
                </div>

                <div className="glass-panel" style={{ padding: 0 }}>
                     {loading ? (
                        <Box sx={{textAlign: 'center', p: 8}}><CircularProgress sx={{ color: '#004D40' }} /></Box>
                    ) : selectedCollection ? (
                        <>
                            {selectedCollection === 'users' ? 
                                <UsersTable data={collectionData} page={page} limit={limit} onEdit={handleEdit} onDelete={handleDelete} /> : 
                                <GenericTable data={collectionData} page={page} limit={limit} onEdit={handleEdit} onDelete={handleDelete} onOpenModal={handleOpenModal} />
                            }
                            {total > limit && (
                                <Box sx={{ p: 3, borderTop: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="body2" sx={{ fontFamily: 'Sora', color: '#666' }}>
                                        Showing <strong>{((page - 1) * limit) + 1}</strong> - <strong>{Math.min(page * limit, total)}</strong> of <strong>{total}</strong>
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <IconButton onClick={() => fetchCollectionData(selectedCollection, page - 1, sortOrder, debouncedSearchTerm)} disabled={page <= 1}>
                                            <NavigateBefore />
                                        </IconButton>
                                        <Typography sx={{ mx: 2, fontFamily: 'Sora', fontWeight: 600 }}>
                                            Page {page} of {totalPages}
                                        </Typography>
                                        <IconButton onClick={() => fetchCollectionData(selectedCollection, page + 1, sortOrder, debouncedSearchTerm)} disabled={page >= totalPages}>
                                            <NavigateNext />
                                        </IconButton>
                                    </Box>
                                </Box>
                            )}
                        </>
                    ) : (
                        <Box sx={{ p: 10, textAlign: 'center' }}>
                            <Typography variant="h5" sx={{ fontFamily: 'Fraunces', color: '#ccc', fontWeight: 900 }}>Select a Domain to Begin</Typography>
                            <Typography variant="body2" sx={{ color: '#ddd', mt: 1 }}>Access high-level database overrides and system controls.</Typography>
                        </Box>
                    )}
                </div>
            </>
        )
    }

    return (
        <div className="god-mode-root">
            <Navbar />
            <Box sx={{ minHeight: 'calc(100vh - 64px)' }}>
                <Container maxWidth="xl" sx={{ py: { xs: 4, md: 6 } }}>
                    
                    <div className="god-mode-header">
                        <Box 
                            sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#666', mb: 2, cursor: 'pointer', '&:hover': { color: '#000' } }}
                            onClick={() => router.back()}
                        >
                            <NavigateBefore />
                            <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'Sora' }}>Back to Activity Hub</Typography>
                        </Box>
                        <Typography variant="h1" className="god-mode-title">God Mode</Typography>
                        <Typography variant="body2" sx={{ color: '#999', mt: 1, fontFamily: 'Sora' }}>System-wide administrative overrides and data management.</Typography>
                    </div>

                    {error && <Alert severity="error" sx={{ mb: 3, borderRadius: '16px' }}>{error}</Alert>}
                    {success && <Alert severity="success" sx={{ mb: 3, borderRadius: '16px' }}>{success}</Alert>}

                    <Box sx={{ borderBottom: 1, borderColor: 'rgba(0,0,0,0.05)', mb: 4 }}>
                        <Tabs value={selectedTab} onChange={handleTabChange} className="admin-tabs" aria-label="god mode tabs">
                            <Tab label="System Overrides" />
                            <Tab label="Direct Registrations" />
                        </Tabs>
                    </Box>

                    {renderMainContent()}

                </Container>
            </Box>

            <Modal 
                open={modalOpen} 
                onClose={handleCloseModal}
                slotProps={{
                    backdrop: {
                        className: 'glass-modal-overlay'
                    }
                }}
            >
                <div className="glass-modal-content sora">
                    <div className="modal-header">
                        <Typography variant="h6" sx={{ fontFamily: 'Fraunces', fontWeight: 900 }}>
                            {editingDoc ? 'Edit Entity' : 'Raw Data View'}
                        </Typography>
                        <IconButton onClick={handleCloseModal}><CloseIcon /></IconButton>
                    </div>
                    <div className="modal-body">
                        {editingDoc && (
                             <Alert severity="warning" sx={{ mb: 3, borderRadius: '12px' }}>
                                <strong>Warning:</strong> You are editing a live production document. Ensure JSON validity before saving.
                            </Alert>
                        )}
                        <TextField
                            multiline
                            fullWidth
                            variant="outlined"
                            value={modalData}
                            onChange={(e) => setModalData(e.target.value)}
                            disabled={!editingDoc}
                            className="json-editor"
                            sx={{ 
                                '& .MuiOutlinedInput-root': { border: 'none' },
                                '& .MuiOutlinedInput-notchedOutline': { border: 'none' }
                            }}
                        />
                    </div>
                    <div className="modal-footer">
                        <Button color="inherit" onClick={handleCloseModal} sx={{ borderRadius: '12px', fontWeight: 700 }}>Close</Button>
                        {editingDoc && (
                            <Button 
                                onClick={handleSave} 
                                variant="contained" 
                                sx={{ 
                                    bgcolor: '#111', 
                                    color: '#fff', 
                                    borderRadius: '12px', 
                                    px: 4, 
                                    fontWeight: 700,
                                    '&:hover': { bgcolor: '#000' }
                                }}
                            >
                                Push Changes
                            </Button>
                        )}
                    </div>
                </div>
            </Modal>

            <Dialog 
                open={deleteDialogOpen} 
                onClose={() => setDeleteDialogOpen(false)}
                PaperProps={{
                    sx: { borderRadius: '28px', p: 1 }
                }}
            >
                <DialogTitle sx={{ fontFamily: 'Fraunces', fontWeight: 900, fontSize: '24px' }}>Confirm Obliteration</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ fontFamily: 'Sora', color: '#666' }}>
                        Are you sure you want to delete this document from the <strong>{selectedCollection}</strong> domain? This action is immediate and irreversible.
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setDeleteDialogOpen(false)} sx={{ borderRadius: '12px', color: '#666', fontWeight: 700 }}>Cancel Operation</Button>
                    <Button onClick={confirmDelete} sx={{ borderRadius: '12px', bgcolor: '#C84B8F', color: '#fff', px: 3, fontWeight: 700, '&:hover': { bgcolor: '#A33B72' } }}>Confirm Delete</Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

export default GodModePage;
