#!/usr/bin/env python3
"""Verifica qual o maior versionCode já usado na Play Store."""

from googleapiclient.discovery import build
from google.oauth2 import service_account

PACKAGE_NAME    = "br.com.rotaposto.app"
SERVICE_ACCOUNT = "./service-account.json"
SCOPES = ["https://www.googleapis.com/auth/androidpublisher"]

creds = service_account.Credentials.from_service_account_file(SERVICE_ACCOUNT, scopes=SCOPES)
service = build("androidpublisher", "v3", credentials=creds)

edit = service.edits().insert(packageName=PACKAGE_NAME, body={}).execute()
edit_id = edit["id"]

bundles = service.edits().bundles().list(packageName=PACKAGE_NAME, editId=edit_id).execute()
print("Bundles já enviados:")
for b in bundles.get("bundles", []):
    print(f"  versionCode: {b['versionCode']}")

tracks = service.edits().tracks().list(packageName=PACKAGE_NAME, editId=edit_id).execute()
print("\nTrilhas:")
for t in tracks.get("tracks", []):
    print(f"  track: {t['track']}")
    for r in t.get("releases", []):
        print(f"    status: {r.get('status')} | codes: {r.get('versionCodes')}")

# Cancelar edit (não queremos commitar)
service.edits().delete(packageName=PACKAGE_NAME, editId=edit_id).execute()
print("\nEdit cancelado.")
