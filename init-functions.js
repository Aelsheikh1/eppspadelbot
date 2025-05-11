const { execSync } = require('child_process');

// Initialize Firebase Functions
execSync('firebase init functions', { stdio: 'inherit' });

// Install dependencies
execSync('npm install firebase-admin firebase-functions --prefix functions', { stdio: 'inherit' });
