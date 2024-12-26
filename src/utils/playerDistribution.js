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
  return player.skillLevel || 5; // Default to middle skill level if not specified
};

// Main function to distribute players into balanced teams
export const distributeTeams = (players) => {
  // Validate input
  if (!players || players.length === 0) {
    console.warn('No players provided for team distribution');
    return [];
  }

  // Filter out any undefined or null players
  const validPlayers = players.filter(player => 
    player && (typeof player === 'object' || typeof player === 'string')
  );

  // Ensure we have at least 2 players
  if (validPlayers.length < 2) {
    console.warn('Not enough players to create teams');
    return [];
  }

  // Sort players by skill level
  const sortedPlayers = [...validPlayers].sort((a, b) => 
    calculateSkillLevel(b) - calculateSkillLevel(a)
  );

  // Calculate number of pairs possible
  const numPairs = Math.floor(validPlayers.length / 2);
  const pairs = [];

  // Create pairs ensuring skill balance
  for (let i = 0; i < numPairs; i++) {
    // Take one player from the top half and one from the bottom half
    const player1 = sortedPlayers[i];
    const player2 = sortedPlayers[sortedPlayers.length - 1 - i];

    pairs.push({
      player1,
      player2,
      averageSkill: (calculateSkillLevel(player1) + calculateSkillLevel(player2)) / 2
    });
  }

  // Handle remaining player if odd number
  const remainingPlayer = validPlayers.length % 2 === 1 ? sortedPlayers[numPairs] : null;
  if (remainingPlayer) {
    pairs.push({
      player1: remainingPlayer,
      player2: null,
      averageSkill: calculateSkillLevel(remainingPlayer)
    });
  }

  // Shuffle the pairs to randomize the order
  return shuffleArray(pairs);
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
