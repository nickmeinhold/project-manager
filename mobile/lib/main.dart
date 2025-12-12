import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:project_manager_flutter/firebase_options.dart';
import 'package:project_manager_flutter/services/messaging_service.dart';
import 'package:project_manager_flutter/services/navigation_service.dart';

import 'views/auth_wrapper.dart';
import 'views/project_detail_wrapper.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);

  // Set up background message handler
  FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);

  // Initialize messaging service
  await MessagingService().initialize();

  runApp(const ProjectManagerApp());
}

class ProjectManagerApp extends StatefulWidget {
  const ProjectManagerApp({super.key});

  @override
  State<ProjectManagerApp> createState() => _ProjectManagerAppState();
}

class _ProjectManagerAppState extends State<ProjectManagerApp> {
  @override
  void initState() {
    super.initState();
    // Process any pending navigation from cold start after first frame
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _processPendingNavigation();
    });
  }

  void _processPendingNavigation() {
    final navigationService = NavigationService();
    final pending = navigationService.consumePendingNavigation();
    if (pending != null) {
      navigationService.navigateTo(pending);
    }
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Project Manager',
      debugShowCheckedModeBanner: false,
      navigatorKey: NavigationService().navigatorKey,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue, brightness: Brightness.light),
        useMaterial3: true,
        appBarTheme: const AppBarTheme(centerTitle: false, elevation: 0),
        cardTheme: CardThemeData(
          elevation: 2,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      ),
      home: const AuthWrapper(),
      onGenerateRoute: (settings) {
        // Handle deep link routes from push notifications
        if (settings.name == Routes.projectDetail) {
          final args = settings.arguments as Map<String, dynamic>?;
          final projectId = args?['projectId'] as String?;
          final stepId = args?['stepId'] as String?;

          if (projectId != null) {
            return MaterialPageRoute(
              builder: (context) => ProjectDetailWrapper(
                projectId: projectId,
                stepId: stepId,
              ),
            );
          }
        }
        // Return null for unknown routes to use default handling
        return null;
      },
    );
  }
}
