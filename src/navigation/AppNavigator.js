import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {Text} from 'react-native';

// Screens
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import TablesScreen from '../screens/TablesScreen';
import OrdersManagementScreen from '../screens/OrdersManagementScreen';
import NotificationsScreen from '../screens/NotificationsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ============================================
// AppTabs - Bottom Tab Navigation
// ============================================
const AppTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarActiveTintColor: '#FF6B6B',
        tabBarInactiveTintColor: '#999999',
        tabBarPosition: 'bottom',
        tabBarItemStyle: {
          flex: 1,
        },
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#FFFFFF',
          borderTopColor: '#EEEEEE',
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          marginTop: 4,
        },
        tabBarIcon: ({focused, color}) => {
          let label = '';
          if (route.name === 'Home') {
            label = '🏠';
          } else if (route.name === 'OrdersManagement') {
            label = '📋';
          } else if (route.name === 'Tables') {
            label = '🍽️';
          } else if (route.name === 'Notifications') {
            label = '📬';
          }
          return <Text style={{fontSize: 20}}>{label}</Text>;
        },
      })}
      sceneContainerStyle={{backgroundColor: '#fff'}}>
      {/* Screens directly without nested Stack */}
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{title: 'Home'}}
      />
      <Tab.Screen
        name="OrdersManagement"
        component={OrdersManagementScreen}
        options={{title: 'Orders'}}
      />
      <Tab.Screen
        name="Tables"
        component={TablesScreen}
        options={{title: 'Menu'}}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{title: 'Messages'}}
      />
    </Tab.Navigator>
  );
};

// ============================================
// RootNavigator
// ============================================
const AppNavigator = ({isAuthenticated}) => {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{headerShown: false}}>
        {!isAuthenticated ? (
          <Stack.Screen
            name="Auth"
            component={LoginScreen}
            options={{headerShown: false}}
          />
        ) : (
          <Stack.Screen name="AppTabs" component={AppTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
