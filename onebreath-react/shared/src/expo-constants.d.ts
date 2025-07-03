declare module 'expo-constants' {
  interface ExpoConfig {
    extra?: Record<string, any>;
    [key: string]: any;
  }
  const Constants: {
    expoConfig?: ExpoConfig;
    manifest?: ExpoConfig;
    appOwnership?: string;
    [key: string]: any;
  };
  export default Constants;
}