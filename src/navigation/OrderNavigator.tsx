import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TableSelectionScreen from '../screens/TableSelectionScreen';
import MenuScreen from '../screens/MenuScreen.tsx';
import OrderReviewScreen from '../screens/OrderReviewScreen';
import OrderDetailsScreen from '../screens/OrderDetailsScreen';

const Stack = createNativeStackNavigator();

export default function OrderNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="TableSelection"
        component={TableSelectionScreen}
        options={{
          title: 'Select Table',
        }}
      />
      <Stack.Screen
        name="Menu"
        component={MenuScreen}
        options={{
          title: 'Menu',
        }}
      />
      <Stack.Screen
        name="OrderReview"
        component={OrderReviewScreen}
        options={{
          title: 'Order Review',
        }}
      />
      <Stack.Screen
        name="OrderDetails"
        component={OrderDetailsScreen}
        options={{
          title: 'Order Details',
        }}
      />
    </Stack.Navigator>
  );
}
