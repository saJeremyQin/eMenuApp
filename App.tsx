import React, {useEffect, useState, useCallback} from 'react';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {Provider as ReduxProvider} from 'react-redux';
import Orientation from 'react-native-orientation-locker';

// Initialize crypto polyfill for Amplify
import 'react-native-get-random-values';

// Configure Amplify FIRST (before any other imports that use it)
import {Amplify} from 'aws-amplify';
import {AWS_CONFIG} from './src/config/aws-config';
import {GRAPHQL_CONFIG} from './src/config/aws-config';
import {store} from './src/store/store';
import {getCurrentUser, signOut} from 'aws-amplify/auth';

Amplify.configure({
  Auth: {
    Cognito: {
      region: AWS_CONFIG.region,
      userPoolId: AWS_CONFIG.userPoolId,
      userPoolClientId: AWS_CONFIG.userPoolWebClientId,
      signUpVerificationMethod: 'code',
      loginWith: {
        email: true,
      },
    },
  },
  API: {
    GraphQL: {
      endpoint: GRAPHQL_CONFIG.endpoint,
      region: AWS_CONFIG.region,
      defaultAuthMode: 'userPool',
    },
  },
});

// Load Amplify polyfills for React Native - must be at the top
import '@aws-amplify/react-native';

import AppNavigator from './src/navigation/AppNavigator';

// Global auth context for signOut
export const handleGlobalLogout = async () => {
  try {
    console.log('[Auth] Signing out user');
    await signOut();
    console.log('[Auth] User signed out successfully');
  } catch (error) {
    console.error('[Auth] Error during sign out:', error);
  }
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Lock to landscape mode for iPad/tablets
    Orientation.lockToLandscape();
    
    // Initialize app and monitor auth state
    initializeApp();
  }, []);

  const checkAuthState = useCallback(async () => {
    try {
      console.log('[Auth] Checking authentication state');
      const user = await getCurrentUser();
      console.log('[Auth] Current user:', user?.username);
      setIsAuthenticated(true);
    } catch (error) {
      console.log('[Auth] No authenticated user found');
      setIsAuthenticated(false);
    }
  }, []);

  const initializeApp = async () => {
    try {
      // Check if user is already authenticated
      await checkAuthState();
    } catch (error) {
      console.error('[App] Initialization error:', error);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  // Monitor authentication state changes
  useEffect(() => {
    if (loading) return;

    // Set up interval to check auth state periodically
    // This helps catch sign-outs from other parts of the app
    const authCheckInterval = setInterval(() => {
      checkAuthState();
    }, 5000); // Check every 5 seconds

    return () => clearInterval(authCheckInterval);
  }, [loading, checkAuthState]);

  if (loading) {
    return null; // TODO: Add splash screen
  }

  return (
    <ReduxProvider store={store}>
      <SafeAreaProvider>
        <AppNavigator isAuthenticated={isAuthenticated} />
      </SafeAreaProvider>
    </ReduxProvider>
  );
}

export default App;
