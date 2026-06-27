# RotaPosto ⛽

**Encontre o posto mais barato e economize no combustível**

## Visão Geral
RotaPosto é um aplicativo web mobile-first para motoristas que querem economizar no combustível. Diferente de apps genéricos, ele combina geolocalização, listagem de preços e calculadora de economia em uma interface fluida e intuitiva — inspirada no visual do Completaí.

## Funcionalidades Implementadas

### ⭐ Aba "Melhor" (Destaque)
- Banner com o **melhor posto** (menor preço) próximo ao usuário
- Exibe: preço, distância, economia por litro, economia no tanque cheio
- **Ranking de preços** com até 5 postos ordenados
- Botão **"Ir até lá"** abre rota no OpenStreetMap
- Alternância de ordenação: Menor Preço / Mais Próximo

### 📋 Aba "Lista"
- Lista completa de postos próximos
- Cards com: bandeira, nome, endereço, distância, preço, badge "mais barato"
- Filtros por combustível: Gasolina, Etanol, Diesel, GNV

### 🗺️ Aba "Mapa"
- Mapa interativo via **Leaflet + OpenStreetMap**
- Marcadores com preços direto no pin
- Popup com detalhes e acesso ao modal do posto

### 🔢 Aba "Planejar"
- **Calculadora de economia**: compara preço atual vs. melhor preço
- Resultados: economia/L, economia no tanque, valor total, km de autonomia
- Resultado da última **rota calculada** via OSRM
- Link para abrir rota no OpenStreetMap

### 🔍 Busca e Geolocalização
- Barra de busca com autocomplete (Nominatim/OpenStreetMap)
- Geolocalização automática do dispositivo
- Sugestões de cidades e endereços

## APIs Backend (Hono + Cloudflare Workers)

| Endpoint | Descrição |
|---|---|
| `GET /api/postos` | Lista postos próximos, ordenados por preço |
| `GET /api/economia` | Calcula economia entre dois preços |
| `GET /api/rota` | Calcula rota via OSRM (OpenStreetMap) |
| `GET /api/geocode` | Busca endereço via Nominatim |

### Parâmetros `/api/postos`
```
lat, lng, raio (km), combustivel (gasolina|etanol|diesel|gnv)
```

### Exemplo de Resposta `/api/postos`
```json
{
  "postos": [
    {
      "id": "3",
      "nome": "Posto BR Higienópolis",
      "bandeira": "BR",
      "preco": 5.69,
      "distancia": 1.92,
      "melhor": true,
      "rank": 1
    }
  ],
  "estatisticas": {
    "menorPreco": 5.69,
    "mediaPreco": 5.98,
    "totalPostos": 8
  }
}
```

## Fontes de Dados
- **Postos**: Dados mock baseados em estrutura ANP (nome, bandeira, endereço, preços por combustível)
- **Mapa**: OpenStreetMap via Leaflet.js
- **Geocodificação**: Nominatim (OpenStreetMap)
- **Roteamento**: OSRM Project (Open Source Routing Machine)

## Stack Tecnológica
- **Backend**: Hono 4.x + TypeScript (Cloudflare Workers)
- **Frontend**: HTML/CSS vanilla + Tailwind (via CDN)
- **Mapas**: Leaflet.js + OpenStreetMap
- **Fontes**: Google Fonts (Raleway)
- **Ícones**: FontAwesome 6

## Design (Inspirado no Completaí)
- Mobile-first (max-width: 430px)
- Paleta: Azul escuro `#0D1B2A` + Laranja `#FF6D00` + Verde `#00C853`
- Bottom navigation com 4 abas
- Cards com bandeiras das distribuidoras
- Preços com 2 casas decimais em destaque
- Suporte a safe-area (notch/home indicator iOS)

## Como Usar
1. Abra o app e permita acesso à localização
2. Selecione o tipo de combustível (Gasolina, Etanol, Diesel, GNV)
3. Veja o **Melhor Posto** com preço, distância e economia calculada
4. Toque em **"Ir até lá"** para traçar a rota
5. Use a aba **Planejar** para calcular quanto você vai economizar

## Desenvolvimento Local
```bash
npm run build
pm2 start ecosystem.config.cjs
# Acesse: http://localhost:3000
```

## Deploy
- **Plataforma**: Cloudflare Pages
- **Build**: `npm run build && wrangler pages deploy dist`
- **Status**: ✅ Em desenvolvimento

## Próximos Passos
- [ ] Integração com API real da ANP (preços semanais)
- [ ] Cadastro colaborativo de preços pelos usuários
- [ ] Alerta de preço: notificar quando posto baixar o preço
- [ ] Histórico de abastecimentos do usuário
- [ ] Comparativo Etanol vs Gasolina (regra dos 70%)
- [ ] PWA com instalação na home screen
- [ ] Integração com dados reais de postos via OpenStreetMap (Overpass API)

---
*RotaPosto — Porque cada litro conta.* ⛽
