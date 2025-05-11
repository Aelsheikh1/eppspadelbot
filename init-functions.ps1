$ErrorActionPreference = "Stop"

# Initialize Firebase Functions
firebase init functions --project=padelbolt-5d9a2 --language=javascript --no-eslint --port=5001 --force

# Install dependencies
npm install firebase-admin firebase-functions --prefix functions
