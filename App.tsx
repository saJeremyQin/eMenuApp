import React, {useEffect, useState} from 'react';
import {ApolloProvider} from '@apollo/client/react';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import apolloClient from './src/services/ApolloClient';
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
          // await apolloClient.mutate({
          //   mutation: UPDATE_FCM_TOKEN,
          //   variables: { token: fcmToken }
          // });

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
  };

  if (loading) {
    return null; // TODO: Add splash screen
  }

  return (
    <ApolloProvider client={apolloClient}>
      <SafeAreaProvider>
        <AppNavigator isAuthenticated={isAuthenticated} />
      </SafeAreaProvider>
    </ApolloProvider>
  );
}

export default App;
