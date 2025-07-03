declare module 'firebase/auth/react-native' {
  import { Persistence } from 'firebase/auth';

  /**
   * Returns a React-Native-compatible persistence layer that uses AsyncStorage under the hood.
   *
   * @param storage React Native AsyncStorage instance
   */
  export function getReactNativePersistence(storage: object): Persistence;
}