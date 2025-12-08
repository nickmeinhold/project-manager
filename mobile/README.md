# Project Manager Mobile App

Flutter mobile app for the Project Manager system with push notifications and real-time sync. Supports iOS and Android.

## Features

- 📱 Cross-platform Flutter app (iOS & Android)
- 🔔 Push notifications via Firebase Cloud Messaging
- 🔄 Real-time project and step updates
- 🔐 Firebase Authentication
- ✅ Manual step management
- 📊 Visual progress tracking
- 🎨 Material Design 3 UI

## Requirements

- Flutter SDK 3.10.1 or later
- For iOS: Xcode 15.0+, macOS, Apple Developer account (for push notifications)
- For Android: Android Studio, Android SDK

## Firebase Setup

The app is configured to connect to your Firebase project:

- Project ID: `project-manager-9ed58`
- Configuration files included:
  - iOS: `ios/Runner/GoogleService-Info.plist`
  - Android: `android/app/google-services.json`

## Installation

### 1. Install Dependencies

```bash
cd mobile
flutter pub get
```

### 2. Run the App

```bash
# iOS Simulator
flutter run -d ios

# Android Emulator
flutter run -d android

# List available devices
flutter devices
```

### 3. Build for Release

```bash
# iOS
flutter build ios --release

# Android APK
flutter build apk --release

# Android App Bundle
flutter build appbundle --release
```

## Project Structure

```sh
mobile/
├── lib/
│   ├── main.dart                 # App entry point
│   ├── firebase_options.dart     # Firebase configuration
│   ├── models/
│   │   ├── project.dart          # Project model
│   │   ├── step.dart             # Step model
│   │   └── notification.dart     # Notification model
│   ├── services/
│   │   ├── firebase_service.dart # Firestore operations
│   │   └── auth_service.dart     # Authentication
│   ├── views/
│   │   ├── auth_wrapper.dart     # Auth state handler
│   │   ├── sign_in_view.dart     # Sign in screen
│   │   ├── project_list_view.dart    # List of projects
│   │   └── project_detail_view.dart  # Project details & steps
│   └── screens/
│       └── create_project_screen.dart
├── ios/                          # iOS-specific code
├── android/                      # Android-specific code
└── pubspec.yaml                  # Dependencies
```

## Push Notifications Setup

### iOS Setup

1. Open `ios/Runner.xcworkspace` in Xcode
2. Select the Runner target → Signing & Capabilities
3. Add "Push Notifications" capability
4. Add "Background Modes" → check "Remote notifications"
5. Upload APNs key to Firebase Console (see [APNS_SETUP_GUIDE.md](APNS_SETUP_GUIDE.md))

### Android Setup

Push notifications work out of the box on Android. The `google-services.json` file is already configured.

## How Push Notifications Work

### Flow

1. **App Launch**: Requests notification permission
2. **FCM Token**: Device receives unique FCM token
3. **Token Storage**: Token saved to Firestore
4. **Firebase Functions**: When a step completes, Cloud Function sends notification
5. **Delivery**: FCM delivers to device via APNs (iOS) or directly (Android)

## Testing Notifications

### Method 1: Complete a Step

1. Open the app and sign in
2. Put the app in background
3. Use the web app to complete a step
4. You should receive a notification

### Method 2: Firebase Console

1. Go to Firebase Console → Cloud Messaging
2. Click "Send your first message"
3. Enter title and body
4. Target your app
5. Click "Send test message" with your FCM token

## Troubleshooting

### Notifications Not Appearing

1. **Check Permission**: Ensure notifications are enabled in device settings
2. **Check APNs (iOS)**: Ensure APNs key is uploaded to Firebase
3. **Check Token**: Look for FCM token in debug console
4. **Check Bundle ID**: Must match Firebase configuration

### Build Errors

```bash
# Clean and rebuild
flutter clean
flutter pub get
flutter run
```

### iOS-specific Issues

```bash
# Reinstall pods
cd ios
pod deintegrate
pod install
cd ..
```

## Code Highlights

### Real-time Updates

```dart
FirebaseFirestore.instance
    .collection('projects')
    .snapshots()
    .listen((snapshot) {
  final projects = snapshot.docs.map((doc) =>
      Project.fromFirestore(doc)).toList();
  // Update UI
});
```

### Update Step Status

```dart
await FirebaseFirestore.instance
    .collection('projects')
    .doc(projectId)
    .collection('steps')
    .doc(stepId)
    .update({'status': 'completed'});
```

## Dependencies

- `firebase_core` - Firebase initialization
- `firebase_auth` - Authentication
- `cloud_firestore` - Database
- `firebase_messaging` - Push notifications
- `provider` - State management
- `intl` - Date formatting

## Next Steps

- [ ] Add EventKit/Reminders integration (iOS)
- [ ] Notification preferences
- [ ] Offline mode indicator
- [ ] Pull to refresh
- [ ] Search and filter projects
- [ ] Dark mode support

## Support

- Flutter Docs: <https://docs.flutter.dev/>
- Firebase Flutter: <https://firebase.google.com/docs/flutter/setup>
- FCM Flutter: <https://firebase.google.com/docs/cloud-messaging/flutter/client>
