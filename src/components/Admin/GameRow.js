import React from 'react';
import { TableRow, TableCell, Box, Chip } from '@mui/material';
import { Event as CalendarIcon, AccessTime as TimeIcon, LocationOn as LocationIcon } from '@mui/icons-material';
import PlayerChips from './PlayerChips';
import GameActions from './GameActions';

export default function GameRow({ game, playersData, onView, onEdit, onDelete, onEmail, sendingEmail, onRemovePlayer, getGameStatus }) {
  return (
    <TableRow>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CalendarIcon color="action" fontSize="small" />
          {game.date}
        </Box>
      </TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TimeIcon color="action" fontSize="small" />
          {game.time}
        </Box>
      </TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LocationIcon color="action" fontSize="small" />
          {game.location}
        </Box>
      </TableCell>
      <TableCell>
        <Chip label={getGameStatus(game).label} color={getGameStatus(game).color} size="small" />
      </TableCell>
      <TableCell>
        <PlayerChips players={game.players} playersData={playersData} onRemove={onRemovePlayer} gameId={game.id} />
      </TableCell>
      <TableCell>
        <GameActions
          game={game}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
          onEmail={onEmail}
          sendingEmail={sendingEmail}
        />
      </TableCell>
    </TableRow>
  );
}
