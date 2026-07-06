class Preco {
  final double? gasolina;
  final double? gasolinaAditivada;
  final double? etanol;
  final double? diesel;
  final double? dieselS10;
  final double? gnv;
  final double? glp;

  const Preco({
    this.gasolina,
    this.gasolinaAditivada,
    this.etanol,
    this.diesel,
    this.dieselS10,
    this.gnv,
    this.glp,
  });

  factory Preco.fromJson(Map<String, dynamic> json) => Preco(
        gasolina: (json['gasolina'] as num?)?.toDouble(),
        gasolinaAditivada: (json['gasolinaAditivada'] as num?)?.toDouble(),
        etanol: (json['etanol'] as num?)?.toDouble(),
        diesel: (json['diesel'] as num?)?.toDouble(),
        dieselS10: (json['dieselS10'] as num?)?.toDouble(),
        gnv: (json['gnv'] as num?)?.toDouble(),
        glp: (json['glp'] as num?)?.toDouble(),
      );

  double? getPorTipo(String tipo) {
    switch (tipo) {
      case 'gasolina': return gasolina;
      case 'gasolinaAditivada': return gasolinaAditivada;
      case 'etanol': return etanol;
      case 'diesel': return diesel;
      case 'dieselS10': return dieselS10;
      case 'gnv': return gnv;
      case 'glp': return glp;
    }
    return null;
  }
}

class Posto {
  final String id;
  final String nome;
  final String bandeira;
  final String endereco;
  final String? bairro;
  final String cidade;
  final String estado;
  final String? cep;
  final double lat;
  final double lng;
  final Preco precos;
  final String atualizadoEm;
  final String? fontePreco;
  final double? rating;
  final int? totalAvaliacoes;
  final String? telefone;
  final bool? aberto;
  final String? fotoUrl;
  double? distanciaKm;

  Posto({
    required this.id,
    required this.nome,
    required this.bandeira,
    required this.endereco,
    this.bairro,
    required this.cidade,
    required this.estado,
    this.cep,
    required this.lat,
    required this.lng,
    required this.precos,
    required this.atualizadoEm,
    this.fontePreco,
    this.rating,
    this.totalAvaliacoes,
    this.telefone,
    this.aberto,
    this.fotoUrl,
    this.distanciaKm,
  });

  factory Posto.fromJson(Map<String, dynamic> json) => Posto(
        id: json['id'] as String,
        nome: json['nome'] as String,
        bandeira: json['bandeira'] as String? ?? 'Independente',
        endereco: json['endereco'] as String? ?? '',
        bairro: json['bairro'] as String?,
        cidade: json['cidade'] as String? ?? '',
        estado: json['estado'] as String? ?? '',
        cep: json['cep'] as String?,
        lat: (json['lat'] as num).toDouble(),
        lng: (json['lng'] as num).toDouble(),
        precos: Preco.fromJson(json['precos'] as Map<String, dynamic>? ?? {}),
        atualizadoEm: json['atualizadoEm'] as String? ?? '',
        fontePreco: json['fontePreco'] as String?,
        rating: (json['rating'] as num?)?.toDouble(),
        totalAvaliacoes: json['totalAvaliacoes'] as int?,
        telefone: json['telefone'] as String?,
        aberto: json['aberto'] as bool?,
        fotoUrl: json['fotoUrl'] as String?,
      );

  String get enderecoCompleto {
    final parts = [endereco, bairro, cidade, estado].where((s) => s != null && s.isNotEmpty);
    return parts.join(', ');
  }

  String get emojiBandeira {
    const map = {
      'BR': '🟢', 'Ipiranga': '🟡', 'Shell': '🔴', 'Esso': '🔵',
      'Raízen': '🟠', 'Ale': '🟣', 'Independente': '⚫', 'Ultragaz': '🟤',
    };
    return map[bandeira] ?? '⛽';
  }

  bool get estaAberto => aberto ?? true;
}
