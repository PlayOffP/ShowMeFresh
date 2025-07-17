import { auth, db } from '../../services/firebase';
import { signInAnonymously } from 'firebase/auth';
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';

export interface ConnectionTestResult {
  success: boolean;
  error?: string;
  details: {
    authWorking: boolean;
    firestoreReadWorking: boolean;
    firestoreWriteWorking: boolean;
    userAuthenticated: boolean;
    userId?: string;
  };
}

export async function testFirebaseConnection(): Promise<ConnectionTestResult> {
  const result: ConnectionTestResult = {
    success: false,
    details: {
      authWorking: false,
      firestoreReadWorking: false,
      firestoreWriteWorking: false,
      userAuthenticated: false,
    }
  };

  try {
    console.log('🔧 Testing Firebase connection...');

    // Test 1: Check if user is already authenticated
    const currentUser = auth.currentUser;
    if (currentUser) {
      result.details.userAuthenticated = true;
      result.details.userId = currentUser.uid;
      console.log('✅ User already authenticated:', currentUser.uid);
    } else {
      // Test 2: Try anonymous authentication
      console.log('🔄 Attempting anonymous authentication...');
      try {
        const userCredential = await signInAnonymously(auth);
        result.details.authWorking = true;
        result.details.userAuthenticated = true;
        result.details.userId = userCredential.user.uid;
        console.log('✅ Anonymous authentication successful:', userCredential.user.uid);
      } catch (authError: any) {
        console.error('❌ Authentication failed:', authError.message);
        result.error = `Authentication failed: ${authError.message}`;
        return result;
      }
    }

    const userId = result.details.userId!;

    // Test 3: Try Firestore write (with timeout)
    console.log('🔄 Testing Firestore write...');
    const testDocRef = doc(db, 'users', userId, 'test', 'connection-test');
    try {
      const writePromise = setDoc(testDocRef, {
        timestamp: Date.now(),
        test: 'Firebase connection test',
        createdAt: new Date().toISOString()
      });
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Write operation timed out after 10 seconds')), 10000)
      );
      
      await Promise.race([writePromise, timeoutPromise]);
      result.details.firestoreWriteWorking = true;
      console.log('✅ Firestore write successful');
    } catch (writeError: any) {
      console.error('❌ Firestore write failed:', writeError.message);
      result.error = `Firestore write failed: ${writeError.message}`;
      // Continue to test read even if write fails
    }

    // Test 4: Try Firestore read (with timeout)
    console.log('🔄 Testing Firestore read...');
    try {
      const readPromise = getDoc(testDocRef);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Read operation timed out after 10 seconds')), 10000)
      );
      
      const docSnap = await Promise.race([readPromise, timeoutPromise]) as any;
      result.details.firestoreReadWorking = true;
      console.log('✅ Firestore read successful, document exists:', docSnap.exists());
    } catch (readError: any) {
      console.error('❌ Firestore read failed:', readError.message);
      if (!result.error) {
        result.error = `Firestore read failed: ${readError.message}`;
      }
    }

    // Test 5: Clean up test document
    if (result.details.firestoreWriteWorking) {
      try {
        await deleteDoc(testDocRef);
        console.log('✅ Test document cleaned up');
      } catch (deleteError) {
        console.warn('⚠️ Failed to clean up test document:', deleteError);
      }
    }

    // Determine overall success
    result.success = result.details.authWorking && 
                    result.details.firestoreReadWorking && 
                    result.details.firestoreWriteWorking;

    console.log('🔧 Firebase connection test completed:', {
      success: result.success,
      auth: result.details.authWorking,
      read: result.details.firestoreReadWorking,
      write: result.details.firestoreWriteWorking
    });

    return result;

  } catch (error: any) {
    console.error('❌ Firebase connection test failed:', error);
    result.error = `Unexpected error: ${error.message}`;
    return result;
  }
}

export function interpretConnectionError(error: string): string {
  if (error.includes('network')) {
    return 'Network connectivity issue. Check your internet connection and firewall settings.';
  }
  
  if (error.includes('permission-denied')) {
    return 'Permission denied. Check your Firestore security rules.';
  }
  
  if (error.includes('unauthenticated')) {
    return 'Authentication required. Make sure the user is signed in.';
  }
  
  if (error.includes('unavailable')) {
    return 'Firebase service temporarily unavailable. Try again later.';
  }
  
  if (error.includes('deadline-exceeded') || error.includes('timeout')) {
    return 'Request timeout. Check your network connection.';
  }
  
  return 'Unknown Firebase error. Check the console for more details.';
} 