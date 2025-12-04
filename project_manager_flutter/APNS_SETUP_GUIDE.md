# APNs Certificate Setup Guide

Complete guide to configure Apple Push Notifications for your Project Manager iOS app.

## Prerequisites

- Active Apple Developer Account ($99/year)
- Access to Firebase Console
- Xcode installed on your Mac

---

## Part 1: Create APNs Authentication Key (Apple Developer Portal)

### Step 1: Go to Apple Developer Portal

1. Open your browser and go to: https://developer.apple.com/account
2. Sign in with your Apple ID
3. Click on **"Certificates, Identifiers & Profiles"**

### Step 2: Create a New Key

1. In the left sidebar, click **"Keys"**
2. Click the **"+"** button (or "Create a key")
3. Enter a key name: `Project Manager APNs Key` (or any name you prefer)
4. Check the box for **"Apple Push Notifications service (APNs)"**
5. Click **"Continue"**
6. Review the details and click **"Register"**

### Step 3: Download the Key

⚠️ **IMPORTANT**: You can only download this key ONCE! Save it securely.

1. Click **"Download"** - this downloads a `.p8` file
2. **Save this file** somewhere safe (you'll need it in the next step)
3. Note down:
   - **Key ID** (shows on the page, looks like: `ABC123DEF4`)
   - **Team ID** (shows in top right of developer portal, looks like: `XYZ987WQR6`)

The file name will be something like: `AuthKey_ABC123DEF4.p8`

---

## Part 2: Register Your App Identifier

### Step 1: Check/Create App Identifier

1. Still in Apple Developer Portal
2. Left sidebar → **"Identifiers"**
3. Click the **"+"** button to create new, or select existing

### Step 2: Configure App ID

1. Select **"App IDs"** → Continue
2. Select **"App"** → Continue
3. Fill in:
   - **Description**: `Project Manager`
   - **Bundle ID**: Choose "Explicit" and enter: `com.yourcompany.ProjectManager`
     (Replace `yourcompany` with your actual company/name)
4. Under **Capabilities**, check:
   - ✅ **Push Notifications**
5. Click **"Continue"** → **"Register"**

---

## Part 3: Upload APNs Key to Firebase

### Step 1: Go to Firebase Console

1. Open: https://console.firebase.google.com/
2. Select your project: **shivy-s-projects**
3. Click the gear icon ⚙️ → **"Project settings"**

### Step 2: Add iOS App (if not already added)

1. Scroll down to "Your apps"
2. If you don't see an iOS app, click **"Add app"** → iOS icon
3. Fill in:
   - **Apple bundle ID**: `com.yourcompany.ProjectManager` (same as Step 2)
   - **App nickname** (optional): `Project Manager iOS`
   - **App Store ID** (optional, skip for now)
4. Click **"Register app"**
5. Download `GoogleService-Info.plist` (you already have this, but download fresh if needed)
6. Click **"Continue"** through the remaining steps

### Step 3: Upload APNs Authentication Key

1. In Firebase Console → Project Settings → Your iOS App
2. Scroll to **"Cloud Messaging"** section
3. Under **"APNs Authentication Key"**, click **"Upload"**
4. Click **"Choose File"** and select your `.p8` file (from Part 1, Step 3)
5. Enter:
   - **Key ID**: The ID you noted earlier (e.g., `ABC123DEF4`)
   - **Team ID**: Your Team ID from Apple Developer Portal (e.g., `XYZ987WQR6`)
6. Click **"Upload"**

✅ You should see: "APNs Authentication Key uploaded successfully"

---

## Part 4: Configure Xcode Project

### Step 1: Open Your Project

```bash
cd /Users/nick/git/individuals/shiv/projects/project-manager-ios
open ProjectManager.xcodeproj
```

### Step 2: Update Bundle Identifier

1. In Xcode, select **"ProjectManager"** project in the navigator
2. Select the **"ProjectManager"** target
3. Go to **"Signing & Capabilities"** tab
4. Under **"Signing"**, select your Team
5. Change **"Bundle Identifier"** to: `com.yourcompany.ProjectManager`
   (Must match what you used in Apple Developer Portal!)

### Step 3: Add Push Notifications Capability

1. Still in **"Signing & Capabilities"** tab
2. Click **"+ Capability"** button
3. Search for and add: **"Push Notifications"**
4. You should now see "Push Notifications" in the capabilities list

### Step 4: Add Background Modes

1. Click **"+ Capability"** again
2. Search for and add: **"Background Modes"**
3. In the Background Modes section, check:
   - ✅ **"Remote notifications"**

### Step 5: Update GoogleService-Info.plist

1. If you downloaded a new `GoogleService-Info.plist` from Firebase:
   - Delete the old one from Xcode
   - Drag the new one into the ProjectManager folder
   - Make sure **"Copy items if needed"** is checked
   - Make sure **"ProjectManager"** target is checked
   - Click **"Finish"**

---

## Part 5: Update Firebase Functions to Send Notifications

Let me create an updated Firebase Functions file that sends actual push notifications:

### Step 1: Update Your Functions Code

The notification sending is already stubbed in your Firebase Functions. You need to store user FCM tokens and send to them.

Add this to your `functions/src/index.ts`:

```typescript
// Add to the sendNotification function

async function sendNotification(
  projectId: string,
  stepId: string,
  notification: { title: string; body: string; type: string }
) {
  // Save notification to Firestore
  await db.collection('notifications').add({
    projectId,
    stepId,
    title: notification.title,
    body: notification.body,
    type: notification.type,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    read: false
  });

  // NEW: Send push notification via FCM
  // You need to store user FCM tokens in a 'users' collection
  // For now, we'll get all tokens (in production, target specific users)

  const tokensSnapshot = await db.collection('fcmTokens').get();

  const tokens = tokensSnapshot.docs.map(doc => doc.data().token);

  if (tokens.length > 0) {
    const message = {
      notification: {
        title: notification.title,
        body: notification.body
      },
      data: {
        projectId: projectId,
        stepId: stepId,
        type: notification.type
      },
      tokens: tokens // Send to all registered devices
    };

    try {
      const response = await admin.messaging().sendMulticast(message);
      console.log(`Successfully sent ${response.successCount} notifications`);
      console.log(`Failed to send ${response.failureCount} notifications`);
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }
}
```

### Step 2: Store FCM Tokens

Update your iOS app to store the FCM token in Firestore:

In `AppDelegate.swift`, update the `messaging(_:didReceiveRegistrationToken:)` method:

```swift
func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
    print("FCM registration token: \(fcmToken ?? "nil")")

    if let token = fcmToken {
        UserDefaults.standard.set(token, forKey: "fcmToken")

        // Store in Firestore
        let db = Firestore.firestore()
        let tokenData: [String: Any] = [
            "token": token,
            "updatedAt": Timestamp(date: Date()),
            "platform": "ios"
        ]

        // Use a unique ID for this device (you can use UIDevice.current.identifierForVendor)
        let deviceId = UIDevice.current.identifierForVendor?.uuidString ?? "unknown"

        db.collection("fcmTokens").document(deviceId).setData(tokenData) { error in
            if let error = error {
                print("Error storing FCM token: \(error)")
            } else {
                print("FCM token stored successfully")
            }
        }
    }
}
```

---

## Part 6: Test Push Notifications

### Method 1: Test from Firebase Console

1. Go to Firebase Console → **Cloud Messaging**
2. Click **"Send your first message"** (or "New campaign")
3. Fill in:
   - **Notification title**: "Test Notification"
   - **Notification text**: "Testing push notifications!"
4. Click **"Send test message"**
5. Enter your FCM token from Xcode console logs
6. Click **"Test"**

You should receive a notification on your device/simulator!

### Method 2: Test by Completing a Step

1. Build and run the iOS app on a device or simulator
2. Keep the app in background or close it
3. Use the React web app to complete a step
4. You should receive a notification!
5. Tap the notification - it should open the app and navigate to that project

### Method 3: Test with curl

```bash
# Get your Server Key from Firebase Console → Project Settings → Cloud Messaging → Server key
# Get your FCM Token from Xcode console

curl -X POST https://fcm.googleapis.com/fcm/send \
  -H "Authorization: key=YOUR_FIREBASE_SERVER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "YOUR_FCM_TOKEN_HERE",
    "notification": {
      "title": "Step Completed!",
      "body": "Your task has been finished",
      "sound": "default",
      "badge": "1"
    },
    "data": {
      "projectId": "test-project-123",
      "stepId": "test-step-456"
    }
  }'
```

---

## Troubleshooting

### "No valid 'aps-environment' entitlement"

**Solution**: Make sure you've added Push Notifications capability in Xcode

### Notifications not appearing on device

**Checklist**:
- ✅ Push Notifications capability added in Xcode
- ✅ Background Modes > Remote notifications enabled
- ✅ APNs key uploaded to Firebase
- ✅ Bundle ID matches between Xcode, Firebase, and Apple Developer
- ✅ App is signed with your team
- ✅ Notification permission granted (check iOS Settings → ProjectManager)
- ✅ Device has internet connection
- ✅ FCM token printed in console logs

### "Invalid APNs credentials"

**Solution**:
- Check Key ID and Team ID are correct
- Ensure the .p8 file is not corrupted
- Verify the Bundle ID matches

### Testing on Simulator

⚠️ **Simulator Limitations**:
- iOS Simulator CAN receive notifications (iOS 16+)
- Make sure simulator has internet
- Check simulator has notification permissions
- Physical device is more reliable for testing

---

## Production Checklist

Before releasing to production:

- [ ] APNs authentication key uploaded to Firebase
- [ ] Bundle identifier properly configured
- [ ] Push Notifications capability enabled
- [ ] Background Modes enabled
- [ ] App signed with production certificate
- [ ] Tested on physical device
- [ ] FCM tokens stored securely in Firestore
- [ ] Firebase Functions deployed
- [ ] Notification permissions requested on first launch
- [ ] Deep linking tested (tapping notification opens correct project)

---

## Quick Reference

### Where to find Key ID and Team ID:
- **Key ID**: Apple Developer Portal → Certificates, Identifiers & Profiles → Keys → Click your key
- **Team ID**: Apple Developer Portal → Top right corner (or Membership page)

### Where to find Server Key:
- Firebase Console → Project Settings → Cloud Messaging → Server key (under "Project credentials")

### Where to find FCM Token:
- Run your iOS app in Xcode
- Check console logs for: "FCM registration token: ..."

### Where to upload APNs key:
- Firebase Console → Project Settings → Your iOS App → APNs Authentication Key → Upload

---

## Next Steps

After setup:
1. Deploy your Firebase Functions: `firebase deploy --only functions`
2. Test notifications thoroughly
3. Add user authentication to target specific users
4. Implement notification preferences
5. Add notification history in the app
6. Monitor notification delivery rates in Firebase Console

---

## Need Help?

- Firebase iOS Setup: https://firebase.google.com/docs/ios/setup
- FCM iOS Client: https://firebase.google.com/docs/cloud-messaging/ios/client
- APNs Overview: https://developer.apple.com/documentation/usernotifications
- Troubleshooting: https://firebase.google.com/docs/cloud-messaging/ios/certs
