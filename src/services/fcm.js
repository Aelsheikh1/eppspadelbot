// This file used firebase-admin and service-account.json, which are not allowed in the frontend (React). All code is commented out or removed to fix the build.
// To use FCM server logic, move this code to a backend/cloud function.

// import { initializeApp, cert } from 'firebase-admin/app';
// import { getMessaging } from 'firebase-admin/messaging';

// This file is a stub for notification sending. Do not use in frontend builds.
export const sendNotification = async () => {
  throw new Error('sendNotification is not available in frontend build. Use a backend/cloud function instead.');
};
