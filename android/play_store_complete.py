#!/usr/bin/env python3
"""
Script completo para configurar todas as seções do Play Store via API
RotaPosto - br.com.rotaposto.app
"""

import json
import sys
import time
import traceback
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# ─── Configuração ────────────────────────────────────────────────────────────
SERVICE_ACCOUNT_FILE = '/home/user/rotaposto-android/service-account.json'
PACKAGE_NAME = 'br.com.rotaposto.app'
SCOPES = ['https://www.googleapis.com/auth/androidpublisher']

# ─── Auth ─────────────────────────────────────────────────────────────────────
credentials = service_account.Credentials.from_service_account_file(
    SERVICE_ACCOUNT_FILE, scopes=SCOPES
)
service = build('androidpublisher', 'v3', credentials=credentials)

results = {}

def log(section, status, detail=""):
    icon = "✅" if status == "ok" else "❌" if status == "error" else "⚠️"
    print(f"{icon} [{section}] {detail}")
    results[section] = {"status": status, "detail": detail}

# ─── 1. Criar edit ─────────────────────────────────────────────────────────────
print("\n" + "="*60)
print("PLAY STORE - CONFIGURAÇÃO COMPLETA - RotaPosto")
print("="*60 + "\n")

try:
    edit = service.edits().insert(packageName=PACKAGE_NAME, body={}).execute()
    edit_id = edit['id']
    log("edit_create", "ok", f"editId={edit_id}")
except Exception as e:
    log("edit_create", "error", str(e))
    sys.exit(1)

# ─── 2. Listing pt-BR ──────────────────────────────────────────────────────────
try:
    listing_ptbr = {
        "language": "pt-BR",
        "title": "RotaPosto - Combustível Barato",
        "shortDescription": "Compare preços de combustível e economize em postos próximos.",
        "fullDescription": """Encontre os menores preços de combustível perto de você com o RotaPosto!

🔍 COMPARE PREÇOS EM TEMPO REAL
Consulte preços de gasolina, etanol, diesel e GNV em postos próximos. Dados atualizados diariamente com base nas tabelas oficiais da ANP (Agência Nacional do Petróleo).

📍 POSTOS MAIS PRÓXIMOS
Veja os postos ordenados por distância. Encontre facilmente o posto mais conveniente no seu trajeto.

💰 ECONOMIZE NAS ABASTECIDAS
Compare os preços antes de abastecer e escolha sempre a melhor opção. Pequenas economias fazem grande diferença no orçamento mensal.

🗺️ MAPA INTERATIVO
Visualize todos os postos em um mapa intuitivo. Veja endereço, preços e avalie qual vale mais a pena.

⚡ RÁPIDO E SIMPLES
Interface limpa e objetiva. Encontre o que precisa em segundos, sem complicação.

🔒 PRIVACIDADE RESPEITADA
Seus dados são protegidos conforme a LGPD. Não vendemos informações para terceiros.
Política de privacidade: https://rotaposto.pages.dev/privacidade

📊 DADOS OFICIAIS DA ANP
Preços coletados da Agência Nacional do Petróleo, Gás Natural e Biocombustíveis — fonte oficial do governo brasileiro.

Termos de uso: https://rotaposto.pages.dev/termos""",
        "video": ""
    }
    service.edits().listings().update(
        packageName=PACKAGE_NAME,
        editId=edit_id,
        language='pt-BR',
        body=listing_ptbr
    ).execute()
    log("listing_pt-BR", "ok", "Título e descrições atualizados")
except Exception as e:
    log("listing_pt-BR", "error", str(e))

# ─── 3. Listing en-US ──────────────────────────────────────────────────────────
try:
    listing_enus = {
        "language": "en-US",
        "title": "RotaPosto - Find Cheap Gas",
        "shortDescription": "Compare fuel prices and save money at nearby gas stations.",
        "fullDescription": """Find the cheapest fuel prices near you with RotaPosto!

🔍 REAL-TIME PRICE COMPARISON
Check gasoline, ethanol, diesel and CNG prices at nearby gas stations. Data updated daily based on official ANP (Brazilian National Petroleum Agency) tables.

📍 NEAREST GAS STATIONS
View stations sorted by distance. Easily find the most convenient station on your route.

💰 SAVE ON EVERY FILL-UP
Compare prices before fueling and always choose the best option. Small savings make a big difference in your monthly budget.

🗺️ INTERACTIVE MAP
View all stations on an intuitive map. See address, prices and decide which is worth it.

⚡ FAST AND SIMPLE
Clean and straightforward interface. Find what you need in seconds.

🔒 PRIVACY PROTECTED
Your data is protected under Brazilian law (LGPD). We do not sell information to third parties.
Privacy policy: https://rotaposto.pages.dev/privacidade

📊 OFFICIAL ANP DATA
Prices collected from the National Agency of Petroleum, Natural Gas and Biofuels — official Brazilian government source.""",
        "video": ""
    }
    service.edits().listings().update(
        packageName=PACKAGE_NAME,
        editId=edit_id,
        language='en-US',
        body=listing_enus
    ).execute()
    log("listing_en-US", "ok", "Título e descrições atualizados")
except Exception as e:
    log("listing_en-US", "error", str(e))

# ─── 4. App Details (categoria, email, website, privacidade) ───────────────────
try:
    app_details = {
        "contactEmail": "rotaposto@gmail.com",
        "contactWebsite": "https://rotaposto.pages.dev",
        "contactPhone": "",
        "defaultLanguage": "pt-BR"
    }
    service.edits().details().update(
        packageName=PACKAGE_NAME,
        editId=edit_id,
        body=app_details
    ).execute()
    log("app_details", "ok", "Email, website e idioma padrão configurados")
except Exception as e:
    log("app_details", "error", str(e))

# ─── 5. Commit do edit ─────────────────────────────────────────────────────────
try:
    commit_result = service.edits().commit(
        packageName=PACKAGE_NAME,
        editId=edit_id
    ).execute()
    log("edit_commit", "ok", f"editId={commit_result.get('id')} committed")
except Exception as e:
    log("edit_commit", "error", str(e))

# ─── 6. Data Safety (endpoint separado, fora de edit) ─────────────────────────
print("\n--- Tentando endpoint dataSafety ---")
try:
    # Payload de Safety Labels para o RotaPosto
    # App: localização, login com Google, sem anúncios, sem compartilhamento comercial
    data_safety_payload = {
        "safetyLabels": {
            "dataShared": [
                {
                    "dataType": "LOCATION",
                    "dataTypeName": "Approximate location",
                    "dataCollection": True,
                    "dataSharing": False,
                    "dataUsage": ["APP_FUNCTIONALITY"],
                    "optional": False
                }
            ],
            "dataCollected": [
                {
                    "dataType": "EMAIL_ADDRESS",
                    "dataTypeName": "Email address",
                    "dataCollection": True,
                    "dataSharing": False,
                    "dataUsage": ["APP_FUNCTIONALITY", "ACCOUNT_MANAGEMENT"],
                    "optional": False
                },
                {
                    "dataType": "USER_IDS",
                    "dataTypeName": "User IDs",
                    "dataCollection": True,
                    "dataSharing": False,
                    "dataUsage": ["APP_FUNCTIONALITY", "ACCOUNT_MANAGEMENT"],
                    "optional": False
                },
                {
                    "dataType": "APPROXIMATE_LOCATION",
                    "dataTypeName": "Approximate location",
                    "dataCollection": True,
                    "dataSharing": False,
                    "dataUsage": ["APP_FUNCTIONALITY"],
                    "optional": False
                }
            ],
            "securityPractices": {
                "dataEncryptedInTransit": True,
                "dataDeletedOnRequest": True,
                "independentSecurityReview": False,
                "followsGooglePlayPolicy": True
            },
            "privacyPolicyUrl": "https://rotaposto.pages.dev/privacidade"
        }
    }
    
    response = service.applications().dataSafety(
        packageName=PACKAGE_NAME,
        body=data_safety_payload
    ).execute()
    log("dataSafety", "ok", f"Safety Labels enviados: {json.dumps(response)[:200]}")
except HttpError as e:
    err_content = json.loads(e.content.decode()) if e.content else {}
    log("dataSafety", "error", f"HTTP {e.resp.status}: {err_content.get('error', {}).get('message', str(e))[:300]}")
except AttributeError as e:
    log("dataSafety", "error", f"Método não disponível na versão da lib: {e}")
except Exception as e:
    log("dataSafety", "error", f"{type(e).__name__}: {str(e)[:300]}")

# ─── 7. Verificar track Internal Testing ──────────────────────────────────────
print("\n--- Verificando Internal Testing track ---")
try:
    edit2 = service.edits().insert(packageName=PACKAGE_NAME, body={}).execute()
    edit2_id = edit2['id']
    
    tracks = service.edits().tracks().list(
        packageName=PACKAGE_NAME,
        editId=edit2_id
    ).execute()
    
    internal_track = None
    for track in tracks.get('tracks', []):
        if track.get('track') == 'internal':
            internal_track = track
    
    if internal_track:
        releases = internal_track.get('releases', [])
        latest = releases[-1] if releases else {}
        log("internal_track", "ok", 
            f"Status: {latest.get('status')} | VersionCode: {latest.get('versionCodes', [])} | Name: {latest.get('name','')}")
    else:
        log("internal_track", "warn", f"Track internal não encontrado. Tracks: {[t.get('track') for t in tracks.get('tracks', [])]}")
    
    # Abortar edit sem commit (só leitura)
    service.edits().delete(packageName=PACKAGE_NAME, editId=edit2_id).execute()
except Exception as e:
    log("internal_track", "error", str(e))

# ─── 8. Verificar Reviews (opcional) ─────────────────────────────────────────
print("\n--- Verificando Reviews ---")
try:
    reviews = service.reviews().list(
        packageName=PACKAGE_NAME,
        maxResults=5
    ).execute()
    count = len(reviews.get('reviews', []))
    log("reviews", "ok", f"{count} reviews encontradas")
except Exception as e:
    log("reviews", "error", str(e)[:200])

# ─── 9. Verificar APKs/Bundles disponíveis ────────────────────────────────────
print("\n--- Verificando Bundles no Internal Testing ---")
try:
    edit3 = service.edits().insert(packageName=PACKAGE_NAME, body={}).execute()
    edit3_id = edit3['id']
    
    bundles = service.edits().bundles().list(
        packageName=PACKAGE_NAME,
        editId=edit3_id
    ).execute()
    
    bundle_list = bundles.get('bundles', [])
    if bundle_list:
        for b in bundle_list[-3:]:  # últimos 3
            log(f"bundle_vc{b.get('versionCode')}", "ok", 
                f"versionCode={b.get('versionCode')} sha1={b.get('sha1','-')[:20]}")
    else:
        log("bundles", "warn", "Nenhum bundle encontrado")
    
    service.edits().delete(packageName=PACKAGE_NAME, editId=edit3_id).execute()
except Exception as e:
    log("bundles", "error", str(e)[:200])

# ─── Resumo Final ─────────────────────────────────────────────────────────────
print("\n" + "="*60)
print("RESUMO FINAL")
print("="*60)
for section, info in results.items():
    icon = "✅" if info['status'] == "ok" else "❌" if info['status'] == "error" else "⚠️"
    print(f"{icon} {section}: {info['detail'][:80]}")

print("\n" + "="*60)
print("O QUE AINDA REQUER PLAY CONSOLE MANUAL")
print("="*60)
manual_tasks = [
    ("Política de Privacidade URL", "App content > Privacy policy → https://rotaposto.pages.dev/privacidade"),
    ("Classificação de conteúdo", "App content > Content rating → Executar questionário (Everyone)"),
    ("Segurança dos dados", "App content > Data safety → Formulário visual (se dataSafety API falhou)"),
    ("Anúncios", "App content > Ads → Marcar 'Não contém anúncios'"),
    ("Público-alvo", "App content > Target audience → Marcar '18 anos ou mais'"),
    ("Detalhes de login", "App content > App access → 'Todas as funções acessíveis sem login especial'"),
    ("Recursos financeiros", "App content > Financial features → 'Não'"),
    ("Saúde", "App content > Health features → 'Não'"),
    ("Apps governamentais", "App content > Government apps → 'Não'"),
    ("Categoria", "Store presence > App category → 'Viagens e informações locais'"),
    ("Testadores", "Testing > Internal testing > Testers → Adicionar Kainow252@gmail.com e gelci.jose.grouptrig@gmail.com"),
]
for i, (task, instruction) in enumerate(manual_tasks, 1):
    print(f"{i:2}. {task}")
    print(f"    → {instruction}")
