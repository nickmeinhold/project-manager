import 'package:cloud_firestore/cloud_firestore.dart';

enum NotificationType {
  stepCompleted,
  stepFailed,
  manualActionRequired;

  String toFirestore() {
    switch (this) {
      case NotificationType.stepCompleted:
        return 'step_completed';
      case NotificationType.stepFailed:
        return 'step_failed';
      case NotificationType.manualActionRequired:
        return 'manual_action_required';
    }
  }

  static NotificationType fromFirestore(String value) {
    switch (value) {
      case 'step_completed':
        return NotificationType.stepCompleted;
      case 'step_failed':
        return NotificationType.stepFailed;
      case 'manual_action_required':
        return NotificationType.manualActionRequired;
      default:
        return NotificationType.manualActionRequired;
    }
  }
}

class ProjectNotification {
  final String id;
  final String projectId;
  final String stepId;
  final String title;
  final String body;
  final NotificationType type;
  final Timestamp createdAt;
  final bool read;

  ProjectNotification({
    required this.id,
    required this.projectId,
    required this.stepId,
    required this.title,
    required this.body,
    required this.type,
    required this.createdAt,
    required this.read,
  });

  factory ProjectNotification.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return ProjectNotification(
      id: doc.id,
      projectId: data['projectId'] ?? '',
      stepId: data['stepId'] ?? '',
      title: data['title'] ?? '',
      body: data['body'] ?? '',
      type: NotificationType.fromFirestore(data['type'] ?? 'manual_action_required'),
      createdAt: data['createdAt'] ?? Timestamp.now(),
      read: data['read'] ?? false,
    );
  }

  Map<String, dynamic> toFirestore() {
    return {
      'projectId': projectId,
      'stepId': stepId,
      'title': title,
      'body': body,
      'type': type.toFirestore(),
      'createdAt': createdAt,
      'read': read,
    };
  }
}
