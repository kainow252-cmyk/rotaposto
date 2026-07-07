#!/usr/bin/env python3
"""
Upload de screenshots para o Play Store via API
RotaPosto - br.com.rotaposto.app
"""

import os
import sys
import json
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaFileUpload

# ─── Configuração ────────────────────────────────────────────────────────────
SERVICE_ACCOUNT_FILE = '/home/user/webapp/android/service-account.json'
PACKAGE_NAME = 'br.com.rotaposto.app'
SCOPES = ['https://www.googleapis.com/auth/androidpublisher']

# Screenshots em ordem preferencial (melhores primeiro)
SCREENSHOTS = [
    '/tmp/playstore_final/ps5_lista_postos.png',   # Real: lista de postos com preços
    '/tmp/playstore_final/ps6_planejar_rota.png',  # Real: planejar rota com mapa
    '/tmp/playstore_final/ps1_login.png',           # Onboarding/login
    '/tmp/playstore_final/ps2_destaque.png',        # Home/destaque
    '/tmp/playstore_final/ps3_lista.png',           # Lista postos (sessão anterior)
    '/tmp/playstore_final/ps4_planejar.png',        # Planejar rota (sessão anterior)
]

print("=" * 60)
print("UPLOAD DE SCREENSHOTS - Play Store - RotaPosto")
print("=" * 60)

# ─── Auth ─────────────────────────────────────────────────────────────────────
print("\n🔐 Autenticando com Service Account...")
try:
    credentials = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE, scopes=SCOPES
    )
    service = build('androidpublisher', 'v3', credentials=credentials)
    print(f"   ✅ Autenticado: {credentials.service_account_email}")
except Exception as e:
    print(f"   ❌ Erro de autenticação: {e}")
    sys.exit(1)

# ─── Criar Edit ───────────────────────────────────────────────────────────────
print("\n📝 Criando edit...")
try:
    edit = service.edits().insert(packageName=PACKAGE_NAME, body={}).execute()
    edit_id = edit['id']
    print(f"   ✅ Edit criado: {edit_id}")
except HttpError as e:
    print(f"   ❌ Erro ao criar edit: {e}")
    sys.exit(1)

# ─── Listar screenshots existentes ────────────────────────────────────────────
print("\n🔍 Verificando screenshots existentes...")
try:
    existing = service.edits().images().list(
        packageName=PACKAGE_NAME,
        editId=edit_id,
        language='pt-BR',
        imageType='phoneScreenshots'
    ).execute()
    imgs = existing.get('images', [])
    print(f"   📋 {len(imgs)} screenshots existentes em pt-BR")
    for img in imgs:
        print(f"      - id: {img.get('id')} | sha1: {img.get('sha1','')[:20]}")
except Exception as e:
    print(f"   ⚠️  Não foi possível listar: {e}")
    imgs = []

# ─── Deletar screenshots existentes ──────────────────────────────────────────
if imgs:
    print(f"\n🗑️  Deletando {len(imgs)} screenshots antigas...")
    try:
        service.edits().images().deleteall(
            packageName=PACKAGE_NAME,
            editId=edit_id,
            language='pt-BR',
            imageType='phoneScreenshots'
        ).execute()
        print("   ✅ Screenshots antigas removidas")
    except Exception as e:
        print(f"   ⚠️  Erro ao deletar: {e}")

# ─── Upload das novas screenshots ─────────────────────────────────────────────
print(f"\n📤 Fazendo upload de {len(SCREENSHOTS)} screenshots...")
uploaded = []

for i, path in enumerate(SCREENSHOTS, 1):
    filename = os.path.basename(path)
    if not os.path.exists(path):
        print(f"   ⚠️  [{i}] Arquivo não encontrado: {path}")
        continue

    size_kb = os.path.getsize(path) / 1024
    print(f"\n   [{i}] {filename} ({size_kb:.0f} KB)...")

    try:
        media = MediaFileUpload(path, mimetype='image/png', resumable=False)
        result = service.edits().images().upload(
            packageName=PACKAGE_NAME,
            editId=edit_id,
            language='pt-BR',
            imageType='phoneScreenshots',
            media_body=media
        ).execute()
        img_info = result.get('image', {})
        print(f"      ✅ Enviada! id={img_info.get('id','-')} | url={img_info.get('url','')[:60]}")
        uploaded.append(img_info)
    except HttpError as e:
        err = json.loads(e.content.decode()) if e.content else {}
        msg = err.get('error', {}).get('message', str(e))
        print(f"      ❌ HTTP {e.resp.status}: {msg[:200]}")
    except Exception as e:
        print(f"      ❌ {type(e).__name__}: {str(e)[:200]}")

# ─── Commit ───────────────────────────────────────────────────────────────────
if uploaded:
    print(f"\n💾 Commitando edit com {len(uploaded)} screenshots...")
    try:
        commit_result = service.edits().commit(
            packageName=PACKAGE_NAME,
            editId=edit_id
        ).execute()
        print(f"   ✅ Commit realizado! editId={commit_result.get('id')}")
    except HttpError as e:
        err = json.loads(e.content.decode()) if e.content else {}
        msg = err.get('error', {}).get('message', str(e))
        print(f"   ❌ Erro no commit: {msg[:300]}")
else:
    print("\n⚠️  Nenhuma screenshot enviada — abortando edit sem commit")
    try:
        service.edits().delete(packageName=PACKAGE_NAME, editId=edit_id).execute()
        print("   Edit cancelado.")
    except Exception:
        pass

# ─── Resumo ───────────────────────────────────────────────────────────────────
print("\n" + "=" * 60)
print(f"RESUMO: {len(uploaded)}/{len(SCREENSHOTS)} screenshots enviadas")
print("=" * 60)
for img in uploaded:
    print(f"  ✅ {img.get('id')} → {img.get('url','')[:70]}")
