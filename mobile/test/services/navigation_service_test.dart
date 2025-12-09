import 'package:flutter_test/flutter_test.dart';
import 'package:project_manager_flutter/services/navigation_service.dart';

void main() {
  late NavigationService navigationService;

  setUp(() {
    navigationService = NavigationService();
  });

  group('NavigationService', () {
    group('getDestinationForPayload', () {
      group('project_created notifications', () {
        test('navigates to project detail with projectId', () {
          final payload = {
            'projectId': 'abc123',
            'type': 'project_created',
          };

          final destination = navigationService.getDestinationForPayload(payload);

          expect(destination, isNotNull);
          expect(destination!.route, equals(Routes.projectDetail));
          expect(destination.params['projectId'], equals('abc123'));
        });

        test('returns null when projectId is missing', () {
          final payload = {
            'type': 'project_created',
          };

          final destination = navigationService.getDestinationForPayload(payload);

          expect(destination, isNull);
        });

        test('returns null when projectId is empty', () {
          final payload = {
            'projectId': '',
            'type': 'project_created',
          };

          final destination = navigationService.getDestinationForPayload(payload);

          expect(destination, isNull);
        });
      });

      group('step_completed notifications', () {
        test('navigates to project detail with projectId and stepId', () {
          final payload = {
            'projectId': 'project-456',
            'stepId': 'step-789',
            'type': 'step_completed',
          };

          final destination = navigationService.getDestinationForPayload(payload);

          expect(destination, isNotNull);
          expect(destination!.route, equals(Routes.projectDetail));
          expect(destination.params['projectId'], equals('project-456'));
          expect(destination.params['stepId'], equals('step-789'));
        });

        test('navigates without stepId when stepId is empty', () {
          final payload = {
            'projectId': 'project-456',
            'stepId': '',
            'type': 'step_completed',
          };

          final destination = navigationService.getDestinationForPayload(payload);

          expect(destination, isNotNull);
          expect(destination!.route, equals(Routes.projectDetail));
          expect(destination.params['projectId'], equals('project-456'));
          expect(destination.params.containsKey('stepId'), isFalse);
        });

        test('navigates without stepId when stepId is null', () {
          final payload = {
            'projectId': 'project-456',
            'type': 'step_completed',
          };

          final destination = navigationService.getDestinationForPayload(payload);

          expect(destination, isNotNull);
          expect(destination!.route, equals(Routes.projectDetail));
          expect(destination.params.containsKey('stepId'), isFalse);
        });
      });

      group('manual_action_required notifications', () {
        test('navigates to project detail with projectId and stepId', () {
          final payload = {
            'projectId': 'proj-111',
            'stepId': 'step-222',
            'type': 'manual_action_required',
          };

          final destination = navigationService.getDestinationForPayload(payload);

          expect(destination, isNotNull);
          expect(destination!.route, equals(Routes.projectDetail));
          expect(destination.params['projectId'], equals('proj-111'));
          expect(destination.params['stepId'], equals('step-222'));
        });
      });

      group('unknown notification types', () {
        test('navigates to project detail when projectId exists', () {
          final payload = {
            'projectId': 'unknown-project',
            'type': 'some_future_type',
          };

          final destination = navigationService.getDestinationForPayload(payload);

          expect(destination, isNotNull);
          expect(destination!.route, equals(Routes.projectDetail));
          expect(destination.params['projectId'], equals('unknown-project'));
        });

        test('navigates to project detail when type is null but projectId exists', () {
          final payload = {
            'projectId': 'no-type-project',
          };

          final destination = navigationService.getDestinationForPayload(payload);

          expect(destination, isNotNull);
          expect(destination!.route, equals(Routes.projectDetail));
          expect(destination.params['projectId'], equals('no-type-project'));
        });

        test('returns null when payload is empty', () {
          final payload = <String, dynamic>{};

          final destination = navigationService.getDestinationForPayload(payload);

          expect(destination, isNull);
        });
      });

      group('edge cases', () {
        test('handles payload with extra fields gracefully', () {
          final payload = {
            'projectId': 'abc',
            'stepId': 'def',
            'type': 'step_completed',
            'extraField': 'ignored',
            'anotherField': 123,
          };

          final destination = navigationService.getDestinationForPayload(payload);

          expect(destination, isNotNull);
          expect(destination!.route, equals(Routes.projectDetail));
          expect(destination.params['projectId'], equals('abc'));
          expect(destination.params['stepId'], equals('def'));
          // Extra fields should not be in params
          expect(destination.params.containsKey('extraField'), isFalse);
        });
      });
    });

    group('NavigationDestination equality', () {
      test('equal destinations are equal', () {
        const dest1 = NavigationDestination(
          route: '/project',
          params: {'projectId': 'abc'},
        );
        const dest2 = NavigationDestination(
          route: '/project',
          params: {'projectId': 'abc'},
        );

        expect(dest1, equals(dest2));
      });

      test('different routes are not equal', () {
        const dest1 = NavigationDestination(
          route: '/project',
          params: {'projectId': 'abc'},
        );
        const dest2 = NavigationDestination(
          route: '/projects',
          params: {'projectId': 'abc'},
        );

        expect(dest1, isNot(equals(dest2)));
      });

      test('different params are not equal', () {
        const dest1 = NavigationDestination(
          route: '/project',
          params: {'projectId': 'abc'},
        );
        const dest2 = NavigationDestination(
          route: '/project',
          params: {'projectId': 'xyz'},
        );

        expect(dest1, isNot(equals(dest2)));
      });
    });
  });
}
