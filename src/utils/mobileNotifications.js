/**
 * Mobile-specific notification system that doesn't rely on Firebase
 * This is a complete standalone implementation for mobile platforms
 */

// Generate a unique device ID for this session
const deviceId = `mobile-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

// Track notification status
let notificationEnabled = false;
let notificationCount = 0;

/**
 * Initialize the mobile notification system
 * @returns {Promise<string>} A pseudo-token for tracking
 */
export const initializeMobileNotifications = async () => {
  console.log('Initializing mobile-specific notification system');
  notificationEnabled = true;
  
  // Generate a pseudo-token for tracking
  const token = `mobile-${deviceId}-${Date.now()}`;
  console.log('Mobile notification token:', token);
  
  // Schedule a test notification
  setTimeout(() => {
    if (notificationEnabled) {
      showTestNotification();
    }
  }, 3000);
  
  return token;
};

/**
 * Show a test notification to demonstrate the system
 */
const showTestNotification = () => {
  const notification = {
    title: 'Mobile Notification System',
    body: 'This is a test notification from the mobile-specific system',
    timestamp: new Date().toISOString()
  };
  
  showNotification(notification);
};

/**
 * Display a notification on the mobile device
 * @param {Object} notification The notification to display
 */
export const showNotification = (notification) => {
  // Create notification element
  const notificationId = `mobile-notification-${notificationCount++}`;
  const notificationElement = document.createElement('div');
  notificationElement.id = notificationId;
  notificationElement.className = 'mobile-notification';
  notificationElement.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    width: 90%;
    max-width: 400px;
    background-color: #2A2A2A;
    color: #FFFFFF;
    border-radius: 8px;
    padding: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 9999;
    display: flex;
    flex-direction: column;
    animation: slideIn 0.3s ease-out;
  `;
  
  // Add animation style
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    @keyframes slideIn {
      from { transform: translate(-50%, -100%); opacity: 0; }
      to { transform: translate(-50%, 0); opacity: 1; }
    }
    @keyframes slideOut {
      from { transform: translate(-50%, 0); opacity: 1; }
      to { transform: translate(-50%, -100%); opacity: 0; }
    }
  `;
  document.head.appendChild(styleElement);
  
  // Create title
  const titleElement = document.createElement('div');
  titleElement.style.cssText = `
    font-weight: bold;
    margin-bottom: 4px;
    font-size: 16px;
  `;
  titleElement.textContent = notification.title || 'New Notification';
  
  // Create body
  const bodyElement = document.createElement('div');
  bodyElement.style.cssText = `
    font-size: 14px;
    margin-bottom: 8px;
  `;
  bodyElement.textContent = notification.body || '';
  
  // Create close button
  const closeButton = document.createElement('button');
  closeButton.style.cssText = `
    align-self: flex-end;
    background: none;
    border: none;
    color: #FFFFFF;
    font-size: 14px;
    cursor: pointer;
    padding: 4px 8px;
  `;
  closeButton.textContent = 'Dismiss';
  
  // Add elements to notification
  notificationElement.appendChild(titleElement);
  notificationElement.appendChild(bodyElement);
  notificationElement.appendChild(closeButton);
  
  // Add to document
  document.body.appendChild(notificationElement);
  
  // Handle close button click
  closeButton.onclick = () => {
    closeNotification(notificationElement);
  };
  
  // Auto-close after 5 seconds
  setTimeout(() => {
    if (document.body.contains(notificationElement)) {
      closeNotification(notificationElement);
    }
  }, 5000);
  
  return notificationId;
};

/**
 * Close a notification with animation
 * @param {HTMLElement} element The notification element to close
 */
const closeNotification = (element) => {
  element.style.animation = 'slideOut 0.3s ease-in forwards';
  
  // Remove after animation completes
  setTimeout(() => {
    if (document.body.contains(element)) {
      document.body.removeChild(element);
    }
  }, 300);
};

/**
 * Check the notification status
 * @returns {Object} The notification status
 */
export const checkMobileNotificationStatus = () => {
  return {
    isSupported: true,
    hasPermission: true,
    permission: 'granted',
    isDenied: false,
    isEnabled: notificationEnabled,
    platform: detectMobilePlatform(),
    usingMobileSystem: true
  };
};

/**
 * Detect the mobile platform
 * @returns {string} The detected platform
 */
const detectMobilePlatform = () => {
  const userAgent = navigator.userAgent || '';
  
  if (/iPad|iPhone|iPod/.test(userAgent)) {
    return 'iOS';
  } else if (/Android/.test(userAgent)) {
    return 'Android';
  } else if (/Windows Phone|IEMobile/.test(userAgent)) {
    return 'Windows Phone';
  } else if (/Mobile|Tablet/.test(userAgent)) {
    return 'Other mobile';
  } else {
    return 'Unknown mobile';
  }
};

/**
 * Set up a polling mechanism for notifications
 * This would normally connect to your server to check for new notifications
 */
export const setupMobileNotifications = () => {
  console.log('Setting up mobile notification polling');
  
  // In a real app, this would poll your server for new notifications
  const pollInterval = 30000; // 30 seconds
  
  // Start polling
  const intervalId = setInterval(() => {
    if (notificationEnabled) {
      console.log('Checking for new notifications (mobile system)');
      // This would call your server API in a real implementation
    }
  }, pollInterval);
  
  // Return a function to stop polling
  return () => {
    clearInterval(intervalId);
    notificationEnabled = false;
  };
};

/**
 * Manually trigger a test notification
 * @param {string} title Optional custom title
 * @param {string} body Optional custom body
 */
export const triggerTestNotification = (title, body) => {
  showNotification({
    title: title || 'Test Notification',
    body: body || 'This is a test notification from the mobile system',
    timestamp: new Date().toISOString()
  });
};
