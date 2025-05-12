import React from 'react';
import Box from '@mui/material/Box';

// SplashLogo now uses the user's PNG logo from public directory
const SplashLogo = ({ size = 88 }) => (
  <Box
    sx={{
      width: { xs: '80vw', sm: 400, md: 400 },
      maxWidth: { xs: '80vw', sm: 400, md: 400 },
      height: 'auto',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      mb: 2,
      mx: 'auto',
      background: 'none',
    }}
    aria-label="EPPS Logo"
  >
    <img
      src={process.env.PUBLIC_URL + '/web-app-manifest-512x512.png'}
      alt="EPPS Logo"
      className="splash-logo"
      style={{ width: '100%', height: 'auto', objectFit: 'contain', background: 'none' }}
    />
  </Box>
);

export default SplashLogo;
