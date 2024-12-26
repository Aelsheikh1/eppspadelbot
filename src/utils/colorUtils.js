// Function to generate a consistent color based on user ID or email
export const getUserColor = (identifier) => {
  // List of predefined pastel colors
  const colors = [
    '#FFB6C1', // Light pink
    '#98FB98', // Pale green
    '#87CEFA', // Light sky blue
    '#DDA0DD', // Plum
    '#F0E68C', // Khaki
    '#E6E6FA', // Lavender
    '#FFE4B5', // Moccasin
    '#B0C4DE', // Light steel blue
    '#98FF98', // Mint green
    '#FFA07A', // Light salmon
    '#AFEEEE', // Pale turquoise
    '#D8BFD8', // Thistle
    '#FFDAB9', // Peach puff
    '#B0E0E6', // Powder blue
    '#FFB6C1', // Light pink
  ];

  // Generate a hash from the identifier
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = ((hash << 5) - hash) + identifier.charCodeAt(i);
    hash = hash & hash;
  }

  // Get a consistent color from the array using the hash
  const colorIndex = Math.abs(hash) % colors.length;
  return colors[colorIndex];
};
