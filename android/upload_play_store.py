#!/usr/bin/env python3
"""
Faz upload do AAB para a Play Store e publica na trilha de produção.
"""

import json
import sys
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from google.oauth2 import service_account

PACKAGE_NAME    = "br.com.rotaposto.app"
SERVICE_ACCOUNT = "./service-account.json"
AAB_PATH        = "./app/build/outputs/bundle/release/app-release.aab"
TRACK           = "internal"

SCOPES = ["https://www.googleapis.com/auth/androidpublisher"]

def main():
    print("🔑 Autenticando com service account...")
    creds = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT, scopes=SCOPES
    )
    service = build("androidpublisher", "v3", credentials=creds)

    # 1. Criar edit
    print("📝 Criando edit...")
    edit = service.edits().insert(packageName=PACKAGE_NAME, body={}).execute()
    edit_id = edit["id"]
    print(f"   Edit ID: {edit_id}")

    # 2. Upload AAB
    print("📦 Fazendo upload do AAB...")
    media = MediaFileUpload(AAB_PATH, mimetype="application/octet-stream", resumable=True)
    bundle = service.edits().bundles().upload(
        packageName=PACKAGE_NAME,
        editId=edit_id,
        media_body=media
    ).execute()
    version_code = bundle["versionCode"]
    print(f"   ✅ AAB enviado — versionCode: {version_code}")

    # 3. Atualizar trilha
    print(f"🚀 Publicando na trilha '{TRACK}'...")
    track_body = {
        "releases": [{
            "versionCodes": [str(version_code)],
            "status": "completed",
            "releaseNotes": [{
                "language": "pt-BR",
                "text": "v1.2.0 — Navegação corrigida: Waze e Google Maps abrem diretamente no app."
            }]
        }]
    }
    service.edits().tracks().update(
        packageName=PACKAGE_NAME,
        editId=edit_id,
        track=TRACK,
        body=track_body
    ).execute()
    print("   ✅ Trilha atualizada")

    # 4. Commit
    print("💾 Commitando edit...")
    result = service.edits().commit(
        packageName=PACKAGE_NAME,
        editId=edit_id
    ).execute()
    print(f"   ✅ Commit OK — edit: {result['id']}")
    print("\n🎉 DEPLOY NA PLAY STORE CONCLUÍDO!")
    print(f"   Package:      {PACKAGE_NAME}")
    print(f"   VersionCode:  {version_code}")
    print(f"   Versão:       1.2.0")
    print(f"   Trilha:       {TRACK}")

if __name__ == "__main__":
    main()
