#!/usr/bin/env python3
"""
Submete Data Safety para o RotaPosto usando o template oficial do Google
como base, modificando apenas as respostas relevantes.

Estratégia: partir do template oficial (2207 linhas) e setar TRUE/FALSE
nas linhas correspondentes ao RotaPosto.
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

# ── Ler template oficial ──────────────────────────────────────────────────────
with open('/tmp/data_safety_template.csv', 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    template_rows = list(reader)

header = template_rows[0]
data_rows = template_rows[1:]

print(f"Template carregado: {len(data_rows)} linhas de dados")

# ── Definir respostas do RotaPosto ────────────────────────────────────────────
# Formato: {(question_id, response_id): True/False/None}
# None = deixar em branco (não selecionado), True = "TRUE", False = "FALSE"

rotaposto_answers = {
    # ── Seção 1: Coleta dados? ────────────────────────────────────────────────
    ("PSL_DATA_COLLECTION_COLLECTS_PERSONAL_DATA", ""):          True,   # SIM, coletamos
    ("PSL_DATA_COLLECTION_ENCRYPTED_IN_TRANSIT", ""):            True,   # SIM, HTTPS
    ("PSL_DATA_COLLECTION_USER_REQUEST_DELETE", ""):             True,   # SIM, via email

    # ── Seção 2: Tipos de dados coletados ─────────────────────────────────────
    # Personal info
    ("PSL_DATA_TYPES_PERSONAL", "PSL_NAME"):                     True,   # Nome via Google
    ("PSL_DATA_TYPES_PERSONAL", "PSL_EMAIL"):                    True,   # Email via Google
    ("PSL_DATA_TYPES_PERSONAL", "PSL_USER_ACCOUNT"):             True,   # User ID Firebase/Google
    ("PSL_DATA_TYPES_PERSONAL", "PSL_ADDRESS"):                  None,
    ("PSL_DATA_TYPES_PERSONAL", "PSL_PHONE"):                    None,
    ("PSL_DATA_TYPES_PERSONAL", "PSL_RACE_ETHNICITY"):           None,
    ("PSL_DATA_TYPES_PERSONAL", "PSL_POLITICAL_RELIGIOUS"):      None,
    ("PSL_DATA_TYPES_PERSONAL", "PSL_SEXUAL_ORIENTATION_GENDER_IDENTITY"): None,
    ("PSL_DATA_TYPES_PERSONAL", "PSL_OTHER_PERSONAL"):           None,

    # Financial: NÃO
    ("PSL_DATA_TYPES_FINANCIAL", "PSL_PURCHASE_HISTORY"):        None,
    ("PSL_DATA_TYPES_FINANCIAL", "PSL_CREDIT_SCORE"):            None,
    ("PSL_DATA_TYPES_FINANCIAL", "PSL_CREDIT_DEBIT_BANK_ACCOUNT_NUMBER"): None,
    ("PSL_DATA_TYPES_FINANCIAL", "PSL_OTHER"):                   None,

    # Location: SIM (aproximada)
    ("PSL_DATA_TYPES_LOCATION", "PSL_APPROX_LOCATION"):          True,
    ("PSL_DATA_TYPES_LOCATION", "PSL_PRECISE_LOCATION"):         None,

    # ── NAME: coletado, não ephemeral, optional, app functionality + account mgmt
    ("PSL_DATA_USAGE_RESPONSES:PSL_NAME:PSL_DATA_USAGE_COLLECTION_AND_SHARING", "PSL_DATA_USAGE_ONLY_COLLECTED"): True,
    ("PSL_DATA_USAGE_RESPONSES:PSL_NAME:PSL_DATA_USAGE_COLLECTION_AND_SHARING", "PSL_DATA_USAGE_ONLY_SHARED"):    None,
    ("PSL_DATA_USAGE_RESPONSES:PSL_NAME:PSL_DATA_USAGE_EPHEMERAL", ""):                                           False,  # NÃO ephemeral
    ("PSL_DATA_USAGE_RESPONSES:PSL_NAME:DATA_USAGE_USER_CONTROL", "PSL_DATA_USAGE_USER_CONTROL_OPTIONAL"):        True,   # opcional (pode usar sem login)
    ("PSL_DATA_USAGE_RESPONSES:PSL_NAME:DATA_USAGE_USER_CONTROL", "PSL_DATA_USAGE_USER_CONTROL_REQUIRED"):        None,
    ("PSL_DATA_USAGE_RESPONSES:PSL_NAME:DATA_USAGE_COLLECTION_PURPOSE", "PSL_APP_FUNCTIONALITY"):                 True,
    ("PSL_DATA_USAGE_RESPONSES:PSL_NAME:DATA_USAGE_COLLECTION_PURPOSE", "PSL_ANALYTICS"):                         None,
    ("PSL_DATA_USAGE_RESPONSES:PSL_NAME:DATA_USAGE_COLLECTION_PURPOSE", "PSL_DEVELOPER_COMMUNICATIONS"):          None,
    ("PSL_DATA_USAGE_RESPONSES:PSL_NAME:DATA_USAGE_COLLECTION_PURPOSE", "PSL_FRAUD_PREVENTION_SECURITY"):         None,
    ("PSL_DATA_USAGE_RESPONSES:PSL_NAME:DATA_USAGE_COLLECTION_PURPOSE", "PSL_ADVERTISING"):                       None,
    ("PSL_DATA_USAGE_RESPONSES:PSL_NAME:DATA_USAGE_COLLECTION_PURPOSE", "PSL_PERSONALIZATION"):                   None,
    ("PSL_DATA_USAGE_RESPONSES:PSL_NAME:DATA_USAGE_COLLECTION_PURPOSE", "PSL_ACCOUNT_MANAGEMENT"):                True,

    # ── EMAIL: coletado, não ephemeral, optional, app functionality + account mgmt
    ("PSL_DATA_USAGE_RESPONSES:PSL_EMAIL:PSL_DATA_USAGE_COLLECTION_AND_SHARING", "PSL_DATA_USAGE_ONLY_COLLECTED"): True,
    ("PSL_DATA_USAGE_RESPONSES:PSL_EMAIL:PSL_DATA_USAGE_COLLECTION_AND_SHARING", "PSL_DATA_USAGE_ONLY_SHARED"):    None,
    ("PSL_DATA_USAGE_RESPONSES:PSL_EMAIL:PSL_DATA_USAGE_EPHEMERAL", ""):                                           False,
    ("PSL_DATA_USAGE_RESPONSES:PSL_EMAIL:DATA_USAGE_USER_CONTROL", "PSL_DATA_USAGE_USER_CONTROL_OPTIONAL"):        True,
    ("PSL_DATA_USAGE_RESPONSES:PSL_EMAIL:DATA_USAGE_USER_CONTROL", "PSL_DATA_USAGE_USER_CONTROL_REQUIRED"):        None,
    ("PSL_DATA_USAGE_RESPONSES:PSL_EMAIL:DATA_USAGE_COLLECTION_PURPOSE", "PSL_APP_FUNCTIONALITY"):                 True,
    ("PSL_DATA_USAGE_RESPONSES:PSL_EMAIL:DATA_USAGE_COLLECTION_PURPOSE", "PSL_ANALYTICS"):                         None,
    ("PSL_DATA_USAGE_RESPONSES:PSL_EMAIL:DATA_USAGE_COLLECTION_PURPOSE", "PSL_DEVELOPER_COMMUNICATIONS"):          None,
    ("PSL_DATA_USAGE_RESPONSES:PSL_EMAIL:DATA_USAGE_COLLECTION_PURPOSE", "PSL_FRAUD_PREVENTION_SECURITY"):         None,
    ("PSL_DATA_USAGE_RESPONSES:PSL_EMAIL:DATA_USAGE_COLLECTION_PURPOSE", "PSL_ADVERTISING"):                       None,
    ("PSL_DATA_USAGE_RESPONSES:PSL_EMAIL:DATA_USAGE_COLLECTION_PURPOSE", "PSL_PERSONALIZATION"):                   None,
    ("PSL_DATA_USAGE_RESPONSES:PSL_EMAIL:DATA_USAGE_COLLECTION_PURPOSE", "PSL_ACCOUNT_MANAGEMENT"):                True,

    # ── USER_ACCOUNT (IDs): coletado, não ephemeral, optional
    ("PSL_DATA_USAGE_RESPONSES:PSL_USER_ACCOUNT:PSL_DATA_USAGE_COLLECTION_AND_SHARING", "PSL_DATA_USAGE_ONLY_COLLECTED"): True,
    ("PSL_DATA_USAGE_RESPONSES:PSL_USER_ACCOUNT:PSL_DATA_USAGE_COLLECTION_AND_SHARING", "PSL_DATA_USAGE_ONLY_SHARED"):    None,
    ("PSL_DATA_USAGE_RESPONSES:PSL_USER_ACCOUNT:PSL_DATA_USAGE_EPHEMERAL", ""):                                           False,
    ("PSL_DATA_USAGE_RESPONSES:PSL_USER_ACCOUNT:DATA_USAGE_USER_CONTROL", "PSL_DATA_USAGE_USER_CONTROL_OPTIONAL"):        True,
    ("PSL_DATA_USAGE_RESPONSES:PSL_USER_ACCOUNT:DATA_USAGE_USER_CONTROL", "PSL_DATA_USAGE_USER_CONTROL_REQUIRED"):        None,
    ("PSL_DATA_USAGE_RESPONSES:PSL_USER_ACCOUNT:DATA_USAGE_COLLECTION_PURPOSE", "PSL_APP_FUNCTIONALITY"):                 True,
    ("PSL_DATA_USAGE_RESPONSES:PSL_USER_ACCOUNT:DATA_USAGE_COLLECTION_PURPOSE", "PSL_ANALYTICS"):                         None,
    ("PSL_DATA_USAGE_RESPONSES:PSL_USER_ACCOUNT:DATA_USAGE_COLLECTION_PURPOSE", "PSL_DEVELOPER_COMMUNICATIONS"):          None,
    ("PSL_DATA_USAGE_RESPONSES:PSL_USER_ACCOUNT:DATA_USAGE_COLLECTION_PURPOSE", "PSL_FRAUD_PREVENTION_SECURITY"):         None,
    ("PSL_DATA_USAGE_RESPONSES:PSL_USER_ACCOUNT:DATA_USAGE_COLLECTION_PURPOSE", "PSL_ADVERTISING"):                       None,
    ("PSL_DATA_USAGE_RESPONSES:PSL_USER_ACCOUNT:DATA_USAGE_COLLECTION_PURPOSE", "PSL_PERSONALIZATION"):                   None,
    ("PSL_DATA_USAGE_RESPONSES:PSL_USER_ACCOUNT:DATA_USAGE_COLLECTION_PURPOSE", "PSL_ACCOUNT_MANAGEMENT"):                True,

    # ── APPROX_LOCATION: coletado, ephemeral (não armazenamos), optional, app functionality + personalization
    ("PSL_DATA_USAGE_RESPONSES:PSL_APPROX_LOCATION:PSL_DATA_USAGE_COLLECTION_AND_SHARING", "PSL_DATA_USAGE_ONLY_COLLECTED"): True,
    ("PSL_DATA_USAGE_RESPONSES:PSL_APPROX_LOCATION:PSL_DATA_USAGE_COLLECTION_AND_SHARING", "PSL_DATA_USAGE_ONLY_SHARED"):    None,
    ("PSL_DATA_USAGE_RESPONSES:PSL_APPROX_LOCATION:PSL_DATA_USAGE_EPHEMERAL", ""):                                           True,  # SIM ephemeral
    ("PSL_DATA_USAGE_RESPONSES:PSL_APPROX_LOCATION:DATA_USAGE_USER_CONTROL", "PSL_DATA_USAGE_USER_CONTROL_OPTIONAL"):        True,
    ("PSL_DATA_USAGE_RESPONSES:PSL_APPROX_LOCATION:DATA_USAGE_USER_CONTROL", "PSL_DATA_USAGE_USER_CONTROL_REQUIRED"):        None,
    ("PSL_DATA_USAGE_RESPONSES:PSL_APPROX_LOCATION:DATA_USAGE_COLLECTION_PURPOSE", "PSL_APP_FUNCTIONALITY"):                 True,
    ("PSL_DATA_USAGE_RESPONSES:PSL_APPROX_LOCATION:DATA_USAGE_COLLECTION_PURPOSE", "PSL_ANALYTICS"):                         None,
    ("PSL_DATA_USAGE_RESPONSES:PSL_APPROX_LOCATION:DATA_USAGE_COLLECTION_PURPOSE", "PSL_DEVELOPER_COMMUNICATIONS"):          None,
    ("PSL_DATA_USAGE_RESPONSES:PSL_APPROX_LOCATION:DATA_USAGE_COLLECTION_PURPOSE", "PSL_FRAUD_PREVENTION_SECURITY"):         None,
    ("PSL_DATA_USAGE_RESPONSES:PSL_APPROX_LOCATION:DATA_USAGE_COLLECTION_PURPOSE", "PSL_ADVERTISING"):                       None,
    ("PSL_DATA_USAGE_RESPONSES:PSL_APPROX_LOCATION:DATA_USAGE_COLLECTION_PURPOSE", "PSL_PERSONALIZATION"):                   True,  # mostrar postos pertos
    ("PSL_DATA_USAGE_RESPONSES:PSL_APPROX_LOCATION:DATA_USAGE_COLLECTION_PURPOSE", "PSL_ACCOUNT_MANAGEMENT"):                None,
}

# ── Aplicar respostas ao template ─────────────────────────────────────────────
modified_count = 0
output_rows = [header]

for row in data_rows:
    if len(row) < 4:
        output_rows.append(row)
        continue

    question_id = row[0]
    response_id = row[1] if len(row) > 1 else ""
    current_value = row[2] if len(row) > 2 else ""

    key = (question_id, response_id)
    answer = rotaposto_answers.get(key)

    new_row = list(row)

    if answer is True:
        new_row[2] = "TRUE"
        modified_count += 1
    elif answer is False:
        new_row[2] = "FALSE"
        modified_count += 1
    elif answer is None:
        new_row[2] = ""  # não selecionado
    # else: manter valor original do template

    output_rows.append(new_row)

print(f"Respostas modificadas: {modified_count}")

# ── Gerar CSV de saída ─────────────────────────────────────────────────────────
output = io.StringIO()
writer = csv.writer(output, lineterminator='\r\n', quoting=csv.QUOTE_MINIMAL)
for row in output_rows:
    writer.writerow(row)

csv_content = output.getvalue()
print(f"CSV final: {len(csv_content)} bytes, {len(output_rows)} linhas total")

# Salvar para inspeção
with open('/home/user/rotaposto-android/data_safety_rotaposto_v2.csv', 'w') as f:
    f.write(csv_content)
print("CSV salvo: data_safety_rotaposto_v2.csv")

# ── Submeter via API ───────────────────────────────────────────────────────────
print("\n--- Submetendo Data Safety (v2 - template completo) ---")
try:
    payload = {"safetyLabels": csv_content}
    response = service.applications().dataSafety(
        packageName=PACKAGE_NAME,
        body=payload
    ).execute()
    print(f"✅ Data Safety submetido com sucesso!")
    print(f"   Response: {json.dumps(response)}")
except HttpError as e:
    err_body = e.content.decode() if e.content else ""
    print(f"❌ Erro HTTP {e.resp.status}:")
    # Exibir erros específicos para correção
    try:
        err_json = json.loads(err_body)
        msg = err_json.get('error', {}).get('message', err_body)
        print(f"   {msg}")
    except:
        print(f"   {err_body[:1000]}")
except Exception as e:
    print(f"❌ Erro: {type(e).__name__}: {str(e)[:500]}")
