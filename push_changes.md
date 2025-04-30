# Git Workflow for Project Updates

## Basic Git Commands

### 1. Check Current Status
```bash
git status
```
- Shows which files have been modified, staged, or are untracked
- Helps you understand the current state of your repository

### 2. Add Changes to Staging
```bash
# Add specific files
git add src/components/NotificationBell.js src/utils/gameNotifications.js

# Or add all changed files
git add .
```
- Prepares files to be committed
- Allows you to select which changes you want to include in the commit

### 3. Commit Changes
```bash
git commit -m "Descriptive commit message explaining the changes"
```
- Creates a snapshot of your changes
- Always use a clear, concise message describing what was modified

### 4. Push Changes to Remote Repository
```bash
# Push to master branch
git push origin master

# If working on a different branch
git push origin branch_name
```
- Uploads your local commits to the remote repository on GitHub

### 5. Pull Latest Changes
```bash
git pull origin master
```
- Downloads and merges the latest changes from the remote repository
- Always pull before starting new work to avoid conflicts

### 6. Create a New Branch
```bash
git checkout -b new_feature_branch
```
- Creates and switches to a new branch for developing features

### 7. Switch Between Branches
```bash
git checkout master
git checkout new_feature_branch
```
- Allows you to move between different branches

## Troubleshooting

### Undo Last Commit (Local Only)
```bash
# Undo commit but keep changes
git reset HEAD~1

# Undo commit and discard changes
git reset --hard HEAD~1
```

### View Commit History
```bash
git log
```

## Best Practices
- Always pull before you start working
- Create a new branch for each feature
- Write clear, descriptive commit messages
- Review changes before committing
