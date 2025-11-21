import messaging from '@react-native-firebase/messaging';
import {Platform} from 'react-native';

class FCMService {
  // Request permission for notifications
  async requestPermission() {
    try {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('✅ FCM Authorization status:', authStatus);
        return true;
      }
      console.log('❌ FCM permission denied');
      return false;
    } catch (error) {
      console.error('❌ FCM permission error:', error);
      return false;
    }
  }

  // Get FCM token
  async getToken() {
    try {
      const token = await messaging().getToken();
      console.log('📱 FCM Token:', token);
      return token;
    } catch (error) {
      console.error('❌ Failed to get FCM token:', error);
      return null;
    }
  }

  // Listen for token refresh
  onTokenRefresh(callback) {
    return messaging().onTokenRefresh(token => {
      console.log('🔄 FCM Token refreshed:', token);
      callback(token);
    });
  }

  // Handle foreground notifications
  onMessageReceived(callback) {
    return messaging().onMessage(async remoteMessage => {
      console.log('📩 Foreground notification:', remoteMessage);
      callback(remoteMessage);
    });
  }

  // Handle background/quit state notifications
  setBackgroundMessageHandler(handler) {
    messaging().setBackgroundMessageHandler(async remoteMessage => {
      console.log('📩 Background notification:', remoteMessage);
      handler(remoteMessage);
    });
  }

  // Get initial notification (when app opened from notification)
  async getInitialNotification() {
    const remoteMessage = await messaging().getInitialNotification();
    if (remoteMessage) {
      console.log('📩 Initial notification:', remoteMessage);
      return remoteMessage;
    }
    return null;
  }
}

export default new FCMService();
