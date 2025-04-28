import React, { forwardRef } from 'react';
import { Avatar, Tooltip } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';

/**
 * Displays a player's avatar with photo, initials, or fallback icon. Use everywhere a player is shown.
 * @param {object} props
 * @param {string} [props.photoURL] - URL to the player's photo
 * @param {string} [props.name] - Player's full name
 * @param {number} [props.size] - Avatar size in px
 * @param {string} [props.email] - Player's email (for tooltip)
 */
const PlayerAvatar = forwardRef(({ photoURL, name, size = 32, email }, ref) => {
  let initials = '';
  if (name && name.split(' ').length >= 2) {
    initials = name.split(' ')[0][0] + name.split(' ')[1][0];
  } else if (name) {
    initials = name[0];
  }
  return (
    <Tooltip title={name || email || ''}>
      <Avatar ref={ref}
        src={photoURL || undefined}
        sx={{ width: size, height: size, bgcolor: 'primary.main', fontSize: size * 0.45 }}
      >
        {!photoURL ? (initials ? initials.toUpperCase() : <PersonIcon fontSize="small" />) : null}
      </Avatar>
    </Tooltip>
  );
});

export default PlayerAvatar;
