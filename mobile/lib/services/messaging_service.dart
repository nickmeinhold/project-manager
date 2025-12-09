import 'dart:async';
import 'dart:developer' as developer;
import 'dart:io';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:project_manager_flutter/firebase_options.dart';

/// Handles Firebase Cloud Messaging for push notifications
class MessagingService {
  static final MessagingService _instance = MessagingService._internal();
  factory MessagingService() => _instance;
  MessagingService._internal();

  final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  final FirebaseFirestore _firestore = FirebaseFirestore.instanceFor(
    app: Firebase.app(),
    databaseId: 'default',
  );
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();

  String? _currentToken;
  StreamSubscription<User?>? _authSubscription;

  /// Initialize messaging and request permissions
  Future<void> initialize() async {
    try {
      // Initialize local notifications
      await _initializeLocalNotifications();

      // Request permission (required for iOS, shows prompt on Android 13+)
      final settings = await _messaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
        provisional: false,
      );

      developer.log(
        'Notification permission status: ${settings.authorizationStatus}',
        name: 'MessagingService',
      );

      if (settings.authorizationStatus == AuthorizationStatus.authorized ||
          settings.authorizationStatus == AuthorizationStatus.provisional) {
        // Get FCM token (but don't store yet - wait for auth)
        await _getToken();

        // Listen for token refresh
        _messaging.onTokenRefresh.listen(_onTokenRefresh);

        // Listen for auth state changes to handle token storage/deletion
        _authSubscription = _auth.authStateChanges().listen(_onAuthStateChanged);

        // Configure foreground message handling
        FirebaseMessaging.onMessage.listen(_onForegroundMessage);

        // Handle notification tap when app is in background/terminated
        FirebaseMessaging.onMessageOpenedApp.listen(_onMessageOpenedApp);

        // Check if app was opened from a notification
        final initialMessage = await _messaging.getInitialMessage();
        if (initialMessage != null) {
          _handleNotificationTap(initialMessage);
        }

        developer.log('Messaging initialized successfully', name: 'MessagingService');
      } else {
        developer.log(
          'Notification permission denied: ${settings.authorizationStatus}',
          name: 'MessagingService',
        );
      }
    } catch (e) {
      developer.log('Error initializing messaging: $e', name: 'MessagingService', error: e);
    }
  }

  /// Initialize flutter_local_notifications
  Future<void> _initializeLocalNotifications() async {
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );

    const initSettings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _localNotifications.initialize(
      initSettings,
      onDidReceiveNotificationResponse: _onNotificationTap,
    );

    // Create Android notification channel
    if (Platform.isAndroid) {
      await _localNotifications
          .resolvePlatformSpecificImplementation<
              AndroidFlutterLocalNotificationsPlugin>()
          ?.createNotificationChannel(
            const AndroidNotificationChannel(
              'high_importance_channel',
              'High Importance Notifications',
              description: 'Channel for important notifications',
              importance: Importance.high,
            ),
          );
    }
  }

  /// Handle local notification tap
  void _onNotificationTap(NotificationResponse response) {
    developer.log('Local notification tapped: ${response.payload}', name: 'MessagingService');
  }

  /// Handle auth state changes - store token on login, delete on logout
  void _onAuthStateChanged(User? user) {
    if (user != null && _currentToken != null) {
      // User logged in - store token
      developer.log('User logged in, storing FCM token', name: 'MessagingService');
      _storeToken(_currentToken!);
    } else if (user == null) {
      // User logged out - delete token from Firestore
      developer.log('User logged out, deleting FCM token', name: 'MessagingService');
      _deleteTokenFromFirestore();
    }
  }

  /// Get FCM token (without storing)
  Future<void> _getToken() async {
    try {
      final token = await _messaging.getToken();
      if (token != null) {
        _currentToken = token;
        developer.log('FCM Token: $token', name: 'MessagingService');
        
        // If user is already logged in, store immediately
        if (_auth.currentUser != null) {
          await _storeToken(token);
        }
      }
    } catch (e) {
      developer.log('Error getting FCM token: $e', name: 'MessagingService', error: e);
    }
  }

  /// Handle token refresh
  void _onTokenRefresh(String token) {
    developer.log('FCM Token refreshed: $token', name: 'MessagingService');
    _currentToken = token;
    
    // Only store if user is logged in
    if (_auth.currentUser != null) {
      _storeToken(token);
    }
  }

  /// Store FCM token in Firestore
  Future<void> _storeToken(String token) async {
    final userId = _auth.currentUser?.uid;
    if (userId == null) {
      developer.log('Cannot store token: user not authenticated', name: 'MessagingService');
      return;
    }

    try {
      // Use token as document ID to prevent duplicates
      await _firestore.collection('fcmTokens').doc(token).set({
        'token': token,
        'userId': userId,
        'platform': _getPlatform(),
        'updatedAt': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true));

      developer.log('FCM token stored successfully', name: 'MessagingService');
    } catch (e) {
      developer.log('Error storing FCM token: $e', name: 'MessagingService', error: e);
    }
  }

  /// Get current platform string
  String _getPlatform() {
    if (kIsWeb) return 'web';
    if (Platform.isIOS) return 'ios';
    if (Platform.isAndroid) return 'android';
    return 'unknown';
  }

  /// Handle foreground messages
  void _onForegroundMessage(RemoteMessage message) {
    developer.log(
      'Foreground message received: ${message.notification?.title}',
      name: 'MessagingService',
    );

    _logMessageDetails(message);

    // Show local notification when app is in foreground
    final notification = message.notification;
    if (notification != null) {
      _showLocalNotification(
        title: notification.title ?? 'Notification',
        body: notification.body ?? '',
        payload: message.data.toString(),
        messageId: message.messageId,
      );
    }
  }

  /// Show a local notification
  Future<void> _showLocalNotification({
    required String title,
    required String body,
    String? payload,
    String? messageId,
  }) async {
    const androidDetails = AndroidNotificationDetails(
      'high_importance_channel',
      'High Importance Notifications',
      channelDescription: 'Channel for important notifications',
      importance: Importance.high,
      priority: Priority.high,
      icon: '@mipmap/ic_launcher',
    );

    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    const details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    // Use message ID hash for unique notification ID, fallback to timestamp
    final notificationId = messageId?.hashCode ?? 
        DateTime.now().millisecondsSinceEpoch % 2147483647;

    await _localNotifications.show(
      notificationId,
      title,
      body,
      details,
      payload: payload,
    );
  }

  /// Handle notification tap when app is in background
  void _onMessageOpenedApp(RemoteMessage message) {
    developer.log(
      'Notification opened app: ${message.notification?.title}',
      name: 'MessagingService',
    );
    _handleNotificationTap(message);
  }

  /// Handle notification tap - navigate to relevant screen
  void _handleNotificationTap(RemoteMessage message) {
    final data = message.data;
    final projectId = data['projectId'];
    final stepId = data['stepId'];
    final type = data['type'];

    developer.log(
      'Notification tap - projectId: $projectId, stepId: $stepId, type: $type',
      name: 'MessagingService',
    );

    // TODO: Implement navigation to project/step
    // This requires access to NavigatorState or a navigation service
    // For now, just log the data
  }

  /// Log message details for debugging
  void _logMessageDetails(RemoteMessage message) {
    developer.log('Message ID: ${message.messageId}', name: 'MessagingService');
    developer.log('Title: ${message.notification?.title}', name: 'MessagingService');
    developer.log('Body: ${message.notification?.body}', name: 'MessagingService');
    developer.log('Data: ${message.data}', name: 'MessagingService');
  }

  /// Delete token from Firestore only (called on logout)
  Future<void> _deleteTokenFromFirestore() async {
    if (_currentToken != null) {
      try {
        await _firestore.collection('fcmTokens').doc(_currentToken).delete();
        developer.log('FCM token deleted from Firestore', name: 'MessagingService');
      } catch (e) {
        developer.log('Error deleting FCM token from Firestore: $e', name: 'MessagingService', error: e);
      }
    }
  }

  /// Delete token completely (from Firestore and Firebase Messaging)
  Future<void> deleteToken() async {
    if (_currentToken != null) {
      try {
        // Delete from Firestore
        await _firestore.collection('fcmTokens').doc(_currentToken).delete();
        // Delete from Firebase Messaging
        await _messaging.deleteToken();
        _currentToken = null;
        developer.log('FCM token deleted', name: 'MessagingService');
      } catch (e) {
        developer.log('Error deleting FCM token: $e', name: 'MessagingService', error: e);
      }
    }
  }

  /// Clean up subscriptions
  void dispose() {
    _authSubscription?.cancel();
  }

  /// Get current token (for debugging)
  String? get currentToken => _currentToken;
}

/// Background message handler - must be a top-level function
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // Initialize Firebase for this isolate
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);

  developer.log(
    'Background message received: ${message.notification?.title}',
    name: 'MessagingService',
  );
}
