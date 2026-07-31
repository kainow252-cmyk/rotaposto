/**
 * fetch-logos.mjs
 * Script profissional para buscar logos de todas as bandeiras de postos
 * brasileiros registradas na ANP.
 *
 * Estratégia em cascata por marca:
 *  1. URL direta SVG/PNG de fonte confiável (Wikimedia Commons, repositório oficial)
 *  2. Fallback: SVG geométrico de alta qualidade criado no próprio script
 *
 * Execução: node scripts/fetch-logos.mjs
 */

import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGOS_DIR  = path.resolve(__dirname, '../public/static/logos');
const PNG_DIR    = path.resolve(__dirname, '../public/static/logos/png');

// ─────────────────────────────────────────────────────────────────────────────
// DEFINIÇÃO COMPLETA: todas as bandeiras ANP + distribuidoras relevantes
// ─────────────────────────────────────────────────────────────────────────────
const BRANDS = [
  // ── Grandes distribuidoras nacionais ─────────────────────────────────────
  {
    slug: 'br',
    name: 'Petrobras BR',
    color: '#009C41',   // verde Petrobras
    textColor: '#FFD700',
    svgSources: [
      'https://upload.wikimedia.org/wikipedia/commons/7/7b/Petrobras_logo_2021.svg',
      'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Petrobras_logo_2021.svg/800px-Petrobras_logo_2021.svg.png',
    ],
  },
  {
    slug: 'shell',
    name: 'Shell',
    color: '#DD1D21',
    textColor: '#FFD500',
    svgSources: [
      'https://upload.wikimedia.org/wikipedia/en/e/e8/Shell_logo_2021.svg',
      'https://upload.wikimedia.org/wikipedia/commons/e/e8/Shell_logo_2021.svg',
    ],
  },
  {
    slug: 'ipiranga',
    name: 'Ipiranga',
    color: '#F4A700',
    textColor: '#003087',
    svgSources: [
      'https://upload.wikimedia.org/wikipedia/commons/9/9e/Ipiranga_logo.svg',
      'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Ipiranga_logo.svg/800px-Ipiranga_logo.svg.png',
    ],
  },
  {
    slug: 'raizen',
    name: 'Raízen',
    color: '#F7941D',
    textColor: '#FFFFFF',
    svgSources: [
      'https://upload.wikimedia.org/wikipedia/commons/8/8c/Ra%C3%ADzen_logo.svg',
      'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Ra%C3%ADzen_logo.svg/800px-Ra%C3%ADzen_logo.svg.png',
    ],
  },
  {
    slug: 'ale',
    name: 'Ale Combustíveis',
    color: '#E31837',
    textColor: '#FFFFFF',
    svgSources: [
      'https://upload.wikimedia.org/wikipedia/commons/b/b7/Ale_Combustiveis_logo.svg',
      'https://logospng.org/download/ale-combustiveis/logo-ale-combustiveis-1024.png',
    ],
  },
  {
    slug: 'vibra',
    name: 'Vibra Energia',
    color: '#00A859',
    textColor: '#FFFFFF',
    svgSources: [
      'https://upload.wikimedia.org/wikipedia/commons/c/c7/Vibra_Energia_logo.svg',
      'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Vibra_Energia_logo.svg/800px-Vibra_Energia_logo.svg.png',
    ],
  },
  {
    slug: 'texaco',
    name: 'Texaco',
    color: '#CC0000',
    textColor: '#FFFFFF',
    svgSources: [
      'https://upload.wikimedia.org/wikipedia/commons/9/9e/Texaco_logo.svg',
      'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Texaco_logo.svg/800px-Texaco_logo.svg.png',
    ],
  },
  {
    slug: 'esso',
    name: 'Esso',
    color: '#003087',
    textColor: '#CC0000',
    svgSources: [
      'https://upload.wikimedia.org/wikipedia/commons/5/5d/Esso_textlogo.svg',
      'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Esso_textlogo.svg/800px-Esso_textlogo.svg.png',
    ],
  },
  // ── Regionais / distribuidoras menores ───────────────────────────────────
  {
    slug: 'cosan',
    name: 'Cosan',
    color: '#00923F',
    textColor: '#FFFFFF',
    svgSources: [
      'https://upload.wikimedia.org/wikipedia/commons/7/72/Cosan_Logo.svg',
      'https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Cosan_Logo.svg/800px-Cosan_Logo.svg.png',
    ],
  },
  {
    slug: 'petrosul',
    name: 'Petrosul',
    color: '#0056A6',
    textColor: '#FFD700',
    svgSources: [],
  },
  {
    slug: 'dislub',
    name: 'Dislub Equador',
    color: '#003082',
    textColor: '#FFFFFF',
    svgSources: [],
  },
  {
    slug: 'repsol',
    name: 'Repsol',
    color: '#F4A700',
    textColor: '#003087',
    svgSources: [
      'https://upload.wikimedia.org/wikipedia/commons/0/07/Repsol_Logo.svg',
      'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Repsol_Logo.svg/800px-Repsol_Logo.svg.png',
    ],
  },
  {
    slug: 'daymon',
    name: 'Daymon',
    color: '#D40000',
    textColor: '#FFFFFF',
    svgSources: [],
  },
  {
    slug: 'nacional',
    name: 'Nacional Gás',
    color: '#1565C0',
    textColor: '#FFD600',
    svgSources: [],
  },
  {
    slug: 'nordeste',
    name: 'Nordeste Combustíveis',
    color: '#E65100',
    textColor: '#FFFFFF',
    svgSources: [],
  },
  {
    slug: 'terpasa',
    name: 'Terpasa',
    color: '#006400',
    textColor: '#FFFFFF',
    svgSources: [],
  },
  {
    slug: 'total',
    name: 'TotalEnergies',
    color: '#E31937',
    textColor: '#FFFFFF',
    svgSources: [
      'https://upload.wikimedia.org/wikipedia/commons/0/0c/TotalEnergies_logo.svg',
      'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/TotalEnergies_logo.svg/800px-TotalEnergies_logo.svg.png',
    ],
  },
  {
    slug: 'cbpi',
    name: 'CBPI',
    color: '#003082',
    textColor: '#FFD700',
    svgSources: [],
  },
  {
    slug: 'petrone',
    name: 'Petrone',
    color: '#CC0000',
    textColor: '#FFFFFF',
    svgSources: [],
  },
  {
    slug: 'sulpetro',
    name: 'Sulpetro',
    color: '#0047AB',
    textColor: '#FFFFFF',
    svgSources: [],
  },
  {
    slug: 'sabbá',
    name: 'Sabbá',
    color: '#007A33',
    textColor: '#FFFFFF',
    svgSources: [],
  },
  {
    slug: 'convenio',
    name: 'Convênio',
    color: '#37474F',
    textColor: '#FFFFFF',
    svgSources: [],
  },
  // ── GLP (gás de cozinha) — aparecem como bandeira em postos ─────────────
  {
    slug: 'supergasbras',
    name: 'SuperGasBrás',
    color: '#F4A700',
    textColor: '#003087',
    svgSources: [
      'https://upload.wikimedia.org/wikipedia/commons/a/a2/Superg%C3%A1sbr%C3%A1s_logo.svg',
      'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Superg%C3%A1sbr%C3%A1s_logo.svg/800px-Superg%C3%A1sbr%C3%A1s_logo.svg.png',
    ],
  },
  {
    slug: 'ultragaz',
    name: 'Ultragaz',
    color: '#E31937',
    textColor: '#FFFFFF',
    svgSources: [
      'https://upload.wikimedia.org/wikipedia/commons/6/61/Ultragaz_logo.svg',
      'https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/Ultragaz_logo.svg/800px-Ultragaz_logo.svg.png',
    ],
  },
  {
    slug: 'copagaz',
    name: 'Copagaz',
    color: '#003082',
    textColor: '#FFD700',
    svgSources: [
      'https://upload.wikimedia.org/wikipedia/commons/d/dc/Copagaz_logo.svg',
      'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/Copagaz_logo.svg/800px-Copagaz_logo.svg.png',
    ],
  },
  {
    slug: 'liquigas',
    name: 'Liquigás',
    color: '#003082',
    textColor: '#FFFFFF',
    svgSources: [
      'https://upload.wikimedia.org/wikipedia/commons/2/2c/Logo_Liqu%C3%ADg%C3%A1s.svg',
      'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Logo_Liqu%C3%ADg%C3%A1s.svg/800px-Logo_Liqu%C3%ADg%C3%A1s.svg.png',
    ],
  },
  // ── Rede própria / outros ─────────────────────────────────────────────────
  {
    slug: 'pitstop',
    name: 'PitStop',
    color: '#1565C0',
    textColor: '#FFFFFF',
    svgSources: [],
  },
  {
    slug: 'bandeirante',
    name: 'Bandeirante',
    color: '#009C41',
    textColor: '#FFD700',
    svgSources: [],
  },
  {
    slug: 'independente',
    name: 'Independente',
    color: '#546E7A',
    textColor: '#FFFFFF',
    svgSources: [],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function fetchUrl(url, timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const req = proto.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RotaPosto-LogoFetcher/1.0)',
        'Accept': 'image/svg+xml,image/png,image/*,*/*',
      },
      timeout: timeoutMs,
    }, (res) => {
      // Segue redirect
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let loc = res.headers.location;
        if (loc.startsWith('/')) {
          const parsed = new URL(url);
          loc = parsed.origin + loc;
        }
        fetchUrl(loc, timeoutMs).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function isSvg(buf) {
  const str = buf.slice(0, 200).toString('utf8').trim().toLowerCase();
  return str.includes('<svg') || str.includes('<?xml');
}

function isPng(buf) {
  return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47;
}

function isJpeg(buf) {
  return buf[0] === 0xFF && buf[1] === 0xD8;
}

// ─────────────────────────────────────────────────────────────────────────────
// GERADOR DE SVG GEOMÉTRICO PROFISSIONAL (fallback quando download falha)
// Produz um escudo/emblema estilizado com as cores e iniciais da marca
// ─────────────────────────────────────────────────────────────────────────────
function generateFallbackSvg(brand) {
  const { slug, name, color, textColor } = brand;
  // Iniciais: até 3 chars, prefere sigla
  let initials = name
    .replace(/[^A-Z0-9]/gi, ' ')
    .split(' ')
    .filter(Boolean)
    .map(w => w[0].toUpperCase())
    .slice(0, 3)
    .join('');
  if (initials.length === 1 || slug === 'br') initials = slug.toUpperCase().slice(0, 3);

  // Gradiente moderno: cor principal + versão mais escura
  const darkenHex = hex => {
    const n = parseInt(hex.replace('#',''), 16);
    const r = Math.max(0, ((n >> 16) & 0xFF) - 40);
    const g = Math.max(0, ((n >>  8) & 0xFF) - 40);
    const b = Math.max(0, ( n        & 0xFF) - 40);
    return '#' + [r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('');
  };

  const darkColor = darkenHex(color);
  const gradId = `g${slug.replace(/[^a-z0-9]/g,'')}_grad`;
  const fontSize = initials.length >= 3 ? 28 : initials.length === 2 ? 34 : 42;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <defs>
    <linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${color}"/>
      <stop offset="100%" stop-color="${darkColor}"/>
    </linearGradient>
    <filter id="shadow${slug}" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.25)"/>
    </filter>
  </defs>
  <!-- Escudo/emblema -->
  <path d="M50 4 L90 20 L90 58 Q90 80 50 96 Q10 80 10 58 L10 20 Z"
        fill="url(#${gradId})"
        filter="url(#shadow${slug})"/>
  <!-- Borda interna sutil -->
  <path d="M50 10 L84 24 L84 58 Q84 77 50 91 Q16 77 16 58 L16 24 Z"
        fill="none" stroke="${textColor}" stroke-width="1" stroke-opacity="0.2"/>
  <!-- Iniciais -->
  <text x="50" y="${initials.length >= 3 ? 60 : 58}"
        font-family="'Arial Black','Arial',sans-serif"
        font-weight="900"
        font-size="${fontSize}"
        fill="${textColor}"
        text-anchor="middle"
        dominant-baseline="middle"
        letter-spacing="-1">${initials}</text>
</svg>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONVERSÃO SIMPLES SVG → PNG via sharp (se disponível) ou skip
// ─────────────────────────────────────────────────────────────────────────────
async function tryConvertToPng(svgContent, outputPath) {
  try {
    // Tenta usar sharp se instalado
    const { default: sharp } = await import('sharp').catch(() => ({ default: null }));
    if (!sharp) return false;
    await sharp(Buffer.from(svgContent)).resize(256, 256).png().toFile(outputPath);
    return true;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO PRINCIPAL: processa uma marca
// ─────────────────────────────────────────────────────────────────────────────
async function processBrand(brand) {
  const svgPath = path.join(LOGOS_DIR, `${brand.slug}.svg`);
  const pngPath = path.join(PNG_DIR,   `${brand.slug}.png`);

  let svgContent = null;
  let sourceUsed = 'fallback-geometrico';
  let sizeBytes  = 0;

  // 1) Tenta baixar de cada URL na ordem
  for (const url of brand.svgSources) {
    try {
      console.log(`  ↓ ${brand.slug}: tentando ${url.substring(0, 80)}...`);
      const buf = await fetchUrl(url);

      if (isSvg(buf)) {
        svgContent = buf.toString('utf8');
        sourceUsed = url.includes('wikimedia') ? 'wikimedia-commons' : 'oficial';
        console.log(`  ✓ ${brand.slug}: SVG obtido (${buf.length} bytes) de ${url.substring(0,50)}...`);
        break;
      } else if (isPng(buf) || isJpeg(buf)) {
        // Salva o PNG diretamente e cria SVG wrapper
        fs.writeFileSync(pngPath, buf);
        console.log(`  ✓ ${brand.slug}: PNG obtido (${buf.length} bytes)`);
        // Cria SVG que embute o PNG como data URI para uso como SVG no app
        const b64 = buf.toString('base64');
        const mime = isPng(buf) ? 'image/png' : 'image/jpeg';
        svgContent = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 100 100" width="100" height="100">
  <image href="data:${mime};base64,${b64}" x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid meet"/>
</svg>`;
        sourceUsed = url.includes('wikimedia') ? 'wikimedia-commons-png' : 'oficial-png';
        break;
      }
    } catch (err) {
      console.log(`  ✗ ${brand.slug}: falhou (${err.message})`);
    }
  }

  // 2) Fallback: SVG geométrico profissional
  if (!svgContent) {
    svgContent = generateFallbackSvg(brand);
    sourceUsed = 'svg-geometrico-profissional';
    console.log(`  ★ ${brand.slug}: usando SVG geométrico fallback`);
  }

  // 3) Salva SVG
  fs.writeFileSync(svgPath, svgContent, 'utf8');
  sizeBytes = Buffer.byteLength(svgContent, 'utf8');

  // 4) Tenta converter SVG para PNG (melhor qualidade)
  if (!fs.existsSync(pngPath)) {
    const ok = await tryConvertToPng(svgContent, pngPath);
    if (!ok) {
      // Salva o SVG como "PNG" (workaround — browsers suportam SVG em <img>)
      fs.writeFileSync(pngPath, svgContent, 'utf8');
    }
  }

  return {
    name: brand.name,
    slug: brand.slug,
    logo_svg: `/static/logos/${brand.slug}.svg`,
    logo_png: `/static/logos/png/${brand.slug}.png`,
    logo_url: `https://rotaposto.com.br/static/logos/${brand.slug}.svg`,
    source: sourceUsed,
    size_bytes: sizeBytes,
    color: brand.color,
    text_color: brand.textColor,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(' RotaPosto — Fetch Logos Profissionais (ANP BR)   ');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Marcas a processar: ${BRANDS.length}`);
  console.log(`Destino SVG: ${LOGOS_DIR}`);
  console.log(`Destino PNG: ${PNG_DIR}`);
  console.log('');

  fs.mkdirSync(LOGOS_DIR, { recursive: true });
  fs.mkdirSync(PNG_DIR,   { recursive: true });

  const catalogo = [];
  let ok = 0, fallback = 0;

  for (const brand of BRANDS) {
    console.log(`\n[${BRANDS.indexOf(brand)+1}/${BRANDS.length}] ${brand.name} (${brand.slug})`);
    const entry = await processBrand(brand);
    catalogo.push(entry);
    if (entry.source.includes('fallback') || entry.source.includes('geometrico')) {
      fallback++;
    } else {
      ok++;
    }
  }

  // Salva catálogo atualizado
  const catalogoPath = path.join(LOGOS_DIR, 'catalogo.json');
  fs.writeFileSync(catalogoPath, JSON.stringify(catalogo, null, 2), 'utf8');

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(` Concluído! Logos obtidos: ${ok} | Fallbacks: ${fallback} | Total: ${BRANDS.length}`);
  console.log(` Catálogo salvo em: ${catalogoPath}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main().catch(err => {
  console.error('ERRO FATAL:', err);
  process.exit(1);
});
