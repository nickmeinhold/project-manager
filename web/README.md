# Project Manager

An intelligent project management system with AI automation, step tracking, and push notifications.

## Features

- ✅ Create and manage projects with multiple steps
- 🤖 AI automation attempts to complete automatable steps
- 📱 Push notifications when steps complete
- 🔄 Real-time updates with Firestore
- 📊 Progress tracking for each project
- 👤 Manual fallback when automation isn't possible

## Tech Stack

- **Frontend**: React + TypeScript
- **Backend**: Firebase (Firestore + Cloud Functions)
- **Notifications**: Firebase Cloud Messaging (FCM)

## Project Structure

```
project-manager/
├── src/                      # React app source
│   ├── components/          # React components
│   │   ├── ProjectList.tsx
│   │   ├── ProjectForm.tsx
│   │   └── ProjectDetail.tsx
│   ├── services/            # Firebase & API services
│   │   ├── firebase.ts
│   │   └── projectService.ts
│   ├── types/               # TypeScript types
│   │   └── index.ts
│   ├── App.tsx
│   └── index.tsx
├── functions/               # Firebase Cloud Functions
│   └── src/
│       └── index.ts         # Automation & notification logic
├── public/
└── firebase.json
```

## Setup Instructions

### Prerequisites

1. **Install Node.js** (v18 or higher)
   - Download from https://nodejs.org/

2. **Install Firebase CLI**
   ```bash
   npm install -g firebase-tools
   ```

3. **Login to Firebase**
   ```bash
   firebase login
   ```

### Installation

1. **Navigate to project directory**
   ```bash
   cd project-manager
   ```

2. **Install React dependencies**
   ```bash
   npm install
   ```

3. **Install Functions dependencies**
   ```bash
   cd functions
   npm install
   cd ..
   ```

### Configuration

The Firebase configuration is already set up in `src/services/firebase.ts` with your project credentials.

To enable push notifications, you'll need to:
1. Go to Firebase Console > Project Settings > Cloud Messaging
2. Generate a Web Push certificate (VAPID key)
3. Update `YOUR_VAPID_KEY` in `src/services/firebase.ts`

### Running Locally

1. **Start the React development server**
   ```bash
   npm start
   ```
   The app will open at http://localhost:3000

2. **Run Firebase Functions locally (optional)**
   ```bash
   firebase emulators:start
   ```

### Deploying to Firebase

1. **Build the React app**
   ```bash
   npm run build
   ```

2. **Deploy everything (Hosting + Functions + Firestore rules)**
   ```bash
   firebase deploy
   ```

   Or deploy individually:
   ```bash
   firebase deploy --only hosting    # Deploy React app
   firebase deploy --only functions  # Deploy Cloud Functions
   firebase deploy --only firestore  # Deploy Firestore rules
   ```

## How It Works

### Creating a Project

1. Click "New Project" button
2. Enter project title and description
3. Add steps:
   - Give each step a title and description
   - Mark as "Can be automated by AI" if applicable
4. Submit the form

### Project Automation Flow

```
1. Step is created/updated
   ↓
2. Firebase Function triggered
   ↓
3. If automatable → AI attempts to complete
   ↓
4. Success → Mark complete & notify user
   Failure → Request manual action
   ↓
5. When complete → Trigger next step
```

### Manual Management

- View all projects in the list
- Click a project to see all steps
- Manually start, complete, or mark steps as failed
- Track progress with visual indicators

## Data Structure

### Projects Collection
```typescript
{
  id: string
  title: string
  description: string
  status: 'active' | 'completed' | 'paused'
  currentStepIndex: number
  totalSteps: number
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### Steps Subcollection (under each project)
```typescript
{
  id: string
  projectId: string
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  order: number
  automatable: boolean
  automationAttempted: boolean
  automationResult?: string
  createdAt: Timestamp
  updatedAt: Timestamp
  completedAt?: Timestamp
}
```

### Notifications Collection
```typescript
{
  id: string
  projectId: string
  stepId: string
  title: string
  body: string
  type: 'step_completed' | 'step_failed' | 'manual_action_required'
  createdAt: Timestamp
  read: boolean
}
```

## Customizing Automation

The automation logic is in `functions/src/index.ts`. Currently it's a placeholder that:
- Marks steps with "simple" in description as auto-completable
- Others require manual intervention

To add real AI automation:
1. Integrate with AI services (OpenAI, Claude, etc.)
2. Add API integrations for task execution
3. Update the `simulateAutomation()` function
4. Implement actual task execution logic

## Future Enhancements

- [ ] User authentication
- [ ] iOS Reminders integration via EventKit
- [ ] Advanced AI automation with LLMs
- [ ] File attachments for steps
- [ ] Team collaboration features
- [ ] Custom automation workflows
- [ ] Analytics and reporting

## Firestore Security

**IMPORTANT**: The current Firestore rules allow open access. Before deploying to production:

1. Edit `firestore.rules`
2. Add proper authentication checks
3. Implement user-specific data access

Example:
```
allow read, write: if request.auth != null && request.auth.uid == userId;
```

## Support

For issues or questions, check:
- Firebase Console: https://console.firebase.google.com/
- Firebase Docs: https://firebase.google.com/docs
- React Docs: https://react.dev/
