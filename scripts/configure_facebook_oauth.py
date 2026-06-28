#!/usr/bin/env python3
"""
Script para configurar Facebook Login OAuth via Graph API
Executar: python3 configure_facebook_oauth.py <APP_SECRET>
"""

import sys
import json
import urllib.request
import urllib.parse

FB_APP_ID = "918697037942559"
FIREBASE_CALLBACK = "https://rotaposto-32e33.firebaseapp.com/__/auth/handler"
ROTAPOSTO_DOMAIN = "https://rotaposto.com.br"
ROTAPOSTO_WWW = "https://www.rotaposto.com.br"
ROTAPOSTO_PAGES = "https://rotaposto.pages.dev"

def fb_request(endpoint, method="GET", params=None, body=None, app_token=None):
    """Helper para chamadas à Graph API do Facebook"""
    base_url = f"https://graph.facebook.com/v25.0/{endpoint}"
    
    if params:
        qs = urllib.parse.urlencode(params)
        url = f"{base_url}?{qs}"
    else:
        url = base_url
    
    if body:
        body["access_token"] = app_token
        data = urllib.parse.urlencode(body).encode()
    else:
        data = None
    
    if method == "GET" and not params:
        url = f"{url}?access_token={app_token}"
    
    req = urllib.request.Request(url, data=data, method=method)
    if data:
        req.add_header("Content-Type", "application/x-www-form-urlencoded")
    
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return json.loads(e.read())

def main():
    if len(sys.argv) < 2:
        print("Uso: python3 configure_facebook_oauth.py <APP_SECRET>")
        print(f"\nApp ID: {FB_APP_ID}")
        print("Você encontra o App Secret em:")
        print("  developers.facebook.com > ShareWallet/RotaPosto > Configurações > Básico")
        sys.exit(1)
    
    app_secret = sys.argv[1]
    app_token = f"{FB_APP_ID}|{app_secret}"
    
    print(f"[1/5] Verificando token de acesso...")
    info = fb_request(FB_APP_ID, params={"fields": "id,name", "access_token": app_token})
    if "error" in info:
        print(f"  ❌ Erro: {info['error']['message']}")
        print("  Verifique se o App Secret está correto")
        sys.exit(1)
    print(f"  ✓ App: {info['name']} (ID: {info['id']})")
    
    print(f"\n[2/5] Configurando URIs de redirecionamento OAuth válidos...")
    result = fb_request(FB_APP_ID, method="POST", body={
        "valid_oauth_redirect_uris": FIREBASE_CALLBACK
    }, app_token=app_token)
    if "error" in result:
        print(f"  ❌ Erro: {result['error']['message']}")
        if result['error']['code'] == 10:
            print("\n  ⚠️  A API está bloqueada!")
            print("  Ative o toggle 'Permitir acesso da API às configurações do aplicativo'")
            print("  Em: developers.facebook.com > App > Configurações > Avançado > Segurança")
    else:
        print(f"  ✓ Resultado: {result}")
    
    print(f"\n[3/5] Configurando origens JavaScript válidas...")
    result = fb_request(FB_APP_ID, method="POST", body={
        "website_url": ROTAPOSTO_DOMAIN
    }, app_token=app_token)
    if "error" in result:
        print(f"  ❌ Erro: {result['error']['message']}")
    else:
        print(f"  ✓ Website URL configurado: {ROTAPOSTO_DOMAIN}")
    
    print(f"\n[4/5] Verificando configuração atual...")
    result = fb_request(
        FB_APP_ID,
        params={"fields": "id,name,website_url", "access_token": app_token}
    )
    print(f"  App: {result.get('name')}")
    print(f"  Website: {result.get('website_url', 'não configurado')}")
    
    print(f"\n[5/5] Teste de validação do redirect_uri...")
    test = fb_request(
        "oauth/access_token",
        params={
            "client_id": FB_APP_ID,
            "redirect_uri": FIREBASE_CALLBACK,
            "client_secret": app_secret
        }
    )
    if "error" in test:
        if test['error']['code'] == 191:
            print(f"  ❌ URI ainda não autorizada: {test['error']['message']}")
        else:
            # Outros erros esperados (ex: falta code param) = URI foi aceita!
            print(f"  ✓ URI aceita pelo Facebook (erro esperado sobre 'code')")
    else:
        print(f"  ✓ OK")
    
    print("\n=== PRÓXIMOS PASSOS ===")
    print("1. Configure as 'Origens JavaScript válidas' no Facebook Login:")
    print(f"   - {ROTAPOSTO_DOMAIN}")
    print(f"   - {ROTAPOSTO_WWW}")
    print(f"   - {ROTAPOSTO_PAGES}")
    print("\n2. URL direta:")
    print(f"   developers.facebook.com/apps/{FB_APP_ID}/fb-login/settings")

if __name__ == "__main__":
    main()
