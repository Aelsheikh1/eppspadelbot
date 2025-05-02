#!/bin/bash

# Check if service account file exists
if [ ! -f "src/service-account.json" ]; then
echo "Error: service-account.json not found. Please copy your service account credentials to src/service-account.json"
exit 1
fi

# Add all files
git add .

# Commit changes
git commit -m "Update with deployment changes"

# Push to master
git push origin master
