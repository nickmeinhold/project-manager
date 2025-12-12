import 'package:flutter/material.dart';
import '../models/project.dart';
import '../services/firebase_service.dart';
import 'project_detail_view.dart';

/// A wrapper view that loads a project by ID and displays ProjectDetailView
///
/// This is used for deep linking from push notifications where we only have
/// the project ID, not the full Project object.
class ProjectDetailWrapper extends StatefulWidget {
  final String projectId;
  final String? stepId;

  const ProjectDetailWrapper({
    super.key,
    required this.projectId,
    this.stepId,
  });

  @override
  State<ProjectDetailWrapper> createState() => _ProjectDetailWrapperState();
}

class _ProjectDetailWrapperState extends State<ProjectDetailWrapper> {
  final FirebaseService _firebaseService = FirebaseService();
  Project? _project;
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadProject();
  }

  Future<void> _loadProject() async {
    try {
      final project = await _firebaseService.getProject(widget.projectId);
      if (mounted) {
        setState(() {
          _project = project;
          _isLoading = false;
          if (project == null) {
            _error = 'Project not found';
          }
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _error = 'Error loading project: $e';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Loading...')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_error != null || _project == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Error')),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 64, color: Colors.red),
              const SizedBox(height: 16),
              Text(
                _error ?? 'Project not found',
                style: const TextStyle(fontSize: 16),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('Go Back'),
              ),
            ],
          ),
        ),
      );
    }

    return ProjectDetailView(project: _project!, initialStepId: widget.stepId);
  }
}
