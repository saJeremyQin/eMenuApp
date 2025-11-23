import React, {useEffect, useState} from 'react';
import {SafeAreaProvider} from 'react-native-safe-area-context';

// Initialize crypto polyfill for Amplify
import 'react-native-get-random-values';

// Configure Amplify FIRST (before any other imports that use it)
import {Amplify} from 'aws-amplify';
import {AWS_CONFIG} from './src/config/aws-config';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: AWS_CONFIG.userPoolId,
      userPoolClientId: AWS_CONFIG.userPoolWebClientId,
      signUpVerificationMethod: 'code',
      loginWith: {
        email: true,
      },
    },
  },
});

// Load Amplify polyfills for React Native - must be at the top
import '@aws-amplify/react-native';

import AuthService from './src/services/AuthService';
import FCMService from './src/services/FCMService';
import AppNavigator from './src/navigation/AppNavigator';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Check authentication status
      const authenticated = await AuthService.isAuthenticated();
      setIsAuthenticated(authenticated);

      if (authenticated) {
        // Request FCM permission
        const permissionGranted = await FCMService.requestPermission();
        
        if (permissionGranted) {
          // Get FCM token
          const fcmToken = await FCMService.getToken();
          console.log('📱 FCM Token:', fcmToken);
          
          // TODO: Upload FCM token to backend via GraphQL mutation
          // await GraphQLClient.mutate(UPDATE_FCM_TOKEN, { token: fcmToken });

          // Listen for token refresh
          FCMService.onTokenRefresh(async (newToken: string) => {
            console.log('🔄 Token refreshed:', newToken);
            // TODO: Update backend with new token
          });
        }
      }
    } catch (error) {
      console.error('App initialization error:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return null; // TODO: Add splash screen
  }

  return (
    <SafeAreaProvider>
      <AppNavigator isAuthenticated={isAuthenticated} />
    </SafeAreaProvider>
  );
}

export default App;
