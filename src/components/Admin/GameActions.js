import React from 'react';
import { Button, Tooltip, Stack } from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Email as EmailIcon, Visibility as VisibilityIcon } from '@mui/icons-material';

export default function GameActions({ game, onView, onEdit, onDelete, onEmail, sendingEmail }) {
  return (
    <Stack direction="row" spacing={1}>
      <Tooltip title="View Game">
        <Button
          variant="contained"
          color="info"
          size="small"
          startIcon={<VisibilityIcon />}
          onClick={() => onView(game)}
          sx={{ borderRadius: 2, boxShadow: 1, textTransform: 'none', fontWeight: 500 }}
        >
          View
        </Button>
      </Tooltip>
      <Tooltip title="Edit Game">
        <Button
          variant="outlined"
          color="primary"
          size="small"
          startIcon={<EditIcon />}
          onClick={() => onEdit(game)}
          sx={{ borderRadius: 2, fontWeight: 500 }}
        >
          Edit
        </Button>
      </Tooltip>
      <Tooltip title="Delete Game">
        <Button
          variant="contained"
          color="error"
          size="small"
          startIcon={<DeleteIcon />}
          onClick={() => onDelete(game)}
          sx={{ borderRadius: 2, fontWeight: 500 }}
        >
          Delete
        </Button>
      </Tooltip>
      <Tooltip title="Send Email Report">
        <Button
          variant="outlined"
          color="secondary"
          size="small"
          startIcon={<EmailIcon />}
          onClick={() => onEmail(game)}
          disabled={sendingEmail}
          sx={{ borderRadius: 2, fontWeight: 500 }}
        >
          Email
        </Button>
      </Tooltip>
    </Stack>
  );
}
