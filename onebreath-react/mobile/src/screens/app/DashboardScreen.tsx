import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList, Sample } from '@shared/src/types';
import { apiService } from '@shared/src/services/api';


type Props = StackScreenProps<RootStackParamList, 'Dashboard'>;

export const DashboardScreen: React.FC<Props> = ({ navigation }) => {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadSamples = async () => {
    setLoading(true);
    try {
      const data = await apiService.getSamples();
      setSamples(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSamples();
  }, []);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
        <Text style={{ fontSize: 20, fontWeight: '600' }}>Samples</Text>
        <TouchableOpacity onPress={() => navigation.navigate('QRScanner')}><Text style={{ color: '#3B82F6' }}>Scan QR</Text></TouchableOpacity>
      </View>
      {loading ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={samples}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadSamples} />}
          renderItem={({ item }) => (
            <View style={{ padding: 12, borderWidth: 1, borderColor: '#eee', borderRadius: 6, marginBottom: 8 }}>
              <Text style={{ fontWeight: '600' }}>{item.chipId}</Text>
              <Text>{item.status}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
};