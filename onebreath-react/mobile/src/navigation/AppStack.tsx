import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { DashboardScreen } from '../screens/app/DashboardScreen';
import { QRScannerScreen } from '../screens/app/QRScannerScreen';

const Stack = createStackNavigator();

export const AppStack: React.FC = () => (
  <Stack.Navigator>
    <Stack.Screen name="Dashboard" component={DashboardScreen} />
    <Stack.Screen name="QRScanner" component={QRScannerScreen} />
  </Stack.Navigator>
);