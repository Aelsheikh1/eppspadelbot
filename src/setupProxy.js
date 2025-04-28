const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // API endpoint to get tournament data
  app.get('/api/tournaments/:id', async (req, res) => {
    try {
      // Import Firebase modules dynamically to avoid ES module issues
      const { getFirestore, doc, getDoc } = await import('firebase/firestore');
      const { initializeApp, getApps, getApp } = await import('firebase/app');
      
      // Firebase configuration
      const firebaseConfig = {
        apiKey: "AIzaSyDxHJkFJmUMqBPzIQlUdGVn9zKBKFl7wvQ",
        authDomain: "eppspadelbot.firebaseapp.com",
        projectId: "eppspadelbot",
        storageBucket: "eppspadelbot.appspot.com",
        messagingSenderId: "1007493758906",
        appId: "1:1007493758906:web:a9f5e8d0c6f6b4c0c6a8c7"
      };
      
      // Initialize Firebase (or get existing app)
      const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
      const db = getFirestore(firebaseApp);
      
      const id = req.params.id;
      
      // Load from games collection
      const gameDoc = await getDoc(doc(db, 'games', id));
      
      if (!gameDoc.exists()) {
        return res.status(404).json({ error: 'Tournament not found' });
      }
      
      const gameData = gameDoc.data();
      
      // Check if this game is a tournament
      if (!gameData.isTournament || !gameData.tournamentData) {
        return res.status(404).json({ error: 'This game is not a tournament' });
      }
      
      // Use the tournament data from the game document
      const tournamentData = {
        id: gameDoc.id,
        ...gameData.tournamentData,
        format: gameData.tournamentFormat || gameData.tournamentData.format || 'Knockout',
      };
      
      res.json(tournamentData);
    } catch (err) {
      console.error('Error loading tournament:', err);
      res.status(500).json({ error: 'Failed to load tournament details' });
    }
  });
};
