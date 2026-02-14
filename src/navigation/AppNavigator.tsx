import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {Text} from 'react-native';
import {THEME} from '../config/theme';

// Screens
import LoginScreen from '../screens/LoginScreen';
import MenuScreen from '../screens/MenuScreen';
import TableSelectionScreen from '../screens/TableSelectionScreen';
import OrderDetailsScreen from '../screens/OrderDetailsScreen';
import OrderReviewScreen from '../screens/OrderReviewScreen';
import AboutScreen from '../screens/AboutScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const OrderingStack = createNativeStackNavigator();

// ============================================
// OrderingStack - Nested Stack for Ordering Tab
// ============================================
const OrderingStackNavigator = () => {
  return (
    <OrderingStack.Navigator
      screenOptions={{
        headerShown: false,
      }}>
      <OrderingStack.Screen
        name="TableSelection"
        component={TableSelectionScreen}
      />
      <OrderingStack.Screen
        name="Menu"
        component={MenuScreen}
      />
      <OrderingStack.Screen name="OrderReview" component={OrderReviewScreen} />
      <OrderingStack.Screen
        name="OrderDetails"
        component={OrderDetailsScreen}
      />
    </OrderingStack.Navigator>
  );
};

// ============================================
// AppTabs - Bottom Tab Navigation (2 tabs)
// ============================================
const AppTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({route, navigation}) => {
        // Check if we're deep in the stack (beyond TableSelection)
        const state = navigation.getState();
        const orderingRoutes = state?.routes?.[0]?.state?.routes;
        const isDeepInStack = orderingRoutes && orderingRoutes.length > 1;
        
        return {
          headerShown: false,
          tabBarActiveTintColor: THEME.colors.accent,
          tabBarInactiveTintColor: THEME.colors.mutedText,
          tabBarStyle: isDeepInStack
            ? { display: 'none' } // Hide TabBar when in Menu/OrderReview/etc
            : {
                backgroundColor: THEME.colors.darkBg,
                borderTopColor: THEME.colors.accent,
                borderTopWidth: 2,
                height: 60,
              },
          tabBarLabelStyle: {
            fontSize: 12,
            marginTop: 4,
          },
          tabBarIcon: ({focused}) => {
            let label = '';
            if (route.name === 'Ordering') {
              label = '🍴';
            } else if (route.name === 'About') {
              label = 'ℹ️';
            }
            return <Text style={{fontSize: 24}}>{label}</Text>;
          },
        };
      }}>
      <Tab.Screen
        name="Ordering"
        component={OrderingStackNavigator}
        options={{title: 'Ordering'}}
      />
      <Tab.Screen
        name="About"
        component={AboutScreen}
        options={{title: 'About'}}
      />
    </Tab.Navigator>
  );
};

// ============================================
// RootNavigator
// ============================================
const AppNavigator = ({isAuthenticated}: {isAuthenticated: boolean}) => {
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
