import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Alert, CircularProgress } from '@mui/material';

export default function DeleteUserDialog({ open, user, onDelete, onClose, loading }) {
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setError('');
    try {
      await onDelete(user);
    } catch (err) {
      setError('Failed to delete user: ' + err.message);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Delete User</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Typography>
          Are you sure you want to delete user <b>{user?.email}</b>?
          This action cannot be undone.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button color="error" variant="contained" onClick={handleDelete} disabled={loading} startIcon={loading ? <CircularProgress size={18} /> : null}>
          {loading ? 'Deleting...' : 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
