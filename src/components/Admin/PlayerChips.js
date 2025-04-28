import React from 'react';
import { Chip, Typography, Stack } from '@mui/material';

export default function PlayerChips({ players, playersData, onRemove, gameId }) {
  if (!Array.isArray(players) || players.length === 0) {
    return <Typography variant="body2" color="textSecondary">No players</Typography>;
  }

  return (
    <Stack direction="row" spacing={1}>
      {players.map((playerId, idx) => {
        const playerData = playersData[playerId];
        let displayName = 'Unknown Player';
        if (playerData) {
          if (playerData.firstName && playerData.lastName) displayName = `${playerData.firstName} ${playerData.lastName}`;
          else if (playerData.displayName) displayName = playerData.displayName;
          else if (playerData.email) displayName = playerData.email.split('@')[0];
        }
        return (
          <Chip
            key={gameId ? `${gameId}-${playerId}-${idx}` : `${playerId}-${idx}`}
            label={displayName}
            onDelete={onRemove ? () => onRemove(gameId, playerId) : undefined}
            color="primary"
            variant="outlined"
            sx={{ mb: 0.5 }}
          />
        );
      })}
    </Stack>
  );
}
