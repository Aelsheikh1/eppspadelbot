$ErrorActionPreference = "Stop"

# Navigate to functions directory
Set-Location -Path "functions"

# Install dependencies
Write-Host "Installing dependencies..."
npm install

# Deploy functions
Write-Host "Deploying functions..."
firebase deploy --only functions

Write-Host "Deployment complete!"
