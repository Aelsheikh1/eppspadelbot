# EPPS Padel Bolt

A professional Padel Game Management System that helps organize and manage padel games efficiently.

## Deployment Instructions

### Deploying to Vercel

To deploy your changes to Vercel, follow these steps:

1. Stage your changes:
```bash
git add .
```

2. Commit your changes with a descriptive message:
```bash
git commit -m "your commit message here"
```

3. Push to the main branch:
```bash
git push origin main
```

The deployment will start automatically on Vercel once the changes are pushed to the main branch.

### Verifying Deployment

1. Visit the [Vercel Dashboard](https://vercel.com/dashboard)
2. Select the padelbolt project
3. Check the deployment status under "Deployments"

### Common Deployment Commands

```bash
# Quick deploy (all-in-one command)
git add . && git commit -m "your message" && git push origin main

# Check git status
git status

# View recent commits
git log --oneline -5

# Discard all local changes (be careful!)
git reset --hard origin/main
```

## Development

### Available Scripts

In the project directory, you can run:

#### `npm start`

Runs the app in development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

#### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

### Testing PWA

To test the Progressive Web App functionality:

1. Run `npm run build` to create a production build
2. Install and run `serve` to test the production build:
```bash
npm install -g serve
serve -s build
```
3. Open Chrome DevTools (F12)
4. Go to Application > Manifest to test PWA features

## Features

- Game Management
- Player Registration
- Automatic Team Distribution
- Email Notifications
- PWA Support
- Responsive Design

## Configuration

The app uses several services that require configuration:

- Firebase for backend
- EmailJS for email notifications
- Vercel for deployment

Contact the project administrator for access to these services.

## Contributing

1. Create a new branch for your feature
2. Make your changes
3. Submit a pull request
4. Wait for review and merge

## License

This project is private and proprietary. All rights reserved.
