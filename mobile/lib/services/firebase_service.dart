import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../models/project.dart';
import '../models/step.dart' as model;
import '../models/notification.dart';

class FirebaseService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;

  Stream<List<Project>> getProjects() {
    final userId = _auth.currentUser?.uid;
    if (userId == null) {
      return Stream.value([]);
    }

    return _firestore
        .collection('projects')
        .where('userId', isEqualTo: userId)
        .orderBy('updatedAt', descending: true)
        .snapshots()
        .map((snapshot) => snapshot.docs.map((doc) => Project.fromFirestore(doc)).toList());
  }

  Stream<List<model.Step>> getSteps(String projectId) {
    return _firestore
        .collection('projects')
        .doc(projectId)
        .collection('steps')
        .orderBy('order')
        .snapshots()
        .map((snapshot) => snapshot.docs.map((doc) => model.Step.fromFirestore(doc)).toList());
  }

  Future<void> createProject({
    required String title,
    required String description,
    required List<CreateStepInput> steps,
  }) async {
    final userId = _auth.currentUser?.uid;
    if (userId == null) {
      throw Exception('User must be authenticated to create a project');
    }

    final batch = _firestore.batch();
    final now = Timestamp.now();

    final projectRef = _firestore.collection('projects').doc();
    batch.set(projectRef, {
      'userId': userId,
      'title': title,
      'description': description,
      'status': ProjectStatus.active.name,
      'createdAt': now,
      'updatedAt': now,
      'currentStepIndex': 0,
      'totalSteps': steps.length,
    });

    for (int i = 0; i < steps.length; i++) {
      final stepRef = projectRef.collection('steps').doc();
      batch.set(stepRef, {
        'projectId': projectRef.id,
        'title': steps[i].title,
        'description': steps[i].description,
        'status': 'pending',
        'order': i,
        'automatable': steps[i].automatable,
        'automationAttempted': false,
        'createdAt': now,
        'updatedAt': now,
      });
    }

    await batch.commit();
  }

  Future<void> updateStep({
    required String projectId,
    required String stepId,
    model.StepStatus? status,
    bool? automationAttempted,
    String? automationResult,
  }) async {
    final Map<String, dynamic> updates = {
      'updatedAt': Timestamp.now(),
    };

    if (status != null) {
      updates['status'] = status.toFirestore();
      if (status == model.StepStatus.completed) {
        updates['completedAt'] = Timestamp.now();
      }
    }

    if (automationAttempted != null) {
      updates['automationAttempted'] = automationAttempted;
    }

    if (automationResult != null) {
      updates['automationResult'] = automationResult;
    }

    await _firestore
        .collection('projects')
        .doc(projectId)
        .collection('steps')
        .doc(stepId)
        .update(updates);
  }

  Future<void> updateProject({
    required String projectId,
    ProjectStatus? status,
    int? currentStepIndex,
  }) async {
    final Map<String, dynamic> updates = {
      'updatedAt': Timestamp.now(),
    };

    if (status != null) {
      updates['status'] = status.name;
    }

    if (currentStepIndex != null) {
      updates['currentStepIndex'] = currentStepIndex;
    }

    await _firestore.collection('projects').doc(projectId).update(updates);
  }

  Stream<List<ProjectNotification>> getNotifications() {
    final userId = _auth.currentUser?.uid;
    if (userId == null) {
      return Stream.value([]);
    }

    return _firestore
        .collection('notifications')
        .where('userId', isEqualTo: userId)
        .orderBy('createdAt', descending: true)
        .limit(50)
        .snapshots()
        .map((snapshot) =>
            snapshot.docs.map((doc) => ProjectNotification.fromFirestore(doc)).toList());
  }

  Future<void> markNotificationAsRead(String notificationId) async {
    await _firestore.collection('notifications').doc(notificationId).update({
      'read': true,
    });
  }
}

class CreateStepInput {
  final String title;
  final String description;
  final bool automatable;

  CreateStepInput({
    required this.title,
    required this.description,
    required this.automatable,
  });
}
