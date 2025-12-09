import 'package:flutter/material.dart';

/// Represents a navigation destination parsed from a notification payload
class NavigationDestination {
  final String route;
  final Map<String, String> params;

  const NavigationDestination({
    required this.route,
    this.params = const {},
  });

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is NavigationDestination &&
          runtimeType == other.runtimeType &&
          route == other.route &&
          _mapsEqual(params, other.params);

  @override
  int get hashCode => route.hashCode ^ params.hashCode;

  static bool _mapsEqual(Map<String, String> a, Map<String, String> b) {
    if (a.length != b.length) return false;
    for (final key in a.keys) {
      if (a[key] != b[key]) return false;
    }
    return true;
  }

  @override
  String toString() => 'NavigationDestination(route: $route, params: $params)';
}

/// Route constants
class Routes {
  static const String projectList = '/projects';
  static const String projectDetail = '/project';

  Routes._();
}

/// Notification type constants (matches backend)
class NotificationType {
  static const String projectCreated = 'project_created';
  static const String stepCompleted = 'step_completed';
  static const String manualActionRequired = 'manual_action_required';

  NotificationType._();
}

/// Service for handling navigation, especially from notification payloads
class NavigationService {
  static final NavigationService _instance = NavigationService._internal();
  factory NavigationService() => _instance;
  NavigationService._internal();

  /// Global navigator key for navigation without context
  final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

  /// Parse a notification payload and return the appropriate destination
  ///
  /// Returns null if the payload doesn't contain enough info to navigate
  NavigationDestination? getDestinationForPayload(Map<String, dynamic> payload) {
    final projectId = payload['projectId'] as String?;
    final type = payload['type'] as String?;

    // If no projectId, we can't navigate anywhere meaningful
    if (projectId == null || projectId.isEmpty) {
      return null;
    }

    switch (type) {
      case NotificationType.projectCreated:
        // Navigate to the newly created project
        return NavigationDestination(
          route: Routes.projectDetail,
          params: {'projectId': projectId},
        );

      case NotificationType.stepCompleted:
      case NotificationType.manualActionRequired:
        // Navigate to project detail (step context is within the project)
        final stepId = payload['stepId'] as String?;
        return NavigationDestination(
          route: Routes.projectDetail,
          params: {
            'projectId': projectId,
            if (stepId != null && stepId.isNotEmpty) 'stepId': stepId,
          },
        );

      default:
        // Unknown type but has projectId - navigate to project
        if (projectId.isNotEmpty) {
          return NavigationDestination(
            route: Routes.projectDetail,
            params: {'projectId': projectId},
          );
        }
        return null;
    }
  }

  /// Navigate to a destination
  ///
  /// Returns true if navigation was successful
  Future<bool> navigateTo(NavigationDestination destination) async {
    final navigator = navigatorKey.currentState;
    if (navigator == null) {
      return false;
    }

    switch (destination.route) {
      case Routes.projectDetail:
        final projectId = destination.params['projectId'];
        if (projectId == null) return false;

        // Push to project detail
        // Note: In a real implementation, you'd fetch the project first
        // or use a route that can load by ID
        navigator.pushNamed(
          Routes.projectDetail,
          arguments: {'projectId': projectId, ...destination.params},
        );
        return true;

      case Routes.projectList:
        navigator.pushNamedAndRemoveUntil(
          Routes.projectList,
          (route) => false,
        );
        return true;

      default:
        return false;
    }
  }

  /// Convenience method to handle a notification payload directly
  Future<bool> handleNotificationPayload(Map<String, dynamic> payload) async {
    final destination = getDestinationForPayload(payload);
    if (destination == null) return false;
    return navigateTo(destination);
  }
}
