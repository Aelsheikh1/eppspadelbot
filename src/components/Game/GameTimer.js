import React, { useEffect, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { emailGameReport } from '../../utils/pdfGenerator';

const GameTimer = ({ game }) => {
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    if (!game || !game.date || !game.time) return;

    const checkTime = () => {
      const now = new Date();
      const gameDateTime = new Date(`${game.date}T${game.time}`);
      const timeDiff = gameDateTime - now;

      // If game time has passed and game is still open
      if (timeDiff <= 0 && game.status !== 'closed') {
        handleGameExpired();
      }

      setTimeLeft(timeDiff);
    };

    // Check immediately
    checkTime();

    // Check every minute
    const timer = setInterval(checkTime, 60000);

    return () => clearInterval(timer);
  }, [game]);

  const handleGameExpired = async () => {
    try {
      // Update game status
      const gameRef = doc(db, 'games', game.id);
      await updateDoc(gameRef, {
        status: 'closed',
        closedAt: new Date().toISOString(),
        closedReason: 'registration_expired'
      });

      // Send automatic email notification
      try {
        await emailGameReport(game.id);
        console.log('Game expired notification sent successfully');
      } catch (emailErr) {
        console.error('Failed to send game expired notification:', emailErr);
      }
    } catch (err) {
      console.error('Error handling game expiration:', err);
    }
  };

  return null; // This is a utility component, no UI needed
};

export default GameTimer;
