import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class PerfilScreen extends StatelessWidget {
  const PerfilScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.grayBg,
      appBar: AppBar(
        title: const Text('Meu Perfil'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // Avatar
            Container(
              width: 88,
              height: 88,
              decoration: BoxDecoration(
                color: AppTheme.orangeLight,
                shape: BoxShape.circle,
                border: Border.all(color: AppTheme.orange, width: 2),
              ),
              child: const Icon(Icons.person, size: 48, color: AppTheme.orange),
            ),
            const SizedBox(height: 12),
            const Text(
              'Entrar / Cadastrar',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: AppTheme.black,
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              'Faça login para salvar seus postos favoritos',
              style: TextStyle(fontSize: 13, color: AppTheme.gray),
            ),
            const SizedBox(height: 24),
            // Botão Google
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () {},
                icon: const Text('G', style: TextStyle(fontWeight: FontWeight.bold)),
                label: const Text('Entrar com Google'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.white,
                  foregroundColor: AppTheme.black,
                  side: const BorderSide(color: AppTheme.border),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  elevation: 0,
                ),
              ),
            ),
            const SizedBox(height: 32),
            // Sobre
            _buildSecao('Sobre o RotaPosto', [
              _buildItem(Icons.local_gas_station, 'Versão 2.0.0 (Flutter)'),
              _buildItem(Icons.security, 'Dados da ANP (Agência Nacional do Petróleo)'),
              _buildItem(Icons.gps_fixed, 'GPS nativo Android'),
              _buildItem(Icons.language, 'rotaposto.com.br'),
            ]),
            const SizedBox(height: 16),
            _buildSecao('Configurações', [
              _buildItem(Icons.notifications_outlined, 'Notificações de preço'),
              _buildItem(Icons.help_outline, 'Ajuda e suporte'),
              _buildItem(Icons.privacy_tip_outlined, 'Política de privacidade'),
            ]),
          ],
        ),
      ),
    );
  }

  Widget _buildSecao(String titulo, List<Widget> itens) {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 8),
            child: Text(
              titulo,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: AppTheme.gray,
                letterSpacing: 0.5,
              ),
            ),
          ),
          ...itens,
        ],
      ),
    );
  }

  Widget _buildItem(IconData icon, String label) {
    return ListTile(
      leading: Icon(icon, color: AppTheme.orange, size: 22),
      title: Text(label, style: const TextStyle(fontSize: 14)),
      trailing: const Icon(Icons.chevron_right, color: AppTheme.grayLight),
      dense: true,
      onTap: () {},
    );
  }
}
