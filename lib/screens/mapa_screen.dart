import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../theme/app_theme.dart';
import '../models/posto.dart';
import 'detalhes_screen.dart';

class MapaScreen extends StatefulWidget {
  final double lat;
  final double lng;
  final List<Posto> postos;
  final bool carregando;
  final String combustivel;
  final ValueChanged<String> onCombustivelChanged;
  final bool gpsReal;
  final VoidCallback onRefresh;

  const MapaScreen({
    super.key,
    required this.lat,
    required this.lng,
    required this.postos,
    required this.carregando,
    required this.combustivel,
    required this.onCombustivelChanged,
    required this.gpsReal,
    required this.onRefresh,
  });

  @override
  State<MapaScreen> createState() => _MapaScreenState();
}

class _MapaScreenState extends State<MapaScreen> {
  static const _combustiveis = [
    ('gasolina', 'Gasolina'),
    ('etanol', 'Etanol'),
    ('diesel', 'Diesel'),
    ('dieselS10', 'Diesel S10'),
    ('gnv', 'GNV'),
    ('glp', 'GLP'),
  ];

  Future<void> _abrirMapsExterno(Posto posto) async {
    // Abre Google Maps com rota até o posto
    final uri = Uri.parse(
      'https://www.google.com/maps/dir/?api=1'
      '&destination=${posto.lat},${posto.lng}'
      '&destination_place_id=${Uri.encodeComponent(posto.nome)}'
      '&travelmode=driving',
    );
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  Future<void> _abrirMapaGeral() async {
    // Abre Google Maps centrado na localização do usuário com todos os postos
    final uri = Uri.parse(
      'https://www.google.com/maps/search/posto+de+combustível/'
      '@${widget.lat},${widget.lng},14z',
    );
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.grayBg,
      body: Column(
        children: [
          _buildHeader(context),
          Expanded(
            child: widget.carregando
                ? _buildLoading()
                : widget.postos.isEmpty
                    ? _buildVazio()
                    : _buildLista(),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Container(
      color: AppTheme.white,
      padding: EdgeInsets.only(
        top: MediaQuery.of(context).padding.top + 12,
        left: 16,
        right: 16,
        bottom: 0,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              RichText(
                text: const TextSpan(
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                    letterSpacing: -0.5,
                  ),
                  children: [
                    TextSpan(text: 'Rota', style: TextStyle(color: AppTheme.black)),
                    TextSpan(text: 'Posto', style: TextStyle(color: AppTheme.orange)),
                  ],
                ),
              ),
              const Spacer(),
              // Status GPS
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: widget.gpsReal ? AppTheme.greenBg : AppTheme.orangeLight,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      widget.gpsReal ? Icons.gps_fixed : Icons.gps_not_fixed,
                      size: 14,
                      color: widget.gpsReal ? AppTheme.greenText : AppTheme.orange,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      widget.gpsReal ? 'GPS Real' : 'Aguardando',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: widget.gpsReal ? AppTheme.greenText : AppTheme.orange,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              // Botão abrir mapa geral
              IconButton(
                icon: const Icon(Icons.map_outlined),
                onPressed: _abrirMapaGeral,
                color: AppTheme.orange,
                tooltip: 'Abrir no Google Maps',
              ),
              IconButton(
                icon: const Icon(Icons.refresh),
                onPressed: widget.onRefresh,
                color: AppTheme.grayDark,
              ),
            ],
          ),
          const SizedBox(height: 10),
          // Chips de combustível
          SizedBox(
            height: 38,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: _combustiveis.map((c) {
                final isSelected = c.$1 == widget.combustivel;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: FilterChip(
                    label: Text(c.$2),
                    selected: isSelected,
                    onSelected: (_) => widget.onCombustivelChanged(c.$1),
                    backgroundColor: AppTheme.white,
                    selectedColor: AppTheme.black,
                    checkmarkColor: AppTheme.white,
                    labelStyle: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: isSelected ? AppTheme.white : AppTheme.grayDark,
                    ),
                    side: BorderSide(
                      color: isSelected ? AppTheme.black : AppTheme.border,
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 8),
        ],
      ),
    );
  }

  Widget _buildLoading() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          CircularProgressIndicator(
            valueColor: AlwaysStoppedAnimation(AppTheme.orange),
          ),
          SizedBox(height: 16),
          Text(
            'Obtendo localização GPS...',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w600,
              color: AppTheme.gray,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildVazio() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(
              color: AppTheme.orangeLight,
              borderRadius: BorderRadius.circular(36),
            ),
            child: const Icon(Icons.local_gas_station_outlined,
                size: 36, color: AppTheme.orange),
          ),
          const SizedBox(height: 16),
          const Text(
            'Nenhum posto encontrado',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: AppTheme.black,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Tente aumentar o raio de busca',
            style: TextStyle(fontSize: 13, color: AppTheme.gray),
          ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: widget.onRefresh,
            icon: const Icon(Icons.refresh),
            label: const Text('Tentar novamente'),
          ),
        ],
      ),
    );
  }

  Widget _buildLista() {
    // Ordenar por distância
    final ordenados = List<Posto>.from(widget.postos);
    ordenados.sort((a, b) => (a.distanciaKm ?? 99).compareTo(b.distanciaKm ?? 99));

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: ordenados.length,
      itemBuilder: (context, index) {
        final posto = ordenados[index];
        return _buildPostoCard(posto, index);
      },
    );
  }

  Widget _buildPostoCard(Posto posto, int index) {
    final preco = posto.precos.getPorTipo(widget.combustivel);
    final isMelhor = index == 0;

    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => DetalhesScreen(posto: posto)),
        );
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          color: AppTheme.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isMelhor ? AppTheme.orange : AppTheme.border,
            width: isMelhor ? 2 : 1,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          children: [
            if (isMelhor)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 5),
                decoration: const BoxDecoration(
                  color: AppTheme.orange,
                  borderRadius: BorderRadius.only(
                    topLeft: Radius.circular(14),
                    topRight: Radius.circular(14),
                  ),
                ),
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.star, size: 13, color: Colors.white),
                    SizedBox(width: 4),
                    Text(
                      'Melhor opção para você',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
            Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(posto.emojiBandeira,
                          style: const TextStyle(fontSize: 22)),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              posto.nome,
                              style: const TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: 15,
                                color: AppTheme.black,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            Text(
                              posto.bandeira,
                              style: const TextStyle(
                                fontSize: 12,
                                color: AppTheme.gray,
                              ),
                            ),
                          ],
                        ),
                      ),
                      if (preco != null)
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: AppTheme.orangeLight,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            'R\$ ${preco.toStringAsFixed(3)}',
                            style: const TextStyle(
                              color: AppTheme.orange,
                              fontWeight: FontWeight.w800,
                              fontSize: 15,
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      const Icon(Icons.location_on_outlined,
                          size: 13, color: AppTheme.gray),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          posto.enderecoCompleto,
                          style: const TextStyle(
                              fontSize: 12, color: AppTheme.gray),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (posto.distanciaKm != null)
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: AppTheme.grayBg,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            '${posto.distanciaKm!.toStringAsFixed(1)} km',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: AppTheme.grayDark,
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: posto.estaAberto
                              ? AppTheme.greenBg
                              : AppTheme.redBg,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          posto.estaAberto ? 'Aberto' : 'Fechado',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: posto.estaAberto
                                ? AppTheme.greenText
                                : AppTheme.red,
                          ),
                        ),
                      ),
                      if (posto.rating != null) ...[
                        const SizedBox(width: 8),
                        const Icon(Icons.star, size: 13, color: Colors.amber),
                        const SizedBox(width: 2),
                        Text(
                          posto.rating!.toStringAsFixed(1),
                          style: const TextStyle(
                              fontSize: 12, fontWeight: FontWeight.w600),
                        ),
                      ],
                      const Spacer(),
                      // Botão navegação
                      GestureDetector(
                        onTap: () => _abrirMapsExterno(posto),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: AppTheme.orange,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.navigation_outlined,
                                  size: 14, color: Colors.white),
                              SizedBox(width: 4),
                              Text(
                                'Ir agora',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
