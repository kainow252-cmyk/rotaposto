#!/usr/bin/env python3
"""Verifica detalhes de todas as trilhas."""

from googleapiclient.discovery import build
from google.oauth2 import service_account

PACKAGE_NAME    = "br.com.rotaposto.app"
SERVICE_ACCOUNT = "./service-account.json"
SCOPES = ["https://www.googleapis.com/auth/androidpublisher"]

creds = service_account.Credentials.from_service_account_file(SERVICE_ACCOUNT, scopes=SCOPES)
service = build("androidpublisher", "v3", credentials=creds)

edit = service.edits().insert(packageName=PACKAGE_NAME, body={}).execute()
edit_id = edit["id"]

tracks = service.edits().tracks().list(packageName=PACKAGE_NAME, editId=edit_id).execute()
print("=== TRILHAS DETALHADAS ===\n")
for t in tracks.get("tracks", []):
    print(f"TRILHA: {t['track']}")
    for r in t.get("releases", []):
        print(f"  status: {r.get('status')}")
        print(f"  versionCodes: {r.get('versionCodes')}")
        print(f"  versionName: {r.get('name','?')}")
        rollout = r.get('userFraction')
        if rollout:
            print(f"  rollout: {rollout*100:.0f}%")
        notes = r.get('releaseNotes', [])
        for n in notes:
            print(f"  nota ({n.get('language')}): {n.get('text','')[:80]}")
    print()

service.edits().delete(packageName=PACKAGE_NAME, editId=edit_id).execute()
print("Edit cancelado.")
