import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  IconButton,
  Avatar,
  CircularProgress,
  Snackbar,
} from '@mui/material';
import {
  Close as CloseIcon,
  Save as SaveIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { updateUserProfile, getUserData } from '../../services/firebase';
import { uploadUserPhoto } from '../../services/uploadUserPhoto';
import PropTypes from 'prop-types';

export default function EditProfile({ open, onClose, onProfileUpdated }) {
  const { currentUser, refreshCurrentUser } = useAuth();
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    preferredLocation: '',
    photoURL: '',
  });
  const avatarKey = formData.photoURL || undefined;
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      if (currentUser?.uid) {
        try {
          const userData = await getUserData(currentUser.uid);
          if (userData) {
            setFormData({
              firstName: userData.firstName || '',
              lastName: userData.lastName || '',
              phoneNumber: userData.phoneNumber || '',
              preferredLocation: userData.preferredLocation || '',
              photoURL: userData.photoURL || '',
            });
          }
        } catch (err) {
          console.error('Error fetching user data:', err);
          setError('Failed to load profile data');
        }
      }
    };

    if (open) {
      fetchUserData();
    }
  }, [currentUser, open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setDirty(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      await updateUserProfile(currentUser.uid, formData);
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError('Failed to update profile: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: 3,
        }
      }}
    >
      <DialogTitle
        sx={{
          m: 0,
          p: 2,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <PersonIcon sx={{ mr: 1 }} />
          <Typography variant="h6">
            Edit Profile
          </Typography>
        </Box>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            color: 'inherit',
            '&:hover': {
              bgcolor: 'primary.dark',
            },
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent dividers>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Profile updated successfully!
            </Alert>
          )}
          <Snackbar
            open={snackbar.open}
            autoHideDuration={3000}
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            message={snackbar.message}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, mb: 2 }}>
              <Avatar
                key={avatarKey}
                src={formData.photoURL || undefined}
                sx={{
                  width: 64,
                  height: 64,
                  bgcolor: 'primary.main',
                  mr: { xs: 0, sm: 2 },
                  mb: { xs: 1, sm: 0 }
                }}
              >
                {(!formData.photoURL && formData.firstName && formData.lastName) ?
                  `${formData.firstName[0]}${formData.lastName[0]}`.toUpperCase() :
                  (!formData.photoURL && <PersonIcon />)
                }
              </Avatar>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1, alignItems: 'center' }}>
                  <Button
                    variant="contained"
                    component="label"
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={18} /> : null}
                  >
                    {loading ? 'Uploading...' : 'Upload Photo'}
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={async (e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          if (!file.type.startsWith('image/')) {
                            setError('Please upload a valid image file (JPEG, PNG, etc).');
                            setSnackbar({ open: true, message: 'Please upload a valid image file (JPEG, PNG, etc).', severity: 'error' });
                            e.target.value = '';
                            return;
                          }
                          if (file.size > 5 * 1024 * 1024) {
                            setError('File is too large. Please choose a file under 5MB.');
                            setSnackbar({ open: true, message: 'File is too large. Please choose a file under 5MB.', severity: 'error' });
                            e.target.value = '';
                            return;
                          }
                          setLoading(true);
                          setError('');
                          setSuccess(false);
                          try {
                            const formDataCloud = new FormData();
                            formDataCloud.append('file', file);
                            formDataCloud.append('upload_preset', 'unsigned_preset'); // Replace with your Cloudinary preset
                            // Replace 'df9ywgjv4' with your Cloudinary cloud name if needed
                            const response = await fetch('https://api.cloudinary.com/v1_1/df9ywgjv4/image/upload', {
                              method: 'POST',
                              body: formDataCloud
                            });
                            const data = await response.json();
                            if (data.secure_url) {
                              await updateUserProfile(currentUser.uid, { ...formData, photoURL: data.secure_url });
                              setFormData(prev => ({ ...prev, photoURL: data.secure_url }));
                              setDirty(true);
                              setSuccess(true);
                              setSnackbar({ open: true, message: 'Photo uploaded successfully!', severity: 'success' });
                              if (typeof refreshCurrentUser === 'function') {
                                await refreshCurrentUser();
                              }
                              if (typeof onProfileUpdated === 'function') {
                                onProfileUpdated();
                              }
                            } else {
                              throw new Error(data.error?.message || 'Cloudinary upload failed');
                            }
                            e.target.value = '';
                          } catch (uploadErr) {
                            const msg = uploadErr?.message || uploadErr?.toString() || 'Failed to upload photo';
                            setError(msg);
                            setSnackbar({ open: true, message: msg, severity: 'error' });
                          } finally {
                            setLoading(false);
                          }
                        }
                      }}
                    />
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    sx={{ ml: { xs: 0, sm: 2 }, mt: { xs: 1, sm: 0 } }}
                    disabled={loading || !formData.photoURL}
                    onClick={async () => {
                      setLoading(true);
                      setError("");
                      setSuccess(false);
                      try {
                        await updateUserProfile(currentUser.uid, { ...formData, photoURL: "" });
                        setFormData(prev => ({ ...prev, photoURL: "" }));
                        setSnackbar({ open: true, message: 'Avatar deleted successfully!', severity: 'success' });
                      } catch (err) {
                        setError('Failed to delete avatar: ' + err.message);
                        setSnackbar({ open: true, message: 'Failed to delete avatar', severity: 'error' });
                      } finally {
                        setLoading(false);
                      }
                    }}
                  >
                    Delete Avatar
                  </Button>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mt: { xs: 1, sm: 0 } }}>
                  {currentUser?.email}
                </Typography>
              </Box>
            </Box>

            <TextField
              label="First Name"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              fullWidth
              required
            />

            <TextField
              label="Last Name"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              fullWidth
              required
            />

            <TextField
              label="Phone Number"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              fullWidth
              type="tel"
            />

            <TextField
              label="Preferred Location"
              name="preferredLocation"
              value={formData.preferredLocation}
              onChange={handleChange}
              fullWidth
              placeholder="e.g., Dubai Sports City"
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2, bgcolor: 'grey.50' }}>
          <Button
            onClick={onClose}
            variant="outlined"
            disabled={loading}
            startIcon={<CloseIcon />}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            startIcon={<SaveIcon />}
            disabled={loading || !dirty}
          >
            Save Changes
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
