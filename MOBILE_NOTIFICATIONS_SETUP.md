# Mobile Notifications Setup Guide

This guide will help you set up push notifications for your EPPS Padel app on both Android and iOS platforms.

## Prerequisites

- Firebase project (using your existing project: padelbolt-5d9a2)
- Android Studio (for Android builds)
- Xcode (for iOS builds, requires a Mac)
- Apple Developer Account (for iOS push notifications)

## Step 1: Firebase Configuration

### Android Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: padelbolt-5d9a2
3. Click the Android icon (+ Add app) if you haven't added an Android app yet
4. Enter package name: `com.epps.padel`
5. Enter app nickname: "EPPS Padel"
6. Register the app
7. Download the `google-services.json` file
8. Place the file in: `android/app/` directory

### iOS Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: padelbolt-5d9a2
3. Click the iOS icon (+ Add app) if you haven't added an iOS app yet
4. Enter Bundle ID: `com.epps.padel`
5. Enter app nickname: "EPPS Padel"
6. Register the app
7. Download the `GoogleService-Info.plist` file
8. Place the file in: `ios/App/App/` directory

## Step 2: Update Native Projects

### Android Project

```bash
# Copy web assets to native projects
npx cap copy

# Open Android Studio
npx cap open android
```

In Android Studio:
1. Wait for the project to sync
2. Go to `app/src/main/AndroidManifest.xml`
3. Ensure the following permissions are present:
   ```xml
   <uses-permission android:name="android.permission.INTERNET" />
   <uses-permission android:name="android.permission.VIBRATE" />
   <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
   ```
4. Build the app (Build > Make Project)
5. Run on a device or emulator (Run > Run 'app')

### iOS Project (requires a Mac)

```bash
# Copy web assets to native projects
npx cap copy

# Open Xcode
npx cap open ios
```

In Xcode:
1. Select the App project in the navigator
2. Select the "App" target
3. Go to "Signing & Capabilities"
4. Ensure you have a valid Apple Developer Team selected
5. Click "+ Capability" and add:
   - Push Notifications
   - Background Modes
6. In Background Modes, check "Remote notifications"
7. Build and run the app on a device or simulator

## Step 3: Testing Push Notifications

1. Build and install the app on a device
2. Log in with your account
3. The app will request notification permissions - accept them
4. Go to Firebase Console > Cloud Messaging
5. Create a new notification:
   - Title: "Test Notification"
   - Body: "This is a test notification"
   - Target: Your app
6. Send the notification and verify it appears on your device

## Troubleshooting

### Android Issues

- Ensure `google-services.json` is in the correct location
- Check that Firebase Cloud Messaging API is enabled in Google Cloud Console
- Verify the app is properly registered in Firebase Console

### iOS Issues

- Ensure `GoogleService-Info.plist` is in the correct location
- Verify you have a valid Apple Developer account with push notification entitlements
- Check that the Bundle ID matches between Xcode and Firebase Console
- Make sure you've configured APNs in Firebase Console

## Additional Resources

- [Capacitor Push Notifications Documentation](https://capacitorjs.com/docs/apis/push-notifications)
- [Firebase Cloud Messaging Documentation](https://firebase.google.com/docs/cloud-messaging)
- [Apple Push Notification Service Documentation](https://developer.apple.com/documentation/usernotifications)
