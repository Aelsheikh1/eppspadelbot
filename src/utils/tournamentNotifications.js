import { db, auth } from '../services/firebase';
import { 
  collection, 
  addDoc, 
  serverTimestamp,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { showLocalNotification } from '../services/notificationService';

/**
 * Send notification for a new tournament
 * @param {Object} tournament - Tournament data
 */
export const notifyNewTournament = async (tournament) => {
  try {
    // Create notification data
    const notificationData = {
      title: 'New Tournament Available',
      body: `${tournament.name} has been created. Registration is now open!`,
      type: 'tournament_created',
      createdAt: serverTimestamp(),
      data: {
        tournamentId: tournament.id,
        url: `/tournaments/${tournament.id}`,
        action: 'register'
      },
      // No targeting means send to all users
      targetRole: null,
      targetUserId: null
    };
    
    // Add to custom notifications collection
    await addDoc(collection(db, 'customNotifications'), notificationData);
    console.log('Tournament creation notification sent');
    return true;
  } catch (error) {
    console.error('Error sending tournament notification:', error);
    return false;
  }
};

/**
 * Send notification for tournament registration deadline approaching
 * @param {Object} tournament - Tournament data
 * @param {number} hoursRemaining - Hours remaining until deadline
 */
export const notifyRegistrationDeadline = async (tournament, hoursRemaining) => {
  try {
    // Get all users who have registered for this tournament
    const registrationsQuery = query(
      collection(db, 'tournamentRegistrations'),
      where('tournamentId', '==', tournament.id)
    );
    
    const registrations = await getDocs(registrationsQuery);
    const registeredUserIds = registrations.docs.map(doc => doc.data().userId);
    
    // Create notification data
    const notificationData = {
      title: 'Registration Deadline Approaching',
      body: `${tournament.name} registration closes in ${hoursRemaining} hours!`,
      type: 'tournament_deadline',
      createdAt: serverTimestamp(),
      data: {
        tournamentId: tournament.id,
        url: `/tournaments/${tournament.id}`,
        action: 'view_tournament'
      }
    };
    
    // Add a notification for each registered user
    const notificationPromises = registeredUserIds.map(userId => {
      return addDoc(collection(db, 'customNotifications'), {
        ...notificationData,
        targetUserId: userId
      });
    });
    
    await Promise.all(notificationPromises);
    console.log(`Deadline notifications sent to ${registeredUserIds.length} users`);
    return true;
  } catch (error) {
    console.error('Error sending deadline notifications:', error);
    return false;
  }
};

/**
 * Send notification for tournament match updates
 * @param {Object} match - Match data
 * @param {string} tournamentId - Tournament ID
 * @param {string} tournamentName - Tournament name
 */
export const notifyMatchResult = async (match, tournamentId, tournamentName) => {
  try {
    // Get the team members for both teams
    const team1Members = match.team1Players || [];
    const team2Members = match.team2Players || [];
    const allPlayers = [...team1Members, ...team2Members];
    
    // Determine the winning team
    const winningTeam = match.winner === 'team1' ? 'Team 1' : 'Team 2';
    const winningTeamPlayers = match.winner === 'team1' ? team1Members : team2Members;
    const winnerNames = winningTeamPlayers.map(player => player.name || 'Unknown').join(' & ');
    
    // Create notification data
    const notificationData = {
      title: 'Match Result',
      body: `${winnerNames} won their match in ${tournamentName}!`,
      type: 'match_result',
      createdAt: serverTimestamp(),
      data: {
        tournamentId: tournamentId,
        matchId: match.id,
        url: `/tournaments/${tournamentId}/matches/${match.id}`,
        action: 'view_match'
      }
    };
    
    // Add a notification for each player
    const notificationPromises = allPlayers.map(player => {
      if (player.userId) {
        return addDoc(collection(db, 'customNotifications'), {
          ...notificationData,
          targetUserId: player.userId
        });
      }
      return Promise.resolve();
    });
    
    await Promise.all(notificationPromises);
    console.log(`Match result notifications sent to ${allPlayers.length} players`);
    return true;
  } catch (error) {
    console.error('Error sending match result notifications:', error);
    return false;
  }
};

/**
 * Send notification for tournament winner
 * @param {Object} tournament - Tournament data
 * @param {Array} winningTeam - Winning team data
 */
export const notifyTournamentWinner = async (tournament, winningTeam) => {
  try {
    // Get player names
    const winnerNames = winningTeam.players
      .map(player => player.name || 'Unknown')
      .join(' & ');
    
    // Create notification data
    const notificationData = {
      title: 'Tournament Champion! 🏆',
      body: `${winnerNames} has won the ${tournament.name} tournament!`,
      type: 'tournament_winner',
      createdAt: serverTimestamp(),
      data: {
        tournamentId: tournament.id,
        url: `/tournaments/${tournament.id}/results`,
        action: 'view_results'
      },
      // No targeting means send to all users
      targetRole: null,
      targetUserId: null
    };
    
    // Add to custom notifications collection
    await addDoc(collection(db, 'customNotifications'), notificationData);
    console.log('Tournament winner notification sent');
    
    // Also show a local notification for users currently in the app
    showLocalNotification(
      notificationData.title,
      notificationData.body,
      notificationData.data
    );
    
    return true;
  } catch (error) {
    console.error('Error sending tournament winner notification:', error);
    return false;
  }
};

/**
 * Send notification for tournament bracket updates
 * @param {string} tournamentId - Tournament ID
 * @param {string} tournamentName - Tournament name
 * @param {string} roundName - Round name (e.g., "Quarterfinals", "Semifinals")
 */
export const notifyBracketUpdate = async (tournamentId, tournamentName, roundName) => {
  try {
    // Get all users who have registered for this tournament
    const registrationsQuery = query(
      collection(db, 'tournamentRegistrations'),
      where('tournamentId', '==', tournamentId)
    );
    
    const registrations = await getDocs(registrationsQuery);
    const registeredUserIds = registrations.docs.map(doc => doc.data().userId);
    
    // Create notification data
    const notificationData = {
      title: 'Tournament Update',
      body: `${roundName} matches for ${tournamentName} have been scheduled!`,
      type: 'bracket_update',
      createdAt: serverTimestamp(),
      data: {
        tournamentId: tournamentId,
        url: `/tournaments/${tournamentId}/bracket`,
        action: 'view_bracket'
      }
    };
    
    // Add a notification for each registered user
    const notificationPromises = registeredUserIds.map(userId => {
      return addDoc(collection(db, 'customNotifications'), {
        ...notificationData,
        targetUserId: userId
      });
    });
    
    await Promise.all(notificationPromises);
    console.log(`Bracket update notifications sent to ${registeredUserIds.length} users`);
    return true;
  } catch (error) {
    console.error('Error sending bracket update notifications:', error);
    return false;
  }
};

/**
 * Send notification for upcoming match reminder
 * @param {Object} match - Match data
 * @param {string} tournamentId - Tournament ID
 * @param {string} tournamentName - Tournament name
 * @param {number} minutesUntilMatch - Minutes until match starts
 */
export const notifyUpcomingMatch = async (match, tournamentId, tournamentName, minutesUntilMatch) => {
  try {
    // Get the team members for both teams
    const team1Members = match.team1Players || [];
    const team2Members = match.team2Players || [];
    const allPlayers = [...team1Members, ...team2Members];
    
    // Create notification data
    const notificationData = {
      title: 'Upcoming Match',
      body: `Your match in ${tournamentName} starts in ${minutesUntilMatch} minutes!`,
      type: 'upcoming_match',
      createdAt: serverTimestamp(),
      data: {
        tournamentId: tournamentId,
        matchId: match.id,
        url: `/tournaments/${tournamentId}/matches/${match.id}`,
        action: 'view_match'
      }
    };
    
    // Add a notification for each player
    const notificationPromises = allPlayers.map(player => {
      if (player.userId) {
        return addDoc(collection(db, 'customNotifications'), {
          ...notificationData,
          targetUserId: player.userId
        });
      }
      return Promise.resolve();
    });
    
    await Promise.all(notificationPromises);
    console.log(`Upcoming match notifications sent to ${allPlayers.length} players`);
    return true;
  } catch (error) {
    console.error('Error sending upcoming match notifications:', error);
    return false;
  }
};
