#!/usr/bin/env python3
"""
Publica AAB (Android App Bundle) no Google Play Store.
O Google exige AAB para apps que já foram publicados como bundle.

Uso:
  python3 scripts/publish_aab.py --aab app/build/outputs/bundle/release/app-release.aab
  python3 scripts/publish_aab.py --aab ... --track production --release-notes "Nova versão"
"""

import argparse
import base64
import json
import os
import sys
import tempfile
import urllib.request
import urllib.error

PACKAGE_NAME = 'br.com.rotaposto.app'
SCOPES = ['https://www.googleapis.com/auth/androidpublisher']

def get_credentials():
    env_json = os.environ.get('GOOGLE_SERVICE_ACCOUNT_JSON')
    if env_json:
        tmp = tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False)
        tmp.write(env_json)
        tmp.close()
        sa_path = tmp.name
    else:
        sa_path = os.path.join(os.path.dirname(__file__), '..', 'service-account.json')
        if not os.path.exists(sa_path):
            raise FileNotFoundError(
                "service-account.json não encontrado. "
                "Em CI, defina GOOGLE_SERVICE_ACCOUNT_JSON como secret."
            )
    from google.oauth2 import service_account
    return service_account.Credentials.from_service_account_file(sa_path, scopes=SCOPES)

def main():
    parser = argparse.ArgumentParser(description='Publica AAB no Google Play Store')
    parser.add_argument('--aab', required=True, help='Caminho para o AAB assinado')
    parser.add_argument('--track', default='internal',
                        choices=['internal', 'alpha', 'beta', 'production'])
    parser.add_argument('--release-notes', default='Nova versão com melhorias e correções.')
    args = parser.parse_args()

    if not os.path.exists(args.aab):
        print(f"❌ AAB não encontrado: {args.aab}")
        sys.exit(1)

    size_mb = os.path.getsize(args.aab) / 1024 / 1024
    print(f"📦 AAB: {args.aab} ({size_mb:.1f} MB)")
    print(f"🎯 Track: {args.track}")
    print(f"📝 Notas: {args.release_notes}")

    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaFileUpload
    from googleapiclient.errors import HttpError

    credentials = get_credentials()
    service = build('androidpublisher', 'v3', credentials=credentials)
    print("✅ Autenticado no Google Play API")

    # 1. Criar edit
    print("\n⏳ Criando edit...")
    edit = service.edits().insert(packageName=PACKAGE_NAME, body={}).execute()
    edit_id = edit['id']
    print(f"✅ Edit criado: {edit_id}")

    try:
        # 2. Upload do AAB
        print("\n⏳ Fazendo upload do AAB...")
        media = MediaFileUpload(
            args.aab,
            mimetype='application/octet-stream',
            resumable=True
        )
        bundle_response = service.edits().bundles().upload(
            packageName=PACKAGE_NAME,
            editId=edit_id,
            media_body=media
        ).execute()
        version_code = bundle_response['versionCode']
        print(f"✅ AAB enviado! versionCode={version_code}")

        # 3. Criar release no track
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

        # 4. Commit
        print("\n⏳ Publicando (commit)...")
        commit_result = service.edits().commit(
            packageName=PACKAGE_NAME,
            editId=edit_id
        ).execute()
        print(f"✅ Commit: {commit_result.get('id')}")

        print(f"""
╔══════════════════════════════════════════════════════════╗
║  ✅ AAB versionCode={version_code} publicado no Play Store!
║  Track: {args.track}
║  Package: {PACKAGE_NAME}
╚══════════════════════════════════════════════════════════╝
""")

    except HttpError as e:
        print(f"\n❌ Erro da API Google Play: {e}")
        try:
            service.edits().delete(packageName=PACKAGE_NAME, editId=edit_id).execute()
            print("🧹 Edit deletado")
        except Exception:
            pass
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Erro: {e}")
        try:
            service.edits().delete(packageName=PACKAGE_NAME, editId=edit_id).execute()
        except Exception:
            pass
        sys.exit(1)

if __name__ == '__main__':
    main()
