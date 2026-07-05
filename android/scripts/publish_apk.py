#!/usr/bin/env python3
"""
Script de upload e publicação de APK no Google Play Store
RotaPosto - br.com.rotaposto.app

Uso:
  python3 scripts/publish_apk.py --apk app/build/outputs/apk/release/app-release.apk
  python3 scripts/publish_apk.py --apk app/build/outputs/apk/release/app-release.apk --track production
"""

import argparse
import json
import os
import sys
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from googleapiclient.errors import HttpError

# ─── Config ───────────────────────────────────────────────────────────────────
PACKAGE_NAME = 'br.com.rotaposto.app'
SCOPES = ['https://www.googleapis.com/auth/androidpublisher']

def get_service_account_path():
    """Suporta variável de ambiente (CI) ou arquivo local (dev)"""
    env_json = os.environ.get('GOOGLE_SERVICE_ACCOUNT_JSON')
    if env_json:
        # No CI, o conteúdo JSON vem direto como variável de ambiente
        import tempfile
        tmp = tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False)
        tmp.write(env_json)
        tmp.close()
        return tmp.name
    # Desenvolvimento local
    local = os.path.join(os.path.dirname(__file__), '..', 'service-account.json')
    if os.path.exists(local):
        return local
    raise FileNotFoundError(
        "service-account.json não encontrado. "
        "Em CI, defina GOOGLE_SERVICE_ACCOUNT_JSON como secret."
    )

def main():
    parser = argparse.ArgumentParser(description='Publica APK no Google Play Store')
    parser.add_argument('--apk', required=True, help='Caminho para o APK assinado')
    parser.add_argument('--track', default='internal',
                        choices=['internal', 'alpha', 'beta', 'production'],
                        help='Track de publicação (padrão: internal)')
    parser.add_argument('--release-notes', default='Nova versão publicada automaticamente.',
                        help='Notas da release (pt-BR)')
    args = parser.parse_args()

    # Validar APK
    if not os.path.exists(args.apk):
        print(f"❌ APK não encontrado: {args.apk}")
        sys.exit(1)

    apk_size = os.path.getsize(args.apk) / 1024 / 1024
    print(f"📦 APK: {args.apk} ({apk_size:.1f} MB)")
    print(f"🎯 Track: {args.track}")
    print(f"📝 Release notes: {args.release_notes}")
    print()

    # Auth
    sa_path = get_service_account_path()
    credentials = service_account.Credentials.from_service_account_file(
        sa_path, scopes=SCOPES
    )
    service = build('androidpublisher', 'v3', credentials=credentials)
    print("✅ Autenticado no Google Play API")

    # 1. Criar edit
    print("\n⏳ Criando edit...")
    edit = service.edits().insert(
        packageName=PACKAGE_NAME, body={}
    ).execute()
    edit_id = edit['id']
    print(f"✅ Edit criado: {edit_id}")

    try:
        # 2. Upload do APK
        print("\n⏳ Fazendo upload do APK...")
        media = MediaFileUpload(
            args.apk,
            mimetype='application/vnd.android.package-archive',
            resumable=True
        )
        apk_response = service.edits().apks().upload(
            packageName=PACKAGE_NAME,
            editId=edit_id,
            media_body=media
        ).execute()
        version_code = apk_response['versionCode']
        print(f"✅ APK enviado! versionCode={version_code}")

        # 3. Criar release no track escolhido
        print(f"\n⏳ Criando release no track '{args.track}'...")
        track_body = {
            'releases': [{
                'versionCodes': [version_code],
                'status': 'completed',
                'releaseNotes': [{
                    'language': 'pt-BR',
                    'text': args.release_notes
                }]
            }]
        }
        service.edits().tracks().update(
            packageName=PACKAGE_NAME,
            editId=edit_id,
            track=args.track,
            body=track_body
        ).execute()
        print(f"✅ Release criada no track '{args.track}'")

        # 4. Commit do edit (torna público)
        print("\n⏳ Publicando (commit do edit)...")
        commit_result = service.edits().commit(
            packageName=PACKAGE_NAME,
            editId=edit_id
        ).execute()
        print(f"✅ Publicado com sucesso! editId={commit_result.get('id')}")

        print(f"""
╔══════════════════════════════════════════════════════════╗
║  ✅ APK v{version_code} publicado no Play Store!              
║  Track: {args.track:<50}
║  Package: {PACKAGE_NAME:<46}
╚══════════════════════════════════════════════════════════╝
""")

    except HttpError as e:
        print(f"\n❌ Erro da API Google Play: {e}")
        # Limpar edit em caso de erro
        try:
            service.edits().delete(packageName=PACKAGE_NAME, editId=edit_id).execute()
            print("🧹 Edit deletado após erro")
        except Exception:
            pass
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Erro inesperado: {e}")
        try:
            service.edits().delete(packageName=PACKAGE_NAME, editId=edit_id).execute()
        except Exception:
            pass
        sys.exit(1)

if __name__ == '__main__':
    main()
