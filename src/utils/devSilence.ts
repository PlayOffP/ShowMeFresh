import { LogBox } from 'react-native';
import Reanimated from 'react-native-reanimated';

// ⬇︎ hide expo-av messages
LogBox.ignoreLogs(['expo-av']);
LogBox.ignoreLogs([
  '[expo-av]: Expo AV has been deprecated',
  'Video component from `expo-av` is deprecated',
]);

// ⬇︎ hide Firebase Auth warnings (expected in Expo Go)
LogBox.ignoreLogs([
  'You are initializing Firebase Auth for React Native without providing AsyncStorage',
  'Component auth has not been registered yet',
]);

// ⬇︎ hide Reanimated strict-mode logger
if ('setLoggerConfig' in Reanimated) {
  // Reanimated v2.18+ / v3
  // @ts-ignore
  Reanimated.setLoggerConfig({ enabled: false });
} else if ('enableLogger' in Reanimated) {
  // Reanimated ≤2.17
  // @ts-ignore
  Reanimated.enableLogger(false);
}

// nothing to export – side-effects only 