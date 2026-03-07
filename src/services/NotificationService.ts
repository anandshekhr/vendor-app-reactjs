import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Alert } from 'react-native';
import { STORAGE_KEYS } from '../utils/constants';

class NotificationServiceClass {
  async initialize(): Promise<void> {
    messaging().onMessage(async (remoteMessage) => {
      if (remoteMessage.notification) {
        Alert.alert(
          remoteMessage.notification.title || 'Notification',
          remoteMessage.notification.body || ''
        );
      }
    });

    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('Background message:', remoteMessage);
    });

    messaging().onNotificationOpenedApp((remoteMessage) => {
      console.log('Notification opened app:', remoteMessage);
    });

    const initialNotification = await messaging().getInitialNotification();
    if (initialNotification) {
      console.log('App opened from notification:', initialNotification);
    }
  }

  async requestPermission(): Promise<boolean> {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      await this.getFCMToken();
    }
    return enabled;
  }

  async getFCMToken(): Promise<string | null> {
    try {
      const storedToken = await AsyncStorage.getItem(STORAGE_KEYS.FCM_TOKEN);
      if (storedToken) return storedToken;

      const token = await messaging().getToken();
      if (token) {
        await AsyncStorage.setItem(STORAGE_KEYS.FCM_TOKEN, token);
        return token;
      }
      return null;
    } catch (error) {
      console.error('Failed to get FCM token:', error);
      return null;
    }
  }

  async subscribeTopic(topic: string): Promise<void> {
    try {
      await messaging().subscribeToTopic(topic);
    } catch (error) {
      console.error('Failed to subscribe to topic:', error);
    }
  }

  async unsubscribeTopic(topic: string): Promise<void> {
    try {
      await messaging().unsubscribeFromTopic(topic);
    } catch (error) {
      console.error('Failed to unsubscribe from topic:', error);
    }
  }
}

export const NotificationService = new NotificationServiceClass();
