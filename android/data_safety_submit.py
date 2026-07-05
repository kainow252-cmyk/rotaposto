#!/usr/bin/env python3
"""
Submete o formulário Data Safety do RotaPosto via API usando CSV oficial.

RotaPosto coleta:
- Localização aproximada (ACCESS_COARSE_LOCATION) → App functionality
- Email (via Google Sign-In) → Account management, App functionality
- User IDs (Firebase UID, Google UID) → Account management, App functionality

NÃO coleta: dados financeiros, saúde, fotos, áudio, contatos, calendário
NÃO compartilha com terceiros comerciais
NÃO tem anúncios
Criptografado em trânsito: SIM
Usuário pode solicitar exclusão: SIM
"""

import csv
import io
import json
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

SERVICE_ACCOUNT_FILE = '/home/user/rotaposto-android/service-account.json'
PACKAGE_NAME = 'br.com.rotaposto.app'
SCOPES = ['https://www.googleapis.com/auth/androidpublisher']

credentials = service_account.Credentials.from_service_account_file(
    SERVICE_ACCOUNT_FILE, scopes=SCOPES
)
service = build('androidpublisher', 'v3', credentials=credentials)

# ─── CSV Data Safety para RotaPosto ───────────────────────────────────────────
# Formato: Question ID, Response ID, Response value, Answer requirement, Label
# Apenas linhas com Response value = TRUE ou FALSE são relevantes
# Linhas sem response value ficam em branco (não selecionado)

CSV_HEADER = "Question ID (machine readable),Response ID (machine readable),Response value,Answer requirement,Human-friendly question label\r\n"

# Construir CSV linha a linha baseado no template oficial
# RotaPosto: coleta email, user IDs, localização aproximada
# Não compartilha com terceiros

rows = [
    # ── Seção 1: Coleta dados? ──────────────────────────────────────────────
    # SIM, coletamos dados
    ["PSL_DATA_COLLECTION_COLLECTS_PERSONAL_DATA", "", "TRUE", "REQUIRED",
     "Does your app collect or share any of the required user data types?"],

    # Criptografado em trânsito? SIM (HTTPS/TLS)
    ["PSL_DATA_COLLECTION_ENCRYPTED_IN_TRANSIT", "", "TRUE", "MAYBE_REQUIRED",
     "Is all of the user data collected by your app encrypted in transit?"],

    # Usuário pode solicitar exclusão? SIM (pelo suporte)
    ["PSL_DATA_COLLECTION_USER_REQUEST_DELETE", "", "TRUE", "MAYBE_REQUIRED",
     "Do you provide a way for users to request that their data is deleted?"],

    # ── Seção 2: Tipos de dados coletados ────────────────────────────────────
    # Personal info: SIM para Name (via Google Sign-In), Email, User IDs
    ["PSL_DATA_TYPES_PERSONAL", "PSL_NAME", "TRUE", "MULTIPLE_CHOICE",
     "Personal info\nName"],
    ["PSL_DATA_TYPES_PERSONAL", "PSL_EMAIL", "TRUE", "MULTIPLE_CHOICE",
     "Personal info\nEmail address"],
    ["PSL_DATA_TYPES_PERSONAL", "PSL_USER_ACCOUNT", "TRUE", "MULTIPLE_CHOICE",
     "Personal info\nPersonal identifiers"],
    # Não coletamos:
    ["PSL_DATA_TYPES_PERSONAL", "PSL_ADDRESS", "", "MULTIPLE_CHOICE",
     "Personal info\nAddress"],
    ["PSL_DATA_TYPES_PERSONAL", "PSL_PHONE", "", "MULTIPLE_CHOICE",
     "Personal info\nPhone number"],
    ["PSL_DATA_TYPES_PERSONAL", "PSL_RACE_ETHNICITY", "", "MULTIPLE_CHOICE",
     "Personal info\nRace and ethnicity"],
    ["PSL_DATA_TYPES_PERSONAL", "PSL_POLITICAL_RELIGIOUS", "", "MULTIPLE_CHOICE",
     "Personal info\nPolitical or religious beliefs"],
    ["PSL_DATA_TYPES_PERSONAL", "PSL_SEXUAL_ORIENTATION_GENDER_IDENTITY", "", "MULTIPLE_CHOICE",
     "Personal info\nSexual orientation or gender identity"],
    ["PSL_DATA_TYPES_PERSONAL", "PSL_OTHER_PERSONAL", "", "MULTIPLE_CHOICE",
     "Personal info\nOther personal info"],

    # Financial: NÃO
    ["PSL_DATA_TYPES_FINANCIAL", "PSL_PURCHASE_HISTORY", "", "MULTIPLE_CHOICE",
     "Financial info\nPurchase history"],
    ["PSL_DATA_TYPES_FINANCIAL", "PSL_CREDIT_SCORE", "", "MULTIPLE_CHOICE",
     "Financial info\nCredit info"],
    ["PSL_DATA_TYPES_FINANCIAL", "PSL_CREDIT_DEBIT_BANK_ACCOUNT_NUMBER", "", "MULTIPLE_CHOICE",
     "Financial info\nCredit card, debit card, or bank account number"],
    ["PSL_DATA_TYPES_FINANCIAL", "PSL_OTHER", "", "MULTIPLE_CHOICE",
     "Financial info\nOther financial info"],

    # Location: SIM, localização aproximada (para mostrar postos próximos)
    ["PSL_DATA_TYPES_LOCATION", "PSL_APPROX_LOCATION", "TRUE", "MULTIPLE_CHOICE",
     "Location\nApproximate location"],
    ["PSL_DATA_TYPES_LOCATION", "PSL_PRECISE_LOCATION", "", "MULTIPLE_CHOICE",
     "Location\nPrecise location"],

    # Web, Messages, Photos, Audio, Health, Contacts, Calendar: NÃO
    ["PSL_DATA_TYPES_SEARCH_AND_BROWSING", "PSL_WEB_BROWSING_HISTORY", "", "MULTIPLE_CHOICE",
     "Web browsing\nWeb browsing history"],
    ["PSL_DATA_TYPES_EMAIL_AND_TEXT", "PSL_EMAILS", "", "MULTIPLE_CHOICE",
     "Messages\nEmails"],
    ["PSL_DATA_TYPES_EMAIL_AND_TEXT", "PSL_SMS_CALL_LOG", "", "MULTIPLE_CHOICE",
     "Messages\nSMS or MMS messages"],
    ["PSL_DATA_TYPES_EMAIL_AND_TEXT", "PSL_OTHER_MESSAGES", "", "MULTIPLE_CHOICE",
     "Messages\nOther in-app messages"],
    ["PSL_DATA_TYPES_PHOTOS_AND_VIDEOS", "PSL_PHOTOS", "", "MULTIPLE_CHOICE",
     "Photos and videos\nPhotos"],
    ["PSL_DATA_TYPES_PHOTOS_AND_VIDEOS", "PSL_VIDEOS", "", "MULTIPLE_CHOICE",
     "Photos and videos\nVideos"],
    ["PSL_DATA_TYPES_AUDIO", "PSL_AUDIO", "", "MULTIPLE_CHOICE",
     "Audio files\nVoice or sound recordings"],
    ["PSL_DATA_TYPES_AUDIO", "PSL_MUSIC", "", "MULTIPLE_CHOICE",
     "Audio files\nMusic files"],
    ["PSL_DATA_TYPES_AUDIO", "PSL_OTHER_AUDIO", "", "MULTIPLE_CHOICE",
     "Audio files\nOther audio files"],
    ["PSL_DATA_TYPES_HEALTH_AND_FITNESS", "PSL_HEALTH", "", "MULTIPLE_CHOICE",
     "Health and fitness\nHealth information"],
    ["PSL_DATA_TYPES_HEALTH_AND_FITNESS", "PSL_FITNESS", "", "MULTIPLE_CHOICE",
     "Health and fitness\nFitness information"],
    ["PSL_DATA_TYPES_CONTACTS", "PSL_CONTACTS", "", "MULTIPLE_CHOICE",
     "Contacts\nContacts"],
    ["PSL_DATA_TYPES_CALENDAR", "PSL_CALENDAR", "", "MULTIPLE_CHOICE",
     "Calendar\nCalendar events"],

    # App performance: NÃO (não coletamos crash logs ou diagnostics explicitamente)
    ["PSL_DATA_TYPES_APP_PERFORMANCE", "PSL_CRASH_LOGS", "", "MULTIPLE_CHOICE",
     "App info and performance\nCrash logs"],
    ["PSL_DATA_TYPES_APP_PERFORMANCE", "PSL_PERFORMANCE_DIAGNOSTICS", "", "MULTIPLE_CHOICE",
     "App info and performance\nDiagnostics"],
    ["PSL_DATA_TYPES_APP_PERFORMANCE", "PSL_OTHER_PERFORMANCE", "", "MULTIPLE_CHOICE",
     "App info and performance\nOther app performance data"],
    ["PSL_DATA_TYPES_FILES_AND_DOCS", "PSL_FILES_AND_DOCS", "", "MULTIPLE_CHOICE",
     "Files and docs\nFiles and docs"],

    # App activity: NÃO
    ["PSL_DATA_TYPES_APP_ACTIVITY", "PSL_USER_INTERACTION", "", "MULTIPLE_CHOICE",
     "App activity\nPage views and taps in app"],
    ["PSL_DATA_TYPES_APP_ACTIVITY", "PSL_IN_APP_SEARCH_HISTORY", "", "MULTIPLE_CHOICE",
     "App activity\nIn-app search history"],
    ["PSL_DATA_TYPES_APP_ACTIVITY", "PSL_APPS_ON_DEVICE", "", "MULTIPLE_CHOICE",
     "App activity\nInstalled apps"],
    ["PSL_DATA_TYPES_APP_ACTIVITY", "PSL_USER_GENERATED_CONTENT", "", "MULTIPLE_CHOICE",
     "App activity\nOther user-generated content"],
    ["PSL_DATA_TYPES_APP_ACTIVITY", "PSL_OTHER_APP_ACTIVITY", "", "MULTIPLE_CHOICE",
     "App activity\nOther actions"],

    # Device IDs: NÃO
    ["PSL_DATA_TYPES_IDENTIFIERS", "PSL_DEVICE_ID", "", "MULTIPLE_CHOICE",
     "Device or other identifiers\nDevice or other identifiers"],

    # ── Seção 3: Uso dos dados — NAME ────────────────────────────────────────
    # Name: coletado (não compartilhado)
    ["PSL_DATA_USAGE_RESPONSES:PSL_NAME:PSL_DATA_USAGE_COLLECTION_AND_SHARING",
     "PSL_DATA_USAGE_ONLY_COLLECTED", "TRUE", "MULTIPLE_CHOICE",
     "Data usage and handling (Name)\nIs this data collected, shared, or both?\nCollected"],
    ["PSL_DATA_USAGE_RESPONSES:PSL_NAME:PSL_DATA_USAGE_COLLECTION_AND_SHARING",
     "PSL_DATA_USAGE_ONLY_SHARED", "", "MULTIPLE_CHOICE",
     "Data usage and handling (Name)\nIs this data collected, shared, or both?\nShared"],
    ["PSL_DATA_USAGE_RESPONSES:PSL_NAME:PSL_DATA_USAGE_EPHEMERAL",
     "", "", "MAYBE_REQUIRED",
     "Data usage and handling (Name)\nIs this data processed ephemerally?"],
    # Opcional? SIM (usuário pode usar sem login)
    ["PSL_DATA_USAGE_RESPONSES:PSL_NAME:DATA_USAGE_USER_CONTROL",
     "PSL_DATA_USAGE_USER_CONTROL_OPTIONAL", "TRUE", "SINGLE_CHOICE",
     "Data usage and handling (Name)\nIs this data required for your app, or can users choose whether it's collected?\nUsers can choose whether this data is collected"],
    ["PSL_DATA_USAGE_RESPONSES:PSL_NAME:DATA_USAGE_USER_CONTROL",
     "PSL_DATA_USAGE_USER_CONTROL_REQUIRED", "", "SINGLE_CHOICE",
     "Data usage and handling (Name)\nIs this data required for your app, or can users choose whether it's collected?\nData collection is required (users can't turn off this data collection)"],
    # Propósito: Account management + App functionality
    ["PSL_DATA_USAGE_RESPONSES:PSL_NAME:DATA_USAGE_COLLECTION_PURPOSE",
     "PSL_APP_FUNCTIONALITY", "TRUE", "MULTIPLE_CHOICE",
     "Data usage and handling (Name)\nWhy is this user data collected? Select all that apply.\nApp functionality"],
    ["PSL_DATA_USAGE_RESPONSES:PSL_NAME:DATA_USAGE_COLLECTION_PURPOSE",
     "PSL_ANALYTICS", "", "MULTIPLE_CHOICE",
     "Data usage and handling (Name)\nWhy is this user data collected? Select all that apply.\nAnalytics"],
    ["PSL_DATA_USAGE_RESPONSES:PSL_NAME:DATA_USAGE_COLLECTION_PURPOSE",
     "PSL_DEVELOPER_COMMUNICATIONS", "", "MULTIPLE_CHOICE",
     "Data usage and handling (Name)\nWhy is this user data collected? Select all that apply.\nDeveloper communications"],
    ["PSL_DATA_USAGE_RESPONSES:PSL_NAME:DATA_USAGE_COLLECTION_PURPOSE",
     "PSL_FRAUD_PREVENTION_SECURITY", "", "MULTIPLE_CHOICE",
     "Data usage and handling (Name)\nWhy is this user data collected? Select all that apply.\nFraud prevention, security, and compliance"],
    ["PSL_DATA_USAGE_RESPONSES:PSL_NAME:DATA_USAGE_COLLECTION_PURPOSE",
     "PSL_ADVERTISING", "", "MULTIPLE_CHOICE",
     "Data usage and handling (Name)\nWhy is this user data collected? Select all that apply.\nAdvertising or marketing"],
    ["PSL_DATA_USAGE_RESPONSES:PSL_NAME:DATA_USAGE_COLLECTION_PURPOSE",
     "PSL_PERSONALIZATION", "", "MULTIPLE_CHOICE",
     "Data usage and handling (Name)\nWhy is this user data collected? Select all that apply.\nPersonalization"],
    ["PSL_DATA_USAGE_RESPONSES:PSL_NAME:DATA_USAGE_COLLECTION_PURPOSE",
     "PSL_ACCOUNT_MANAGEMENT", "TRUE", "MULTIPLE_CHOICE",
     "Data usage and handling (Name)\nWhy is this user data collected? Select all that apply.\nAccount management"],

    # ── Seção 3: Uso dos dados — EMAIL ────────────────────────────────────────
    ["PSL_DATA_USAGE_RESPONSES:PSL_EMAIL:PSL_DATA_USAGE_COLLECTION_AND_SHARING",
     "PSL_DATA_USAGE_ONLY_COLLECTED", "TRUE", "MULTIPLE_CHOICE",
     "Data usage and handling (Email address)\nIs this data collected, shared, or both?\nCollected"],
    ["PSL_DATA_USAGE_RESPONSES:PSL_EMAIL:PSL_DATA_USAGE_COLLECTION_AND_SHARING",
     "PSL_DATA_USAGE_ONLY_SHARED", "", "MULTIPLE_CHOICE",
     "Data usage and handling (Email address)\nIs this data collected, shared, or both?\nShared"],
    ["PSL_DATA_USAGE_RESPONSES:PSL_EMAIL:PSL_DATA_USAGE_EPHEMERAL",
     "", "", "MAYBE_REQUIRED",
     "Data usage and handling (Email address)\nIs this data processed ephemerally?"],
    ["PSL_DATA_USAGE_RESPONSES:PSL_EMAIL:DATA_USAGE_USER_CONTROL",
     "PSL_DATA_USAGE_USER_CONTROL_OPTIONAL", "TRUE", "SINGLE_CHOICE",
     "Data usage and handling (Email address)\nIs this data required for your app, or can users choose whether it's collected?\nUsers can choose whether this data is collected"],
    ["PSL_DATA_USAGE_RESPONSES:PSL_EMAIL:DATA_USAGE_USER_CONTROL",
     "PSL_DATA_USAGE_USER_CONTROL_REQUIRED", "", "SINGLE_CHOICE",
     "Data usage and handling (Email address)\nIs this data required for your app, or can users choose whether it's collected?\nData collection is required (users can't turn off this data collection)"],
    ["PSL_DATA_USAGE_RESPONSES:PSL_EMAIL:DATA_USAGE_COLLECTION_PURPOSE",
     "PSL_APP_FUNCTIONALITY", "TRUE", "MULTIPLE_CHOICE",
     "Data usage and handling (Email address)\nWhy is this user data collected? Select all that apply.\nApp functionality"],
    ["PSL_DATA_USAGE_RESPONSES:PSL_EMAIL:DATA_USAGE_COLLECTION_PURPOSE",
     "PSL_ANALYTICS", "", "MULTIPLE_CHOICE",
     "Data usage and handling (Email address)\nWhy is this user data collected? Select all that apply.\nAnalytics"],
    ["PSL_DATA_USAGE_RESPONSES:PSL_EMAIL:DATA_USAGE_COLLECTION_PURPOSE",
     "PSL_DEVELOPER_COMMUNICATIONS", "", "MULTIPLE_CHOICE",
     "Data usage and handling (Email address)\nWhy is this user data collected? Select all that apply.\nDeveloper communications"],
    ["PSL_DATA_USAGE_RESPONSES:PSL_EMAIL:DATA_USAGE_COLLECTION_PURPOSE",
     "PSL_FRAUD_PREVENTION_SECURITY", "", "MULTIPLE_CHOICE",
     "Data usage and handling (Email address)\nWhy is this user data collected? Select all that apply.\nFraud prevention, security, and compliance"],
    ["PSL_DATA_USAGE_RESPONSES:PSL_EMAIL:DATA_USAGE_COLLECTION_PURPOSE",
     "PSL_ADVERTISING", "", "MULTIPLE_CHOICE",
     "Data usage and handling (Email address)\nWhy is this user data collected? Select all that apply.\nAdvertising or marketing"],
    ["PSL_DATA_USAGE_RESPONSES:PSL_EMAIL:DATA_USAGE_COLLECTION_PURPOSE",
     "PSL_PERSONALIZATION", "", "MULTIPLE_CHOICE",
     "Data usage and handling (Email address)\nWhy is this user data collected? Select all that apply.\nPersonalization"],
    ["PSL_DATA_USAGE_RESPONSES:PSL_EMAIL:DATA_USAGE_COLLECTION_PURPOSE",
     "PSL_ACCOUNT_MANAGEMENT", "TRUE", "MULTIPLE_CHOICE",
     "Data usage and handling (Email address)\nWhy is this user data collected? Select all that apply.\nAccount management"],

    # ── Seção 3: Uso dos dados — USER ACCOUNT (IDs) ───────────────────────────
    ["PSL_DATA_USAGE_RESPONSES:PSL_USER_ACCOUNT:PSL_DATA_USAGE_COLLECTION_AND_SHARING",
     "PSL_DATA_USAGE_ONLY_COLLECTED", "TRUE", "MULTIPLE_CHOICE",
     "Data usage and handling (Personal identifiers)\nIs this data collected, shared, or both?\nCollected"],
    ["PSL_DATA_USAGE_RESPONSES:PSL_USER_ACCOUNT:PSL_DATA_USAGE_COLLECTION_AND_SHARING",
     "PSL_DATA_USAGE_ONLY_SHARED", "", "MULTIPLE_CHOICE",
     "Data usage and handling (Personal identifiers)\nIs this data collected, shared, or both?\nShared"],
    ["PSL_DATA_USAGE_RESPONSES:PSL_USER_ACCOUNT:PSL_DATA_USAGE_EPHEMERAL",
     "", "", "MAYBE_REQUIRED",
     "Data usage and handling (Personal identifiers)\nIs this data processed ephemerally?"],
    ["PSL_DATA_USAGE_RESPONSES:PSL_USER_ACCOUNT:DATA_USAGE_USER_CONTROL",
     "PSL_DATA_USAGE_USER_CONTROL_OPTIONAL", "TRUE", "SINGLE_CHOICE",
     "Data usage and handling (Personal identifiers)\nIs this data required for your app, or can users choose whether it's collected?\nUsers can choose whether this data is collected"],
    ["PSL_DATA_USAGE_RESPONSES:PSL_USER_ACCOUNT:DATA_USAGE_USER_CONTROL",
     "PSL_DATA_USAGE_USER_CONTROL_REQUIRED", "", "SINGLE_CHOICE",
     "Data usage and handling (Personal identifiers)\nIs this data required for your app, or can users choose whether it's collected?\nData collection is required (users can't turn off this data collection)"],
    ["PSL_DATA_USAGE_RESPONSES:PSL_USER_ACCOUNT:DATA_USAGE_COLLECTION_PURPOSE",
     "PSL_APP_FUNCTIONALITY", "TRUE", "MULTIPLE_CHOICE",
     "Data usage and handling (Personal identifiers)\nWhy is this user data collected? Select all that apply.\nApp functionality"],
    ["PSL_DATA_USAGE_RESPONSES:PSL_USER_ACCOUNT:DATA_USAGE_COLLECTION_PURPOSE",
     "PSL_ANALYTICS", "", "MULTIPLE_CHOICE",
     "Data usage and handling (Personal identifiers)\nWhy is this user data collected? Select all that apply.\nAnalytics"],
    ["PSL_DATA_USAGE_RESPONSES:PSL_USER_ACCOUNT:DATA_USAGE_COLLECTION_PURPOSE",
     "PSL_DEVELOPER_COMMUNICATIONS", "", "MULTIPLE_CHOICE",
     "Data usage and handling (Personal identifiers)\nWhy is this user data collected? Select all that apply.\nDeveloper communications"],
    ["PSL_DATA_USAGE_RESPONSES:PSL_USER_ACCOUNT:DATA_USAGE_COLLECTION_PURPOSE",
     "PSL_FRAUD_PREVENTION_SECURITY", "", "MULTIPLE_CHOICE",
     "Data usage and handling (Personal identifiers)\nWhy is this user data collected? Select all that apply.\nFraud prevention, security, and compliance"],
    ["PSL_DATA_USAGE_RESPONSES:PSL_USER_ACCOUNT:DATA_USAGE_COLLECTION_PURPOSE",
     "PSL_ADVERTISING", "", "MULTIPLE_CHOICE",
     "Data usage and handling (Personal identifiers)\nWhy is this user data collected? Select all that apply.\nAdvertising or marketing"],
    ["PSL_DATA_USAGE_RESPONSES:PSL_USER_ACCOUNT:DATA_USAGE_COLLECTION_PURPOSE",
     "PSL_PERSONALIZATION", "", "MULTIPLE_CHOICE",
     "Data usage and handling (Personal identifiers)\nWhy is this user data collected? Select all that apply.\nPersonalization"],
    ["PSL_DATA_USAGE_RESPONSES:PSL_USER_ACCOUNT:DATA_USAGE_COLLECTION_PURPOSE",
     "PSL_ACCOUNT_MANAGEMENT", "TRUE", "MULTIPLE_CHOICE",
     "Data usage and handling (Personal identifiers)\nWhy is this user data collected? Select all that apply.\nAccount management"],

    # ── Seção 3: Uso dos dados — LOCALIZAÇÃO APROXIMADA ──────────────────────
    ["PSL_DATA_USAGE_RESPONSES:PSL_APPROX_LOCATION:PSL_DATA_USAGE_COLLECTION_AND_SHARING",
     "PSL_DATA_USAGE_ONLY_COLLECTED", "TRUE", "MULTIPLE_CHOICE",
     "Data usage and handling (Approximate location)\nIs this data collected, shared, or both?\nCollected"],
    ["PSL_DATA_USAGE_RESPONSES:PSL_APPROX_LOCATION:PSL_DATA_USAGE_COLLECTION_AND_SHARING",
     "PSL_DATA_USAGE_ONLY_SHARED", "", "MULTIPLE_CHOICE",
     "Data usage and handling (Approximate location)\nIs this data collected, shared, or both?\nShared"],
    # Localização é processada efêmeramente? SIM (apenas para busca, não armazenamos)
    ["PSL_DATA_USAGE_RESPONSES:PSL_APPROX_LOCATION:PSL_DATA_USAGE_EPHEMERAL",
     "", "TRUE", "MAYBE_REQUIRED",
     "Data usage and handling (Approximate location)\nIs this data processed ephemerally?"],
    # Opcional (usuário pode usar sem localização)
    ["PSL_DATA_USAGE_RESPONSES:PSL_APPROX_LOCATION:DATA_USAGE_USER_CONTROL",
     "PSL_DATA_USAGE_USER_CONTROL_OPTIONAL", "TRUE", "SINGLE_CHOICE",
     "Data usage and handling (Approximate location)\nIs this data required for your app, or can users choose whether it's collected?\nUsers can choose whether this data is collected"],
    ["PSL_DATA_USAGE_RESPONSES:PSL_APPROX_LOCATION:DATA_USAGE_USER_CONTROL",
     "PSL_DATA_USAGE_USER_CONTROL_REQUIRED", "", "SINGLE_CHOICE",
     "Data usage and handling (Approximate location)\nIs this data required for your app, or can users choose whether it's collected?\nData collection is required (users can't turn off this data collection)"],
    # Propósito: App functionality (mostrar postos próximos)
    ["PSL_DATA_USAGE_RESPONSES:PSL_APPROX_LOCATION:DATA_USAGE_COLLECTION_PURPOSE",
     "PSL_APP_FUNCTIONALITY", "TRUE", "MULTIPLE_CHOICE",
     "Data usage and handling (Approximate location)\nWhy is this user data collected? Select all that apply.\nApp functionality"],
    ["PSL_DATA_USAGE_RESPONSES:PSL_APPROX_LOCATION:DATA_USAGE_COLLECTION_PURPOSE",
     "PSL_ANALYTICS", "", "MULTIPLE_CHOICE",
     "Data usage and handling (Approximate location)\nWhy is this user data collected? Select all that apply.\nAnalytics"],
    ["PSL_DATA_USAGE_RESPONSES:PSL_APPROX_LOCATION:DATA_USAGE_COLLECTION_PURPOSE",
     "PSL_DEVELOPER_COMMUNICATIONS", "", "MULTIPLE_CHOICE",
     "Data usage and handling (Approximate location)\nWhy is this user data collected? Select all that apply.\nDeveloper communications"],
    ["PSL_DATA_USAGE_RESPONSES:PSL_APPROX_LOCATION:DATA_USAGE_COLLECTION_PURPOSE",
     "PSL_FRAUD_PREVENTION_SECURITY", "", "MULTIPLE_CHOICE",
     "Data usage and handling (Approximate location)\nWhy is this user data collected? Select all that apply.\nFraud prevention, security, and compliance"],
    ["PSL_DATA_USAGE_RESPONSES:PSL_APPROX_LOCATION:DATA_USAGE_COLLECTION_PURPOSE",
     "PSL_ADVERTISING", "", "MULTIPLE_CHOICE",
     "Data usage and handling (Approximate location)\nWhy is this user data collected? Select all that apply.\nAdvertising or marketing"],
    ["PSL_DATA_USAGE_RESPONSES:PSL_APPROX_LOCATION:DATA_USAGE_COLLECTION_PURPOSE",
     "PSL_PERSONALIZATION", "TRUE", "MULTIPLE_CHOICE",
     "Data usage and handling (Approximate location)\nWhy is this user data collected? Select all that apply.\nPersonalization"],
    ["PSL_DATA_USAGE_RESPONSES:PSL_APPROX_LOCATION:DATA_USAGE_COLLECTION_PURPOSE",
     "PSL_ACCOUNT_MANAGEMENT", "", "MULTIPLE_CHOICE",
     "Data usage and handling (Approximate location)\nWhy is this user data collected? Select all that apply.\nAccount management"],
]

# ── Montar CSV ──────────────────────────────────────────────────────────────
output = io.StringIO()
writer = csv.writer(output, lineterminator='\r\n', quoting=csv.QUOTE_MINIMAL)
writer.writerow(["Question ID (machine readable)", "Response ID (machine readable)",
                 "Response value", "Answer requirement", "Human-friendly question label"])
for row in rows:
    writer.writerow(row)

csv_content = output.getvalue()
print(f"CSV gerado: {len(csv_content)} bytes, {csv_content.count(chr(10))+1} linhas")
print("Primeiras 3 linhas do CSV:")
for line in csv_content.split('\r\n')[:3]:
    print(f"  {line}")

# ── Salvar CSV localmente para inspeção ────────────────────────────────────
with open('/home/user/rotaposto-android/data_safety_rotaposto.csv', 'w') as f:
    f.write(csv_content)
print("\nCSV salvo em data_safety_rotaposto.csv")

# ── Submeter via API ────────────────────────────────────────────────────────
print("\n--- Submetendo Data Safety via API ---")
try:
    payload = {
        "safetyLabels": csv_content  # string CSV, não objeto JSON
    }
    response = service.applications().dataSafety(
        packageName=PACKAGE_NAME,
        body=payload
    ).execute()
    print(f"✅ dataSafety submetido com sucesso!")
    print(f"   Response: {json.dumps(response)}")
except HttpError as e:
    err_body = e.content.decode() if e.content else ""
    print(f"❌ Erro HTTP {e.resp.status}: {err_body[:500]}")
except Exception as e:
    print(f"❌ Erro: {type(e).__name__}: {str(e)[:500]}")
