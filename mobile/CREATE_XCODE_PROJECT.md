# Creating the Xcode Project

The Xcode project file needs to be created properly using Xcode. Follow these steps:

## Step 1: Create New Xcode Project

1. **Open Xcode**
2. **File → New → Project**
3. Select **iOS** → **App** → Click **Next**
4. Fill in:
   - **Product Name**: `ProjectManager`
   - **Team**: Select your team
   - **Organization Identifier**: `com.yourcompany` (or your domain)
   - **Bundle Identifier**: (auto-filled) `com.yourcompany.ProjectManager`
   - **Interface**: **SwiftUI**
   - **Language**: **Swift**
   - **Storage**: None
   - Uncheck "Include Tests"
5. Click **Next**
6. Save to: `/Users/nick/git/individuals/shiv/projects/project-manager-ios`
7. Click **Create**

## Step 2: Delete Generated Files

Xcode creates some default files. Delete these (Move to Trash):
- `ContentView.swift` (we have our own)
- `ProjectManagerApp.swift` (we have our own)
- `Assets.xcassets` (we have our own)

## Step 3: Add Our Files to the Project

1. In Xcode's **Project Navigator** (left sidebar), right-click on the **ProjectManager** folder
2. Select **Add Files to "ProjectManager"...**
3. Navigate to: `/Users/nick/git/individuals/shiv/projects/project-manager-ios/ProjectManager/ProjectManager`
4. Select all these files:
   - ✅ `ProjectManagerApp.swift`
   - ✅ `AppDelegate.swift`
   - ✅ `ContentView.swift`
   - ✅ `Models.swift`
   - ✅ `FirebaseService.swift`
   - ✅ `ProjectListView.swift`
   - ✅ `ProjectDetailView.swift`
   - ✅ `Assets.xcassets`
   - ✅ `GoogleService-Info.plist`
5. Make sure these options are checked:
   - ✅ **Copy items if needed**
   - ✅ **Create groups**
   - ✅ **Add to targets: ProjectManager**
6. Click **Add**

## Step 4: Add Firebase SDK

1. In Xcode, select your project in the navigator
2. Select the **ProjectManager** project (not target)
3. Go to **Package Dependencies** tab
4. Click the **+** button
5. Enter: `https://github.com/firebase/firebase-ios-sdk`
6. Click **Add Package**
7. In the products dialog, select:
   - ✅ **FirebaseFirestore**
   - ✅ **FirebaseMessaging**
8. Make sure they're added to **ProjectManager** target
9. Click **Add Package**

Xcode will download and integrate Firebase SDK.

## Step 5: Add Capabilities

1. Select the **ProjectManager** target (under TARGETS)
2. Go to **Signing & Capabilities** tab
3. Click **+ Capability**
4. Add **Push Notifications**
5. Click **+ Capability** again
6. Add **Background Modes**
7. In Background Modes, check:
   - ✅ **Remote notifications**

## Step 6: Configure Signing

1. Still in **Signing & Capabilities**
2. Under **Signing**, select your **Team**
3. Xcode will automatically manage signing

## Step 7: Build and Run

1. Select a simulator or connected device from the scheme dropdown
2. Press **Cmd+R** or click the **Play** button
3. App should build and launch!

## Verify It Works

In Xcode console, you should see:
```
FCM registration token: <long token string>
✅ FCM token stored successfully in Firestore
```

---

## Troubleshooting

### "No such module 'FirebaseFirestore'"
- Wait for package download to complete (check status bar)
- Clean Build Folder: **Product → Clean Build Folder** (Cmd+Shift+K)
- Rebuild

### "Cannot find 'Firestore' in scope"
- Make sure Firebase packages are added to the target
- Check Package Dependencies tab shows FirebaseFirestore and FirebaseMessaging

### Build fails with signing errors
- Make sure you've selected your Team in Signing & Capabilities
- Bundle identifier should be unique to your account

### Files appear in red in Xcode
- Right-click the file → Show in Finder
- Make sure the file exists at the expected location
- Remove reference and re-add the file

---

## Alternative: Use the Template

If you prefer to start fresh without our custom files:

1. Create new iOS App project as above
2. Manually copy the code from each `.swift` file into the corresponding Xcode files
3. This ensures Xcode properly tracks everything

---

## Next Steps

Once the project builds successfully:
1. Follow **QUICK_START.md** to set up APNs
2. Deploy Firebase Functions
3. Test notifications!

---

## Project Structure You'll See

```
ProjectManager/
├── ProjectManagerApp.swift       ← Entry point
├── AppDelegate.swift             ← Push notification handling
├── ContentView.swift             ← Root view
├── Models.swift                  ← Data models
├── FirebaseService.swift         ← Firebase operations
├── ProjectListView.swift         ← Projects list UI
├── ProjectDetailView.swift       ← Project detail UI
├── Assets.xcassets              ← App icons and colors
└── GoogleService-Info.plist     ← Firebase config
```

The project should now build and run successfully! 🎉
