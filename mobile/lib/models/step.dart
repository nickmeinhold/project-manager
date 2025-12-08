import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';

enum StepStatus {
  pending,
  inProgress,
  completed,
  failed;

  String get displayName {
    switch (this) {
      case StepStatus.pending:
        return 'Pending';
      case StepStatus.inProgress:
        return 'In Progress';
      case StepStatus.completed:
        return 'Completed';
      case StepStatus.failed:
        return 'Failed';
    }
  }

  Color get color {
    switch (this) {
      case StepStatus.pending:
        return Colors.grey;
      case StepStatus.inProgress:
        return Colors.orange;
      case StepStatus.completed:
        return Colors.green;
      case StepStatus.failed:
        return Colors.red;
    }
  }

  String toFirestore() {
    switch (this) {
      case StepStatus.pending:
        return 'pending';
      case StepStatus.inProgress:
        return 'in_progress';
      case StepStatus.completed:
        return 'completed';
      case StepStatus.failed:
        return 'failed';
    }
  }

  static StepStatus fromFirestore(String value) {
    switch (value) {
      case 'pending':
        return StepStatus.pending;
      case 'in_progress':
        return StepStatus.inProgress;
      case 'completed':
        return StepStatus.completed;
      case 'failed':
        return StepStatus.failed;
      default:
        return StepStatus.pending;
    }
  }
}

class Step {
  final String id;
  final String projectId;
  final String title;
  final String description;
  final StepStatus status;
  final int order;
  final bool automatable;
  final bool automationAttempted;
  final String? automationResult;
  final Timestamp createdAt;
  final Timestamp updatedAt;
  final Timestamp? completedAt;

  Step({
    required this.id,
    required this.projectId,
    required this.title,
    required this.description,
    required this.status,
    required this.order,
    required this.automatable,
    required this.automationAttempted,
    this.automationResult,
    required this.createdAt,
    required this.updatedAt,
    this.completedAt,
  });

  factory Step.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return Step(
      id: doc.id,
      projectId: data['projectId'] ?? '',
      title: data['title'] ?? '',
      description: data['description'] ?? '',
      status: StepStatus.fromFirestore(data['status'] ?? 'pending'),
      order: data['order'] ?? 0,
      automatable: data['automatable'] ?? false,
      automationAttempted: data['automationAttempted'] ?? false,
      automationResult: data['automationResult'],
      createdAt: data['createdAt'] ?? Timestamp.now(),
      updatedAt: data['updatedAt'] ?? Timestamp.now(),
      completedAt: data['completedAt'],
    );
  }

  Map<String, dynamic> toFirestore() {
    return {
      'projectId': projectId,
      'title': title,
      'description': description,
      'status': status.toFirestore(),
      'order': order,
      'automatable': automatable,
      'automationAttempted': automationAttempted,
      'automationResult': automationResult,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
      'completedAt': completedAt,
    };
  }
}
