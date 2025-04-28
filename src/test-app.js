import React, { useState } from 'react';
import {
  Container,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Box
} from '@mui/material';

export default function TestApp() {
  const [maxPlayers, setMaxPlayers] = useState(4);

  const handleChange = (e) => {
    setMaxPlayers(e.target.value);
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Test Player Dropdown
        </Typography>

        <Box sx={{ mt: 2 }}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Maximum Players</InputLabel>
            <Select
              value={maxPlayers}
              label="Maximum Players"
              name="maxPlayers"
              onChange={handleChange}
            >
              <MenuItem value={2}>2</MenuItem>
              <MenuItem value={4}>4</MenuItem>
              <MenuItem value={6}>6</MenuItem>
              <MenuItem value={8}>8</MenuItem>
              <MenuItem value={10}>10</MenuItem>
              <MenuItem value={12}>12</MenuItem>
            </Select>
          </FormControl>
          
          <Typography variant="body1" sx={{ mt: 2 }}>
            Selected: {maxPlayers} players
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
}
