# RotaPosto ⛽

Aplicativo mobile-first de localização de postos de combustível com IA de Economia.

## 🌐 URLs

| Rota | Descrição |
|------|-----------|
| `/` | Redireciona para `/landing` |
| `/landing` | Landing page com planos e pagamento |
| `/app` | App móvel (max-width 430px) |
| `/admin` | Painel administrativo |

## ✅ Funcionalidades Implementadas

### App Mobile (`/app`)
- [x] 4 abas: Melhor Posto, Lista, Mapa, Planejar
- [x] Geolocalização automática (GPS do navegador)
- [x] Busca por cidade/endereço (Nominatim autocomplete)
- [x] Dados reais ANP + OpenStreetMap (787+ postos em SP)
- [x] IA de Economia: rank por custo total (preço + deslocamento)
- [x] Cache 10min por cidade (evita rate-limit)
- [x] Badges de fonte (🏛 ANP / 🗺 OSM) nos cards
- [x] Mapa interativo Leaflet com pins de preço
- [x] Modal com preços por combustível + "Ir até lá"
- [x] Reportar preço (sistema colaborativo)
- [x] Calculadora de economia (aba Planejar)
- [x] Rota OSRM com distância e tempo

### Landing Page (`/landing`)
- [x] Hero animado + contador de estatísticas
- [x] 6 feature cards
- [x] Como funciona (4 passos)
- [x] 3 planos: Grátis / Premium R$9,90/mês / Anual R$89
- [x] 3 depoimentos
- [x] FAQ accordion
- [x] Modal de pagamento com máscara CPF/cartão
- [x] Integração MercadoPago (com fallback demo)

### Backend APIs
| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/postos` | GET | Postos reais ANP + OSM com IA ranking |
| `/api/geocode` | GET | Nominatim autocomplete |
| `/api/geocode/reverso` | GET | GPS → cidade/UF |
| `/api/rota` | GET | OSRM distância e tempo |
| `/api/economia` | GET | Calculadora de economia |
| `/api/precos/reportar` | POST | Reportar preço colaborativo |
| `/api/precos/reportados` | GET | Listar reportes das últimas 24h |
| `/api/pagamento/assinar` | POST | MercadoPago Checkout |
| `/api/pagamento/webhook` | POST | Webhook MP |

### Painel Admin (`/admin`)
- [x] Dashboard com KPIs (postos, preço médio, reportes)
- [x] Gráfico Chart.js de preços por bandeira
- [x] Tabela de postos com fonte (ANP/OSM)
- [x] Lista de preços colaborativos
- [x] Mapa Leaflet ao vivo com todos os postos
- [x] Auto-refresh a cada 5 minutos

## 🔌 APIs Externas Integradas

| API | Uso | Status |
|-----|-----|--------|
| ANP Revendedores | Cadastro real de postos (CNPJ, lat/lng, bandeira) | ✅ |
| Overpass/OSM | Postos via OpenStreetMap (fallback + complemento) | ✅ |
| Nominatim | Geocode + reverse geocode (GPS → cidade/UF) | ✅ |
| OSRM | Cálculo de rota (distância + tempo) | ✅ |
| MercadoPago | Checkout de assinatura (demo mode sem token) | ✅ |

## 🤖 IA de Economia

Fórmula do score:
```
score = (preço × litros_tanque) + (distância_km × 2 / consumo_kmL × preço_combustível)
```
Considera o custo real do motorista: combustível + deslocamento até o posto.

## 📊 Dados

- **Fonte primária**: API ANP (postos cadastrados com lat/lng oficial)
- **Fonte secundária**: Overpass API / OpenStreetMap
- **Preços**: Estimados por bandeira (ANP jun/2025) + colaborativos
- **Cache**: 10 minutos por cidade (memória)

## 🛠 Stack Técnico

- **Framework**: Hono 4 (Cloudflare Pages/Workers)
- **Build**: Vite + @hono/vite-cloudflare-pages
- **Deploy**: Wrangler Pages
- **Frontend**: HTML/CSS/JS puro + Leaflet + Chart.js + Tailwind CDN
- **Font**: Raleway (Google Fonts)
- **PM2**: wrangler pages dev (sandbox)

## 🚀 Rodar Localmente

```bash
npm install
npm run build
pm2 start ecosystem.config.cjs
# ou
npx wrangler pages dev dist --ip 0.0.0.0 --port 3000
```

## 📋 Próximos Passos

- [ ] Firebase Auth (login Google/Apple)
- [ ] Cloudflare D1 para persistência de preços colaborativos
- [ ] Notificações push (preço abaixou no seu posto favorito)
- [ ] Google Places (fotos, avaliações, horários)
- [ ] OpenWeather (clima no posto)
- [ ] Histórico de preços por posto (gráfico temporal)
- [ ] Deploy produção Cloudflare Pages

## 📅 Última Atualização

2026-06-27 — Integração real ANP + OSM + IA de Economia + Admin + Preços Colaborativos
