# Cleanup script for preparing the repository for GitHub

# Remove any backup or temporary files
Get-ChildItem -Path . -Recurse -Include *.bak,*.new,*.tmp,*~ | ForEach-Object {
    Write-Host "Removing $($_.FullName)"
    Remove-Item $_.FullName -Force
}

# Make sure node_modules is not tracked
Write-Host "Making sure node_modules is not tracked"
git rm -r --cached node_modules 2>$null
git rm -r --cached functions/node_modules 2>$null

# Add all changes
Write-Host "Adding all changes to git"
git add .

# Show status
Write-Host "Current git status:"
git status
