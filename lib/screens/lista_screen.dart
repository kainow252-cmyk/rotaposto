import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../models/posto.dart';
import 'detalhes_screen.dart';

class ListaScreen extends StatelessWidget {
  final List<Posto> postos;
  final bool carregando;
  final String combustivel;
  final ValueChanged<String> onCombustivelChanged;
  final VoidCallback onRefresh;

  const ListaScreen({
    super.key,
    required this.postos,
    required this.carregando,
    required this.combustivel,
    required this.onCombustivelChanged,
    required this.onRefresh,
  });

  static const _combustiveis = [
    ('gasolina', 'Gasolina'),
    ('etanol', 'Etanol'),
    ('diesel', 'Diesel'),
    ('dieselS10', 'Diesel S10'),
    ('gnv', 'GNV'),
    ('glp', 'GLP'),
  ];

  String get _labelCombustivel =>
      _combustiveis.firstWhere((c) => c.$1 == combustivel, orElse: () => ('gasolina', 'Gasolina')).$2;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.grayBg,
      appBar: AppBar(
        title: RichText(
          text: const TextSpan(
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900),
            children: [
              TextSpan(text: 'Rota', style: TextStyle(color: AppTheme.black)),
              TextSpan(text: 'Posto', style: TextStyle(color: AppTheme.orange)),
            ],
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: onRefresh,
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(52),
          child: SizedBox(
            height: 48,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              children: _combustiveis.map((c) {
                final sel = c.$1 == combustivel;
                return Padding(
                  padding: const EdgeInsets.only(right: 8, bottom: 8),
                  child: FilterChip(
                    label: Text(c.$2),
                    selected: sel,
                    onSelected: (_) => onCombustivelChanged(c.$1),
                    backgroundColor: AppTheme.white,
                    selectedColor: AppTheme.black,
                    labelStyle: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: sel ? AppTheme.white : AppTheme.grayDark,
                    ),
                    side: BorderSide(color: sel ? AppTheme.black : AppTheme.border),
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                  ),
                );
              }).toList(),
            ),
          ),
        ),
      ),
      body: carregando
          ? const Center(
              child: CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation(AppTheme.orange),
              ),
            )
          : postos.isEmpty
              ? _buildVazio()
              : _buildLista(),
    );
  }

  Widget _buildVazio() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.local_gas_station_outlined, size: 64, color: AppTheme.grayLight),
          const SizedBox(height: 16),
          const Text(
            'Nenhum posto encontrado',
            style: TextStyle(fontSize: 16, color: AppTheme.gray, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 8),
          const Text(
            'Tente aumentar o raio de busca',
            style: TextStyle(fontSize: 13, color: AppTheme.grayLight),
          ),
        ],
      ),
    );
  }

  Widget _buildLista() {
    // Ordenar por preço
    final ordenados = List<Posto>.from(postos);
    ordenados.sort((a, b) {
      final pa = a.precos.getPorTipo(combustivel) ?? 999;
      final pb = b.precos.getPorTipo(combustivel) ?? 999;
      return pa.compareTo(pb);
    });

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: ordenados.length,
      itemBuilder: (ctx, i) => _buildCard(ctx, ordenados[i], i),
    );
  }

  Widget _buildCard(BuildContext context, Posto posto, int rank) {
    final preco = posto.precos.getPorTipo(combustivel);

    return GestureDetector(
      onTap: () => Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => DetalhesScreen(posto: posto)),
      ),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.white,
          borderRadius: BorderRadius.circular(16),
          border: rank == 0 && preco != null
              ? Border.all(color: AppTheme.orange, width: 2)
              : Border.all(color: AppTheme.border),
        ),
        child: Column(
          children: [
            Row(
              children: [
                // Ranking badge
                if (rank < 3)
                  Container(
                    width: 28,
                    height: 28,
                    decoration: BoxDecoration(
                      color: rank == 0
                          ? AppTheme.orange
                          : rank == 1
                              ? AppTheme.grayLight
                              : const Color(0xFFCD7F32),
                      shape: BoxShape.circle,
                    ),
                    child: Center(
                      child: Text(
                        '${rank + 1}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w900,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  )
                else
                  Text(posto.emojiBandeira, style: const TextStyle(fontSize: 24)),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        posto.nome,
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 14,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        posto.endereco,
                        style: const TextStyle(fontSize: 12, color: AppTheme.gray),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                if (preco != null)
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        'R\$ ${preco.toStringAsFixed(3)}',
                        style: const TextStyle(
                          color: AppTheme.orange,
                          fontWeight: FontWeight.w900,
                          fontSize: 16,
                        ),
                      ),
                      Text(
                        _labelCombustivel,
                        style: const TextStyle(fontSize: 10, color: AppTheme.gray),
                      ),
                    ],
                  )
                else
                  const Text(
                    'Sem preço',
                    style: TextStyle(fontSize: 12, color: AppTheme.grayLight),
                  ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: posto.estaAberto ? AppTheme.greenBg : AppTheme.redBg,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    posto.estaAberto ? '● Aberto' : '● Fechado',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: posto.estaAberto ? AppTheme.greenText : AppTheme.red,
                    ),
                  ),
                ),
                if (posto.distanciaKm != null) ...[
                  const SizedBox(width: 8),
                  const Icon(Icons.near_me, size: 13, color: AppTheme.gray),
                  const SizedBox(width: 3),
                  Text(
                    '${posto.distanciaKm!.toStringAsFixed(1)} km',
                    style: const TextStyle(fontSize: 12, color: AppTheme.gray),
                  ),
                ],
                if (posto.rating != null) ...[
                  const SizedBox(width: 8),
                  const Icon(Icons.star, size: 13, color: Colors.amber),
                  const SizedBox(width: 2),
                  Text(
                    posto.rating!.toStringAsFixed(1),
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                  ),
                ],
                const Spacer(),
                const Icon(Icons.chevron_right, color: AppTheme.grayLight),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
