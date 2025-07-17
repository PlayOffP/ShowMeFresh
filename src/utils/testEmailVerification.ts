import { auth } from '../../services/firebase';
import { sendEmailVerification, createUserWithEmailAndPassword } from 'firebase/auth';

export const testEmailVerification = async (email: string, password: string) => {
  try {
    console.log('🧪 Testing email verification...');
    console.log('📧 Email:', email);
    
    // Create a test user
    console.log('📝 Creating test user...');
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log('✅ User created successfully');
    
    // Send verification email
    console.log('📤 Sending verification email...');
    await sendEmailVerification(userCredential.user);
    console.log('✅ Verification email sent successfully');
    
    // Check user state
    console.log('👤 User email verified:', userCredential.user.emailVerified);
    console.log('👤 User email:', userCredential.user.email);
    
    return {
      success: true,
      message: 'Test completed successfully. Check your email for verification link.',
      user: userCredential.user
    };
    
  } catch (error: any) {
    console.error('❌ Email verification test failed:', error);
    
    let errorMessage = 'Unknown error occurred';
    
    if (error.code === 'auth/email-already-in-use') {
      errorMessage = 'Email already exists. Try signing in instead.';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email format.';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'Password is too weak (minimum 6 characters).';
    } else if (error.code === 'auth/network-request-failed') {
      errorMessage = 'Network error. Check your internet connection.';
    } else if (error.code === 'auth/operation-not-allowed') {
      errorMessage = 'Email/password authentication is not enabled in Firebase Console.';
    } else if (error.code === 'auth/admin-restricted-operation') {
      errorMessage = 'Email verification is disabled in Firebase Console.';
    }
    
    return {
      success: false,
      message: errorMessage,
      error: error
    };
  }
};

export const checkFirebaseConfig = () => {
  console.log('🔧 Checking Firebase configuration...');
  console.log('📱 Auth domain:', auth.config.authDomain);
  console.log('🔑 API key exists:', !!auth.config.apiKey);
  console.log('🏗️ Project ID:', auth.config.projectId);
  console.log('📦 App ID:', auth.config.appId);
}; 