import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '@shared/src/context/AuthContext';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '@shared/src/types';

type Props = StackScreenProps<RootStackParamList, 'Login'>;

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Enter email and password');
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (e: any) {
      Alert.alert('Login failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, padding: 24, justifyContent: 'center' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ marginBottom: 32 }}>
        <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#3B82F6' }}>OneBreath</Text>
      </View>
      <View style={{ gap: 16 }}>
        <TextInput
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          style={{ borderWidth: 1, borderColor: '#ccc', padding: 12, borderRadius: 6 }}
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          placeholder="Password"
          secureTextEntry
          style={{ borderWidth: 1, borderColor: '#ccc', padding: 12, borderRadius: 6 }}
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity style={{ backgroundColor: '#3B82F6', padding: 16, borderRadius: 6, alignItems: 'center' }} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '600' }}>Sign In</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};