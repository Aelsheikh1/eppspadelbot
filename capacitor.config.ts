import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.epps.padel',
  appName: 'EPPS Padel',
  webDir: 'build',
  plugins: {
    FirebaseX: {
      // These are placeholder values - you'll need to replace them with your actual Firebase config values
      FIREBASE_ANALYTICS_COLLECTION_ENABLED: true,
      FIREBASE_PERFORMANCE_COLLECTION_ENABLED: true,
      FIREBASE_CRASHLYTICS_COLLECTION_ENABLED: true,
      ANDROID_ICON_ACCENT_COLOR: '#2A2A2A', // Using your preferred dark mode color
      ANDROID_NOTIFICATION_COLOR: '#2A2A2A', // Using your preferred dark mode color
      ANDROID_FIREBASE_CONFIG_FILEPATH: './google-services.json',
      IOS_FIREBASE_CONFIG_FILEPATH: './GoogleService-Info.plist'
    }
  },
  server: {
    // Allow Capacitor to access your deployed web app
    // For development
    // url: 'http://localhost:3000',
    // For production (replace with your actual Vercel URL)
    url: 'https://padelbolt.vercel.app',
    cleartext: true
  }
};

export default config;
