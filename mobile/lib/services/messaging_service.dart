import 'dart:developer' as developer;
import 'dart:io';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

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
        // Get and store FCM token
        await _getAndStoreToken();

        // Listen for token refresh
        _messaging.onTokenRefresh.listen(_onTokenRefresh);

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

  /// Get FCM token and store in Firestore
  Future<void> _getAndStoreToken() async {
    try {
      final token = await _messaging.getToken();
      if (token != null) {
        _currentToken = token;
        developer.log('FCM Token: $token', name: 'MessagingService');
        await _storeToken(token);
      }
    } catch (e) {
      developer.log('Error getting FCM token: $e', name: 'MessagingService', error: e);
    }
  }

  /// Handle token refresh
  void _onTokenRefresh(String token) {
    developer.log('FCM Token refreshed: $token', name: 'MessagingService');
    _currentToken = token;
    _storeToken(token);
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
      );
    }
  }

  /// Show a local notification
  Future<void> _showLocalNotification({
    required String title,
    required String body,
    String? payload,
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

    await _localNotifications.show(
      DateTime.now().millisecondsSinceEpoch ~/ 1000,
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

  /// Delete token (call on logout)
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

  /// Re-register token after login
  Future<void> registerTokenForUser() async {
    await _getAndStoreToken();
  }

  /// Get current token (for debugging)
  String? get currentToken => _currentToken;
}

/// Background message handler - must be a top-level function
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  developer.log(
    'Background message received: ${message.notification?.title}',
    name: 'MessagingService',
  );
  // Handle background message if needed
  // Note: This runs in a separate isolate, so you can't access app state
}
