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
  String? _errPostos;
  bool _permissaoNegadaPermanente = false;

  @override
  void initState() {
    super.initState();
    _inicializarLocalizacao();
  }

  Future<void> _inicializarLocalizacao() async {
    setState(() {
      _carregandoGPS = true;
      _errGps = null;
      _errPostos = null;
      _permissaoNegadaPermanente = false;
    });

    // Verifica permissão antes de pedir GPS
    final perm = await Geolocator.checkPermission();
    if (perm == LocationPermission.deniedForever) {
      if (mounted) {
        setState(() {
          _carregandoGPS = false;
          _permissaoNegadaPermanente = true;
          _errGps = 'Permissão de localização bloqueada. Abra as Configurações para ativar.';
        });
        // Ainda carrega postos com posição padrão
        await _carregarPostos();
      }
      return;
    }

    // Tenta obter GPS real
    final pos = await LocalizacaoService.obterLocalizacao();

    if (mounted) {
      setState(() {
        _posicaoAtual = pos;
        _carregandoGPS = false;
        if (pos == null) {
          _errGps = 'GPS indisponível — mostrando postos de Vitória/ES';
        }
      });
      // Carrega postos com a posição obtida (real ou placeholder)
      await _carregarPostos();
    }
  }

  Future<void> _carregarPostos() async {
    if (!mounted) return;

    setState(() {
      _carregandoPostos = true;
      _errPostos = null;
    });

    final lat = _posicaoAtual?.latitude ?? LocalizacaoService.posicaoPadrao['lat']!;
    final lng = _posicaoAtual?.longitude ?? LocalizacaoService.posicaoPadrao['lng']!;

    try {
      final postos = await PostosService.buscarPostosProximos(
        lat: lat,
        lng: lng,
        raioKm: 10.0,
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
    } on PostosException catch (e) {
      if (mounted) {
        setState(() {
          _errPostos = e.message;
          _carregandoPostos = false;
        });
        // Mostra SnackBar com botão de retry
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.message),
            backgroundColor: Colors.red.shade700,
            duration: const Duration(seconds: 6),
            action: SnackBarAction(
              label: 'Tentar novamente',
              textColor: Colors.white,
              onPressed: _carregarPostos,
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        const msg = 'Erro inesperado. Verifique sua conexão e tente novamente.';
        setState(() {
          _errPostos = msg;
          _carregandoPostos = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text(msg),
            backgroundColor: Colors.red.shade700,
            duration: const Duration(seconds: 6),
            action: SnackBarAction(
              label: 'Tentar novamente',
              textColor: Colors.white,
              onPressed: _carregarPostos,
            ),
          ),
        );
      }
    }
  }

  void _onCombustivelChanged(String tipo) {
    setState(() => _combustivelSelecionado = tipo);
    _carregarPostos();
  }

  Future<void> _abrirConfiguracoes() async {
    await Geolocator.openAppSettings();
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
        errPostos: _errPostos,
      ),
      ListaScreen(
        postos: _postos,
        carregando: _carregandoPostos,
        combustivel: _combustivelSelecionado,
        onCombustivelChanged: _onCombustivelChanged,
        onRefresh: _carregarPostos,
        errPostos: _errPostos,
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

          // Banner GPS (permissão negada permanentemente)
          if (_permissaoNegadaPermanente && _tabIndex <= 1)
            Positioned(
              top: MediaQuery.of(context).padding.top + 8,
              left: 16,
              right: 16,
              child: _buildBanner(
                icon: Icons.location_disabled,
                msg: 'Localização bloqueada — ative nas Configurações',
                btnLabel: 'Configurações',
                onBtn: _abrirConfiguracoes,
                color: Colors.red.shade600,
              ),
            )
          // Banner GPS (sem localização, não bloqueada)
          else if (_errGps != null && _tabIndex <= 1)
            Positioned(
              top: MediaQuery.of(context).padding.top + 8,
              left: 16,
              right: 16,
              child: _buildBanner(
                icon: Icons.gps_not_fixed,
                msg: _errGps!,
                btnLabel: 'Tentar',
                onBtn: _inicializarLocalizacao,
                color: AppTheme.orange,
              ),
            ),

          // Banner erro de rede / API
          if (_errPostos != null && _postos.isEmpty && !_carregandoPostos && _tabIndex <= 1)
            Positioned(
              top: MediaQuery.of(context).padding.top + (_errGps != null ? 58 : 8),
              left: 16,
              right: 16,
              child: _buildBanner(
                icon: Icons.wifi_off_rounded,
                msg: _errPostos!,
                btnLabel: 'Recarregar',
                onBtn: _carregarPostos,
                color: Colors.red.shade600,
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

  Widget _buildBanner({
    required IconData icon,
    required String msg,
    required String btnLabel,
    required VoidCallback onBtn,
    required Color color,
  }) {
    return Material(
      borderRadius: BorderRadius.circular(12),
      color: color.withValues(alpha: 0.95),
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        child: Row(
          children: [
            Icon(icon, color: Colors.white, size: 16),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                msg,
                style: const TextStyle(color: Colors.white, fontSize: 12),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(width: 8),
            GestureDetector(
              onTap: onBtn,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.25),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  btnLabel,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
