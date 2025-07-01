import 'expo-dev-client';
import './global.css';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@shared/context/AuthContext';
import { RootNavigator } from './src/navigation';

export default function App() {
  return (
    <AuthProvider>
      <RootNavigator />
      <StatusBar style="auto" />
    </AuthProvider>
  );
}