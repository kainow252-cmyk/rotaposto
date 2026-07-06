import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../theme/app_theme.dart';
import '../models/posto.dart';

class DetalhesScreen extends StatelessWidget {
  final Posto posto;

  const DetalhesScreen({super.key, required this.posto});

  static const _precoLabels = {
    'gasolina': 'Gasolina Comum',
    'gasolinaAditivada': 'Gasolina Aditivada',
    'etanol': 'Etanol',
    'diesel': 'Diesel',
    'dieselS10': 'Diesel S10',
    'gnv': 'GNV',
    'glp': 'GLP',
  };

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.grayBg,
      appBar: AppBar(
        title: Text(posto.nome),
        leading: const BackButton(),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeader(),
            const SizedBox(height: 16),
            _buildPrecos(),
            const SizedBox(height: 16),
            _buildInfo(),
            const SizedBox(height: 16),
            _buildAcoes(context),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
      ),
      child: Row(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: AppTheme.orangeLight,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Center(
              child: Text(posto.emojiBandeira, style: const TextStyle(fontSize: 28)),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  posto.nome,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  posto.bandeira,
                  style: const TextStyle(
                    fontSize: 13,
                    color: AppTheme.orange,
                    fontWeight: FontWeight.w600,
                  ),
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
                        posto.estaAberto ? '● Aberto' : '● Fechado',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: posto.estaAberto ? AppTheme.greenText : AppTheme.red,
                        ),
                      ),
                    ),
                    if (posto.rating != null) ...[
                      const SizedBox(width: 8),
                      const Icon(Icons.star, size: 14, color: Colors.amber),
                      const SizedBox(width: 2),
                      Text(
                        '${posto.rating!.toStringAsFixed(1)} (${posto.totalAvaliacoes ?? 0})',
                        style: const TextStyle(fontSize: 12),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPrecos() {
    final precos = <MapEntry<String, double>>[];
    void add(String key, double? val) {
      if (val != null && val > 0) precos.add(MapEntry(key, val));
    }
    add('gasolina', posto.precos.gasolina);
    add('gasolinaAditivada', posto.precos.gasolinaAditivada);
    add('etanol', posto.precos.etanol);
    add('diesel', posto.precos.diesel);
    add('dieselS10', posto.precos.dieselS10);
    add('gnv', posto.precos.gnv);
    add('glp', posto.precos.glp);

    if (precos.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.border),
        ),
        child: const Row(
          children: [
            Icon(Icons.info_outline, color: AppTheme.grayLight),
            SizedBox(width: 8),
            Text('Preços não disponíveis', style: TextStyle(color: AppTheme.gray)),
          ],
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Text(
                'Preços',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppTheme.grayBg,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  posto.atualizadoEm,
                  style: const TextStyle(fontSize: 10, color: AppTheme.gray),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...precos.map((e) => _buildPrecoItem(e.key, e.value)),
        ],
      ),
    );
  }

  Widget _buildPrecoItem(String tipo, double preco) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: const BoxDecoration(
              color: AppTheme.orange,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 10),
          Text(
            _precoLabels[tipo] ?? tipo,
            style: const TextStyle(fontSize: 14, color: AppTheme.grayDark),
          ),
          const Spacer(),
          Text(
            'R\$ ${preco.toStringAsFixed(3)}',
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w800,
              color: AppTheme.orange,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfo() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Informações',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 12),
          _infoRow(Icons.location_on_outlined, posto.enderecoCompleto),
          if (posto.telefone != null)
            _infoRow(Icons.phone_outlined, posto.telefone!),
          if (posto.distanciaKm != null)
            _infoRow(Icons.near_me_outlined, '${posto.distanciaKm!.toStringAsFixed(1)} km de você'),
        ],
      ),
    );
  }

  Widget _infoRow(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: AppTheme.gray),
          const SizedBox(width: 10),
          Expanded(
            child: Text(text, style: const TextStyle(fontSize: 13, color: AppTheme.grayDark)),
          ),
        ],
      ),
    );
  }

  Widget _buildAcoes(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: ElevatedButton.icon(
            onPressed: () => _abrirMaps(),
            icon: const Icon(Icons.directions),
            label: const Text('Como chegar'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.orange,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ),
        if (posto.telefone != null) ...[
          const SizedBox(width: 12),
          OutlinedButton.icon(
            onPressed: () => _ligar(),
            icon: const Icon(Icons.phone),
            label: const Text('Ligar'),
            style: OutlinedButton.styleFrom(
              foregroundColor: AppTheme.orange,
              side: const BorderSide(color: AppTheme.orange),
              padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ],
      ],
    );
  }

  Future<void> _abrirMaps() async {
    final url = Uri.parse(
      'https://www.google.com/maps/dir/?api=1&destination=${posto.lat},${posto.lng}',
    );
    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    }
  }

  Future<void> _ligar() async {
    if (posto.telefone == null) return;
    final url = Uri.parse('tel:${posto.telefone}');
    if (await canLaunchUrl(url)) {
      await launchUrl(url);
    }
  }
}
