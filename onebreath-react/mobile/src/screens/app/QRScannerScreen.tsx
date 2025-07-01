import React, { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '@shared/src/types';
import { QRScanner } from '../../components/QRScanner';
import { apiService } from '@shared/src/services/api';

type Props = StackScreenProps<RootStackParamList, 'QRScanner'>;

export const QRScannerScreen: React.FC<Props> = ({ navigation }) => {
  const [processing, setProcessing] = useState(false);

  const handleScanSuccess = async (chipId: string) => {
    if (processing) return;
    setProcessing(true);
    try {
      const result = await apiService.registerSampleFromQR(chipId);
      Alert.alert('Success', `Registered sample ${chipId}`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to register');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <QRScanner onScanSuccess={handleScanSuccess} />
      {processing && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <Text style={{ color: '#fff' }}>Processing...</Text>
        </View>
      )}
    </View>
  );
};