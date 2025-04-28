import React, { useEffect, useRef } from 'react';
import { Box, Typography, Paper, CircularProgress } from '@mui/material';
import './TournamentVisualizer.css';

const TournamentVisualizer = ({ rounds, teams, format }) => {
  const iframeRef = useRef(null);

  useEffect(() => {
    if (!rounds || !iframeRef.current) return;

    const iframe = iframeRef.current;
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    
    // Create a tournament object from the props
    const tournament = {
      rounds,
      teams,
      format
    };
    
    // Generate HTML content for the iframe
    const htmlContent = generateTournamentHTML(tournament);
    
    // Write to the iframe
    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();
  }, [rounds, teams, format]);

  if (!rounds) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', mt: 2 }}>
      <iframe 
        ref={iframeRef}
        title="Tournament Visualization"
        style={{ 
          width: '100%', 
          height: '800px', 
          border: 'none',
          overflow: 'hidden'
        }}
      />
    </Box>
  );
};

// Function to generate HTML content for the iframe
const generateTournamentHTML = (tournament) => {
  const isLeague = tournament.format === 'League';
  const rounds = tournament.rounds || [];
  const teams = tournament.teams || [];
  
  // Generate HTML for the tournament visualization
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Tournament Visualization</title>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" />
        <style>
            body {
                font-family: 'Roboto', sans-serif;
                margin: 0;
                padding: 20px;
                background-color: transparent;
                color: #333;
            }
            .container {
                max-width: 1200px;
                margin: 0 auto;
                background-color: white;
                padding: 20px;
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            }
            h1 {
                background: linear-gradient(135deg, #1976d2, #0d47a1);
                color: white;
                margin-top: 0;
                padding: 15px 20px;
                border-radius: 8px;
                display: flex;
                align-items: center;
                font-size: 1.8rem;
                box-shadow: 0 4px 10px rgba(0,0,0,0.1);
            }
            h1 i {
                margin-right: 10px;
            }
            .tournament-bracket {
                display: flex;
                overflow-x: auto;
                padding: 30px 10px;
                background: linear-gradient(to bottom, #f9f9f9, #ffffff);
                border-radius: 8px;
                position: relative;
                margin-bottom: 20px;
            }
            .round {
                display: flex;
                flex-direction: column;
                min-width: 240px;
                margin-right: 50px;
                position: relative;
            }
            .round:last-child {
                margin-right: 0;
            }
            .round-title {
                background: linear-gradient(135deg, #1976d2, #0d47a1);
                color: white;
                padding: 12px 15px;
                text-align: center;
                border-radius: 8px 8px 0 0;
                font-weight: bold;
                margin-bottom: 25px;
                box-shadow: 0 4px 10px rgba(0,0,0,0.1);
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .round-title i {
                margin-right: 8px;
            }
            .match {
                border: none;
                border-radius: 10px;
                padding: 0;
                margin-bottom: 30px;
                background-color: white;
                box-shadow: 0 5px 15px rgba(0,0,0,0.08);
                position: relative;
                transition: transform 0.2s ease, box-shadow 0.2s ease;
                overflow: hidden;
            }
            .match:hover {
                transform: translateY(-3px);
                box-shadow: 0 8px 20px rgba(0,0,0,0.12);
            }
            .match.completed {
                border-left: 5px solid #4caf50;
            }
            .match-header {
                background: linear-gradient(to right, #f5f5f5, #eeeeee);
                padding: 8px 12px;
                font-size: 0.85rem;
                color: #555;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid #eee;
            }
            .match-status {
                display: inline-flex;
                align-items: center;
                background-color: #e0e0e0;
                color: #555;
                padding: 3px 8px;
                border-radius: 12px;
                font-size: 0.7rem;
                font-weight: 500;
            }
            .match-status.completed {
                background-color: #4caf50;
                color: white;
            }
            .match-status i {
                margin-right: 4px;
                font-size: 0.7rem;
            }
            .team {
                display: flex;
                align-items: center;
                padding: 12px 15px;
                border-radius: 6px;
                margin-bottom: 8px;
                position: relative;
                transition: all 0.2s ease;
                box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                background-color: white;
            }
            .team:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            }
            .team.winner {
                background-color: rgba(76, 175, 80, 0.1);
                border-left: 4px solid #4caf50;
            }
            .team.winner::after {
                content: '🏆';
                position: absolute;
                top: 5px;
                right: 5px;
                font-size: 14px;
            }
            .team-avatar {
                width: 38px;
                height: 38px;
                border-radius: 50%;
                background: linear-gradient(135deg, #3f51b5, #1a237e);
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 14px;
                font-weight: bold;
                margin-right: 12px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                text-transform: uppercase;
            }
            .team-name {
                flex-grow: 1;
                font-weight: 600;
                font-size: 15px;
                display: flex;
                flex-direction: column;
            }
            .team-players {
                font-size: 12px;
                color: #757575;
                margin-top: 3px;
                display: flex;
                align-items: center;
            }
            .team-players i {
                margin-right: 5px;
                font-size: 11px;
                color: #9e9e9e;
            }
            .team-score {
                font-weight: bold;
                min-width: 30px;
                height: 30px;
                background-color: #f5f5f5;
                border-radius: 15px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
                margin-left: 10px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .team.winner .team-score {
                background-color: #4caf50;
                color: white;
            }
            .connector {
                position: absolute;
                right: -40px;
                width: 40px;
                height: 2px;
                background-color: #e0e0e0;
                z-index: 1;
            }
            .connector.active {
                background-color: #4caf50;
                color: white;
            }
            .trophy {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-width: 120px;
            }
            .trophy-icon {
                font-size: 60px;
                color: gold;
                margin-bottom: 10px;
            }
            .champion {
                background-color: #4caf50;
                color: white;
                padding: 10px;
                border-radius: 4px;
                text-align: center;
                font-weight: bold;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            }
            .league-table-container {
                margin-top: 30px;
                border-radius: 10px;
                overflow: hidden;
                box-shadow: 0 5px 15px rgba(0,0,0,0.08);
            }
            .league-table {
                width: 100%;
                border-collapse: collapse;
                background-color: white;
            }
            .league-table th, .league-table td {
                padding: 12px 15px;
                text-align: center;
            }
            .league-table th {
                background: linear-gradient(135deg, #1976d2, #0d47a1);
                color: white;
                font-weight: 500;
                text-transform: uppercase;
                font-size: 0.85rem;
                letter-spacing: 0.5px;
                border: none;
            }
            .league-table td {
                border-bottom: 1px solid #f0f0f0;
            }
            .league-table tr:last-child td {
                border-bottom: none;
            }
            .league-table tr:nth-child(even) {
                background-color: #fafafa;
            .league-table tr:hover {
                background-color: #f0f0f0;
            }
            .league-table td.points {
                font-weight: bold;
                background-color: #1976d2;
                color: white;
            }
            .team-cell {
                display: flex;
                align-items: center;
                text-align: left;
            }
            .league-winner {
                background-color: #4caf50;
                color: white;
                padding: 15px;
                border-radius: 4px;
                margin-bottom: 20px;
            }
            .match-card {
                border: 1px solid #e0e0e0;
                border-radius: 4px;
                padding: 15px;
                margin-bottom: 15px;
                background-color: white;
            }
            .match-card.completed {
                background-color: rgba(76, 175, 80, 0.05);
                border-color: #4caf50;
            }
            .match-header {
                font-weight: bold;
                margin-bottom: 10px;
                display: flex;
                justify-content: space-between;
            }
            .match-team {
                display: flex;
                align-items: center;
                margin-bottom: 8px;
            }
            .completed-tag {
                background-color: #4caf50;
                color: white;
                font-size: 12px;
                padding: 2px 8px;
                border-radius: 10px;
            }
            .match-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                gap: 15px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            ${isLeague ? generateLeagueHTML(tournament) : generateKnockoutHTML(tournament)}
        </div>
    </body>
    </html>
  `;
};

// Function to generate HTML for knockout tournament
const generateKnockoutHTML = (tournament) => {
  const rounds = tournament.rounds || [];
  
  if (!rounds.length) {
    return '<div style="text-align: center; padding: 20px;">No tournament data available</div>';
  }
  
  // Check if there's a winner in the final round
  const hasFinalWinner = rounds.length > 0 && 
    rounds[rounds.length - 1].matches.length > 0 && 
    rounds[rounds.length - 1].matches[0].winner;
  
  const finalWinner = hasFinalWinner ? 
    (rounds[rounds.length - 1].matches[0].winner === 'team1' ? 
      rounds[rounds.length - 1].matches[0].team1 : 
      rounds[rounds.length - 1].matches[0].team2) : 
    null;
  
  let html = `
    <h2><i class="fas fa-trophy"></i> Knockout Tournament Bracket</h2>
    <div class="tournament-bracket">
  `;
  
  // Generate rounds
  rounds.forEach((round, roundIndex) => {
    // Choose appropriate icon for each round
    let roundIcon = 'fas fa-flag';
    if (roundIndex === 0) roundIcon = 'fas fa-play';
    else if (roundIndex === rounds.length - 1) roundIcon = 'fas fa-trophy';
    else if (roundIndex === rounds.length - 2) roundIcon = 'fas fa-medal';
    
    html += `
      <div class="round">
        <div class="round-title"><i class="${roundIcon}"></i> ${round.name}</div>
        <div style="display: flex; flex-direction: column; gap: 30px;">
    `;
    
    // Generate matches for this round
    round.matches.forEach((match, matchIndex) => {
      const isTeam1Winner = match.winner === 'team1';
      const isTeam2Winner = match.winner === 'team2';
      const matchCompleted = match.completed || isTeam1Winner || isTeam2Winner;
      const matchClass = matchCompleted ? 'completed' : '';
      const winnerClass = isTeam1Winner ? 'team1-winner' : isTeam2Winner ? 'team2-winner' : '';
      
      html += `
        <div class="match ${matchClass} ${winnerClass}">
          <div class="match-header">
            <span>Match ${matchIndex + 1}</span>
            <span class="match-status ${matchCompleted ? 'completed' : ''}">
              <i class="${matchCompleted ? 'fas fa-check-circle' : 'fas fa-clock'}"></i>
              ${matchCompleted ? 'Completed' : 'Pending'}
            </span>
          </div>
          <div class="team ${isTeam1Winner ? 'winner' : ''}">
            <div class="team-avatar" style="background-color: ${match.team1?.color || '#3f51b5'};">
              ${match.team1?.name?.substring(0, 2) || '?'}
            </div>
            <div class="team-name">
              ${match.team1?.name || 'TBD'}
              <div class="team-players">
                <i class="fas fa-user-friends"></i>
                ${match.team1?.players?.map(p => p?.name || 'TBC').join(' & ')}
              </div>
            </div>
            <div class="team-score">${match.score1 !== undefined && match.score1 !== null ? match.score1 : '-'}</div>
          </div>
          <div class="team ${isTeam2Winner ? 'winner' : ''}">
            <div class="team-avatar" style="background-color: ${match.team2?.color || '#e91e63'};">
              ${match.team2?.name?.substring(0, 2) || '?'}
            </div>
            <div class="team-name">
              ${match.team2?.name || 'TBD'}
              <div class="team-players">
                <i class="fas fa-user-friends"></i>
                ${match.team2?.players?.map(p => p?.name || 'TBC').join(' & ')}
              </div>
            </div>
            <div class="team-score">${match.score2 !== undefined && match.score2 !== null ? match.score2 : '-'}</div>
          </div>
        </div>
      `;
    ${roundIndex < rounds.length - 1 ? `<div class="connector ${matchCompleted ? 'active' : ''}"></div>` : ''}
        </div>
      `;
    });
    
    html += `
        </div>
      </div>
    `;
  });
  
  // Add champion trophy if there's a winner
  if (hasFinalWinner && finalWinner) {
    html += `
      <div class="trophy">
        <div class="trophy-icon">🏆</div>
        <div class="champion">
          <div>CHAMPION</div>
          <div>${finalWinner.name}</div>
          <div style="font-size: 12px; margin-top: 5px;">${finalWinner.players?.map(p => p?.name || 'Unknown').join(' & ')}</div>
        </div>
      </div>
    `;
  }
  
  html += `
    </div>
  `;
  
  return html;
};

// Function to generate HTML for league tournament
const generateLeagueHTML = (tournament) => {
  const teams = tournament.teams || [];
  const rounds = tournament.rounds || [];
  
  if (!teams.length) {
    return '<div style="text-align: center; padding: 20px;">No league data available</div>';
  }
  
  // Calculate team stats
  const teamsWithStats = calculateTeamStats(teams, rounds);
  
  // Sort teams by points, then goal difference
  const sortedTeams = [...teamsWithStats].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const aDiff = a.goalsFor - a.goalsAgainst;
    const bDiff = b.goalsFor - b.goalsAgainst;
    if (bDiff !== aDiff) return bDiff - aDiff;
    return b.goalsFor - a.goalsFor; // If tied on GD, sort by goals scored
  });
  
  // Check if all matches have been completed
  let completedMatches = 0;
  let totalMatches = 0;
  rounds.forEach(round => {
    if (round.matches && round.matches.length > 0) {
      totalMatches += round.matches.length;
      round.matches.forEach(match => {
        if (match.completed) completedMatches++;
      });
    }
  });
  const allMatchesCompleted = completedMatches === totalMatches && totalMatches > 0;
  
  let html = `
    <h2>League Table</h2>
  `;
  
  // Add winner display if all matches are completed
  if (allMatchesCompleted && sortedTeams.length > 0) {
    html += `
      <div class="league-winner">
        <h3 style="margin-top: 0;">TOURNAMENT CHAMPION</h3>
        <div style="font-size: 18px; font-weight: bold;">${sortedTeams[0].name} (${sortedTeams[0].players?.map(p => p?.name || 'Unknown').join(' & ')})</div>
        <div style="margin-top: 10px;">
          <span style="background-color: white; color: #4caf50; padding: 5px 10px; border-radius: 15px; font-weight: bold; margin-right: 10px;">${sortedTeams[0].points} Points</span>
          <span style="background-color: rgba(255,255,255,0.3); padding: 5px 10px; border-radius: 15px;">${sortedTeams[0].won}W ${sortedTeams[0].drawn}D ${sortedTeams[0].lost}L</span>
        </div>
      </div>
    `;
  }
  
  // Generate league table
  html += `
    <table class="league-table">
      <thead>
        <tr>
          <th>Pos</th>
          <th>Team</th>
          <th>P</th>
          <th>W</th>
          <th>D</th>
          <th>L</th>
          <th>GF</th>
          <th>GA</th>
          <th>GD</th>
          <th class="points">Pts</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  // Add team rows
  sortedTeams.forEach((team, index) => {
    html += `
      <tr style="${index === 0 ? 'background-color: rgba(76, 175, 80, 0.1);' : ''}">
        <td>${index + 1} ${index === 0 ? '⭐' : ''}</td>
        <td>
          <div class="team-cell">
            <div class="team-avatar" style="background-color: ${team.color || `hsl(${index * 137.5 % 360}, 70%, 45%)`};">
              ${team.name?.substring(0, 2) || `T${index+1}`}
            </div>
            <div>
              <div style="font-weight: bold;">${team.name || `Team ${index+1}`}</div>
              <div style="font-size: 12px; color: #757575;">${team.players?.map(p => p?.name || 'Unknown').join(' & ')}</div>
            </div>
          </div>
        </td>
        <td>${team.played || 0}</td>
        <td>${team.won || 0}</td>
        <td>${team.drawn || 0}</td>
        <td>${team.lost || 0}</td>
        <td>${team.goalsFor || 0}</td>
        <td>${team.goalsAgainst || 0}</td>
        <td>${(team.goalsFor || 0) - (team.goalsAgainst || 0)}</td>
        <td class="points">${team.points || 0}</td>
      </tr>
    `;
  });
  
  html += `
      </tbody>
    </table>
  `;
  
  // Add current leader display if not all matches are completed
  if (!allMatchesCompleted && sortedTeams.length > 0) {
    html += `
      <div style="padding: 10px; margin-bottom: 20px; background-color: #e3f2fd; color: #0d47a1; display: flex; align-items: center; border-radius: 4px;">
        ⭐ <span style="margin-left: 8px; font-weight: bold;">
          Current Leader: ${sortedTeams[0].name} (${sortedTeams[0].players?.map(p => p?.name || 'Unknown').join(' & ')})
          with ${sortedTeams[0].points} points
        </span>
      </div>
    `;
  }
  
  // Add match results
  html += `
    <h3>Match Results</h3>
    <div class="match-grid">
  `;
  
  // Generate match cards
  rounds.forEach(round => {
    if (round.matches && round.matches.length > 0) {
      round.matches.forEach((match, matchIndex) => {
        html += `
          <div class="match-card ${match.completed ? 'completed' : ''}">
            <div class="match-header">
              <span>${round.name} - Match ${matchIndex + 1}</span>
              ${match.completed ? '<span class="completed-tag">Completed</span>' : ''}
            </div>
            <div class="match-team">
              <div class="team-avatar" style="background-color: ${match.team1?.color || '#9e9e9e'};">
                ${match.team1?.name?.substring(0, 2) || '?'}
              </div>
              <div style="flex-grow: 1; margin-left: 8px;">
                <div>${match.team1?.name || 'TBD'}</div>
                <div style="font-size: 12px; color: #757575;">${match.team1?.players?.map(p => p?.name || 'Unknown').join(' & ')}</div>
              </div>
              <div style="font-weight: bold;">${match.score1 !== undefined && match.score1 !== null ? match.score1 : '-'}</div>
            </div>
            <div class="match-team">
              <div class="team-avatar" style="background-color: ${match.team2?.color || '#9e9e9e'};">
                ${match.team2?.name?.substring(0, 2) || '?'}
              </div>
              <div style="flex-grow: 1; margin-left: 8px;">
                <div>${match.team2?.name || 'TBD'}</div>
                <div style="font-size: 12px; color: #757575;">${match.team2?.players?.map(p => p?.name || 'Unknown').join(' & ')}</div>
              </div>
              <div style="font-weight: bold;">${match.score2 !== undefined && match.score2 !== null ? match.score2 : '-'}</div>
            </div>
          </div>
        `;
      });
    }
  });
  
  html += `
    </div>
  `;
  
  return html;
};

// Function to calculate team stats
const calculateTeamStats = (teams, rounds) => {
  // Create a copy of teams with stats initialized
  const teamsWithStats = teams.map(team => ({
    ...team,
    points: 0,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0
  }));

  // Process all matches to calculate stats
  if (rounds && rounds.length > 0) {
    rounds.forEach(round => {
      if (round.matches && round.matches.length > 0) {
        round.matches.forEach(match => {
          // Only count completed matches
          if (match.completed && match.team1 && match.team2 && 
              match.score1 !== null && match.score1 !== undefined && 
              match.score2 !== null && match.score2 !== undefined) {
            
            // Find the team indices
            const team1Index = teamsWithStats.findIndex(t => t.id === match.team1.id);
            const team2Index = teamsWithStats.findIndex(t => t.id === match.team2.id);
            
            if (team1Index >= 0 && team2Index >= 0) {
              // Update matches played
              teamsWithStats[team1Index].played++;
              teamsWithStats[team2Index].played++;
              
              // Update goals
              teamsWithStats[team1Index].goalsFor += parseInt(match.score1) || 0;
              teamsWithStats[team1Index].goalsAgainst += parseInt(match.score2) || 0;
              teamsWithStats[team2Index].goalsFor += parseInt(match.score2) || 0;
              teamsWithStats[team2Index].goalsAgainst += parseInt(match.score1) || 0;
              
              // Update win/draw/loss and points
              if (match.score1 > match.score2) {
                // Team 1 wins
                teamsWithStats[team1Index].won++;
                teamsWithStats[team1Index].points += 3; // 3 points for a win
                teamsWithStats[team2Index].lost++;
              } else if (match.score1 < match.score2) {
                // Team 2 wins
                teamsWithStats[team2Index].won++;
                teamsWithStats[team2Index].points += 3; // 3 points for a win
                teamsWithStats[team1Index].lost++;
              } else {
                // Draw
                teamsWithStats[team1Index].drawn++;
                teamsWithStats[team1Index].points += 1; // 1 point for a draw
                teamsWithStats[team2Index].drawn++;
                teamsWithStats[team2Index].points += 1; // 1 point for a draw
              }
            }
          }
        });
      }
    });
  }
  
  return teamsWithStats;
};

export default TournamentVisualizer;
