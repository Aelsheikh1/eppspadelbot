import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Box,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Fab,
} from '@mui/material';
import {
  Edit as EditIcon,
  Add as AddIcon,
  Check as CheckIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { getAllUsers, updateUserRole, createUser } from '../../services/firebase';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    role: '',
    firstName: '',
    lastName: ''
  });
  const [selectedRole, setSelectedRole] = useState('');
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    name: '',
    role: 'user'
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const usersList = await getAllUsers();
      setUsers(usersList);
    } catch (err) {
      setError('Failed to fetch users: ' + err.message);
    }
    setLoading(false);
  };

  const handleEditClick = (user) => {
    setEditingUser(user);
    setEditForm({
      role: user.role || 'user',
      firstName: user.firstName || '',
      lastName: user.lastName || ''
    });
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRoleChange = async () => {
    try {
      await updateUserRole(editingUser.id, {
        role: editForm.role,
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim()
      });
      setEditingUser(null);
      await fetchUsers();
    } catch (err) {
      setError('Failed to update user: ' + err.message);
    }
  };

  const handleAddUser = async () => {
    try {
      if (!newUser.email || !newUser.name) {
        throw new Error('Please fill in all required fields');
      }

      await createUser(newUser);
      setOpenAddDialog(false);
      setNewUser({ email: '', name: '', role: 'user' });
      await fetchUsers();
    } catch (err) {
      setError('Failed to create user: ' + err.message);
    }
  };

  const handleNewUserChange = (e) => {
    const { name, value } = e.target;
    setNewUser(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper elevation={3}>
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5">
              User Management
            </Typography>
            <Fab
              color="primary"
              size="small"
              onClick={() => setOpenAddDialog(true)}
            >
              <AddIcon />
            </Fab>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Email</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.name || 'Anonymous'}</TableCell>
                    <TableCell>
                      <Chip
                        label={user.role || 'user'}
                        color={user.role === 'admin' ? 'primary' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleEditClick(user)}
                      >
                        <EditIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      No users found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Paper>

      {/* Edit User Dialog */}
      <Dialog 
        open={Boolean(editingUser)} 
        onClose={() => setEditingUser(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="First Name"
              name="firstName"
              value={editForm.firstName}
              onChange={handleEditFormChange}
              fullWidth
            />
            <TextField
              label="Last Name"
              name="lastName"
              value={editForm.lastName}
              onChange={handleEditFormChange}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                name="role"
                value={editForm.role}
                label="Role"
                onChange={handleEditFormChange}
              >
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingUser(null)}>Cancel</Button>
          <Button 
            onClick={handleRoleChange} 
            variant="contained"
            disabled={!editForm.role}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)}>
        <DialogTitle>Add New User</DialogTitle>
        <DialogContent>
          <Box sx={{ minWidth: 300, mt: 2 }}>
            <TextField
              name="email"
              label="Email"
              value={newUser.email}
              onChange={handleNewUserChange}
              fullWidth
              required
              sx={{ mb: 2 }}
            />
            <TextField
              name="name"
              label="Name"
              value={newUser.name}
              onChange={handleNewUserChange}
              fullWidth
              required
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                name="role"
                value={newUser.role}
                label="Role"
                onChange={handleNewUserChange}
              >
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddDialog(false)}>Cancel</Button>
          <Button onClick={handleAddUser} variant="contained">
            Add User
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
