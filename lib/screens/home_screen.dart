import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import '../theme/app_theme.dart';
import '../services/localizacao_service.dart';
import '../services/postos_service.dart';
import '../models/posto.dart';
import 'mapa_screen.dart';
import 'lista_screen.dart';
import 'economia_screen.dart';
import 'perfil_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _tabIndex = 0;
  Position? _posicaoAtual;
  List<Posto> _postos = [];
  bool _carregandoGPS = true;
  bool _carregandoPostos = false;
  String _combustivelSelecionado = 'gasolina';
  String? _errGps;

  @override
  void initState() {
    super.initState();
    _inicializarLocalizacao();
  }

  Future<void> _inicializarLocalizacao() async {
    setState(() { _carregandoGPS = true; _errGps = null; });

    // Tenta obter GPS real
    final pos = await LocalizacaoService.obterLocalizacao();

    if (mounted) {
      setState(() {
        _posicaoAtual = pos;
        _carregandoGPS = false;
        if (pos == null) {
          _errGps = 'Não foi possível obter localização. Usando Vitória/ES.';
        }
      });
      // Carrega postos com a posição obtida (real ou placeholder)
      _carregarPostos();
    }
  }

  Future<void> _carregarPostos() async {
    setState(() => _carregandoPostos = true);

    final lat = _posicaoAtual?.latitude ?? LocalizacaoService.posicaoPadrao['lat']!;
    final lng = _posicaoAtual?.longitude ?? LocalizacaoService.posicaoPadrao['lng']!;

    final postos = await PostosService.buscarPostosProximos(
      lat: lat,
      lng: lng,
      raioKm: 5.0,
      combustivel: _combustivelSelecionado,
    );

    // Calcular distância de cada posto
    for (final p in postos) {
      p.distanciaKm = LocalizacaoService.calcularDistancia(lat, lng, p.lat, p.lng);
    }
    postos.sort((a, b) => (a.distanciaKm ?? 99).compareTo(b.distanciaKm ?? 99));

    if (mounted) {
      setState(() {
        _postos = postos;
        _carregandoPostos = false;
      });
    }
  }

  void _onCombustivelChanged(String tipo) {
    setState(() => _combustivelSelecionado = tipo);
    _carregarPostos();
  }

  @override
  Widget build(BuildContext context) {
    final lat = _posicaoAtual?.latitude ?? LocalizacaoService.posicaoPadrao['lat']!;
    final lng = _posicaoAtual?.longitude ?? LocalizacaoService.posicaoPadrao['lng']!;

    final telas = [
      MapaScreen(
        lat: lat,
        lng: lng,
        postos: _postos,
        carregando: _carregandoGPS || _carregandoPostos,
        combustivel: _combustivelSelecionado,
        onCombustivelChanged: _onCombustivelChanged,
        gpsReal: _posicaoAtual != null,
        onRefresh: _inicializarLocalizacao,
      ),
      ListaScreen(
        postos: _postos,
        carregando: _carregandoPostos,
        combustivel: _combustivelSelecionado,
        onCombustivelChanged: _onCombustivelChanged,
        onRefresh: _carregarPostos,
      ),
      EconomiaScreen(
        postos: _postos,
        userLat: lat,
        userLng: lng,
        combustivel: _combustivelSelecionado,
      ),
      const PerfilScreen(),
    ];

    return Scaffold(
      body: Stack(
        children: [
          IndexedStack(index: _tabIndex, children: telas),
          // Banner GPS se não tiver localização real
          if (_errGps != null && _tabIndex == 0)
            Positioned(
              top: MediaQuery.of(context).padding.top + 8,
              left: 16,
              right: 16,
              child: Material(
                borderRadius: BorderRadius.circular(12),
                color: AppTheme.orange.withOpacity(0.95),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  child: Row(
                    children: [
                      const Icon(Icons.location_off, color: Colors.white, size: 18),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _errGps!,
                          style: const TextStyle(color: Colors.white, fontSize: 12),
                        ),
                      ),
                      GestureDetector(
                        onTap: _inicializarLocalizacao,
                        child: const Text(
                          'Tentar',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tabIndex,
        onDestinationSelected: (i) => setState(() => _tabIndex = i),
        backgroundColor: AppTheme.white,
        indicatorColor: AppTheme.orangeLight,
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.map_outlined),
            selectedIcon: Icon(Icons.map, color: AppTheme.orange),
            label: 'Mapa',
          ),
          NavigationDestination(
            icon: Icon(Icons.list_outlined),
            selectedIcon: Icon(Icons.list, color: AppTheme.orange),
            label: 'Lista',
          ),
          NavigationDestination(
            icon: Icon(Icons.savings_outlined),
            selectedIcon: Icon(Icons.savings, color: AppTheme.orange),
            label: 'Economia',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person, color: AppTheme.orange),
            label: 'Perfil',
          ),
        ],
      ),
    );
  }
}
