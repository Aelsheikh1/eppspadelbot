import React from 'react';
import {
  Drawer,
  Box,
  Typography,
  Chip,
  Stack,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import { Close as CloseIcon, Delete as DeleteIcon, Edit as EditIcon, Email as EmailIcon } from '@mui/icons-material';
import PlayerChips from './PlayerChips';

export default function GameDetailDrawer({ open, game, playersData, onClose, onEdit, onDelete, onEmail, sendingEmail }) {
  if (!game) return null;
  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: 350, p: 3, position: 'relative' }}>
        <IconButton onClick={onClose} sx={{ position: 'absolute', top: 8, right: 8 }}>
          <CloseIcon />
        </IconButton>
        <Typography variant="h6" gutterBottom>Game Details</Typography>
        <Divider sx={{ mb: 2 }} />
        <Typography variant="subtitle2">Date</Typography>
        <Typography sx={{ mb: 1 }}>{game.date}</Typography>
        <Typography variant="subtitle2">Time</Typography>
        <Typography sx={{ mb: 1 }}>{game.time}</Typography>
        <Typography variant="subtitle2">Location</Typography>
        <Typography sx={{ mb: 1 }}>{game.location}</Typography>
        <Typography variant="subtitle2">Status</Typography>
        <Chip label={game.status || 'N/A'} color="primary" sx={{ mb: 2 }} />
        <Typography variant="subtitle2">Players</Typography>
        <PlayerChips players={game.players} playersData={playersData} gameId={game.id} />
        <Divider sx={{ my: 2 }} />
        <Stack direction="row" spacing={2}>
          <Tooltip title="Edit Game"><IconButton color="primary" onClick={() => onEdit(game)}><EditIcon /></IconButton></Tooltip>
          <Tooltip title="Delete Game"><IconButton color="error" onClick={() => onDelete(game)}><DeleteIcon /></IconButton></Tooltip>
          <Tooltip title="Send Email Report"><IconButton color="primary" onClick={() => onEmail(game)} disabled={sendingEmail}><EmailIcon /></IconButton></Tooltip>
        </Stack>
      </Box>
    </Drawer>
  );
}
