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
  Avatar
} from '@mui/material';
import {
  Edit as EditIcon,
  Add as AddIcon,
  Check as CheckIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { collection, getDocs, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { getPlayerData, cleanupUserListeners, clearPlayerCache } from '../../utils/playerUtils';

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
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const usersRef = collection(db, 'users');
        const usersSnapshot = await getDocs(usersRef);
        const usersData = [];
        
        for (const doc of usersSnapshot.docs) {
          const userData = await getPlayerData(doc.id);
          usersData.push({
            id: doc.id,
            ...userData
          });
        }
        
        setUsers(usersData);
      } catch (error) {
        console.error('Error fetching users:', error);
        setError('Failed to load users');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();

    // Set up real-time listener for user changes
    const usersRef = collection(db, 'users');
    const unsubscribe = onSnapshot(usersRef, async (snapshot) => {
      const changes = snapshot.docChanges();
      
      for (const change of changes) {
        if (change.type === 'modified') {
          // Get fresh data for the modified user
          const userData = await getPlayerData(change.doc.id);
          
          // Update the users array with the new data
          setUsers(prevUsers => 
            prevUsers.map(user => 
              user.id === change.doc.id 
                ? { ...user, ...userData }
                : user
            )
          );
        }
      }
    });

    // Cleanup listeners when component unmounts
    return () => {
      unsubscribe();
      cleanupUserListeners();
    };
  }, []);

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
      const userRef = doc(db, 'users', editingUser.id);
      await updateDoc(userRef, {
        role: editForm.role,
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim()
      });
      
      // Clear the cache for this user to force a refresh
      clearPlayerCache(editingUser.id);
      
      // Get fresh data for this user
      const updatedUserData = await getPlayerData(editingUser.id);
      
      // Update the users array with the new data
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === editingUser.id 
            ? { ...user, ...updatedUserData }
            : user
        )
      );
      
      setEditingUser(null);
    } catch (err) {
      setError('Failed to update user: ' + err.message);
    }
  };

  const handleAddUser = async () => {
    try {
      if (!newUser.email || !newUser.name) {
        throw new Error('Please fill in all required fields');
      }

      // await createUser(newUser);
      setOpenAddDialog(false);
      setNewUser({ email: '', name: '', role: 'user' });
      // await fetchUsers();
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

  const getDisplayName = (user) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    } else if (user.displayName) {
      return user.displayName;
    } else if (user.email) {
      return user.email.split('@')[0];
    }
    return 'Unknown User';
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
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ bgcolor: user.color || 'primary.main' }}>
                          {user.initials || '?'}
                        </Avatar>
                        <Box>
                          <Typography variant="body1">{getDisplayName(user)}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {user.email}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
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
