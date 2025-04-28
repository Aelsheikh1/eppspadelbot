import React from 'react';
import { Fab, Tooltip, Zoom } from '@mui/material';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';

const FloatingBell = ({ onClick }) => (
  <Zoom in>
    <Tooltip title="Subscribe to notifications" placement="left">
      <Fab
        color="secondary"
        aria-label="subscribe-notifications"
        onClick={onClick}
        sx={{
          position: 'fixed',
          bottom: { xs: 16, sm: 32 },
          right: { xs: '50%', sm: 32 },
          left: { xs: '50%', sm: 'auto' },
          transform: { xs: 'translateX(-50%)', sm: 'none' },
          zIndex: 2000,
          boxShadow: 6
        }}
      >
        <NotificationsActiveIcon fontSize="large" />
      </Fab>
    </Tooltip>
  </Zoom>
);

export default FloatingBell;
