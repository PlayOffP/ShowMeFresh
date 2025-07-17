import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firebaseConfig } from './firebaseConfig';

export const firebaseApp = initializeApp(firebaseConfig);

// ---------- auth (React Native) ----------
export const auth = initializeAuth(firebaseApp, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// ---------- firestore ----------
export const db = getFirestore(firebaseApp);

// ---------- storage ----------
export const storage = getStorage(firebaseApp);

async function removeOnboardingFlag() {
  await AsyncStorage.removeItem('onboarded');
} 