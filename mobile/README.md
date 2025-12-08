# Project Manager iOS App

Native iOS app for the Project Manager system with push notifications and real-time sync.

## Features

- 📱 Native iOS SwiftUI interface
- 🔔 Push notifications via Firebase Cloud Messaging
- 🔄 Real-time project and step updates
- ✅ Manual step management
- 📊 Visual progress tracking
- 🎨 Modern SwiftUI design

## Requirements

- Xcode 15.0 or later
- iOS 16.0 or later
- macOS Ventura or later
- Active Apple Developer account (for push notifications)

## Firebase Setup

The app is already configured to connect to your Firebase project:
- Project ID: `shivy-s-projects`
- Configuration file: `GoogleService-Info.plist` (already included)

## Installation

### 1. Open the Project

```bash
cd project-manager-ios
open ProjectManager.xcodeproj
```

### 2. Install Dependencies

When you open the project in Xcode, it will automatically fetch the Firebase iOS SDK via Swift Package Manager.

If needed, you can manually add Firebase:
1. File → Add Package Dependencies
2. Enter: `https://github.com/firebase/firebase-ios-sdk`
3. Select version 10.0.0 or later
4. Add these products:
   - FirebaseFirestore
   - FirebaseMessaging

### 3. Configure Bundle Identifier

1. Select the ProjectManager target
2. Go to "Signing & Capabilities"
3. Change the bundle identifier from `com.yourcompany.ProjectManager` to your own

### 4. Enable Push Notifications

1. Select the ProjectManager target
2. Go to "Signing & Capabilities"
3. Click "+ Capability"
4. Add "Push Notifications"
5. Add "Background Modes" and check "Remote notifications"

### 5. Configure Firebase Cloud Messaging

#### Get APNs Authentication Key:
1. Go to [Apple Developer Portal](https://developer.apple.com/account)
2. Certificates, Identifiers & Profiles → Keys
3. Create a new key with "Apple Push Notifications service (APNs)" enabled
4. Download the `.p8` file

#### Upload to Firebase:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `shivy-s-projects`
3. Project Settings → Cloud Messaging → iOS app configuration
4. Upload your APNs Authentication Key
5. Enter your Team ID and Key ID

### 6. Update GoogleService-Info.plist

If you need to download a fresh config file:
1. Firebase Console → Project Settings → Your iOS App
2. Download `GoogleService-Info.plist`
3. Replace the existing file in the project

## Running the App

1. Select a simulator or connected device
2. Press Cmd+R or click the Run button
3. The app will build and launch

## Project Structure

```
ProjectManager/
├── ProjectManagerApp.swift        # App entry point
├── AppDelegate.swift              # Push notification setup
├── ContentView.swift              # Root view
├── Models.swift                   # Data models
├── FirebaseService.swift          # Firebase operations
├── ProjectListView.swift          # List of all projects
├── ProjectDetailView.swift        # Project details & steps
├── Assets.xcassets               # App assets
└── GoogleService-Info.plist      # Firebase configuration
```

## How Push Notifications Work

### Flow:
1. **App Launch**: Requests notification permission
2. **FCM Token**: Device receives unique FCM token
3. **Token Storage**: Token saved to UserDefaults (in production, send to backend)
4. **Firebase Functions**: When a step completes, Cloud Function sends notification
5. **APNs**: Firebase sends notification to Apple Push Notification service
6. **Delivery**: APNs delivers to your device

### Handling Notifications:

#### Foreground (App Open):
- Notification appears as banner
- Handled in `AppDelegate.userNotificationCenter(_:willPresent:)`

#### Background/Closed:
- Notification appears in notification center
- Tapping opens app
- Handled in `AppDelegate.userNotificationCenter(_:didReceive:)`

#### Deep Linking:
- Notifications include `projectId` in payload
- App automatically navigates to the project when tapped

## Testing Notifications

### Method 1: Complete a Step
1. Open the app and create a project with steps
2. Close the app or put it in background
3. Use the web app to complete a step
4. You should receive a notification

### Method 2: Firebase Console
1. Go to Firebase Console → Cloud Messaging
2. Click "Send your first message"
3. Enter title and body
4. Click "Send test message"
5. Enter your FCM token (check Xcode console logs)

### Method 3: Test with curl

```bash
# Get your FCM token from Xcode console
# Get your Firebase Server Key from Firebase Console → Project Settings → Cloud Messaging

curl -X POST https://fcm.googleapis.com/fcm/send \
  -H "Authorization: key=YOUR_SERVER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "YOUR_FCM_TOKEN",
    "notification": {
      "title": "Step Completed!",
      "body": "Your step has been completed. Next step: Review results"
    },
    "data": {
      "projectId": "PROJECT_ID_HERE"
    }
  }'
```

## Troubleshooting

### Notifications Not Appearing

1. **Check Permission**: Settings → ProjectManager → Notifications → Allow Notifications
2. **Check APNs**: Ensure APNs key is uploaded to Firebase
3. **Check Token**: Look for "FCM registration token" in Xcode console
4. **Check Bundle ID**: Must match Firebase and Apple Developer Portal
5. **Check Certificate**: Ensure using the correct provisioning profile

### Build Errors

1. **Firebase SDK**: Clean build folder (Cmd+Shift+K) and rebuild
2. **Signing**: Ensure you have a valid team selected
3. **Capabilities**: Ensure Push Notifications capability is added

### Connection Issues

1. **GoogleService-Info.plist**: Ensure file is properly added to target
2. **Internet**: Check device/simulator has internet connection
3. **Firestore Rules**: Check rules allow read/write (see `firestore.rules`)

## Firestore Data Sync

The app uses real-time listeners to sync data:

- **Projects**: Auto-updates when projects change in Firestore
- **Steps**: Auto-updates when steps change
- **Offline Support**: Firebase SDK caches data locally

## Code Highlights

### Real-time Updates
```swift
firebaseService.fetchProjects()
    .receive(on: DispatchQueue.main)
    .sink { projects in
        self.projects = projects
    }
```

### Update Step Status
```swift
try await firebaseService.updateStep(
    projectId: projectId,
    stepId: stepId,
    updates: ["status": "completed"]
)
```

### Handle Notification Tap
```swift
if let projectId = userInfo["projectId"] as? String {
    // Navigate to project
    NotificationCenter.default.post(
        name: NSNotification.Name("NavigateToProject"),
        object: nil,
        userInfo: ["projectId": projectId]
    )
}
```

## Next Steps

### iOS Reminders Integration
To sync with iOS Reminders (EventKit):
1. Add EventKit framework
2. Request calendar/reminders permission
3. Create bidirectional sync between Reminders and Firestore
4. See EventKit documentation: https://developer.apple.com/documentation/eventkit

### Additional Features
- [ ] Create projects from iOS app
- [ ] Add EventKit/Reminders integration
- [ ] Notification settings/preferences
- [ ] Offline mode indicator
- [ ] Pull to refresh
- [ ] Search and filter projects
- [ ] Dark mode optimization

## Production Checklist

Before releasing to production:

- [ ] Update bundle identifier to your company domain
- [ ] Configure proper code signing with distribution certificate
- [ ] Upload production APNs certificate to Firebase
- [ ] Update Firestore security rules with authentication
- [ ] Add error tracking (Crashlytics)
- [ ] Add analytics
- [ ] Test on multiple device sizes
- [ ] Test on physical device
- [ ] Submit to App Store Connect

## Support

- Firebase iOS SDK: https://firebase.google.com/docs/ios/setup
- SwiftUI: https://developer.apple.com/documentation/swiftui
- Push Notifications: https://developer.apple.com/documentation/usernotifications
- EventKit: https://developer.apple.com/documentation/eventkit
