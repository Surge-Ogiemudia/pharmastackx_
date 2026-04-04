'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
  FormControl,
  SelectChangeEvent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  InputAdornment,
  Button, 
  Modal, 
  Stack, 
  InputLabel, 
  Alert,
  CircularProgress
} from '@mui/material';
import { ExpandMore, Search } from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { User } from '@/types';

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  fontWeight: 'bold',
  color: theme.palette.common.white,
  backgroundColor: '#006D5B',
  padding: '12px 16px',
  textAlign: 'left',
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  '&:nth-of-type(odd)': {
    backgroundColor: theme.palette.action.hover,
  },
  '& > td, & > th': {
    padding: '12px 16px',
    textAlign: 'left',
  },
  '&:last-child td, &:last-child th': {
    border: 0,
  },
}));

const allRoles = ['customer', 'admin', 'pharmacy', 'vendor', 'clinic', 'agent', 'stockManager'];

export default function UserManagementPage() {

  const [usersByRole, setUsersByRole] = useState<Record<string, User[]>>({
    customer: [],
    admin: [],
    pharmacy: [],
    vendor: [],
    clinic: [],
    agent: [],
    stockManager: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', role: 'customer' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);


  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/users');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to parse error JSON' }));
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: User[] = await response.json();
      
      const groupedUsers: Record<string, User[]> = {
        customer: [],
        admin: [],
        pharmacy: [],
        vendor: [],
        clinic: [],
        agent: [],
        stockManager: [],
      };

      data.forEach((user) => {
        const role = user.role?.toLowerCase();
        if (role && groupedUsers.hasOwnProperty(role)) {
          groupedUsers[role].push(user);
        } else {
          console.warn('Unrecognized or missing role for user:', user);
        }
      });

      setUsersByRole(groupedUsers);

    } catch (error) {
      console.error("Failed to fetch and process users:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRoleChange = async (userId: string, event: SelectChangeEvent<string>) => {
    const newRole = event.target.value;
    try {
      const response = await fetch(`/api/admin/users/${userId}`,
        {
          method: 'PATCH', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: newRole }),
        });

      if (!response.ok) {
        throw new Error('Failed to update role');
      }

      await fetchUsers();

    } catch (error) {
      console.error('Error updating user role:', error);
    }
  };

  const handleCreateNewUser = () => {
    setError(null);
    setNewUser({ email: '', password: '', role: 'customer' });
    setModalOpen(true);
  };

  const handleSaveNewUser = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create user.');
      }
      
      // Manually add the new user to the state to ensure the UI updates instantly
      const newUserData = data.user;
      setUsersByRole(prevUsersByRole => {
        const updatedRoleList = [...(prevUsersByRole[newUserData.role] || []), newUserData];
        return {
          ...prevUsersByRole,
          [newUserData.role]: updatedRoleList,
        };
      });

      alert('User created successfully!');
      setModalOpen(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  
  const filteredUsersByRole = useMemo(() => {
    if (!searchQuery) {
      return usersByRole;
    }
    return Object.keys(usersByRole).reduce((acc, roleKey) => {
      const users = usersByRole[roleKey];
      const filtered = users.filter(user => 
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      acc[roleKey] = filtered;
      return acc;
    }, {} as Record<string, User[]>);
  }, [searchQuery, usersByRole]);

  const roleColumns = {
    customer: 'Customers',
    admin: 'Administrators',
    pharmacy: 'Pharmacies',
    vendor: 'Vendors',
    clinic: 'Clinics',
    agent: 'Delivery Agents',
    stockManager: 'Stock Managers',
  };
  
  const roleKeys = Object.keys(roleColumns) as (keyof typeof roleColumns)[];

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
       <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>User Management</Typography>
        <Button variant="contained" color="primary" onClick={handleCreateNewUser}>
            Create New User
        </Button>
      </Box>

      <Box sx={{ mb: 4, maxWidth: '600px' }}>
        <TextField
          fullWidth
          placeholder="Search by username or email..."
          variant="outlined"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: '#006D5B' }} />
              </InputAdornment>
            ),
            sx: {
              borderRadius: '12px',
              bgcolor: 'white',
            }
          }}
        />
      </Box>
      
      {roleKeys.map((roleKey) => {
        const users = filteredUsersByRole[roleKey] || [];
        const roleTitle = roleColumns[roleKey];
        
        return (
          <Accordion key={roleKey} defaultExpanded={roleKey === 'customer'} sx={{ mb: 2, '&.Mui-expanded': { mb: 2 }, boxShadow: '0 8px 24px rgba(0,0,0,0.05)', borderRadius: '16px', '&:before': { display: 'none' } }}>
            <AccordionSummary
              expandIcon={<ExpandMore />}
              aria-controls={`${roleKey}-content`}
              id={`${roleKey}-header`}
              sx={{ borderRadius: '16px' }}
            >
              <Typography variant="h5" sx={{ fontWeight: 500 }}>
                {roleTitle} ({users.length} Total)
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              <TableContainer component={Paper} sx={{ borderRadius: '0 0 16px 16px', boxShadow: 'none' }}>
                <Table aria-label={`${roleKey} users table`}>
                  <TableHead>
                    <TableRow>
                      <StyledTableCell>S/N</StyledTableCell>
                      <StyledTableCell>Email</StyledTableCell>
                      <StyledTableCell>Username</StyledTableCell>
                      <StyledTableCell>Change Role</StyledTableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {isLoading ? (
                      <StyledTableRow>
                        <TableCell colSpan={4} align="center" sx={{ py: 4 }}>Loading...</TableCell>
                      </StyledTableRow>
                    ) : users.length === 0 ? (
                      <StyledTableRow>
                        <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                          No {searchQuery ? 'matching' : ''} {roleKey.replace(/([A-Z])/g, ' $1').toLowerCase()} users found.
                        </TableCell>
                      </StyledTableRow>
                    ) : (
                      users.map((user, index) => (
                        <StyledTableRow key={user.id || index}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{user.name || 'N/A'}</TableCell>
                          <TableCell>
                            <FormControl fullWidth size="small">
                              <Select
                                value={user.role || ''}
                                onChange={(e) => handleRoleChange(user.id, e)}
                                displayEmpty
                              >
                                {allRoles.map(role => (
                                  <MenuItem key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </TableCell>
                        </StyledTableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>
        );
      })}

    <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        <Box sx={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: 400, bgcolor: 'background.paper', boxShadow: 24, p: 4, borderRadius: 2
        }}>
          <Typography variant="h6" component="h2" sx={{ mb: 2 }}>Create New User</Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Stack spacing={2}>
            <TextField
              label="Email"
              type="email"
              fullWidth
              value={newUser.email}
              onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
            />
            <TextField
              label="Password"
              type="password"
              fullWidth
              value={newUser.password}
              onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
            />
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={newUser.role}
                label="Role"
                onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}
              >
                {allRoles.map(role => (
                    <MenuItem key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              color="primary"
              disabled={isSubmitting}
              onClick={handleSaveNewUser}
            >
              {isSubmitting ? <CircularProgress size={24} /> : 'Save User'}
            </Button>
          </Stack>
        </Box>
    </Modal>
    </Box>
  );
}
