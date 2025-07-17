# Firebase Setup Guide

## Authentication Issues Resolution

The authentication errors you're experiencing are due to missing Firebase project configuration. Follow these steps to enable the required authentication methods.

### Current Issues
1. **`auth/invalid-credential`** - Expected when using wrong credentials
2. **`auth/email-already-in-use`** - Expected when email already exists  
3. **`auth/admin-restricted-operation`** - Anonymous auth is disabled

### Required Setup Steps

#### 1. Enable Authentication Methods

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `showme-708f9`
3. Navigate to **Authentication** → **Sign-in method**
4. Enable the following providers:

   **Email/Password:**
   - ✅ Enable Email/Password
   - ✅ Allow users to sign up with email/password
   - ✅ Allow users to sign in with email/password
   - ✅ **Enable Email verification** (NEW - Required for email verification flow)

   **Anonymous:**
   - ✅ Enable Anonymous authentication
   - This allows "Continue as Guest" functionality

#### 2. Configure Email Verification Settings

1. In **Authentication** → **Settings** → **User actions**:
   - ✅ **Enable email verification**
   - ✅ **Require email verification before sign-in** (Recommended for security)
   - Customize verification email template if desired

2. In **Authentication** → **Settings** → **Authorized domains**:
   - Add your app domain
   - For development, ensure `localhost` and your Expo development URL are included

#### 3. Email Templates (Optional but Recommended)

1. In **Authentication** → **Settings** → **Email templates**:
   - **Verification email**: Customize the email users receive to verify their account
   - **Password reset email**: Customize the email for password reset requests
   - **Email change**: Customize the email for email change confirmations

#### 4. Update Firestore Rules (if needed)

The current Firestore rules look correct, but verify they match your requirements:

```javascript
service cloud.firestore {
  match /databases/{db}/documents {
    // user-specific data
    match /users/{uid}/{doc=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }

    // public reviews
    match /reviews/{reviewId} {
      allow read:  if true;
      allow write: if request.auth != null;     // must be signed-in
    }
  }
}
```

#### 5. Test Authentication Flow

After enabling the authentication methods:

1. **Email Sign Up**: 
   - Create a new account with email/password
   - User receives verification email
   - User must verify email before accessing app

2. **Email Sign In**: 
   - Sign in with existing verified credentials
   - Unverified users are redirected to verification screen

3. **Anonymous Sign In**: 
   - Use "Continue as Guest" button
   - Bypasses email verification

4. **Password Reset**: 
   - Use "Forgot Password?" link
   - User receives password reset email

### New Authentication Flow

#### Email Verification Flow:
1. **Sign Up** → User creates account → Verification email sent
2. **Verification Screen** → User clicks verification link → Email verified
3. **Onboarding** → First-time user completes onboarding
4. **Main App** → User accesses full app functionality

#### Sign In Flow:
1. **Sign In** → User enters credentials → Check if email verified
2. **If Verified** → Direct to main app (or onboarding if first time)
3. **If Not Verified** → Redirect to verification screen

### Project Configuration

Your current Firebase configuration in `app.json` looks correct:

```json
{
  "FIREBASE_API_KEY": "AIzaSyCg7vGE2Evt8iplqJEsA3HEaO1YmqHkZGU",
  "FIREBASE_AUTH_DOMAIN": "showme-708f9.firebaseapp.com",
  "FIREBASE_PROJECT_ID": "showme-708f9",
  "FIREBASE_STORAGE_BUCKET": "showme-708f9.firebasestorage.app",
  "FIREBASE_APP_ID": "1:485292217670:web:94c1a90f8d159a67c4c147"
}
```

### Troubleshooting

#### If Email Verification Fails:
1. Check if email verification is enabled in Firebase Console
2. Verify the email domain is allowed
3. Check spam/junk folders for verification emails
4. Ensure the verification link is clicked in the same browser/app

#### If Anonymous Auth Still Fails:
1. Check if your Firebase project has billing enabled
2. Verify the project is not in a restricted region
3. Ensure you have the necessary permissions

#### If Email Auth Fails:
1. Verify the email format is valid
2. Check if the email domain is allowed
3. Ensure password meets minimum requirements (6+ characters)
4. Check if email verification is required and completed

### Security Benefits

- **Email verification** prevents fake accounts and improves security
- **Password reset** allows users to recover their accounts
- **Anonymous auth** provides a frictionless entry point for new users
- **Proper redirection** ensures users complete required steps

### Next Steps

1. **Enable authentication methods** in Firebase Console
2. **Configure email verification** settings
3. **Test the complete authentication flow**:
   - Sign up → Verify email → Onboarding → Main app
   - Sign in → Main app (if verified)
   - Anonymous → Main app
4. **Monitor the console logs** for any remaining issues
5. **Update this guide** with any additional configuration needed

### Security Notes

- The current Firestore rules are secure and follow best practices
- User data is properly isolated by UID
- Public reviews are read-only for unauthenticated users
- All write operations require authentication
- Email verification adds an extra layer of security 