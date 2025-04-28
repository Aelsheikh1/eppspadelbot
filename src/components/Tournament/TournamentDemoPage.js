import React from 'react';
import { Container, Typography, Box, Paper, Divider } from '@mui/material';
import TournamentVisualizerEnhanced from './TournamentVisualizerEnhanced';

// Sample tournament data
const sampleTournament = {
  format: 'knockout',
  teams: [
    { 
      id: 'team1', 
      name: 'Wolves', 
      color: '#f44336',
      players: [{ id: 'p1', name: 'Mahmoud' }, { id: 'p2', name: 'Moataz' }]
    },
    { 
      id: 'team2', 
      name: 'Eagles', 
      color: '#9c27b0',
      players: [{ id: 'p3', name: 'Ali' }, { id: 'p4', name: 'Ahmed' }]
    },
    { 
      id: 'team3', 
      name: 'Tigers', 
      color: '#ff9800',
      players: [{ id: 'p5', name: 'Hassan' }, { id: 'p6', name: 'Khaled' }]
    },
    { 
      id: 'team4', 
      name: 'Bears', 
      color: '#4caf50',
      players: [{ id: 'p7', name: 'Omar' }, { id: 'p8', name: 'Youssef' }]
    },
    { 
      id: 'team5', 
      name: 'Dolphins', 
      color: '#2196f3',
      players: [{ id: 'p9', name: 'Tarek' }, { id: 'p10', name: 'Karim' }]
    },
    { 
      id: 'team6', 
      name: 'Sharks', 
      color: '#607d8b',
      players: [{ id: 'p11', name: 'Amr' }, { id: 'p12', name: 'Hossam' }]
    },
    { 
      id: 'team7', 
      name: 'Lions', 
      color: '#795548',
      players: [{ id: 'p13', name: 'Ramy' }, { id: 'p14', name: 'Sherif' }]
    },
    { 
      id: 'team8', 
      name: 'Panthers', 
      color: '#009688',
      players: [{ id: 'p15', name: 'Walid' }, { id: 'p16', name: 'Tamer' }]
    }
  ],
  rounds: [
    {
      name: 'Quarter Finals',
      matches: [
        {
          id: 'match1',
          team1: { id: 'team1', name: 'Wolves', color: '#f44336', players: [{ id: 'p1', name: 'Mahmoud' }, { id: 'p2', name: 'Moataz' }] },
          team2: { id: 'team2', name: 'Eagles', color: '#9c27b0', players: [{ id: 'p3', name: 'Ali' }, { id: 'p4', name: 'Ahmed' }] },
          score1: 21,
          score2: 18,
          winner: 'team1',
          completed: true
        },
        {
          id: 'match2',
          team1: { id: 'team3', name: 'Tigers', color: '#ff9800', players: [{ id: 'p5', name: 'Hassan' }, { id: 'p6', name: 'Khaled' }] },
          team2: { id: 'team4', name: 'Bears', color: '#4caf50', players: [{ id: 'p7', name: 'Omar' }, { id: 'p8', name: 'Youssef' }] },
          score1: 15,
          score2: 21,
          winner: 'team2',
          completed: true
        },
        {
          id: 'match3',
          team1: { id: 'team5', name: 'Dolphins', color: '#2196f3', players: [{ id: 'p9', name: 'Tarek' }, { id: 'p10', name: 'Karim' }] },
          team2: { id: 'team6', name: 'Sharks', color: '#607d8b', players: [{ id: 'p11', name: 'Amr' }, { id: 'p12', name: 'Hossam' }] },
          score1: 21,
          score2: 19,
          winner: 'team1',
          completed: true
        },
        {
          id: 'match4',
          team1: { id: 'team7', name: 'Lions', color: '#795548', players: [{ id: 'p13', name: 'Ramy' }, { id: 'p14', name: 'Sherif' }] },
          team2: { id: 'team8', name: 'Panthers', color: '#009688', players: [{ id: 'p15', name: 'Walid' }, { id: 'p16', name: 'Tamer' }] },
          score1: 18,
          score2: 21,
          winner: 'team2',
          completed: true
        }
      ]
    },
    {
      name: 'Semi Finals',
      matches: [
        {
          id: 'match5',
          team1: { id: 'team1', name: 'Wolves', color: '#f44336', players: [{ id: 'p1', name: 'Mahmoud' }, { id: 'p2', name: 'Moataz' }] },
          team2: { id: 'team4', name: 'Bears', color: '#4caf50', players: [{ id: 'p7', name: 'Omar' }, { id: 'p8', name: 'Youssef' }] },
          score1: 21,
          score2: 17,
          winner: 'team1',
          completed: true
        },
        {
          id: 'match6',
          team1: { id: 'team5', name: 'Dolphins', color: '#2196f3', players: [{ id: 'p9', name: 'Tarek' }, { id: 'p10', name: 'Karim' }] },
          team2: { id: 'team8', name: 'Panthers', color: '#009688', players: [{ id: 'p15', name: 'Walid' }, { id: 'p16', name: 'Tamer' }] },
          score1: 19,
          score2: 21,
          winner: 'team2',
          completed: true
        }
      ]
    },
    {
      name: 'Final',
      matches: [
        {
          id: 'match7',
          team1: { id: 'team1', name: 'Wolves', color: '#f44336', players: [{ id: 'p1', name: 'Mahmoud' }, { id: 'p2', name: 'Moataz' }] },
          team2: { id: 'team8', name: 'Panthers', color: '#009688', players: [{ id: 'p15', name: 'Walid' }, { id: 'p16', name: 'Tamer' }] },
          score1: 21,
          score2: 15,
          winner: 'team1',
          completed: true
        }
      ]
    }
  ]
};

// Sample league tournament data
const sampleLeagueTournament = {
  format: 'League',
  teams: sampleTournament.teams,
  rounds: [
    {
      name: 'Round 1',
      matches: [
        {
          id: 'match1',
          team1: { id: 'team1', name: 'Wolves', color: '#f44336', players: [{ id: 'p1', name: 'Mahmoud' }, { id: 'p2', name: 'Moataz' }] },
          team2: { id: 'team2', name: 'Eagles', color: '#9c27b0', players: [{ id: 'p3', name: 'Ali' }, { id: 'p4', name: 'Ahmed' }] },
          score1: 21,
          score2: 18,
          winner: 'team1',
          completed: true
        },
        {
          id: 'match2',
          team1: { id: 'team3', name: 'Tigers', color: '#ff9800', players: [{ id: 'p5', name: 'Hassan' }, { id: 'p6', name: 'Khaled' }] },
          team2: { id: 'team4', name: 'Bears', color: '#4caf50', players: [{ id: 'p7', name: 'Omar' }, { id: 'p8', name: 'Youssef' }] },
          score1: 15,
          score2: 21,
          winner: 'team2',
          completed: true
        }
      ]
    },
    {
      name: 'Round 2',
      matches: [
        {
          id: 'match3',
          team1: { id: 'team1', name: 'Wolves', color: '#f44336', players: [{ id: 'p1', name: 'Mahmoud' }, { id: 'p2', name: 'Moataz' }] },
          team2: { id: 'team3', name: 'Tigers', color: '#ff9800', players: [{ id: 'p5', name: 'Hassan' }, { id: 'p6', name: 'Khaled' }] },
          score1: 21,
          score2: 15,
          winner: 'team1',
          completed: true
        },
        {
          id: 'match4',
          team1: { id: 'team2', name: 'Eagles', color: '#9c27b0', players: [{ id: 'p3', name: 'Ali' }, { id: 'p4', name: 'Ahmed' }] },
          team2: { id: 'team4', name: 'Bears', color: '#4caf50', players: [{ id: 'p7', name: 'Omar' }, { id: 'p8', name: 'Youssef' }] },
          score1: 18,
          score2: 21,
          winner: 'team2',
          completed: true
        }
      ]
    },
    {
      name: 'Round 3',
      matches: [
        {
          id: 'match5',
          team1: { id: 'team1', name: 'Wolves', color: '#f44336', players: [{ id: 'p1', name: 'Mahmoud' }, { id: 'p2', name: 'Moataz' }] },
          team2: { id: 'team4', name: 'Bears', color: '#4caf50', players: [{ id: 'p7', name: 'Omar' }, { id: 'p8', name: 'Youssef' }] },
          score1: 21,
          score2: 19,
          winner: 'team1',
          completed: true
        },
        {
          id: 'match6',
          team1: { id: 'team2', name: 'Eagles', color: '#9c27b0', players: [{ id: 'p3', name: 'Ali' }, { id: 'p4', name: 'Ahmed' }] },
          team2: { id: 'team3', name: 'Tigers', color: '#ff9800', players: [{ id: 'p5', name: 'Hassan' }, { id: 'p6', name: 'Khaled' }] },
          score1: 21,
          score2: 17,
          winner: 'team1',
          completed: true
        }
      ]
    }
  ]
};

const TournamentDemoPage = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom sx={{ 
        color: '#1a237e', 
        fontWeight: 'bold',
        textAlign: 'center',
        mb: 4
      }}>
        Tournament Visualization Demo
      </Typography>
      
      <Box sx={{ mb: 6 }}>
        <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
          <Typography variant="h5" component="h2" gutterBottom sx={{ 
            color: '#1976d2',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            mb: 3
          }}>
            <span role="img" aria-label="trophy" style={{ marginRight: '10px' }}>🏆</span>
            Knockout Tournament
          </Typography>
          
          <TournamentVisualizerEnhanced
            rounds={sampleTournament.rounds}
            teams={sampleTournament.teams}
            format="knockout"
          />
        </Paper>
      </Box>
      
      <Divider sx={{ my: 5 }} />
      
      <Box sx={{ mb: 6 }}>
        <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
          <Typography variant="h5" component="h2" gutterBottom sx={{ 
            color: '#1976d2',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            mb: 3
          }}>
            <span role="img" aria-label="table" style={{ marginRight: '10px' }}>📊</span>
            League Tournament
          </Typography>
          
          <TournamentVisualizerEnhanced
            rounds={sampleLeagueTournament.rounds}
            teams={sampleLeagueTournament.teams}
            format="League"
          />
        </Paper>
      </Box>
    </Container>
  );
};

export default TournamentDemoPage;
