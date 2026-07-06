import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
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
  GoogleMapController? _mapController;
  Posto? _postoSelecionado;

  static const _combustiveis = [
    ('gasolina', 'Gasolina'),
    ('etanol', 'Etanol'),
    ('diesel', 'Diesel'),
    ('dieselS10', 'Diesel S10'),
    ('gnv', 'GNV'),
    ('glp', 'GLP'),
  ];

  @override
  void didUpdateWidget(MapaScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Centraliza mapa quando posição muda
    if (oldWidget.lat != widget.lat || oldWidget.lng != widget.lng) {
      _mapController?.animateCamera(
        CameraUpdate.newLatLng(LatLng(widget.lat, widget.lng)),
      );
    }
  }

  Set<Marker> get _markers {
    final markers = <Marker>{};

    // Marcador do usuário
    markers.add(
      Marker(
        markerId: const MarkerId('user'),
        position: LatLng(widget.lat, widget.lng),
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueAzure),
        infoWindow: const InfoWindow(title: 'Você está aqui'),
        zIndexInt: 10,
      ),
    );

    // Marcadores dos postos
    for (final posto in widget.postos) {
      final preco = posto.precos.getPorTipo(widget.combustivel);
      markers.add(
        Marker(
          markerId: MarkerId(posto.id),
          position: LatLng(posto.lat, posto.lng),
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueOrange),
          infoWindow: InfoWindow(
            title: posto.nome,
            snippet: preco != null ? 'R\$ ${preco.toStringAsFixed(3)}' : 'Sem preço',
          ),
          onTap: () {
            setState(() => _postoSelecionado = posto);
          },
        ),
      );
    }
    return markers;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.white,
      body: Stack(
        children: [
          // Google Maps
          GoogleMap(
            onMapCreated: (ctrl) => _mapController = ctrl,
            initialCameraPosition: CameraPosition(
              target: LatLng(widget.lat, widget.lng),
              zoom: 14,
            ),
            markers: _markers,
            myLocationEnabled: widget.gpsReal,
            myLocationButtonEnabled: false,
            zoomControlsEnabled: false,
            mapToolbarEnabled: false,
            onTap: (_) => setState(() => _postoSelecionado = null),
          ),

          // Header com busca e chips
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: _buildHeader(context),
          ),

          // Loading overlay
          if (widget.carregando)
            Positioned(
              bottom: 120,
              left: 0,
              right: 0,
              child: Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  decoration: BoxDecoration(
                    color: AppTheme.white,
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.12),
                        blurRadius: 12,
                      ),
                    ],
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2.5,
                          valueColor: AlwaysStoppedAnimation(AppTheme.orange),
                        ),
                      ),
                      SizedBox(width: 10),
                      Text(
                        'Obtendo localização GPS...',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                ),
              ),
            ),

          // Card do posto selecionado
          if (_postoSelecionado != null)
            Positioned(
              bottom: 16,
              left: 16,
              right: 16,
              child: _buildPostoCard(_postoSelecionado!),
            ),

          // Botão de centralizar mapa
          Positioned(
            bottom: _postoSelecionado != null ? 160 : 16,
            right: 16,
            child: FloatingActionButton.small(
              backgroundColor: AppTheme.white,
              foregroundColor: AppTheme.orange,
              onPressed: () {
                _mapController?.animateCamera(
                  CameraUpdate.newLatLng(LatLng(widget.lat, widget.lng)),
                );
              },
              child: const Icon(Icons.my_location),
            ),
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
          // Logo + ícones
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
              // GPS indicator
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

  Widget _buildPostoCard(Posto posto) {
    final preco = posto.precos.getPorTipo(widget.combustivel);
    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => DetalhesScreen(posto: posto)),
        );
      },
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.12),
              blurRadius: 16,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(posto.emojiBandeira, style: const TextStyle(fontSize: 20)),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    posto.nome,
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 15,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                if (preco != null)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppTheme.orangeLight,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      'R\$ ${preco.toStringAsFixed(3)}',
                      style: const TextStyle(
                        color: AppTheme.orange,
                        fontWeight: FontWeight.w800,
                        fontSize: 14,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 6),
            Row(
              children: [
                const Icon(Icons.location_on_outlined, size: 14, color: AppTheme.gray),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    posto.endereco,
                    style: const TextStyle(fontSize: 12, color: AppTheme.gray),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                if (posto.distanciaKm != null)
                  Text(
                    '${posto.distanciaKm!.toStringAsFixed(1)} km',
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.grayDark,
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 4),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: posto.estaAberto ? AppTheme.greenBg : AppTheme.redBg,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    posto.estaAberto ? 'Aberto' : 'Fechado',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: posto.estaAberto ? AppTheme.greenText : AppTheme.red,
                    ),
                  ),
                ),
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
                const Text(
                  'Ver detalhes →',
                  style: TextStyle(
                    fontSize: 12,
                    color: AppTheme.orange,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
