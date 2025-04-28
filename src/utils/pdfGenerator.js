import { db } from '../services/firebase';
import { doc, getDoc, getDocs, query, where, collection, updateDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import emailjs from '@emailjs/browser';

const EMAILJS_SERVICE_ID = 'service_7tyowsa';
const EMAILJS_TEMPLATE_ID = 'template_jbxo9ua';
const EMAILJS_PUBLIC_KEY = 'nQmOlke0ZSm9wxLuH';

// Function to distribute teams
const distributeTeams = (players) => {
  // Sort players by skill level
  players.sort((a, b) => a.skillLevel - b.skillLevel);

  // Distribute teams
  const pairs = [];
  for (let i = 0; i < players.length; i += 2) {
    pairs.push({
      player1: players[i],
      player2: players[i + 1] || null
    });
  }

  return pairs;
};

export const emailGameReport = async (gameId) => {
  try {
    // Fetch game data
    const gameRef = doc(db, 'games', gameId);
    const gameSnap = await getDoc(gameRef);
    
    if (!gameSnap.exists()) {
      throw new Error('Game not found');
    }

    const game = { id: gameId, ...gameSnap.data() };

    // If game is closed and no teams are distributed yet, distribute them now
    if (game.status === 'closed' && (!game.pairs || game.pairs.length === 0)) {
      // Fetch complete player details for distribution
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
                name: playerData.firstName && playerData.lastName
                  ? `${playerData.firstName} ${playerData.lastName}`
                  : playerData.displayName || playerData.email?.split('@')[0] || 'Unknown Player',
                email: playerData.email,
                skillLevel: playerData.skillLevel || 5
              };
            }
          } catch (error) {
            console.error(`Error fetching player ${playerId}:`, error);
          }
          return null;
        })
      );

      // Filter out null values
      const validPlayers = players.filter(p => p !== null);
      
      // Distribute teams
      const distributedPairs = distributeTeams(validPlayers);
      
      // Update game with distributed teams
      await updateDoc(gameRef, {
        pairs: distributedPairs
      });
      
      // Update local game object with distributed pairs
      game.pairs = distributedPairs;
    }

    // Fetch complete player details for email
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
              name: playerData.firstName && playerData.lastName
                ? `${playerData.firstName} ${playerData.lastName}`
                : playerData.displayName || playerData.email?.split('@')[0] || 'Unknown Player',
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
      game.pairs = game.pairs.map(pair => {
        const player1 = pair.player1 ? game.players.find(p => p.id === pair.player1.id) : null;
        const player2 = pair.player2 ? game.players.find(p => p.id === pair.player2.id) : null;
        return {
          ...pair,
          player1,
          player2
        };
      });
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
            <span style="color: #2196f3;">👤 ${pair.player1?.name || 'TBD'}</span>
            ${pair.player2 ? ` - <span style="color: #4caf50;">👤 ${pair.player2.name}</span>` : ''}
          </div>
         </div>`
      ).join('');
    };

    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1a73e8; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">
            <span style="margin-right: 10px;">🎾</span>
            Game Report ${game.emailSent ? '(Updated)' : ''}
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
              <span style="margin-right: 8px;">🏆</span>
              Teams Distribution
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
      game_id: `${game.location} - ${format(new Date(game.date), 'PP')} at ${game.time}${game.emailSent ? ' (Updated)' : ''}`,
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

    // Mark as sent and increment reopenCount if it's a resend
    await updateDoc(gameRef, {
      emailSent: true,
      emailSentAt: new Date().toISOString(),
      reopenCount: (game.reopenCount || 0) + (game.emailSent ? 1 : 0)
    });

    return response;
  } catch (error) {
    console.error('Error sending game report email:', error);
    throw error;
  }
};
