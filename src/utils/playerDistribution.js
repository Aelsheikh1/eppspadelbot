// Function to shuffle an array randomly
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Function to calculate player's skill level (can be expanded based on more criteria)
const calculateSkillLevel = (player) => {
  console.log('Calculating skill level for player:', player);
  if (!player) return 5;
  if (typeof player === 'string') return 5;
  return player.skillLevel || player.rating || 5; // Try different properties, default to 5
};

// Function to create a valid player object for Firestore
const createPlayerObject = (player) => {
  if (!player) return null;
  
  // If player is just an ID string
  if (typeof player === 'string') {
    return {
      id: player,
      name: 'Unknown Player'
    };
  }

  // If player is an object, ensure it has required fields
  if (typeof player === 'object') {
    return {
      id: player.id,
      name: player.name || player.displayName || 'Unknown Player',
      email: player.email || null
    };
  }

  return null;
};

// Main function to distribute players into balanced teams
export const distributeTeams = (players) => {
  console.log('Starting team distribution with players:', JSON.stringify(players, null, 2));
  
  // Validate input
  if (!players || players.length === 0) {
    console.warn('No players provided for team distribution');
    return [];
  }

  // Filter out any undefined or null players and ensure proper structure
  const validPlayers = players.filter(player => {
    console.log('Validating player:', player);
    if (!player) {
      console.log('Player is null/undefined');
      return false;
    }
    if (typeof player === 'string') {
      console.log('Player is string ID:', player);
      return true;
    }
    const isValid = typeof player === 'object' && (player.id || player.email);
    console.log('Player validation result:', isValid, player);
    return isValid;
  });

  console.log('Valid players after filtering:', JSON.stringify(validPlayers, null, 2));

  // Ensure we have at least 2 players
  if (validPlayers.length < 2) {
    console.warn('Not enough players to create teams');
    return [];
  }

  // Sort players by skill level
  const sortedPlayers = [...validPlayers].sort((a, b) => 
    calculateSkillLevel(b) - calculateSkillLevel(a)
  );

  console.log('Sorted players:', JSON.stringify(sortedPlayers, null, 2));

  // Calculate number of pairs possible
  const numPairs = Math.floor(validPlayers.length / 2);
  const pairs = [];

  // Create pairs ensuring skill balance
  for (let i = 0; i < numPairs; i++) {
    // Take one player from the top half and one from the bottom half
    const player1 = sortedPlayers[i];
    const player2 = sortedPlayers[sortedPlayers.length - 1 - i];

    console.log('Creating pair with players:', 
      JSON.stringify(player1, null, 2), 
      JSON.stringify(player2, null, 2)
    );

    const pair = {
      player1: createPlayerObject(player1),
      player2: createPlayerObject(player2),
      score: 0
    };

    console.log('Created pair:', JSON.stringify(pair, null, 2));
    pairs.push(pair);
  }

  // Handle remaining player if odd number
  const remainingPlayer = validPlayers.length % 2 === 1 ? sortedPlayers[numPairs] : null;
  if (remainingPlayer) {
    console.log('Handling remaining player:', JSON.stringify(remainingPlayer, null, 2));
    const pair = {
      player1: createPlayerObject(remainingPlayer),
      player2: null,
      score: 0
    };
    console.log('Created pair for remaining player:', JSON.stringify(pair, null, 2));
    pairs.push(pair);
  }

  console.log('Final pairs before shuffle:', JSON.stringify(pairs, null, 2));
  // Shuffle the pairs to randomize the order
  const shuffledPairs = shuffleArray(pairs);
  console.log('Final shuffled pairs:', JSON.stringify(shuffledPairs, null, 2));
  return shuffledPairs;
};

// Function to get players that weren't assigned to teams
export const getUnassignedPlayers = (allPlayers, distributedPairs) => {
  if (!distributedPairs || !allPlayers) return [];
  
  const assignedPlayerIds = new Set();
  distributedPairs.forEach(pair => {
    if (pair.player1) assignedPlayerIds.add(pair.player1.id);
    if (pair.player2) assignedPlayerIds.add(pair.player2.id);
  });

  return allPlayers.filter(player => !assignedPlayerIds.has(player.id));
};
