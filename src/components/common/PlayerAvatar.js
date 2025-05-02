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
  // AGGRESSIVE DEBUGGING
  console.group('🖼️ PlayerAvatar AGGRESSIVE DEBUG');
  
  // Detailed logging of ALL inputs
  console.log('🔍 FULL INPUT DETAILS:', {
    photoURL: {
      value: photoURL,
      type: typeof photoURL,
      length: photoURL ? photoURL.length : 'N/A',
      startsWith: photoURL ? {
        http: photoURL.startsWith('http://'),
        https: photoURL.startsWith('https://'),
        data: photoURL.startsWith('data:image'),
        blob: photoURL.startsWith('blob:')
      } : 'N/A'
    },
    name: {
      value: name,
      type: typeof name,
      trimmed: name ? name.trim() : 'N/A'
    },
    size: {
      value: size,
      type: typeof size
    },
    email: {
      value: email,
      type: typeof email
    }
  });

  // FORCE RENDER MECHANISM
  const forceRenderStyle = {
    border: '2px solid red',  // Bright red border to make it visible
    backgroundColor: 'rgba(255,0,0,0.1)'  // Slight red background
  };

  // Validate and generate initials with MAXIMUM robustness
  let initials = '';
  try {
    if (name && typeof name === 'string') {
      const nameParts = name.trim().split(/\s+/).filter(part => part.length > 0);
      if (nameParts.length >= 2) {
        initials = `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
      } else if (nameParts.length === 1) {
        initials = nameParts[0][0].toUpperCase();
      }
    }
  } catch (error) {
    console.error('⚠️ CRITICAL INITIALS ERROR:', error);
  }

  // ULTRA ROBUST URL VALIDATION
  const isValidPhotoURL = photoURL && 
    typeof photoURL === 'string' && 
    (photoURL.startsWith('http://') || 
     photoURL.startsWith('https://') || 
     photoURL.startsWith('data:image') ||
     photoURL.startsWith('blob:'));

  console.log('🕵️ VALIDATION RESULTS:', {
    initials: initials || 'NO INITIALS',
    isValidPhotoURL,
    photoURLDetails: isValidPhotoURL ? {
      fullURL: photoURL,
      protocol: photoURL.split('://')[0],
      domain: photoURL.split('://')[1]?.split('/')[0]
    } : null
  });

  // FALLBACK CONTENT GENERATION
  const avatarContent = isValidPhotoURL ? null : 
    (initials ? initials.toUpperCase() : <PersonIcon fontSize="small" />);

  console.groupEnd();

  // FORCE RENDER with multiple fallback mechanisms
  return (
    <Tooltip title={name || email || ''}>
      <Avatar 
        ref={ref}
        src={isValidPhotoURL ? photoURL : undefined}
        alt={name || 'Player Avatar'}
        sx={{ 
          width: size, 
          height: size, 
          bgcolor: 'primary.main', 
          fontSize: size * 0.45,
          color: 'white',
          ...(avatarContent ? forceRenderStyle : {}) // Force visual feedback
        }}
        imgProps={{
          onError: (e) => {
            console.error('🚨 AVATAR IMAGE LOAD ERROR:', {
              src: photoURL,
              event: e
            });
            e.target.style.display = 'none'; // Hide broken image
          }
        }}
      >
        {avatarContent}
      </Avatar>
    </Tooltip>
  );
});

export default PlayerAvatar;
