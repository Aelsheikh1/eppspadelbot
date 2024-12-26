import { db } from '../services/firebase';
import { doc, getDoc, getDocs, query, where, collection, updateDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import emailjs from '@emailjs/browser';

const EMAILJS_SERVICE_ID = 'service_7tyowsa';
const EMAILJS_TEMPLATE_ID = 'template_jbxo9ua';
const EMAILJS_PUBLIC_KEY = 'nQmOlke0ZSm9wxLuH';

export const emailGameReport = async (gameId) => {
  try {
    // Fetch game data
    const gameRef = doc(db, 'games', gameId);
    const gameDoc = await getDoc(gameRef);
    
    if (!gameDoc.exists()) {
      throw new Error('Game not found');
    }

    const game = { id: gameId, ...gameDoc.data() };

    // Check if email has already been sent
    if (game.emailSent) {
      console.log('Email already sent for this game');
      return;
    }

    // Fetch complete player details for all players
    const players = await Promise.all(
      (game.players || []).map(async (player) => {
        const playerId = typeof player === 'string' ? player : player.id;
        if (!playerId) return null;

        try {
          const playerDoc = await getDoc(doc(db, 'users', playerId));
          if (playerDoc.exists()) {
            const playerData = playerDoc.data();
            return {
              id: playerId,
              name: playerData.name || playerData.email,
              email: playerData.email
            };
          }
        } catch (error) {
          console.error(`Error fetching player ${playerId}:`, error);
        }
        return null;
      })
    );

    // Filter out null values and update game object
    game.players = players.filter(p => p !== null);

    // If there are pairs, fetch player details for them too
    if (game.pairs) {
      game.pairs = await Promise.all(
        game.pairs.map(async (pair) => {
          const player1 = pair.player1 ? game.players.find(p => p.id === (typeof pair.player1 === 'string' ? pair.player1 : pair.player1.id)) : null;
          const player2 = pair.player2 ? game.players.find(p => p.id === (typeof pair.player2 === 'string' ? pair.player2 : pair.player2.id)) : null;
          return {
            ...pair,
            player1,
            player2
          };
        })
      );
    }

    // Get all admin emails
    const adminsSnapshot = await getDocs(query(collection(db, 'users'), where('role', '==', 'admin')));
    const adminEmails = adminsSnapshot.docs.map(doc => doc.data().email).filter(Boolean);

    // Get all player emails
    const playerEmails = game.players.map(player => player.email).filter(Boolean);

    // Combine all recipient emails and remove duplicates
    const recipientEmails = [...new Set([...adminEmails, ...playerEmails])];

    if (recipientEmails.length === 0) {
      throw new Error('No recipient emails found');
    }

    const formatTeams = () => {
      if (!game.pairs || game.pairs.length === 0) {
        // If no pairs but we have players, create a default team
        if (game.players && game.players.length >= 2) {
          return `<div style="padding: 12px; margin: 8px 0; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #1a73e8;">
            <div style="color: #1a73e8; font-weight: bold; margin-bottom: 4px;">
              <span style="background: #1a73e8; color: white; padding: 4px 8px; border-radius: 4px; font-size: 14px;">Team 1</span>
            </div>
            <div style="margin-top: 8px;">
              <span style="color: #2196f3;">👤 ${game.players[0].name}</span> - 
              <span style="color: #4caf50;">👤 ${game.players[1].name}</span>
            </div>
          </div>`;
        }
        return '<p style="color: #666;">No teams distributed yet</p>';
      }
      return game.pairs.map((pair, index) => 
        `<div style="padding: 12px; margin: 8px 0; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #1a73e8;">
          <div style="color: #1a73e8; font-weight: bold; margin-bottom: 4px;">
            <span style="background: #1a73e8; color: white; padding: 4px 8px; border-radius: 4px; font-size: 14px;">
              🏆 Team ${index + 1}
            </span>
          </div>
          <div style="margin-top: 8px;">
            <span style="color: #2196f3;">👤 ${pair.player1?.name || 'TBD'}</span> - 
            <span style="color: #4caf50;">👤 ${pair.player2?.name || 'TBD'}</span>
          </div>
         </div>`
      ).join('');
    };

    const formatPlayers = () => {
      if (!game.players || game.players.length === 0) return '<p style="color: #666;">No players joined yet</p>';
      
      // Array of colors for players
      const playerColors = ['#2196f3', '#4caf50', '#ff9800', '#e91e63', '#9c27b0', '#00bcd4', '#009688', '#ff5722'];
      const playerIcons = ['👤', '🎾', '🏃', '🎯', '🌟', '⭐', '💫', '✨'];
      
      return game.players.map((player, index) => 
        `<div style="padding: 12px; margin: 8px 0; background: #f8f9fa; border-radius: 8px; border-left: 4px solid ${playerColors[index % playerColors.length]};">
          <div style="display: flex; align-items: center;">
            <span style="font-size: 20px; margin-right: 8px;">${playerIcons[index % playerIcons.length]}</span>
            <div>
              <span style="color: ${playerColors[index % playerColors.length]}; font-weight: bold;">${player.name}</span>
              <span style="color: #666; font-size: 0.9em;"> (${player.email})</span>
            </div>
          </div>
         </div>`
      ).join('');
    };

    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1a73e8; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">
            <span style="margin-right: 10px;">🎾</span>
            Game Report
          </h1>
        </div>
        
        <div style="padding: 20px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
          <div style="background: #f8f9fa; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
            <h2 style="margin: 0 0 15px 0; color: #1a73e8; font-size: 18px;">
              <span style="margin-right: 8px;">📋</span>
              Game Details
            </h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666;">
                  <span style="margin-right: 8px;">📅</span>
                  Date:
                </td>
                <td style="padding: 8px 0;"><strong>${game.date ? format(new Date(game.date), 'PPP') : 'Not set'}</strong></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">
                  <span style="margin-right: 8px;">⏰</span>
                  Time:
                </td>
                <td style="padding: 8px 0;"><strong>${game.time || 'Not set'}</strong></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">
                  <span style="margin-right: 8px;">📍</span>
                  Location:
                </td>
                <td style="padding: 8px 0;"><strong>${game.location || 'Not set'}</strong></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">
                  <span style="margin-right: 8px;">🎮</span>
                  Status:
                </td>
                <td style="padding: 8px 0;">
                  <span style="background: ${game.isOpen ? '#4caf50' : '#f44336'}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 14px;">
                    ${game.isOpen ? '🟢 Open' : '🔴 Closed'}
                  </span>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">
                  <span style="margin-right: 8px;">👥</span>
                  Total Players:
                </td>
                <td style="padding: 8px 0;"><strong>${game.players?.length || 0}</strong></td>
              </tr>
            </table>
          </div>

          <div style="margin-bottom: 20px;">
            <h2 style="color: #1a73e8; font-size: 18px;">
              <span style="margin-right: 8px;">👥</span>
              Players List
            </h2>
            ${formatPlayers()}
          </div>

          <div style="margin-bottom: 20px;">
            <h2 style="color: #1a73e8; font-size: 18px;">
              <span style="margin-right: 8px;">🏆</span>
              Distributed Teams
            </h2>
            ${formatTeams()}
          </div>

          <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #e0e0e0; color: #666; font-size: 12px; text-align: center;">
            <span style="margin-right: 5px;">⏱️</span>
            Generated on: ${format(new Date(), 'PPP p')}
          </div>
        </div>
      </div>
    `;

    const templateParams = {
      to_email: recipientEmails.join(','),
      game_id: `${game.location} - ${format(new Date(game.date), 'PP')} at ${game.time}${game.reopenCount ? ' (Updated)' : ''}`,
      game_details: emailBody
    };

    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams,
      EMAILJS_PUBLIC_KEY
    );

    if (response.status !== 200) {
      throw new Error('Failed to send email');
    }

    // After sending email, mark as sent
    await updateDoc(gameRef, {
      emailSent: true,
      emailSentAt: new Date().toISOString()
    });

    console.log('Game report email sent successfully');
  } catch (error) {
    console.error('Error sending game report email:', error);
    throw error;
  }
};
