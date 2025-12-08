import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('App Smoke Tests', () {
    testWidgets('MaterialApp builds without crashing', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          title: 'Project Manager',
          theme: ThemeData(
            colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
            useMaterial3: true,
          ),
          home: const Scaffold(
            body: Center(child: Text('Project Manager')),
          ),
        ),
      );

      expect(find.text('Project Manager'), findsOneWidget);
    });

    testWidgets('Theme uses Material 3', (WidgetTester tester) async {
      late ThemeData capturedTheme;

      await tester.pumpWidget(
        MaterialApp(
          theme: ThemeData(
            colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
            useMaterial3: true,
          ),
          home: Builder(
            builder: (context) {
              capturedTheme = Theme.of(context);
              return const SizedBox();
            },
          ),
        ),
      );

      expect(capturedTheme.useMaterial3, isTrue);
    });
  });
}
