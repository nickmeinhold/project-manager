# APNs Setup Quick Start

Quick checklist to get push notifications working. Full details in `APNS_SETUP_GUIDE.md`.

## 📋 Checklist

### 1. Apple Developer Portal (5 minutes)

- [ ] Go to <https://developer.apple.com/account>

- [ ] Certificates, Identifiers & Profiles → **Keys**
- [ ] Create new key with **APNs** enabled
- [ ] Download `.p8` file (ONLY ONE CHANCE!)
- [ ] Note your **Key ID** and **Team ID**

### 2. Firebase Console (3 minutes)

- [ ] Go to <https://console.firebase.google.com>
- [ ] Select project: **project-manager-9ed58**
- [ ] Add iOS app (if not exists): Bundle ID = `com.yourcompany.ProjectManager`
- [ ] Project Settings → Your iOS App → Cloud Messaging
- [ ] Upload your `.p8` file with Key ID and Team ID

### 3. Xcode (2 minutes)

- [ ] Open `ProjectManager.xcodeproj`
- [ ] Select ProjectManager target → Signing & Capabilities
- [ ] Change Bundle ID to match Firebase: `com.yourcompany.ProjectManager`
- [ ] Select your Team
- [ ] Add **Push Notifications** capability
- [ ] Add **Background Modes** → check **Remote notifications**

### 4. Deploy & Test (5 minutes)

```bash
# Deploy Firebase Functions
cd /Users/nick/git/individuals/shiv/projects/project-manager
firebase deploy --only functions

# Run iOS app
cd /Users/nick/git/individuals/shiv/projects/project-manager-ios
open ProjectManager.xcodeproj
# Build and run (Cmd+R)
```

### 5. Verify (1 minute)

- [ ] Check Xcode console for "FCM registration token: ..."
- [ ] Check console for "✅ FCM token stored successfully in Firestore"
- [ ] Complete a step in web app → should get notification on iOS!

---

## 🧪 Quick Test

### Test from Firebase Console

1. Firebase Console → Cloud Messaging → "Send test message"
2. Copy FCM token from Xcode console
3. Paste and click "Test"
4. ✅ Notification appears!

### Test by completing step

1. Run iOS app (keep in background)
2. Open web app at <http://localhost:3000>
3. Create project and complete a step
4. ✅ Notification appears on iOS!

---

## 🔑 Key Information

### Your Firebase Project

- **Project ID**: `project-manager-9ed58`
- **Console**: <https://console.firebase.google.com/project/project-manager-9ed58>

### Bundle Identifier

- **Current**: `com.yourcompany.ProjectManager`
- **Change in**: Xcode → Target → Signing & Capabilities

### Important Files

- **APNs Key**: `AuthKey_XXXXX.p8` (keep secure!)
- **Firebase Config**: `GoogleService-Info.plist`
- **Functions**: `/project-manager/functions/src/index.ts`

---

## ❗ Common Issues

| Problem                                             | Solution                                           |
| --------------------------------------------------- | -------------------------------------------------- |
| "No valid aps-environment"                          | Add Push Notifications capability in Xcode         |
| Notifications not appearing                         | Check Bundle ID matches everywhere                 |
| "Invalid APNs credentials"                          | Re-upload .p8 file with correct Key ID and Team ID |
| FCM token not in console                            | Check internet connection, rebuild app             |
| Notifications work in foreground but not background | Enable Background Modes → Remote notifications     |

---

## 📱 What You Built

Your notification flow:

```sh
Step completes (Web/Firestore)
    ↓
Firebase Function triggered
    ↓
Reads FCM tokens from Firestore
    ↓
Sends via Firebase Cloud Messaging
    ↓
APNs delivers to iOS device
    ↓
App shows notification banner
    ↓
User taps → Opens specific project
```

---

## 🚀 Next Steps

After basic setup works:

1. Add user authentication
2. Target notifications to specific users
3. Add notification preferences
4. Implement notification history
5. Add rich notifications with images
6. Test on physical device
7. Submit to App Store

---

## 📚 Full Documentation

- **Detailed Setup**: See `APNS_SETUP_GUIDE.md`
- **iOS App README**: See `README.md`
- **Troubleshooting**: See `APNS_SETUP_GUIDE.md` → Troubleshooting section

---

## 💡 Pro Tips

1. **Save your .p8 file** - you can't download it again!
2. **Test on device** - simulator can be flaky
3. **Check console logs** - FCM token must print
4. **Bundle ID consistency** - must match everywhere
5. **Deploy functions** - don't forget to deploy after changes!

---

Ready to start? Follow the checklist above! ✨
