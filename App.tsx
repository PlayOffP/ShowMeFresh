import { Slot } from 'expo-router';
import { AuthProvider } from './src/context/AuthContext';
import { AppProvider } from './src/context/AppContext';

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <Slot />
      </AppProvider>
    </AuthProvider>
  );
} 