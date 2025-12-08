# CI/CD Workflows

This directory contains GitHub Actions workflows for continuous integration and deployment.

## Workflows

### `ci.yml` - Main CI/CD Pipeline

Runs on every push to `main` and on all pull requests.

**Build Jobs:**
- **Backend (Firebase Functions)**: Builds TypeScript functions
- **Web (React)**: Builds React app and runs tests
- **Mobile (Flutter)**: Analyzes code, runs tests, and builds APK

**Deploy Job:**
- Runs only on pushes to `main` branch
- Deploys backend functions, web hosting, and Firestore rules to Firebase

### `pr-review.yml` - Claude Code Review

Runs on all pull requests to provide AI-powered code review.

**Reviews:**
- Security vulnerabilities and best practices
- Code quality and maintainability
- Performance considerations
- Error handling
- Type safety (TypeScript/Dart)
- Firebase security rules

## Required Secrets

To use these workflows, configure the following secrets in your GitHub repository settings:

### `FIREBASE_TOKEN`
Firebase deployment token for CI/CD.

**How to get it:**
```bash
firebase login:ci
```

This will output a token. Add it to GitHub:
1. Go to repository Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `FIREBASE_TOKEN`
4. Value: [paste your token]

### `ANTHROPIC_API_KEY`
API key for Claude Code Review.

**How to get it:**
1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Create an API key
3. Add it to GitHub repository secrets

**Note:** This secret is optional. If not provided, the PR review workflow will be skipped.

## Workflow Features

### Caching
- Node.js dependencies are cached for faster builds
- Flutter dependencies are cached automatically

### Artifacts
Build artifacts are uploaded and shared between jobs:
- Backend: `lib/` directory (compiled TypeScript)
- Web: `build/` directory (production React build)
- Mobile: APK file

### Status Checks
All build jobs must pass before deployment occurs.

## Local Testing

Before pushing, you can test builds locally:

```bash
# Backend
cd backend && npm run build

# Web
cd web && npm run build && npm test

# Mobile
cd mobile && flutter analyze && flutter test && flutter build apk
```

## Troubleshooting

### Firebase deployment fails
- Verify `FIREBASE_TOKEN` is set correctly
- Check that the token has permissions for your Firebase project
- Ensure Firebase CLI version is compatible

### Mobile build fails
- Flutter version: 3.24.x stable
- Java version: 17
- Check that all dependencies are compatible

### Claude review doesn't run
- Verify `ANTHROPIC_API_KEY` is set
- Check API key has sufficient credits
- Review API rate limits
