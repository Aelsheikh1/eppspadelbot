import React from 'react';
import Box from '@mui/material/Box';

// SplashLogo now uses the user's PNG logo from public directory
const SplashLogo = ({ size = 88 }) => (
  <Box
    sx={{
      width: size,
      height: size,
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
      width={size}
      height={size}
      style={{ objectFit: 'contain', borderRadius: 16, boxShadow: '0 2px 8px rgba(25, 118, 210, 0.13)' }}
    />
  </Box>
);

export default SplashLogo;
