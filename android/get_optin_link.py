#!/usr/bin/env python3
"""Busca o link de opt-in para teste interno na Play Store."""

from googleapiclient.discovery import build
from google.oauth2 import service_account

PACKAGE_NAME    = "br.com.rotaposto.app"
SERVICE_ACCOUNT = "./service-account.json"
SCOPES = ["https://www.googleapis.com/auth/androidpublisher"]

creds = service_account.Credentials.from_service_account_file(SERVICE_ACCOUNT, scopes=SCOPES)
service = build("androidpublisher", "v3", credentials=creds)

# Buscar testers da trilha internal
testers = service.internalappsharingartefacts()

# Link direto de opt-in
print("=" * 60)
print("LINK PARA INSTALAR O APK NOVO (trilha internal):")
print(f"https://play.google.com/apps/internaltest/{PACKAGE_NAME}")
print("=" * 60)
print("\nCaso o link acima não funcione, acesse o Play Console:")
print("https://play.google.com/console")
print(f"App: {PACKAGE_NAME}")
print("Menu: Testes > Testes internos > link de opt-in")
