import 'package:cloud_firestore/cloud_firestore.dart';

enum ProjectStatus {
  active,
  completed,
  paused;

  String get displayName {
    switch (this) {
      case ProjectStatus.active:
        return 'Active';
      case ProjectStatus.completed:
        return 'Completed';
      case ProjectStatus.paused:
        return 'Paused';
    }
  }
}

class Project {
  final String id;
  final String title;
  final String description;
  final ProjectStatus status;
  final Timestamp createdAt;
  final Timestamp updatedAt;
  final int currentStepIndex;
  final int totalSteps;

  Project({
    required this.id,
    required this.title,
    required this.description,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
    required this.currentStepIndex,
    required this.totalSteps,
  });

  double get progress {
    if (totalSteps == 0) return 0;
    return currentStepIndex / totalSteps;
  }

  String get progressText {
    return '$currentStepIndex of $totalSteps steps completed';
  }

  factory Project.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return Project(
      id: doc.id,
      title: data['title'] ?? '',
      description: data['description'] ?? '',
      status: ProjectStatus.values.firstWhere(
        (e) => e.name == data['status'],
        orElse: () => ProjectStatus.active,
      ),
      createdAt: data['createdAt'] ?? Timestamp.now(),
      updatedAt: data['updatedAt'] ?? Timestamp.now(),
      currentStepIndex: data['currentStepIndex'] ?? 0,
      totalSteps: data['totalSteps'] ?? 0,
    );
  }

  Map<String, dynamic> toFirestore() {
    return {
      'title': title,
      'description': description,
      'status': status.name,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
      'currentStepIndex': currentStepIndex,
      'totalSteps': totalSteps,
    };
  }
}
