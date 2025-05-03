import React from 'react';
import Box from '@mui/material/Box';

// SplashLogo now uses the user's PNG logo from public directory
const SplashLogo = ({ size = 88 }) => (
  <Box
    sx={{
      width: { xs: '90vw', sm: size, md: size },
      maxWidth: { xs: '90vw', sm: 300, md: 300 },
      height: 'auto',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      mb: 2,
      mx: 'auto',
    }}
    aria-label="EPPS Logo"
  >
    <img
      src={process.env.PUBLIC_URL + '/web-app-manifest-512x512.png'}
      alt="EPPS Logo"
      className="splash-logo"
      style={{ width: '50%', height: 'auto', objectFit: 'contain', borderRadius: 16, boxShadow: '0 2px 8px rgba(25, 118, 210, 0.13)' }}
    />
  </Box>
);

export default SplashLogo;
