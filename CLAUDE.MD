# Project Context for Claude

## Project Overview

An intelligent project management system that:

- Allows easy task creation and updates via iOS Reminders or React web interface
- Tracks detailed progress for each step in a project
- Uses AI/automation to complete tasks when possible
- Sends push notifications on step completion with details about next steps
- Falls back to manual updates when automation isn't possible

## Tech Stack

**Backend:**

- Firebase Firestore (database)
- Firebase Functions (event-driven automation)
- Firebase Cloud Messaging (push notifications)

**Frontend:**

- React Web App
- iOS Reminders (via EventKit integration)

**AI/Automation:**

- AI Agent for task execution
- Integration APIs for automated task completion

## Project Structure

```mermaid
graph TD
    %% Node Definitions
    User[User]
    RemindersApp[iOS Reminders App]
    ReactApp[React Web App]
    Firestore[Firebase Firestore]
    Functions[Firebase Functions]
    AIAgent[AI Task Agent]
    FCM[Firebase Cloud Messaging]

    ProjectsCollection[Projects Collection]
    StepsCollection[Steps Subcollection]
    NotificationsCollection[Notifications Collection]

    %% User Interaction Layer
    User -->|Create/Update Tasks| RemindersApp
    User -->|Create/Update Tasks| ReactApp
    User -->|Receives Notifications| FCM

    %% Data Flow
    RemindersApp -->|Sync via EventKit| Functions
    ReactApp -->|Read/Write| Firestore
    Functions -->|Read/Write| Firestore

    %% Automation Flow
    Functions -->|Trigger on Step Update| AIAgent
    AIAgent -->|Attempt Automation| ExternalAPIs[External APIs]
    AIAgent -->|Update Progress| Firestore

    %% Notification Flow
    Functions -->|On Step Complete| FCM
    Functions -->|Write Log| NotificationsCollection

    %% Data Structure
    subgraph "Firestore Schema"
        Firestore --> ProjectsCollection
        Firestore --> NotificationsCollection
        ProjectsCollection -->|Subcollection| StepsCollection
    end

    %% Styling
    style User fill:#e8eaf6
    style RemindersApp fill:#e1f5ff
    style ReactApp fill:#f3e5f5
    style Firestore fill:#fff4e1
    style Functions fill:#e8f5e9
    style AIAgent fill:#fce4ec
    style FCM fill:#fff9c4
```

## Development Guidelines

<!-- Add any coding standards, conventions, or best practices -->

## Key Information

<!-- Add any important context, gotchas, or things to remember -->

## Current Focus

<!-- What are you currently working on? -->

## Notes

<!-- Any additional notes or reminders -->
