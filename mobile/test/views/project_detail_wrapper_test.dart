import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:project_manager_flutter/views/project_detail_wrapper.dart';

void main() {
  group('ProjectDetailWrapper', () {
    test('widget accepts projectId parameter', () {
      // Verify the widget can be constructed with required parameters
      const wrapper = ProjectDetailWrapper(projectId: 'test-project-id');
      expect(wrapper.projectId, 'test-project-id');
      expect(wrapper.stepId, isNull);
    });

    test('widget accepts optional stepId parameter', () {
      const wrapper = ProjectDetailWrapper(
        projectId: 'test-project-id',
        stepId: 'test-step-id',
      );
      expect(wrapper.projectId, 'test-project-id');
      expect(wrapper.stepId, 'test-step-id');
    });

    test('widget key is optional', () {
      const wrapper1 = ProjectDetailWrapper(projectId: 'id1');
      const wrapper2 = ProjectDetailWrapper(projectId: 'id2', key: Key('custom'));

      expect(wrapper1.key, isNull);
      expect(wrapper2.key, const Key('custom'));
    });
  });
}
