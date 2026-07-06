import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../models/posto.dart';
import '../services/localizacao_service.dart';
import 'detalhes_screen.dart';

class EconomiaScreen extends StatefulWidget {
  final List<Posto> postos;
  final double userLat;
  final double userLng;
  final String combustivel;

  const EconomiaScreen({
    super.key,
    required this.postos,
    required this.userLat,
    required this.userLng,
    required this.combustivel,
  });

  @override
  State<EconomiaScreen> createState() => _EconomiaScreenState();
}

class _EconomiaScreenState extends State<EconomiaScreen> {
  double _litros = 40;
  double _consumo = 12;

  List<_PostoEconomia> get _ranking {
    final lista = <_PostoEconomia>[];
    for (final p in widget.postos) {
      final preco = p.precos.getPorTipo(widget.combustivel);
      if (preco == null || preco <= 0) continue;
      final dist = LocalizacaoService.calcularDistancia(
        widget.userLat, widget.userLng, p.lat, p.lng,
      );
      final custoAbast = preco * _litros;
      final custoDesloc = (dist * 2 / _consumo) * preco; // ida e volta
      lista.add(_PostoEconomia(posto: p, preco: preco, dist: dist,
          custoAbast: custoAbast, custoDesloc: custoDesloc));
    }
    lista.sort((a, b) => a.custoTotal.compareTo(b.custoTotal));
    if (lista.length > 1) {
      final melhor = lista.first.custoTotal;
      for (var e in lista) {
        e.economia = e.custoTotal - melhor;
      }
    }
    return lista;
  }

  @override
  Widget build(BuildContext context) {
    final rank = _ranking;
    return Scaffold(
      backgroundColor: AppTheme.grayBg,
      appBar: AppBar(
        title: const Text('Calculadora de Economia'),
        actions: [
          IconButton(
            icon: const Icon(Icons.info_outline),
            onPressed: _mostrarInfo,
          ),
        ],
      ),
      body: widget.postos.isEmpty
          ? const Center(
              child: Text(
                'Volte ao Mapa e busque postos primeiro',
                style: TextStyle(color: AppTheme.gray),
              ),
            )
          : Column(
              children: [
                _buildControles(),
                Expanded(child: _buildRanking(rank)),
              ],
            ),
    );
  }

  Widget _buildControles() {
    return Container(
      color: AppTheme.white,
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: _buildSlider(
                  label: 'Litros: ${_litros.toStringAsFixed(0)}L',
                  value: _litros,
                  min: 5,
                  max: 100,
                  onChanged: (v) => setState(() => _litros = v),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: _buildSlider(
                  label: 'Consumo: ${_consumo.toStringAsFixed(0)} km/L',
                  value: _consumo,
                  min: 5,
                  max: 25,
                  onChanged: (v) => setState(() => _consumo = v),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSlider({
    required String label,
    required double value,
    required double min,
    required double max,
    required ValueChanged<double> onChanged,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
        Slider(
          value: value,
          min: min,
          max: max,
          activeColor: AppTheme.orange,
          onChanged: onChanged,
        ),
      ],
    );
  }

  Widget _buildRanking(List<_PostoEconomia> rank) {
    if (rank.isEmpty) {
      return const Center(
        child: Text(
          'Sem postos com preço disponível',
          style: TextStyle(color: AppTheme.gray),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: rank.length,
      itemBuilder: (ctx, i) {
        final e = rank[i];
        return GestureDetector(
          onTap: () => Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => DetalhesScreen(posto: e.posto)),
          ),
          child: Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.white,
              borderRadius: BorderRadius.circular(16),
              border: i == 0
                  ? Border.all(color: AppTheme.green, width: 2)
                  : Border.all(color: AppTheme.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      i == 0 ? '🏆' : i == 1 ? '🥈' : i == 2 ? '🥉' : '${i + 1}º',
                      style: const TextStyle(fontSize: 20),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        e.posto.nome,
                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          'R\$ ${e.custoTotal.toStringAsFixed(2)}',
                          style: const TextStyle(
                            fontWeight: FontWeight.w900,
                            fontSize: 15,
                            color: AppTheme.black,
                          ),
                        ),
                        const Text(
                          'custo total',
                          style: TextStyle(fontSize: 10, color: AppTheme.gray),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    _infoChip(
                      icon: Icons.local_gas_station,
                      label: 'R\$ ${e.preco.toStringAsFixed(3)}/L',
                      color: AppTheme.orangeLight,
                      textColor: AppTheme.orange,
                    ),
                    const SizedBox(width: 8),
                    _infoChip(
                      icon: Icons.near_me,
                      label: '${e.dist.toStringAsFixed(1)} km',
                      color: AppTheme.grayBg,
                      textColor: AppTheme.gray,
                    ),
                    if (e.economia > 0) ...[
                      const SizedBox(width: 8),
                      _infoChip(
                        icon: Icons.trending_up,
                        label: '+R\$ ${e.economia.toStringAsFixed(2)}',
                        color: AppTheme.redBg,
                        textColor: AppTheme.red,
                      ),
                    ] else ...[
                      const SizedBox(width: 8),
                      _infoChip(
                        icon: Icons.check_circle,
                        label: 'Melhor opção!',
                        color: AppTheme.greenBg,
                        textColor: AppTheme.greenText,
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _infoChip({
    required IconData icon,
    required String label,
    required Color color,
    required Color textColor,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: textColor),
          const SizedBox(width: 4),
          Text(label, style: TextStyle(fontSize: 11, color: textColor, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }

  void _mostrarInfo() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Como calculamos?'),
        content: const Text(
          'O custo total considera:\n\n'
          '• Custo do abastecimento (preço × litros)\n'
          '• Custo do deslocamento ida+volta ao posto\n\n'
          'Assim você vê qual posto é realmente mais barato, '
          'considerando a distância até ele.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Entendi'),
          ),
        ],
      ),
    );
  }
}

class _PostoEconomia {
  final Posto posto;
  final double preco;
  final double dist;
  final double custoAbast;
  final double custoDesloc;
  double economia = 0;

  _PostoEconomia({
    required this.posto,
    required this.preco,
    required this.dist,
    required this.custoAbast,
    required this.custoDesloc,
  });

  double get custoTotal => custoAbast + custoDesloc;
}
