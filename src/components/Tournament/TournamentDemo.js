import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Tabs, Tab } from '@mui/material';
import TournamentVisualizerEnhanced from './TournamentVisualizerEnhanced';

/**
 * TournamentDemo
 * Renders the tournament visualization (bracket and league table) with enhanced styling.
 * 
 * Props:
 *   tournament: {
 *     format: 'knockout' | 'league',
 *     bracketRounds: [ ... ], // for knockout: array of rounds, each with matches
 *     leagueTable: [ ... ],   // for league: array of teams with stats
 *     champion: { teamName, players, ... }
 *   }
 */

const rawStyle = `
body { font-family: 'Roboto', sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
.container { max-width: 1200px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
h1 { color: #1976d2; margin-top: 0; }
.tournament-bracket { display: flex; overflow-x: auto; padding-bottom: 20px; }
.round { display: flex; flex-direction: column; min-width: 200px; margin-right: 40px; position: relative; }
.round-title { background-color: #1976d2; color: white; padding: 10px; text-align: center; border-radius: 4px 4px 0 0; font-weight: bold; margin-bottom: 20px; }
.match { border: 1px solid #e0e0e0; border-radius: 4px; padding: 10px; margin-bottom: 20px; background-color: white; box-shadow: 0 2px 5px rgba(0,0,0,0.1); position: relative; }
.match.completed { border-color: #4caf50; background-color: rgba(76, 175, 80, 0.05); }
.match::before { content: ''; position: absolute; top: 0; left: 0; width: 4px; height: 100%; background-color: #e0e0e0; }
.match.team1-winner::before { background-color: #4caf50; }
.match.team2-winner::before { background-color: #2196f3; }
.team { display: flex; align-items: center; padding: 5px; border-radius: 4px; margin-bottom: 5px; }
.team.winner { background-color: rgba(76, 175, 80, 0.2); }
.team-avatar { width: 24px; height: 24px; border-radius: 50%; background-color: #9e9e9e; color: white; display: flex; align-items: center; justify-content: center; font-size: 12px; margin-right: 8px; }
.team-name { flex-grow: 1; font-weight: bold; }
.team-score { font-weight: bold; }
.team-players { font-size: 12px; color: #757575; margin-top: 2px; }
.connector { position: absolute; right: -40px; width: 40px; height: 2px; background-color: #e0e0e0; z-index: 1; }
.connector.active { background-color: #4caf50; }
.trophy { display: flex; flex-direction: column; align-items: center; justify-content: center; min-width: 120px; }
.trophy-icon { font-size: 60px; color: gold; margin-bottom: 10px; }
.champion { background-color: #4caf50; color: white; padding: 10px; border-radius: 4px; text-align: center; font-weight: bold; box-shadow: 0 2px 5px rgba(0,0,0,0.2); }
.league-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
.league-table th { background-color: #f5f5f5; padding: 10px; text-align: center; font-weight: bold; border-bottom: 2px solid #e0e0e0; }
.league-table th.points { background-color: #1976d2; color: white; }
.league-table td { padding: 10px; text-align: center; border-bottom: 1px solid #e0e0e0; }
.league-table tr:nth-child(odd) { background-color: #f9f9f9; }
.league-table tr:hover { background-color: #f0f0f0; }
.league-table td.points { font-weight: bold; background-color: #1976d2; color: white; }
.team-cell { display: flex; align-items: center; text-align: left; }
.league-winner { background-color: #4caf50; color: white; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
.tabs { display: flex; margin-bottom: 20px; border-bottom: 1px solid #e0e0e0; }
.tab { padding: 10px 20px; cursor: pointer; border-bottom: 2px solid transparent; }
.tab.active { border-bottom-color: #1976d2; color: #1976d2; font-weight: bold; }
.tab-content { display: none; }
.tab-content.active { display: block; }
`;

const TEAM_COLORS = [
    '#f44336', // Wolves
    '#9c27b0', // Eagles
    '#ff9800', // Tigers
    '#4caf50', // Bears
    '#2196f3', // Dolphins
    '#607d8b', // Sharks
    '#795548', // Lions
    '#009688', // Panthers
    '#e91e63', // Hawks
    '#3f51b5', // Falcons
];

function getTeamAvatar(teamName, idx) {
    // Use initials and color
    const initials = teamName
        .split(' ')
        .map(w => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    const color = TEAM_COLORS[idx % TEAM_COLORS.length];
    return `<div class="team-avatar" style="background-color: ${color};">${initials}</div>`;
}

function renderBracket(bracketRounds, teamsByName) {
    // bracketRounds: array of rounds, each with matches [{team1, team2, score1, score2, winner}]
    return `
        <div class="tournament-bracket">
            ${bracketRounds
                .map(
                    (round, rIdx) => `
                    <div class="round">
                        <div class="round-title">${round.name}</div>
                        ${round.matches
                            .map(
                                (match, mIdx) => {
                                    const t1 = teamsByName[match.team1] || { name: match.team1, players: [] };
                                    const t2 = teamsByName[match.team2] || { name: match.team2, players: [] };
                                    const t1Players = t1.players && t1.players.length ? t1.players.join(' & ') : 'TBC';
                                    const t2Players = t2.players && t2.players.length ? t2.players.join(' & ') : 'TBC';
                                    const t1Win = match.winner === match.team1;
                                    const t2Win = match.winner === match.team2;
                                    return `
                                        <div class="match completed ${t1Win ? 'team1-winner' : ''} ${t2Win ? 'team2-winner' : ''}">
                                            <div class="team ${t1Win ? 'winner' : ''}">
                                                ${getTeamAvatar(t1.name, t1.colorIdx)}
                                                <div>
                                                    <div class="team-name">${t1.name}</div>
                                                    <div class="team-players">${t1Players}</div>
                                                </div>
                                                <div class="team-score">${match.score1 != null ? match.score1 : '-'}</div>
                                            </div>
                                            <div class="team ${t2Win ? 'winner' : ''}">
                                                ${getTeamAvatar(t2.name, t2.colorIdx)}
                                                <div>
                                                    <div class="team-name">${t2.name}</div>
                                                    <div class="team-players">${t2Players}</div>
                                                </div>
                                                <div class="team-score">${match.score2 != null ? match.score2 : '-'}</div>
                                            </div>
                                            <div class="connector active" style="top: 30px;"></div>
                                        </div>
                                    `;
                                }
                            )
                            .join('')}
                    </div>
                `
                )
                .join('')}
        </div>
    `;
}

function renderTrophy(champion) {
    if (!champion) return '';
    const players = champion.players && champion.players.length ? champion.players.join(' & ') : 'TBC';
    return `
        <div class="trophy">
            <div class="trophy-icon">🏆</div>
            <div class="champion">
                <div>CHAMPION</div>
                <div>${champion.name}</div>
                <div style="font-size: 12px; margin-top: 5px;">${players}</div>
            </div>
        </div>
    `;
}

function renderLeagueWinner(winner) {
    if (!winner) return '';
    const players = winner.players && winner.players.length ? winner.players.join(' & ') : 'TBC';
    return `
        <div class="league-winner">
            <h3 style="margin-top: 0;">TOURNAMENT CHAMPION</h3>
            <div style="font-size: 18px; font-weight: bold;">${winner.name} (${players})</div>
            <div style="margin-top: 10px;">
                <span style="background-color: white; color: #4caf50; padding: 5px 10px; border-radius: 15px; font-weight: bold; margin-right: 10px;">${winner.points} Points</span>
                <span style="background-color: rgba(255,255,255,0.3); padding: 5px 10px; border-radius: 15px;">${winner.won}W ${winner.drawn}D ${winner.lost}L</span>
            </div>
        </div>
    `;
}

function renderLeagueTable(leagueTable) {
    return `
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
                ${leagueTable
                    .map(
                        (team, idx) => `
                        <tr${idx === 0 ? ' style="background-color: rgba(76, 175, 80, 0.1);"' : ''}>
                            <td>${idx + 1}${idx === 0 ? ' ⭐' : ''}</td>
                            <td>
                                <div class="team-cell">
                                    ${getTeamAvatar(team.name, team.colorIdx)}
                                    <div>
                                        <div style="font-weight: bold;">${team.name}</div>
                                        <div style="font-size: 12px; color: #757575;">${team.players && team.players.length ? team.players.join(' & ') : 'TBC'}</div>
                                    </div>
                                </div>
                            </td>
                            <td>${team.played}</td>
                            <td>${team.won}</td>
                            <td>${team.drawn}</td>
                            <td>${team.lost}</td>
                            <td>${team.goalsFor}</td>
                            <td>${team.goalsAgainst}</td>
                            <td>${team.goalDiff >= 0 ? '+' : ''}${team.goalDiff}</td>
                            <td class="points">${team.points}</td>
                        </tr>
                    `
                    )
                    .join('')}
            </tbody>
        </table>
    `;
}

const rawScript = `
window.showTab = function(tabId) {
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.getElementById(tabId).classList.add('active');
    document.querySelector('.tab[onclick="showTab(\\'' + tabId + '\\')"]').classList.add('active');
};
`;

export default function TournamentDemo({ tournament }) {
    const [tabValue, setTabValue] = useState(0);
    
    // Format tournament data for the enhanced visualizer
    const formatTournamentData = () => {
        if (!tournament) return { rounds: [], teams: [], format: 'knockout' };
        
        // Prepare teams with consistent colors
        const teams = tournament.teams ? tournament.teams.map((team, idx) => ({
            ...team,
            color: TEAM_COLORS[idx % TEAM_COLORS.length]
        })) : [];
        
        // Format rounds for the visualizer
        const rounds = tournament.bracketRounds || [];
        
        return {
            rounds,
            teams,
            format: tournament.format || 'knockout'
        };
    };
    
    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };
    
    const tournamentData = formatTournamentData();
    
    return (
        <Paper elevation={3} sx={{ p: 3, borderRadius: 2, mb: 4 }}>
            <Typography variant="h4" gutterBottom sx={{ 
                color: '#1a237e',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                mb: 3
            }}>
                <span role="img" aria-label="trophy" style={{ marginRight: '10px' }}>🏆</span>
                Tournament Visualization
            </Typography>
            
            <Tabs 
                value={tabValue} 
                onChange={handleTabChange}
                indicatorColor="primary"
                textColor="primary"
                sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
            >
                <Tab label="Knockout Tournament" />
                <Tab label="League Table" />
            </Tabs>
            
            <Box sx={{ mt: 2 }}>
                {/* Show the appropriate visualization based on the selected tab */}
                {tabValue === 0 && (
                    <TournamentVisualizerEnhanced
                        rounds={tournamentData.rounds}
                        teams={tournamentData.teams}
                        format="knockout"
                    />
                )}
                {tabValue === 1 && (
                    <TournamentVisualizerEnhanced
                        rounds={tournamentData.rounds}
                        teams={tournamentData.teams}
                        format="League"
                    />
                )}
            </Box>
        </Paper>
    );
}
