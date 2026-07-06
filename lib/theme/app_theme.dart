import 'package:flutter/material.dart';

class AppTheme {
  static const Color orange = Color(0xFFFF6D00);
  static const Color orangeDark = Color(0xFFE65100);
  static const Color orangeLight = Color(0xFFFFF3E0);
  static const Color black = Color(0xFF1A1A1A);
  static const Color grayDark = Color(0xFF444444);
  static const Color gray = Color(0xFF777777);
  static const Color grayLight = Color(0xFFBBBBBB);
  static const Color grayBg = Color(0xFFF5F5F5);
  static const Color white = Color(0xFFFFFFFF);
  static const Color green = Color(0xFF00C853);
  static const Color greenText = Color(0xFF2E7D32);
  static const Color greenBg = Color(0xFFE8F5E9);
  static const Color red = Color(0xFFE53935);
  static const Color redBg = Color(0xFFFFEBEE);
  static const Color blue = Color(0xFF1565C0);
  static const Color border = Color(0xFFE0E0E0);

  static ThemeData get theme => ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: orange,
          primary: orange,
          secondary: orangeDark,
          surface: white,
          background: grayBg,
        ),
        fontFamily: 'Roboto',
        appBarTheme: const AppBarTheme(
          backgroundColor: white,
          foregroundColor: black,
          elevation: 0,
          centerTitle: false,
          titleTextStyle: TextStyle(
            color: black,
            fontSize: 20,
            fontWeight: FontWeight.w900,
            letterSpacing: -0.5,
          ),
        ),
        scaffoldBackgroundColor: grayBg,
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: orange,
            foregroundColor: white,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: grayBg,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: border),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: border),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: orange, width: 2),
          ),
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        ),
        cardTheme: CardThemeData(
          color: white,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: border),
          ),
        ),
      );
}
