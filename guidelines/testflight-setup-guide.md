# TestFlight Setup Guide for ShowMe

## Current Status: ✅ Foundation Complete
- ✅ EAS configuration updated with iOS settings
- ✅ Bundle identifier configured (`com.showme.app`)
- ✅ Apple Developer Program access obtained
- 🎯 **Ready for App Store Connect setup**

---

## Step 1: App Store Connect Setup

### 1.1 Create App Listing
1. Go to [App Store Connect](https://appstoreconnect.apple.com/)
2. Sign in with your Apple Developer account
3. Click **"My Apps"** → **"+"** → **"New App"**
4. Fill in the app details:
   - **Platform**: iOS
   - **Name**: `ShowMe`
   - **Primary Language**: English (US)
   - **Bundle ID**: Select `com.showme.app` (should be available from your developer account)
   - **SKU**: `showme-app-2024` (unique identifier for your app)

### 1.2 App Information
Fill in the required app metadata:
- **Category**: Entertainment
- **Content Rights**: Check "Contains third-party content" (TMDB data)
- **Age Rating**: Complete the questionnaire (likely 4+ or 9+ depending on content)

### 1.3 Pricing and Availability
- **Price**: Free
- **Availability**: All countries/regions (or select specific ones)

---

## Step 2: Update EAS Configuration

Once you have your App Store Connect app set up, update the `eas.json` file:

```json
{
  "submit": {
    "production": {
      "ios": {
        "ascAppId": "YOUR_APP_STORE_CONNECT_ID",
        "appleId": "your-apple-id@email.com"
      }
    }
  }
}
```

**To find your App Store Connect ID:**
1. In App Store Connect, go to your app
2. Look at the URL: `https://appstoreconnect.apple.com/apps/[APP_ID]/appstore`
3. The `APP_ID` is your `ascAppId`

---

## Step 3: Build and Submit to TestFlight

### 3.1 Install EAS CLI (if not already installed)
```bash
npm install -g eas-cli
```

### 3.2 Login to EAS
```bash
eas login
```

### 3.3 Configure iOS Credentials
```bash
eas credentials
```
- Choose **iOS**
- Select **production**
- EAS will help you set up:
  - Distribution Certificate
  - Provisioning Profile
  - Push Notification Certificate (if needed)

### 3.4 Build for Production
```bash
eas build --platform ios --profile production
```

This will:
- Create an optimized production build
- Sign it with your distribution certificate
- Upload to EAS servers

### 3.5 Submit to TestFlight
```bash
eas submit --platform ios
```

This will automatically:
- Download your built app
- Upload it to App Store Connect
- Submit it for TestFlight review

---

## Step 4: TestFlight Configuration

### 4.1 Internal Testing
1. In App Store Connect, go to **TestFlight** → **iOS**
2. Your build should appear (may take 10-30 minutes for processing)
3. Add internal testers:
   - Click **"Internal Testing"**
   - Add team members' Apple IDs
   - They'll receive an invitation email

### 4.2 Test Information
Fill in the required testing information:
- **What to Test**: Brief description of features to focus on
- **Test Details**: Any specific instructions for testers
- **Feedback Email**: Your contact email for feedback

### 4.3 App Review for TestFlight
- Apple reviews TestFlight builds before external testing
- Internal testing is usually immediate
- External testing requires App Review approval

---

## Step 5: External Beta Testing (Optional)

### 5.1 Add External Groups
1. Go to **TestFlight** → **External Testing**
2. Create testing groups (e.g., "Beta Users", "Content Creators")
3. Add up to 2,000 external testers per group

### 5.2 Public Link Testing
- Create a public TestFlight link
- Share with a broader audience
- Up to 10,000 testers can use the public link

---

## Step 6: Testing Checklist

### Core Functionality
- [ ] **User Authentication** - Sign up, sign in, email verification
- [ ] **Onboarding Flow** - Username and genre selection
- [ ] **For You Feed** - Personalized recommendations work
- [ ] **Trending Feed** - Shows trending content
- [ ] **Video Playback** - Trailers play without issues
- [ ] **Save Functionality** - Shows save to Must-Watch
- [ ] **Rating System** - Users can rate shows
- [ ] **Sharing Features** - Share with friends works
- [ ] **Profile Management** - User can update preferences

### Performance Testing
- [ ] **Load Times** - App loads quickly on first launch
- [ ] **Video Performance** - Smooth trailer playback
- [ ] **Navigation** - Smooth transitions between tabs
- [ ] **Memory Usage** - No crashes or memory issues
- [ ] **Network Handling** - Graceful offline/poor connection handling

### Device Testing
- [ ] **iPhone Models** - Test on various iPhone sizes
- [ ] **iOS Versions** - Test on supported iOS versions
- [ ] **Orientations** - Portrait and landscape modes
- [ ] **Dark/Light Mode** - Both themes work correctly

---

## Step 7: Feedback and Iteration

### Collecting Feedback
- TestFlight includes built-in feedback collection
- Testers can take screenshots and provide feedback directly
- Monitor crash reports in App Store Connect

### Common Issues to Watch For
- Authentication problems with real users
- Performance issues on older devices
- Network connectivity edge cases
- Content loading failures
- UI/UX feedback for improvements

---

## Step 8: Preparing for App Store

### App Store Requirements
- [ ] **App Preview Video** - 30-second promotional video
- [ ] **Screenshots** - Required for all device sizes
- [ ] **App Description** - Compelling app store description
- [ ] **Keywords** - SEO optimization for App Store search
- [ ] **Privacy Policy** - Required URL for privacy policy
- [ ] **Support URL** - Website or support page

### Content Requirements
- [ ] **Age Rating** - Accurate content rating
- [ ] **Copyright** - Proper attribution for TMDB content
- [ ] **Terms of Service** - Legal terms for app usage

---

## Commands Quick Reference

```bash
# Build for TestFlight
eas build --platform ios --profile production

# Submit to App Store Connect
eas submit --platform ios

# Check build status
eas build:list

# View submission status
eas submit:list

# Update app version
# (Edit app.json version, then rebuild)

# View device logs during testing
npx react-native log-ios
```

---

## Troubleshooting

### Build Issues
- **Certificate Problems**: Run `eas credentials` to reconfigure
- **Bundle ID Conflicts**: Ensure Bundle ID matches App Store Connect
- **Build Failures**: Check build logs in EAS dashboard

### Submission Issues
- **App Store Connect API**: Verify ascAppId and appleId in eas.json
- **Binary Upload Failures**: Check internet connection and retry
- **Validation Errors**: Review App Store Connect requirements

### TestFlight Issues
- **Processing Delays**: Builds can take 10-60 minutes to process
- **Review Rejections**: Address Apple's feedback and resubmit
- **Installation Problems**: Check TestFlight app is installed on test devices

---

## Next Steps After TestFlight

1. **Gather Feedback** from beta testers
2. **Fix Critical Issues** discovered in testing
3. **Optimize Performance** based on real device usage
4. **Prepare App Store Listing** with screenshots and descriptions
5. **Submit for App Store Review** when ready for public release

---

*This guide will be updated as we progress through the TestFlight setup process.* 