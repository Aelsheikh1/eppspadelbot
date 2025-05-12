# Vercel Deployment Guide for EPPS Padel with Mobile Notifications

This guide will help you deploy your EPPS Padel app to Vercel while ensuring that mobile notifications work properly across web and mobile platforms.

## Prerequisites

- Vercel account
- GitHub repository with your code
- Firebase project (padelbolt-5d9a2)

## Step 1: Set Up Environment Variables in Vercel

1. Log in to your Vercel account
2. Go to your project settings (create one if you haven't already)
3. Navigate to the "Environment Variables" section
4. Add the following environment variables from your Firebase project:

```
REACT_APP_FIREBASE_API_KEY=AIzaSyAyZAakNVP3eOnIeJ1qB1Ki-6qRgZ4VBg8
REACT_APP_FIREBASE_AUTH_DOMAIN=padelbolt-5d9a2.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=padelbolt-5d9a2
REACT_APP_FIREBASE_STORAGE_BUCKET=padelbolt-5d9a2.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=773090904452
REACT_APP_FIREBASE_APP_ID=1:773090904452:web:e33380da424fe8d69e75d1
REACT_APP_FIREBASE_MEASUREMENT_ID=G-1PRKH5C8NV
REACT_APP_VAPID_KEY=BMzSIFpKw-T23cx8aoIfssl2Q8oYxKZVIXY5qYkrAVOzXXOzN3eIhhyQhsuA6_mnC4go0hk9IWQ06Dwqe-eHSfE
```

## Step 2: Deploy to Vercel

1. Push your code to GitHub
2. In Vercel, create a new project
3. Connect to your GitHub repository
4. Configure the build settings:
   - Build Command: `npm run build`
   - Output Directory: `build`
   - Install Command: `npm install`
5. Deploy your project

## Step 3: Update Capacitor Configuration

After deploying to Vercel, update your `capacitor.config.ts` file to point to your Vercel deployment:

```typescript
server: {
  // For production
  url: 'https://your-vercel-app-url.vercel.app',
  cleartext: true
}
```

Replace `your-vercel-app-url` with your actual Vercel deployment URL.

## Step 4: Configure Firebase for Web Push Notifications

1. In Firebase Console, go to Project Settings > Cloud Messaging
2. Under "Web configuration", add your Vercel domain
3. Enable the Firebase Cloud Messaging API in Google Cloud Console

## Step 5: Building Mobile Apps with Vercel Integration

### For Android:

1. Update your app with the Vercel URL:
   ```bash
   npx cap sync android
   ```

2. Open Android Studio:
   ```bash
   npx cap open android
   ```

3. Build your app in Android Studio

### For iOS:

1. Update your app with the Vercel URL:
   ```bash
   npx cap sync ios
   ```

2. Open Xcode:
   ```bash
   npx cap open ios
   ```

3. Configure capabilities in Xcode:
   - Push Notifications
   - Background Modes > Remote notifications

4. Build your app in Xcode

## Step 6: Testing the Integration

1. Deploy a new version to Vercel
2. Install the mobile app on your device
3. Log in with your account
4. Send a test notification from Firebase Console
5. Verify that the notification appears on both web and mobile

## Troubleshooting

### Web Notifications Not Working

- Check that your Firebase configuration is correct in Vercel environment variables
- Verify that the service worker is properly registered
- Ensure the VAPID key is correctly set

### Mobile Notifications Not Working

- Verify that the Firebase configuration files are correctly placed
- Check that the Capacitor server URL points to your Vercel deployment
- Ensure the app has notification permissions on the device

## Updating Your App

When you make changes to your app:

1. Push changes to GitHub
2. Vercel will automatically deploy the web version
3. For mobile updates:
   ```bash
   npm run build
   npx cap copy
   npx cap sync
   ```
4. Rebuild and redistribute your mobile apps

## Important Notes for Dark Mode

Your dark mode theme preferences (#2A2A2A backgrounds, white text) have been preserved in both the web and mobile versions. The mobile notification styling also uses your preferred dark color scheme for a consistent user experience across platforms.
