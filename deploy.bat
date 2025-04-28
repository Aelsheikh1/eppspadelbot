@echo off
echo Deploying to GitHub and Vercel...

:: Step 1: Git add & commit
git add .
git commit -m "Auto-deploy"

:: Step 2: Push to GitHub main
git push origin main

:: Step 3: Deploy to Vercel production
vercel --prod

echo Done!
pause
