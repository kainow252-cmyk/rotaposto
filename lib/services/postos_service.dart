import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/posto.dart';

class PostosService {
  static const String _baseUrl = 'https://c36ea0a3-6990-42af-8958-614cfa583082.vip.gensparksite.com';
  static const String _googleApiKey = 'AIzaSyBuPqI-hxHV33dqYbVC2G3LrM5uTCVol-8';

  /// Busca postos próximos usando a API do backend RotaPosto
  static Future<List<Posto>> buscarPostosProximos({
    required double lat,
    required double lng,
    double raioKm = 5.0,
    String combustivel = 'gasolina',
  }) async {
    try {
      final uri = Uri.parse('$_baseUrl/api/postos/proximos').replace(
        queryParameters: {
          'lat': lat.toString(),
          'lng': lng.toString(),
          'raio': (raioKm * 1000).toStringAsFixed(0),
          'combustivel': combustivel,
        },
      );

      final res = await http.get(uri, headers: {'Accept': 'application/json'})
          .timeout(const Duration(seconds: 15));

      if (res.statusCode == 200) {
        final data = json.decode(res.body) as Map<String, dynamic>;
        final lista = data['postos'] as List<dynamic>? ?? [];
        return lista.map((j) => Posto.fromJson(j as Map<String, dynamic>)).toList();
      }
    } catch (_) {}

    // Fallback: buscar via Google Places diretamente
    return _buscarViaGooglePlaces(lat: lat, lng: lng, raioKm: raioKm);
  }

  /// Fallback: Google Places API diretamente
  static Future<List<Posto>> _buscarViaGooglePlaces({
    required double lat,
    required double lng,
    double raioKm = 5.0,
  }) async {
    try {
      final uri = Uri.parse('https://places.googleapis.com/v1/places:searchNearby');
      final body = {
        'includedTypes': ['gas_station'],
        'maxResultCount': 20,
        'locationRestriction': {
          'circle': {
            'center': {'latitude': lat, 'longitude': lng},
            'radius': raioKm * 1000,
          },
        },
        'rankPreference': 'DISTANCE',
      };

      final res = await http.post(
        uri,
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': _googleApiKey,
          'X-Goog-FieldMask':
              'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.currentOpeningHours,places.businessStatus,places.addressComponents',
          'Accept-Language': 'pt-BR',
        },
        body: json.encode(body),
      ).timeout(const Duration(seconds: 10));

      if (res.statusCode == 200) {
        final data = json.decode(res.body) as Map<String, dynamic>;
        final places = data['places'] as List<dynamic>? ?? [];
        return places.map((p) => _parsePlaceToPost(p as Map<String, dynamic>)).toList();
      }
    } catch (_) {}
    return [];
  }

  static Posto _parsePlaceToPost(Map<String, dynamic> place) {
    final components = place['addressComponents'] as List<dynamic>? ?? [];
    String getComp(String type) {
      for (final c in components) {
        final types = c['types'] as List<dynamic>? ?? [];
        if (types.contains(type)) return c['longText'] as String? ?? '';
      }
      return '';
    }
    String getCompShort(String type) {
      for (final c in components) {
        final types = c['types'] as List<dynamic>? ?? [];
        if (types.contains(type)) return c['shortText'] as String? ?? '';
      }
      return '';
    }

    final nome = (place['displayName'] as Map?)?.containsKey('text') == true
        ? place['displayName']['text'] as String
        : 'Posto de Combustível';
    final rua = getComp('route');
    final numero = getComp('street_number');
    final bairro = getComp('sublocality_level_1');
    final cidade = getComp('administrative_area_level_2');
    final uf = getCompShort('administrative_area_level_1');
    final cep = getComp('postal_code');
    final loc = place['location'] as Map<String, dynamic>?;

    return Posto(
      id: 'google-${place['id']}',
      nome: nome,
      bandeira: _normalizarBandeira(nome),
      endereco: [rua, numero].where((s) => s.isNotEmpty).join(', '),
      bairro: bairro.isNotEmpty ? bairro : null,
      cidade: cidade,
      estado: uf,
      cep: cep.isNotEmpty ? cep : null,
      lat: (loc?['latitude'] as num?)?.toDouble() ?? 0,
      lng: (loc?['longitude'] as num?)?.toDouble() ?? 0,
      precos: const Preco(),
      atualizadoEm: DateTime.now().toIso8601String().split('T')[0],
      fontePreco: 'estimado',
      rating: (place['rating'] as num?)?.toDouble(),
      totalAvaliacoes: place['userRatingCount'] as int?,
      aberto: (place['currentOpeningHours'] as Map?)?['openNow'] as bool?,
    );
  }

  static String _normalizarBandeira(String nome) {
    final s = nome.toUpperCase();
    if (s.contains('PETROBRAS') || s.contains('BR ') || s.contains('VIBRA')) return 'BR';
    if (s.contains('IPIRANGA')) return 'Ipiranga';
    if (s.contains('SHELL')) return 'Shell';
    if (s.contains('RAIZEN') || s.contains('RAÍZEN')) return 'Raízen';
    if (s.contains('ESSO')) return 'Esso';
    if (s.contains('ALE') || s.contains('ALÉ')) return 'Ale';
    return 'Independente';
  }

  /// Busca postos por cidade via ANP
  static Future<List<Posto>> buscarPorCidade({
    required String uf,
    required String municipio,
  }) async {
    try {
      final uri = Uri.parse('$_baseUrl/api/postos/anp').replace(
        queryParameters: {'uf': uf, 'municipio': municipio},
      );
      final res = await http.get(uri).timeout(const Duration(seconds: 20));
      if (res.statusCode == 200) {
        final data = json.decode(res.body) as Map<String, dynamic>;
        final lista = data['postos'] as List<dynamic>? ?? [];
        return lista.map((j) => Posto.fromJson(j as Map<String, dynamic>)).toList();
      }
    } catch (_) {}
    return [];
  }
}
