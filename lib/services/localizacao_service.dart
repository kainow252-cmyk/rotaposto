import 'package:geolocator/geolocator.dart';

class LocalizacaoService {
  static const double _vitoriLat = -20.3155;
  static const double _vitoriaLng = -40.3128;

  /// Retorna localização real do GPS nativo.
  /// Sem intermediários, sem API externa, direto do hardware.
  static Future<Position?> obterLocalizacao() async {
    try {
      // Verificar se serviço de localização está ativo
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        return null;
      }

      // Verificar/solicitar permissão
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          return null;
        }
      }
      if (permission == LocationPermission.deniedForever) {
        return null;
      }

      // FASE 1: Localização rápida (rede/WiFi) — resposta em ~2s
      try {
        final pos = await Geolocator.getCurrentPosition(
          locationSettings: const LocationSettings(
            accuracy: LocationAccuracy.low,
            timeLimit: Duration(seconds: 5),
          ),
        );
        return pos;
      } catch (_) {
        // Se fase 1 falhar, tenta fase 2
      }

      // FASE 2: GPS preciso (satélite) — resposta em até 30s
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 30),
        ),
      );
      return pos;
    } catch (e) {
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
