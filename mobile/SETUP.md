# Flutter Project Manager Setup

This Flutter app uses the same models and views as the iOS and React web apps.

## Firebase Configuration

You need to configure Firebase for both iOS and Android:

### iOS Configuration

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Add an iOS app
4. Download the `GoogleService-Info.plist` file
5. Place it in `ios/Runner/` directory

### Android Configuration

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Add an Android app
4. Download the `google-services.json` file
5. Place it in `android/app/` directory

### Web Configuration (Optional)

For web support, you'll need to configure Firebase for web:

1. Add a web app in Firebase Console
2. Create `lib/firebase_options.dart` using FlutterFire CLI:

```bash
# Install FlutterFire CLI
dart pub global activate flutterfire_cli

# Configure Firebase
flutterfire configure
```

## Installation

```bash
# Get dependencies
flutter pub get

# Run on iOS
flutter run -d ios

# Run on Android
flutter run -d android
```

## Project Structure

```
lib/
├── main.dart                    # App entry point
├── models/                      # Data models
│   ├── project.dart            # Project model
│   ├── step.dart               # Step model
│   └── notification.dart       # Notification model
├── services/                    # Business logic
│   └── firebase_service.dart   # Firebase operations
└── views/                       # UI screens
    ├── project_list_view.dart  # Projects list
    └── project_detail_view.dart # Project details and steps
```

## Features

- **Project List**: View all projects with status and progress
- **Project Details**: View project steps and their status
- **Step Management**: Start, complete, fail, and retry steps
- **Real-time Updates**: Uses Firestore streams for live data
- **Status Tracking**: Visual indicators for project and step status
- **Automation Support**: Shows which steps are automatable
- **Progress Tracking**: Visual progress bars and completion percentages

## Models

All models match the TypeScript/Swift implementations:

- **Project**: Contains title, description, status, and progress tracking
- **Step**: Individual project steps with status, automation flags, and results
- **Notification**: Push notification records for step updates

## Firebase Collections

- `projects/`: Project documents
- `projects/{id}/steps/`: Steps subcollection for each project
- `notifications/`: Notification documents
