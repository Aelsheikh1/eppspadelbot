// This is a mock file to replace firebase-admin imports for browser compatibility

export const initializeApp = () => ({});
export const cert = () => ({});
export const getMessaging = () => ({
  send: async () => ({ success: true })
});

export default {
  initializeApp,
  cert,
  getMessaging
};
