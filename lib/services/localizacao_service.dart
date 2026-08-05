import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';

class LocalizacaoService {
  static const double _vitoriLat = -20.3155;
  static const double _vitoriaLng = -40.3128;

  /// Retorna localização real do GPS nativo.
  /// Sem intermediários, sem API externa, direto do hardware.
  /// Retorna null se GPS indisponível ou permissão negada.
  static Future<Position?> obterLocalizacao() async {
    try {
      // Verificar se serviço de localização está ativo
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        debugPrint('[GPS] Serviço de localização desativado no dispositivo');
        return null;
      }

      // Verificar/solicitar permissão
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        debugPrint('[GPS] Solicitando permissão de localização...');
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          debugPrint('[GPS] Permissão de localização negada pelo usuário');
          return null;
        }
      }
      if (permission == LocationPermission.deniedForever) {
        debugPrint('[GPS] Permissão negada permanentemente — redirecionar para configurações');
        return null;
      }

      debugPrint('[GPS] Permissão OK: $permission — buscando posição...');

      // FASE 1: Localização rápida (rede/WiFi) — resposta em ~3s
      try {
        final pos = await Geolocator.getCurrentPosition(
          locationSettings: const LocationSettings(
            accuracy: LocationAccuracy.low,
            timeLimit: Duration(seconds: 8),
          ),
        );
        debugPrint('[GPS] Fase 1 OK: ${pos.latitude}, ${pos.longitude} (accuracy: ${pos.accuracy}m)');
        return pos;
      } catch (e) {
        // Fase 1 falhou (timeout ou sem sinal) — tenta GPS preciso
        debugPrint('[GPS] Fase 1 falhou: $e — tentando GPS preciso...');
      }

      // FASE 2: GPS preciso (satélite) — resposta em até 30s
      try {
        final pos = await Geolocator.getCurrentPosition(
          locationSettings: const LocationSettings(
            accuracy: LocationAccuracy.high,
            timeLimit: Duration(seconds: 25),
          ),
        );
        debugPrint('[GPS] Fase 2 OK: ${pos.latitude}, ${pos.longitude} (accuracy: ${pos.accuracy}m)');
        return pos;
      } catch (e) {
        debugPrint('[GPS] Fase 2 falhou: $e — usando posição padrão');
        return null;
      }
    } catch (e) {
      debugPrint('[GPS] Erro inesperado: $e');
      return null;
    }
  }

  /// Stream de atualizações de localização em tempo real
  static Stream<Position> streamLocalizacao() {
    return Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 50, // Atualiza a cada 50 metros
      ),
    );
  }

  /// Posição padrão: Vitória/ES (placeholder até GPS chegar)
  static Map<String, double> get posicaoPadrao => {
        'lat': _vitoriLat,
        'lng': _vitoriaLng,
      };

  /// Calcula distância em km entre dois pontos
  static double calcularDistancia(
    double lat1, double lng1,
    double lat2, double lng2,
  ) {
    return Geolocator.distanceBetween(lat1, lng1, lat2, lng2) / 1000;
  }
}
