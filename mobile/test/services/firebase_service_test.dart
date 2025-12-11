import 'package:flutter_test/flutter_test.dart';
import 'package:project_manager_flutter/services/firebase_service.dart';

void main() {
  group('FirebaseService', () {
    group('CreateStepInput', () {
      test('creates with required parameters', () {
        final input = CreateStepInput(
          title: 'Test Step',
          description: 'Test description',
          automatable: true,
        );

        expect(input.title, 'Test Step');
        expect(input.description, 'Test description');
        expect(input.automatable, isTrue);
      });

      test('creates with automatable false', () {
        final input = CreateStepInput(
          title: 'Manual Step',
          description: 'Requires manual work',
          automatable: false,
        );

        expect(input.automatable, isFalse);
      });

      test('handles empty strings', () {
        final input = CreateStepInput(
          title: '',
          description: '',
          automatable: false,
        );

        expect(input.title, isEmpty);
        expect(input.description, isEmpty);
      });
    });
  });
}
