import React from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { store } from './store/store';
import AppNavigator from './navigation/AppNavigator';

export default function AppRoot() {
  return (
    <ReduxProvider store={store}>
      <AppNavigator isAuthenticated={true} />
    </ReduxProvider>
  );
}
