import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../models/posto.dart';

class PostosService {
  // API real do RotaPosto — chamada direta, sem intermediários, sem WebView
  static const String _baseUrl = 'https://rotaposto.com.br';

  /// Busca postos próximos usando a API real do RotaPosto
  static Future<List<Posto>> buscarPostosProximos({
    required double lat,
    required double lng,
    double raioKm = 10.0,
    String combustivel = 'gasolina',
  }) async {
    final uri = Uri.parse('$_baseUrl/api/postos').replace(
      queryParameters: {
        'lat': lat.toString(),
        'lng': lng.toString(),
        'raio': raioKm.toStringAsFixed(0),
        'combustivel': combustivel,
      },
    );

    debugPrint('[API] GET $uri');

    try {
      final res = await http.get(
        uri,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'RotaPosto-App/2.1.7',
        },
      ).timeout(const Duration(seconds: 20));

      debugPrint('[API] Status: ${res.statusCode} | Bytes: ${res.bodyBytes.length}');

      if (res.statusCode == 200) {
        final data = json.decode(res.body);

        // A API pode retornar lista direta ou objeto com campo 'postos'
        List<dynamic> lista;
        if (data is List) {
          lista = data;
        } else if (data is Map && data.containsKey('postos')) {
          lista = data['postos'] as List<dynamic>? ?? [];
        } else if (data is Map && data.containsKey('data')) {
          lista = data['data'] as List<dynamic>? ?? [];
        } else {
          lista = [];
        }

        debugPrint('[API] Total postos recebidos: ${lista.length}');

        final postos = lista
            .map((j) => _parsePosto(j as Map<String, dynamic>, lat, lng))
            .where((p) => p != null)
            .cast<Posto>()
            .toList();

        debugPrint('[API] Postos parseados com sucesso: ${postos.length}');

        // Ordenar por preço do combustível selecionado
        postos.sort((a, b) {
          final pa = a.precos.getPorTipo(combustivel) ?? 999.0;
          final pb = b.precos.getPorTipo(combustivel) ?? 999.0;
          return pa.compareTo(pb);
        });

        return postos;
      } else {
        debugPrint('[API] Erro HTTP ${res.statusCode}: ${res.body.substring(0, res.body.length.clamp(0, 200))}');
        throw PostosException('Servidor retornou erro ${res.statusCode}. Tente novamente.');
      }
    } on SocketException catch (e) {
      debugPrint('[API] Sem conexão de rede: $e');
      throw const PostosException('Sem conexão com a internet. Verifique seu Wi-Fi ou dados móveis.');
    } on HttpException catch (e) {
      debugPrint('[API] Erro HTTP: $e');
      throw const PostosException('Erro de conexão com o servidor. Tente novamente.');
    } on FormatException catch (e) {
      debugPrint('[API] Erro ao parsear JSON: $e');
      throw const PostosException('Erro ao processar dados do servidor. Tente novamente.');
    } catch (e) {
      debugPrint('[API] Erro inesperado: $e');
      if (e is PostosException) rethrow;
      // TimeoutException ou outro
      if (e.toString().contains('TimeoutException') || e.toString().contains('timeout')) {
        throw const PostosException('Servidor demorou muito para responder. Verifique sua conexão.');
      }
      throw const PostosException('Não foi possível carregar os postos. Tente novamente.');
    }
  }

  /// Tenta parsear um posto do JSON da API real do RotaPosto
  static Posto? _parsePosto(
      Map<String, dynamic> json, double userLat, double userLng) {
    try {
      final id = json['id']?.toString() ??
          json['cnpj']?.toString() ??
          json['codigo']?.toString() ??
          '';
      final nome = json['nome'] as String? ??
          json['razaoSocial'] as String? ??
          json['nome_fantasia'] as String? ??
          'Posto de Combustível';
      final bandeira = json['bandeira'] as String? ??
          json['distribuidora'] as String? ??
          'Independente';
      final endereco = json['endereco'] as String? ??
          json['logradouro'] as String? ??
          json['rua'] as String? ??
          '';
      final bairro =
          json['bairro'] as String? ?? json['neighborhood'] as String?;
      final cidade = json['cidade'] as String? ??
          json['municipio'] as String? ??
          json['city'] as String? ??
          '';
      final estado = json['estado'] as String? ??
          json['uf'] as String? ??
          json['state'] as String? ??
          '';
      final cep = json['cep'] as String? ?? json['postalCode'] as String?;

      // Coordenadas
      final lat = (json['lat'] as num?)?.toDouble() ??
          (json['latitude'] as num?)?.toDouble() ??
          (json['geo']?['lat'] as num?)?.toDouble();
      final lng = (json['lng'] as num?)?.toDouble() ??
          (json['longitude'] as num?)?.toDouble() ??
          (json['lon'] as num?)?.toDouble() ??
          (json['geo']?['lng'] as num?)?.toDouble();

      if (lat == null || lng == null) return null;

      // Preços
      final precosJson = json['precos'] as Map<String, dynamic>? ??
          json['combustiveis'] as Map<String, dynamic>? ??
          {};
      final precos = Preco.fromJson(precosJson);

      final atualizadoEm = json['atualizadoEm'] as String? ??
          json['updatedAt'] as String? ??
          json['dataColeta'] as String? ??
          '';
      final rating = (json['rating'] as num?)?.toDouble() ??
          (json['avaliacao'] as num?)?.toDouble();
      final aberto = json['aberto'] as bool? ?? json['ativo'] as bool?;

      final posto = Posto(
        id: id.isNotEmpty ? id : '${lat}_$lng',
        nome: nome,
        bandeira: _normalizarBandeira(bandeira),
        endereco: endereco,
        bairro: bairro,
        cidade: cidade,
        estado: estado,
        cep: cep,
        lat: lat,
        lng: lng,
        precos: precos,
        atualizadoEm: atualizadoEm,
        fontePreco: 'rotaposto',
        rating: rating,
        totalAvaliacoes: json['totalAvaliacoes'] as int? ??
            json['numAvaliacoes'] as int?,
        telefone: json['telefone'] as String? ?? json['phone'] as String?,
        aberto: aberto,
        fotoUrl: json['fotoUrl'] as String? ?? json['foto'] as String?,
      );

      return posto;
    } catch (e) {
      debugPrint('[PARSE] Erro ao parsear posto: $e');
      return null;
    }
  }

  static String _normalizarBandeira(String bandeira) {
    final s = bandeira.toUpperCase();
    if (s.contains('PETROBRAS') || s == 'BR' || s.contains('VIBRA')) {
      return 'BR';
    }
    if (s.contains('IPIRANGA')) return 'Ipiranga';
    if (s.contains('SHELL') || s.contains('RAIZEN') || s.contains('RAÍZEN')) {
      return 'Shell';
    }
    if (s.contains('ESSO')) return 'Esso';
    if (s.contains('ALE') || s.contains('ALÉ')) return 'Ale';
    if (s.contains('ULTRAGAZ') || s.contains('ULTRA')) return 'Ultragaz';
    return bandeira.isNotEmpty ? bandeira : 'Independente';
  }

  /// Busca postos por cidade (busca textual)
  static Future<List<Posto>> buscarPorCidade({
    required String uf,
    required String municipio,
  }) async {
    try {
      final uri = Uri.parse('$_baseUrl/api/postos').replace(
        queryParameters: {
          'uf': uf,
          'municipio': municipio,
          'combustivel': 'gasolina',
        },
      );
      final res = await http
          .get(uri, headers: {
            'Accept': 'application/json',
            'User-Agent': 'RotaPosto-App/2.1.7',
          })
          .timeout(const Duration(seconds: 20));
      if (res.statusCode == 200) {
        final data = json.decode(res.body);
        List<dynamic> lista;
        if (data is List) {
          lista = data;
        } else if (data is Map) {
          lista = (data['postos'] ?? data['data'] ?? []) as List<dynamic>;
        } else {
          lista = [];
        }
        return lista
            .map((j) => _parsePosto(j as Map<String, dynamic>, 0, 0))
            .where((p) => p != null)
            .cast<Posto>()
            .toList();
      }
    } catch (_) {}
    return [];
  }
}

/// Exceção específica do serviço de postos com mensagem amigável
class PostosException implements Exception {
  final String message;
  const PostosException(this.message);

  @override
  String toString() => message;
}
