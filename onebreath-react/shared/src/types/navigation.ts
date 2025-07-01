export type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  QRScanner: undefined;
  SampleDetails: { sampleId: string };
  SampleForm: { sampleId?: string };
  DataView: undefined;
  AdminDashboard: undefined;
  Profile: undefined;
  Settings: undefined;
};

/**
 * Simplified generic for screen props. In a full React Navigation setup you would
 * import StackScreenProps from '@react-navigation/stack'. To avoid coupling the
 * shared package to React Navigation we expose a minimal placeholder that can
 * be augmented in the consumer app.
 */
export type ScreenProps<RouteName extends keyof RootStackParamList = keyof RootStackParamList> = {
  navigation: any; // consumer app can cast to correct navigation type
  route: {
    key?: string;
    name: RouteName;
    params: RootStackParamList[RouteName];
  };
};