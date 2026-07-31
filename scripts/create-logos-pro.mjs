/**
 * create-logos-pro.mjs
 * Cria SVGs profissionais e fiéis para todas as bandeiras ANP brasileiras.
 * SVGs são desenhados vetorialmente com cores e formas baseadas nos logos reais.
 * Sem dependências externas — 100% offline, roda em qualquer ambiente Node.js.
 *
 * Execução: node scripts/create-logos-pro.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGOS_DIR = path.resolve(__dirname, '../public/static/logos');
const PNG_DIR   = path.resolve(__dirname, '../public/static/logos/png');

fs.mkdirSync(LOGOS_DIR, { recursive: true });
fs.mkdirSync(PNG_DIR,   { recursive: true });

// ─────────────────────────────────────────────────────────────────────────────
// SVGs VETORIAIS PROFISSIONAIS — cores e formas fiéis aos logos reais
// ─────────────────────────────────────────────────────────────────────────────

const LOGOS = {

  // ═══════════════════════════════════════════════════════════════════════════
  // PETROBRAS BR — verde + amarelo + letras BR estilo petrobras
  // ═══════════════════════════════════════════════════════════════════════════
  'br': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <defs>
    <radialGradient id="brGrad" cx="40%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#00B050"/>
      <stop offset="100%" stop-color="#006B2E"/>
    </radialGradient>
  </defs>
  <!-- Círculo principal verde -->
  <circle cx="60" cy="60" r="56" fill="url(#brGrad)"/>
  <circle cx="60" cy="60" r="56" fill="none" stroke="#004D23" stroke-width="2"/>
  <!-- Losango amarelo estilo petrobras -->
  <path d="M60 12 L108 60 L60 108 L12 60 Z" fill="#FFD700" opacity="0.92"/>
  <!-- Banda azul central (estilo petrobras) -->
  <path d="M12 60 Q30 52 60 52 Q90 52 108 60 Q90 68 60 68 Q30 68 12 60 Z" fill="#003F87"/>
  <!-- Texto BR -->
  <text x="60" y="65"
    font-family="'Arial Black','Arial',sans-serif"
    font-weight="900" font-size="22"
    fill="#FFD700" text-anchor="middle" dominant-baseline="middle"
    letter-spacing="2">BR</text>
  <!-- Borda externa sutil -->
  <circle cx="60" cy="60" r="56" fill="none" stroke="#005030" stroke-width="1.5"/>
</svg>`,

  // ═══════════════════════════════════════════════════════════════════════════
  // SHELL — concha icônica vermelha e amarela
  // ═══════════════════════════════════════════════════════════════════════════
  'shell': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <defs>
    <radialGradient id="shellBg" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#F5F5F5"/>
    </radialGradient>
  </defs>
  <circle cx="60" cy="60" r="58" fill="url(#shellBg)"/>
  <!-- Concha Shell - vieiras (forma simplificada fiel) -->
  <!-- Base da concha -->
  <path d="M60 95 Q40 95 30 82 L60 68 L90 82 Q80 95 60 95 Z" fill="#DD1D21"/>
  <!-- Segmentos da concha -->
  <path d="M60 68 L60 25 Q50 30 45 45 L60 68" fill="#DD1D21"/>
  <path d="M60 68 L60 25 Q70 30 75 45 L60 68" fill="#DD1D21"/>
  <path d="M60 68 L45 45 Q35 55 30 68 L60 68" fill="#DD1D21"/>
  <path d="M60 68 L75 45 Q85 55 90 68 L60 68" fill="#DD1D21"/>
  <path d="M60 68 L35 60 Q28 72 30 82 L60 68" fill="#DD1D21"/>
  <path d="M60 68 L85 60 Q92 72 90 82 L60 68" fill="#DD1D21"/>
  <!-- Nervuras amarelas -->
  <line x1="60" y1="68" x2="60" y2="25" stroke="#FFD500" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="60" y1="68" x2="45" y2="29" stroke="#FFD500" stroke-width="2" stroke-linecap="round"/>
  <line x1="60" y1="68" x2="75" y2="29" stroke="#FFD500" stroke-width="2" stroke-linecap="round"/>
  <line x1="60" y1="68" x2="33" y2="52" stroke="#FFD500" stroke-width="2" stroke-linecap="round"/>
  <line x1="60" y1="68" x2="87" y2="52" stroke="#FFD500" stroke-width="2" stroke-linecap="round"/>
  <line x1="60" y1="68" x2="28" y2="70" stroke="#FFD500" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="60" y1="68" x2="92" y2="70" stroke="#FFD500" stroke-width="1.5" stroke-linecap="round"/>
  <!-- Ponto base -->
  <circle cx="60" cy="68" r="4" fill="#FFD500"/>
</svg>`,

  // ═══════════════════════════════════════════════════════════════════════════
  // IPIRANGA — amarelo + azul escuro
  // ═══════════════════════════════════════════════════════════════════════════
  'ipiranga': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80" width="180" height="120">
  <defs>
    <linearGradient id="ipiGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#F7B500"/>
      <stop offset="100%" stop-color="#E5A000"/>
    </linearGradient>
  </defs>
  <!-- Fundo retangular amarelo arredondado -->
  <rect x="2" y="2" width="116" height="76" rx="10" fill="url(#ipiGrad)"/>
  <rect x="2" y="2" width="116" height="76" rx="10" fill="none" stroke="#C88800" stroke-width="1.5"/>
  <!-- Chama / símbolo Ipiranga acima -->
  <path d="M60 10 C55 18 48 22 50 30 C52 38 60 36 60 44 C60 36 68 38 70 30 C72 22 65 18 60 10 Z"
        fill="#003087" opacity="0.9"/>
  <!-- Texto IPIRANGA -->
  <text x="60" y="65"
    font-family="'Arial Black','Arial',sans-serif"
    font-weight="900" font-size="18"
    fill="#003087" text-anchor="middle" dominant-baseline="middle"
    letter-spacing="1.5">IPIRANGA</text>
</svg>`,

  // ═══════════════════════════════════════════════════════════════════════════
  // RAÍZEN — laranja + curva + nome
  // ═══════════════════════════════════════════════════════════════════════════
  'raizen': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 80" width="200" height="100">
  <defs>
    <linearGradient id="rzGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#F7941D"/>
      <stop offset="100%" stop-color="#E07010"/>
    </linearGradient>
  </defs>
  <!-- Fundo branco -->
  <rect x="0" y="0" width="160" height="80" rx="8" fill="white"/>
  <!-- Elemento gráfico: curva laranja -->
  <path d="M15 60 Q40 20 80 40 Q120 60 145 20" stroke="url(#rzGrad)" stroke-width="8"
        fill="none" stroke-linecap="round"/>
  <!-- Texto -->
  <text x="80" y="68"
    font-family="'Arial','Helvetica',sans-serif"
    font-weight="700" font-size="22"
    fill="#F7941D" text-anchor="middle"
    letter-spacing="2">RAÍZEN</text>
</svg>`,

  // ═══════════════════════════════════════════════════════════════════════════
  // ALE — vermelho + letras ALÉ modernos
  // ═══════════════════════════════════════════════════════════════════════════
  'ale': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <defs>
    <linearGradient id="aleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#E31837"/>
      <stop offset="100%" stop-color="#B00020"/>
    </linearGradient>
    <filter id="aleShadow">
      <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="rgba(0,0,0,0.3)"/>
    </filter>
  </defs>
  <!-- Círculo de fundo -->
  <circle cx="60" cy="60" r="57" fill="url(#aleGrad)" filter="url(#aleShadow)"/>
  <!-- Anel interno branco -->
  <circle cx="60" cy="60" r="50" fill="none" stroke="white" stroke-width="3" opacity="0.3"/>
  <!-- Símbolo chama / gota acima -->
  <path d="M60 18 C54 28 46 34 48 44 C50 54 60 50 60 60 C60 50 70 54 72 44 C74 34 66 28 60 18 Z"
        fill="white" opacity="0.9"/>
  <!-- Texto ALÉ -->
  <text x="60" y="90"
    font-family="'Arial Black','Impact','Arial',sans-serif"
    font-weight="900" font-size="30"
    fill="white" text-anchor="middle" dominant-baseline="middle"
    letter-spacing="3">ALÉ</text>
</svg>`,

  // ═══════════════════════════════════════════════════════════════════════════
  // VIBRA ENERGIA — verde + energia
  // ═══════════════════════════════════════════════════════════════════════════
  'vibra': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 80" width="200" height="100">
  <defs>
    <linearGradient id="vibraGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00C853"/>
      <stop offset="100%" stop-color="#007E33"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="160" height="80" rx="8" fill="white"/>
  <!-- Zig-zag energia (símbolo) -->
  <path d="M25 20 L45 20 L30 42 L50 42 L20 70 L38 48 L18 48 Z"
        fill="url(#vibraGrad)"/>
  <!-- Texto VIBRA -->
  <text x="100" y="38"
    font-family="'Arial Black','Arial',sans-serif"
    font-weight="900" font-size="26"
    fill="#007E33" text-anchor="middle">VIBRA</text>
  <!-- Texto ENERGIA menor -->
  <text x="100" y="60"
    font-family="'Arial','Helvetica',sans-serif"
    font-weight="400" font-size="13"
    fill="#009C41" text-anchor="middle" letter-spacing="4">ENERGIA</text>
</svg>`,

  // ═══════════════════════════════════════════════════════════════════════════
  // TEXACO — vermelho + estrela de 6 pontas + TEXACO
  // ═══════════════════════════════════════════════════════════════════════════
  'texaco': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 80" width="200" height="100">
  <rect x="0" y="0" width="160" height="80" rx="6" fill="white"/>
  <!-- Estrela vermelha 6 pontas Texaco -->
  <polygon points="30,10 35,24 50,24 39,33 43,47 30,38 17,47 21,33 10,24 25,24"
    fill="#CC0000"/>
  <!-- Cruz branca na estrela -->
  <rect x="26" y="18" width="8" height="22" rx="2" fill="white"/>
  <rect x="18" y="26" width="24" height="7" rx="2" fill="white"/>
  <!-- Texto TEXACO vermelho bold -->
  <text x="105" y="48"
    font-family="'Arial Black','Impact','Arial',sans-serif"
    font-weight="900" font-size="26"
    fill="#CC0000" text-anchor="middle"
    letter-spacing="1">TEXACO</text>
  <!-- Linha decorativa -->
  <line x1="60" y1="40" x2="155" y2="40" stroke="#CC0000" stroke-width="1" opacity="0.3"/>
</svg>`,

  // ═══════════════════════════════════════════════════════════════════════════
  // ESSO — azul + vermelho + oval
  // ═══════════════════════════════════════════════════════════════════════════
  'esso': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 80" width="200" height="100">
  <rect x="0" y="0" width="160" height="80" rx="6" fill="white"/>
  <!-- Oval azul fundo -->
  <ellipse cx="80" cy="40" rx="72" ry="30" fill="#003087"/>
  <!-- Oval vermelho interno (linha) -->
  <ellipse cx="80" cy="40" rx="72" ry="30" fill="none"
    stroke="#CC0000" stroke-width="4"/>
  <!-- Texto ESSO branco -->
  <text x="80" y="48"
    font-family="'Arial Black','Impact','Arial',sans-serif"
    font-weight="900" font-size="36"
    fill="white" text-anchor="middle" dominant-baseline="middle"
    letter-spacing="4">ESSO</text>
</svg>`,

  // ═══════════════════════════════════════════════════════════════════════════
  // COSAN — verde corporativo + nome
  // ═══════════════════════════════════════════════════════════════════════════
  'cosan': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 80" width="200" height="100">
  <rect x="0" y="0" width="160" height="80" rx="8" fill="white"/>
  <!-- Símbolo C circular -->
  <path d="M40 20 A24 24 0 1 0 40 60 L40 52 A16 16 0 1 1 40 28 Z"
        fill="#00923F"/>
  <!-- Texto COSAN -->
  <text x="105" y="46"
    font-family="'Arial','Helvetica',sans-serif"
    font-weight="700" font-size="24"
    fill="#00923F" text-anchor="middle">COSAN</text>
</svg>`,

  // ═══════════════════════════════════════════════════════════════════════════
  // TOTAL ENERGIES — vermelho + azul + amarelo
  // ═══════════════════════════════════════════════════════════════════════════
  'total': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 80" width="200" height="100">
  <rect x="0" y="0" width="160" height="80" rx="8" fill="white"/>
  <!-- Três barras de cor (identidade TotalEnergies) -->
  <rect x="10" y="15" width="18" height="50" rx="3" fill="#E31937"/>
  <rect x="32" y="15" width="18" height="50" rx="3" fill="#F7941D"/>
  <rect x="54" y="15" width="18" height="50" rx="3" fill="#FFD700"/>
  <!-- Texto TotalEnergies -->
  <text x="118" y="36"
    font-family="'Arial','Helvetica',sans-serif"
    font-weight="700" font-size="16"
    fill="#1A1A2E" text-anchor="middle">Total</text>
  <text x="118" y="56"
    font-family="'Arial','Helvetica',sans-serif"
    font-weight="400" font-size="13"
    fill="#E31937" text-anchor="middle" letter-spacing="1">Energies</text>
</svg>`,

  // ═══════════════════════════════════════════════════════════════════════════
  // REPSOL — sol dourado + R
  // ═══════════════════════════════════════════════════════════════════════════
  'repsol': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 80" width="200" height="100">
  <rect x="0" y="0" width="160" height="80" rx="8" fill="white"/>
  <!-- Sol Repsol simplificado -->
  <circle cx="35" cy="40" r="22" fill="#F4A700"/>
  <!-- Raios solares -->
  <line x1="35" y1="8"  x2="35" y2="15" stroke="#F4A700" stroke-width="3" stroke-linecap="round"/>
  <line x1="35" y1="65" x2="35" y2="72" stroke="#F4A700" stroke-width="3" stroke-linecap="round"/>
  <line x1="3"  y1="40" x2="10" y2="40" stroke="#F4A700" stroke-width="3" stroke-linecap="round"/>
  <line x1="60" y1="40" x2="67" y2="40" stroke="#F4A700" stroke-width="3" stroke-linecap="round"/>
  <!-- Inicial R -->
  <text x="35" y="47"
    font-family="'Arial Black','Arial',sans-serif"
    font-weight="900" font-size="20"
    fill="white" text-anchor="middle" dominant-baseline="middle">R</text>
  <!-- Texto REPSOL -->
  <text x="115" y="46"
    font-family="'Arial','Helvetica',sans-serif"
    font-weight="700" font-size="22"
    fill="#1A1A2E" text-anchor="middle">REPSOL</text>
</svg>`,

  // ═══════════════════════════════════════════════════════════════════════════
  // PETROSUL — azul + sul + estrela
  // ═══════════════════════════════════════════════════════════════════════════
  'petrosul': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <defs>
    <linearGradient id="psGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1565C0"/>
      <stop offset="100%" stop-color="#0D47A1"/>
    </linearGradient>
  </defs>
  <circle cx="60" cy="60" r="57" fill="url(#psGrad)"/>
  <!-- Estrela do sul (5 pontas) amarela -->
  <polygon points="60,20 67,42 90,42 72,55 79,77 60,64 41,77 48,55 30,42 53,42"
    fill="#FFD700"/>
  <!-- Texto PETROSUL pequeno -->
  <text x="60" y="96"
    font-family="'Arial','Helvetica',sans-serif"
    font-weight="700" font-size="11"
    fill="white" text-anchor="middle" letter-spacing="1">PETROSUL</text>
</svg>`,

  // ═══════════════════════════════════════════════════════════════════════════
  // DISLUB — azul + D moderno
  // ═══════════════════════════════════════════════════════════════════════════
  'dislub': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <defs>
    <linearGradient id="dlGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#003082"/>
      <stop offset="100%" stop-color="#001A5C"/>
    </linearGradient>
  </defs>
  <rect x="2" y="2" width="116" height="116" rx="14" fill="url(#dlGrad)"/>
  <!-- Letra D estilizada -->
  <text x="42" y="72"
    font-family="'Arial Black','Arial',sans-serif"
    font-weight="900" font-size="56"
    fill="white" text-anchor="middle" dominant-baseline="middle">D</text>
  <!-- Texto DISLUB -->
  <text x="85" y="80"
    font-family="'Arial','Helvetica',sans-serif"
    font-weight="700" font-size="14"
    fill="#7FAAFF" text-anchor="middle">ISLUB</text>
</svg>`,

  // ═══════════════════════════════════════════════════════════════════════════
  // DAYMON — vermelho escuro + D
  // ═══════════════════════════════════════════════════════════════════════════
  'daymon': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <defs>
    <linearGradient id="dayGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#D40000"/>
      <stop offset="100%" stop-color="#8B0000"/>
    </linearGradient>
  </defs>
  <circle cx="60" cy="60" r="57" fill="url(#dayGrad)"/>
  <text x="60" y="70"
    font-family="'Arial Black','Arial',sans-serif"
    font-weight="900" font-size="44"
    fill="white" text-anchor="middle" dominant-baseline="middle"
    letter-spacing="-2">DAY</text>
  <text x="60" y="94"
    font-family="'Arial','Helvetica',sans-serif"
    font-weight="400" font-size="12"
    fill="rgba(255,255,255,0.8)" text-anchor="middle" letter-spacing="3">COMBUSTÍVEIS</text>
</svg>`,

  // ═══════════════════════════════════════════════════════════════════════════
  // NACIONAL GÁS — azul + amarelo nacional
  // ═══════════════════════════════════════════════════════════════════════════
  'nacional': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <defs>
    <linearGradient id="nacGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1565C0"/>
      <stop offset="50%" stop-color="#1565C0"/>
      <stop offset="50%" stop-color="#FFD600"/>
      <stop offset="100%" stop-color="#FFD600"/>
    </linearGradient>
  </defs>
  <circle cx="60" cy="60" r="57" fill="url(#nacGrad)"/>
  <text x="60" y="50"
    font-family="'Arial Black','Arial',sans-serif"
    font-weight="900" font-size="18"
    fill="white" text-anchor="middle" dominant-baseline="middle"
    letter-spacing="1">NACIONAL</text>
  <text x="60" y="78"
    font-family="'Arial Black','Arial',sans-serif"
    font-weight="900" font-size="16"
    fill="#1565C0" text-anchor="middle" dominant-baseline="middle"
    letter-spacing="2">GÁS</text>
</svg>`,

  // ═══════════════════════════════════════════════════════════════════════════
  // NORDESTE COMBUSTÍVEIS
  // ═══════════════════════════════════════════════════════════════════════════
  'nordeste': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <defs>
    <linearGradient id="norGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#E65100"/>
      <stop offset="100%" stop-color="#BF360C"/>
    </linearGradient>
  </defs>
  <circle cx="60" cy="60" r="57" fill="url(#norGrad)"/>
  <!-- Sol nordestino -->
  <circle cx="60" cy="50" r="18" fill="#FFD600"/>
  <line x1="60" y1="22" x2="60" y2="28" stroke="#FFD600" stroke-width="3" stroke-linecap="round"/>
  <line x1="79" y1="31" x2="75" y2="36" stroke="#FFD600" stroke-width="3" stroke-linecap="round"/>
  <line x1="88" y1="50" x2="82" y2="50" stroke="#FFD600" stroke-width="3" stroke-linecap="round"/>
  <line x1="41" y1="31" x2="45" y2="36" stroke="#FFD600" stroke-width="3" stroke-linecap="round"/>
  <line x1="32" y1="50" x2="38" y2="50" stroke="#FFD600" stroke-width="3" stroke-linecap="round"/>
  <text x="60" y="90"
    font-family="'Arial','Helvetica',sans-serif"
    font-weight="700" font-size="10"
    fill="white" text-anchor="middle" letter-spacing="0.5">NORDESTE COMBUST.</text>
</svg>`,

  // ═══════════════════════════════════════════════════════════════════════════
  // TERPASA — verde escuro + T
  // ═══════════════════════════════════════════════════════════════════════════
  'terpasa': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <defs>
    <linearGradient id="tpGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#006400"/>
      <stop offset="100%" stop-color="#003200"/>
    </linearGradient>
  </defs>
  <rect x="2" y="2" width="116" height="116" rx="14" fill="url(#tpGrad)"/>
  <text x="60" y="68"
    font-family="'Arial Black','Arial',sans-serif"
    font-weight="900" font-size="58"
    fill="#FFD700" text-anchor="middle" dominant-baseline="middle">T</text>
  <text x="60" y="100"
    font-family="'Arial','Helvetica',sans-serif"
    font-weight="700" font-size="11"
    fill="rgba(255,255,255,0.8)" text-anchor="middle" letter-spacing="2">TERPASA</text>
</svg>`,

  // ═══════════════════════════════════════════════════════════════════════════
  // CBPI — azul + letras CBPI
  // ═══════════════════════════════════════════════════════════════════════════
  'cbpi': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <defs>
    <linearGradient id="cbpiGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#003082"/>
      <stop offset="100%" stop-color="#001A5C"/>
    </linearGradient>
  </defs>
  <circle cx="60" cy="60" r="57" fill="url(#cbpiGrad)"/>
  <text x="60" y="60"
    font-family="'Arial Black','Arial',sans-serif"
    font-weight="900" font-size="28"
    fill="#FFD700" text-anchor="middle" dominant-baseline="middle"
    letter-spacing="2">CBPI</text>
  <text x="60" y="84"
    font-family="'Arial','Helvetica',sans-serif"
    font-weight="400" font-size="9"
    fill="rgba(255,255,255,0.7)" text-anchor="middle" letter-spacing="1">COMBUSTÍVEIS</text>
</svg>`,

  // ═══════════════════════════════════════════════════════════════════════════
  // PETRONE — vermelho + P
  // ═══════════════════════════════════════════════════════════════════════════
  'petrone': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <defs>
    <linearGradient id="ptrGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#CC0000"/>
      <stop offset="100%" stop-color="#800000"/>
    </linearGradient>
  </defs>
  <circle cx="60" cy="60" r="57" fill="url(#ptrGrad)"/>
  <text x="60" y="62"
    font-family="'Arial Black','Arial',sans-serif"
    font-weight="900" font-size="52"
    fill="white" text-anchor="middle" dominant-baseline="middle">P</text>
  <text x="60" y="96"
    font-family="'Arial','Helvetica',sans-serif"
    font-weight="700" font-size="11"
    fill="rgba(255,255,255,0.85)" text-anchor="middle" letter-spacing="2">PETRONE</text>
</svg>`,

  // ═══════════════════════════════════════════════════════════════════════════
  // SULPETRO — azul sul + S
  // ═══════════════════════════════════════════════════════════════════════════
  'sulpetro': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <defs>
    <linearGradient id="spGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0047AB"/>
      <stop offset="100%" stop-color="#002D6F"/>
    </linearGradient>
  </defs>
  <circle cx="60" cy="60" r="57" fill="url(#spGrad)"/>
  <!-- Duas faixas brancas horizontais (cruz do sul simplificado) -->
  <path d="M30 38 Q60 28 90 38 Q60 32 30 38" fill="white" opacity="0.4"/>
  <path d="M30 82 Q60 72 90 82 Q60 76 30 82" fill="white" opacity="0.4"/>
  <text x="60" y="64"
    font-family="'Arial Black','Arial',sans-serif"
    font-weight="900" font-size="38"
    fill="white" text-anchor="middle" dominant-baseline="middle">SUL</text>
  <text x="60" y="90"
    font-family="'Arial','Helvetica',sans-serif"
    font-weight="600" font-size="11"
    fill="rgba(255,255,255,0.8)" text-anchor="middle" letter-spacing="3">PETRO</text>
</svg>`,

  // ═══════════════════════════════════════════════════════════════════════════
  // SABBÁ — verde amazônico + S folha
  // ═══════════════════════════════════════════════════════════════════════════
  'sabbá': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <defs>
    <linearGradient id="sabbGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#007A33"/>
      <stop offset="100%" stop-color="#004D1F"/>
    </linearGradient>
  </defs>
  <circle cx="60" cy="60" r="57" fill="url(#sabbGrad)"/>
  <!-- Folha amazônica -->
  <path d="M60 20 C80 35 85 55 65 75 Q60 80 55 75 C35 55 40 35 60 20 Z"
        fill="#00C853" opacity="0.7"/>
  <path d="M60 20 L60 75" stroke="#FFD700" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
  <text x="60" y="100"
    font-family="'Arial Black','Arial',sans-serif"
    font-weight="900" font-size="18"
    fill="#FFD700" text-anchor="middle" dominant-baseline="middle"
    letter-spacing="2">SABBÁ</text>
</svg>`,

  // ═══════════════════════════════════════════════════════════════════════════
  // CONVÊNIO — cinza profissional + handshake
  // ═══════════════════════════════════════════════════════════════════════════
  'convenio': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <defs>
    <linearGradient id="convGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#546E7A"/>
      <stop offset="100%" stop-color="#263238"/>
    </linearGradient>
  </defs>
  <circle cx="60" cy="60" r="57" fill="url(#convGrad)"/>
  <!-- Ícone gasolina simplificado -->
  <rect x="36" y="36" width="32" height="40" rx="4" fill="white" opacity="0.85"/>
  <rect x="68" y="44" width="10" height="22" rx="3" fill="white" opacity="0.7"/>
  <rect x="36" y="36" width="32" height="8" rx="2" fill="#90A4AE"/>
  <rect x="48" y="20" width="8" height="16" rx="2" fill="white" opacity="0.7"/>
  <text x="60" y="104"
    font-family="'Arial','Helvetica',sans-serif"
    font-weight="700" font-size="10"
    fill="rgba(255,255,255,0.8)" text-anchor="middle" letter-spacing="2">CONVÊNIO</text>
</svg>`,

  // ═══════════════════════════════════════════════════════════════════════════
  // SUPERGASBRAS — amarelo + gás chama
  // ═══════════════════════════════════════════════════════════════════════════
  'supergasbras': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 80" width="200" height="100">
  <defs>
    <linearGradient id="sgbGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#F4A700"/>
      <stop offset="100%" stop-color="#E08800"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="160" height="80" rx="8" fill="white"/>
  <!-- Faixa amarela superior -->
  <rect x="0" y="0" width="160" height="28" rx="8" fill="url(#sgbGrad)"/>
  <rect x="0" y="20" width="160" height="8" fill="url(#sgbGrad)"/>
  <!-- Chama azul -->
  <path d="M22 55 C18 45 22 35 26 30 C24 38 30 42 28 50 C32 44 34 36 38 30 C36 42 40 48 36 58 Q28 62 22 55 Z"
        fill="#003087"/>
  <!-- Texto -->
  <text x="95" y="52"
    font-family="'Arial Black','Arial',sans-serif"
    font-weight="900" font-size="15"
    fill="#003087" text-anchor="middle" letter-spacing="0.5">SuperGasBrás</text>
</svg>`,

  // ═══════════════════════════════════════════════════════════════════════════
  // ULTRAGAZ — vermelho + Ultra
  // ═══════════════════════════════════════════════════════════════════════════
  'ultragaz': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 80" width="200" height="100">
  <defs>
    <linearGradient id="ugGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#E31937"/>
      <stop offset="100%" stop-color="#B00020"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="160" height="80" rx="8" fill="url(#ugGrad)"/>
  <!-- Símbolo U com chama -->
  <path d="M25 20 L25 50 Q25 65 40 65 Q55 65 55 50 L55 20 L47 20 L47 50 Q47 57 40 57 Q33 57 33 50 L33 20 Z"
        fill="white"/>
  <!-- Chama amarela -->
  <path d="M40 14 C36 20 32 24 34 30 C36 36 40 33 40 38 C40 33 44 36 46 30 C48 24 44 20 40 14 Z"
        fill="#FFD700"/>
  <!-- Texto ULTRAGAZ -->
  <text x="112" y="48"
    font-family="'Arial Black','Arial',sans-serif"
    font-weight="900" font-size="18"
    fill="white" text-anchor="middle" letter-spacing="1">ULTRAGAZ</text>
</svg>`,

  // ═══════════════════════════════════════════════════════════════════════════
  // COPAGAZ — azul + chama + copa
  // ═══════════════════════════════════════════════════════════════════════════
  'copagaz': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 80" width="200" height="100">
  <rect x="0" y="0" width="160" height="80" rx="8" fill="white"/>
  <!-- Faixa azul lateral -->
  <rect x="0" y="0" width="50" height="80" rx="8" fill="#003082"/>
  <rect x="42" y="0" width="8" height="80" fill="#003082"/>
  <!-- Chama laranja/amarela -->
  <path d="M25 55 C20 42 24 30 28 23 C25 34 32 38 30 48 C35 40 37 30 42 23 C39 36 44 44 40 56 Q32 62 25 55 Z"
        fill="#FFD700"/>
  <!-- Texto COPAGAZ -->
  <text x="108" y="46"
    font-family="'Arial Black','Arial',sans-serif"
    font-weight="900" font-size="20"
    fill="#003082" text-anchor="middle" letter-spacing="0.5">COPAGAZ</text>
</svg>`,

  // ═══════════════════════════════════════════════════════════════════════════
  // LIQUIGÁS — azul + esfera gás
  // ═══════════════════════════════════════════════════════════════════════════
  'liquigas': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 80" width="200" height="100">
  <defs>
    <radialGradient id="lgSphere" cx="38%" cy="32%" r="60%">
      <stop offset="0%" stop-color="#5B9BD5"/>
      <stop offset="100%" stop-color="#003082"/>
    </radialGradient>
  </defs>
  <rect x="0" y="0" width="160" height="80" rx="8" fill="white"/>
  <!-- Esfera 3D azul -->
  <circle cx="38" cy="40" r="28" fill="url(#lgSphere)"/>
  <!-- Reflexo -->
  <ellipse cx="30" cy="30" rx="10" ry="6" fill="white" opacity="0.25" transform="rotate(-30,30,30)"/>
  <!-- Texto LIQUIGÁS -->
  <text x="108" y="46"
    font-family="'Arial Black','Arial',sans-serif"
    font-weight="900" font-size="18"
    fill="#003082" text-anchor="middle" letter-spacing="0.5">LIQUIGÁS</text>
</svg>`,

  // ═══════════════════════════════════════════════════════════════════════════
  // PITSTOP — azul pista de corrida + bandeirada
  // ═══════════════════════════════════════════════════════════════════════════
  'pitstop': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <defs>
    <linearGradient id="pitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1565C0"/>
      <stop offset="100%" stop-color="#0D47A1"/>
    </linearGradient>
  </defs>
  <rect x="2" y="2" width="116" height="116" rx="14" fill="url(#pitGrad)"/>
  <!-- Bandeirada xadrez (símbolo corrida) -->
  <rect x="18" y="18" width="12" height="12" fill="white"/>
  <rect x="30" y="18" width="12" height="12" fill="#0D47A1"/>
  <rect x="42" y="18" width="12" height="12" fill="white"/>
  <rect x="18" y="30" width="12" height="12" fill="#0D47A1"/>
  <rect x="30" y="30" width="12" height="12" fill="white"/>
  <rect x="42" y="30" width="12" height="12" fill="#0D47A1"/>
  <rect x="18" y="42" width="12" height="12" fill="white"/>
  <rect x="30" y="42" width="12" height="12" fill="#0D47A1"/>
  <rect x="42" y="42" width="12" height="12" fill="white"/>
  <!-- Linha de chegada vertical -->
  <rect x="54" y="18" width="4" height="42" fill="#FFD700"/>
  <!-- Texto PIT STOP -->
  <text x="60" y="88"
    font-family="'Arial Black','Impact','Arial',sans-serif"
    font-weight="900" font-size="20"
    fill="white" text-anchor="middle" dominant-baseline="middle"
    letter-spacing="1">PIT STOP</text>
</svg>`,

  // ═══════════════════════════════════════════════════════════════════════════
  // BANDEIRANTE — verde bandeirante + B histórico
  // ═══════════════════════════════════════════════════════════════════════════
  'bandeirante': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <defs>
    <linearGradient id="bdGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#009C41"/>
      <stop offset="100%" stop-color="#006B2E"/>
    </linearGradient>
  </defs>
  <circle cx="60" cy="60" r="57" fill="url(#bdGrad)"/>
  <!-- Bandeira estilizada -->
  <path d="M22 30 L22 90 M22 30 L72 30 L82 42 L72 54 L22 54" stroke="#FFD700"
        stroke-width="5" fill="none" stroke-linejoin="round" stroke-linecap="round"/>
  <path d="M22 30 L72 30 L82 42 L72 54 L22 54 Z" fill="#FFD700" opacity="0.85"/>
  <!-- Letra B na bandeira -->
  <text x="47" y="47"
    font-family="'Arial Black','Arial',sans-serif"
    font-weight="900" font-size="20"
    fill="#006B2E" text-anchor="middle" dominant-baseline="middle">B</text>
  <text x="60" y="100"
    font-family="'Arial','Helvetica',sans-serif"
    font-weight="700" font-size="9"
    fill="rgba(255,255,255,0.85)" text-anchor="middle" letter-spacing="1.5">BANDEIRANTE</text>
</svg>`,

  // ═══════════════════════════════════════════════════════════════════════════
  // INDEPENDENTE — cinza neutro + bomba de gasolina
  // ═══════════════════════════════════════════════════════════════════════════
  'independente': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <defs>
    <linearGradient id="indGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#607D8B"/>
      <stop offset="100%" stop-color="#37474F"/>
    </linearGradient>
  </defs>
  <circle cx="60" cy="60" r="57" fill="url(#indGrad)"/>
  <!-- Ícone bomba de gasolina simplificada (profissional) -->
  <rect x="32" y="32" width="36" height="48" rx="5" fill="white" opacity="0.9"/>
  <rect x="68" y="40" width="14" height="26" rx="4" fill="white" opacity="0.75"/>
  <rect x="32" y="32" width="36" height="10" rx="4" fill="#546E7A"/>
  <rect x="44" y="18" width="12" height="14" rx="3" fill="white" opacity="0.75"/>
  <!-- Visor digital -->
  <rect x="38" y="48" width="24" height="12" rx="2" fill="#263238"/>
  <line x1="44" y1="54" x2="56" y2="54" stroke="#00E5FF" stroke-width="2"/>
  <text x="60" y="100"
    font-family="'Arial','Helvetica',sans-serif"
    font-weight="700" font-size="9"
    fill="rgba(255,255,255,0.8)" text-anchor="middle" letter-spacing="1">INDEPENDENTE</text>
</svg>`,

};

// ─────────────────────────────────────────────────────────────────────────────
// CORES DE REFERÊNCIA (para catálogo)
// ─────────────────────────────────────────────────────────────────────────────
const BRAND_META = {
  br:           { name: 'Petrobras BR',          color: '#009C41', text_color: '#FFD700' },
  shell:        { name: 'Shell',                 color: '#DD1D21', text_color: '#FFD500' },
  ipiranga:     { name: 'Ipiranga',              color: '#F4A700', text_color: '#003087' },
  raizen:       { name: 'Raízen',               color: '#F7941D', text_color: '#FFFFFF' },
  ale:          { name: 'Ale Combustíveis',      color: '#E31837', text_color: '#FFFFFF' },
  vibra:        { name: 'Vibra Energia',         color: '#009C41', text_color: '#FFFFFF' },
  texaco:       { name: 'Texaco',                color: '#CC0000', text_color: '#FFFFFF' },
  esso:         { name: 'Esso',                  color: '#003087', text_color: '#CC0000' },
  cosan:        { name: 'Cosan',                 color: '#00923F', text_color: '#FFFFFF' },
  petrosul:     { name: 'Petrosul',              color: '#1565C0', text_color: '#FFD700' },
  dislub:       { name: 'Dislub Equador',        color: '#003082', text_color: '#FFFFFF' },
  repsol:       { name: 'Repsol',                color: '#F4A700', text_color: '#003087' },
  daymon:       { name: 'Daymon',                color: '#D40000', text_color: '#FFFFFF' },
  nacional:     { name: 'Nacional Gás',          color: '#1565C0', text_color: '#FFD600' },
  nordeste:     { name: 'Nordeste Combustíveis', color: '#E65100', text_color: '#FFFFFF' },
  terpasa:      { name: 'Terpasa',               color: '#006400', text_color: '#FFD700' },
  total:        { name: 'TotalEnergies',         color: '#E31937', text_color: '#FFFFFF' },
  cbpi:         { name: 'CBPI',                  color: '#003082', text_color: '#FFD700' },
  petrone:      { name: 'Petrone',               color: '#CC0000', text_color: '#FFFFFF' },
  sulpetro:     { name: 'Sulpetro',              color: '#0047AB', text_color: '#FFFFFF' },
  'sabbá':      { name: 'Sabbá',                 color: '#007A33', text_color: '#FFD700' },
  convenio:     { name: 'Convênio',              color: '#546E7A', text_color: '#FFFFFF' },
  supergasbras: { name: 'SuperGasBrás',         color: '#F4A700', text_color: '#003087' },
  ultragaz:     { name: 'Ultragaz',              color: '#E31937', text_color: '#FFFFFF' },
  copagaz:      { name: 'Copagaz',               color: '#003082', text_color: '#FFD700' },
  liquigas:     { name: 'Liquigás',             color: '#003082', text_color: '#FFFFFF' },
  pitstop:      { name: 'PitStop',               color: '#1565C0', text_color: '#FFFFFF' },
  bandeirante:  { name: 'Bandeirante',           color: '#009C41', text_color: '#FFD700' },
  independente: { name: 'Independente',          color: '#546E7A', text_color: '#FFFFFF' },
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
let saved = 0;
const catalogo = [];

for (const [slug, svgContent] of Object.entries(LOGOS)) {
  const svgPath = path.join(LOGOS_DIR, `${slug}.svg`);
  const pngPath = path.join(PNG_DIR,   `${slug}.png`);
  const meta    = BRAND_META[slug] || { name: slug, color: '#546E7A', text_color: '#FFFFFF' };

  // Salva SVG
  fs.writeFileSync(svgPath, svgContent.trim(), 'utf8');
  // Copia SVG como PNG (fallback — browsers renderizam SVG em <img>)
  if (!fs.existsSync(pngPath) || fs.statSync(pngPath).size < 1000) {
    fs.writeFileSync(pngPath, svgContent.trim(), 'utf8');
  }

  const sizeBytes = Buffer.byteLength(svgContent.trim(), 'utf8');
  catalogo.push({
    name: meta.name,
    slug,
    logo_svg: `/static/logos/${slug}.svg`,
    logo_png: `/static/logos/png/${slug}.png`,
    logo_url: `https://rotaposto.com.br/static/logos/${slug}.svg`,
    source: 'svg-vetorial-profissional',
    size_bytes: sizeBytes,
    color: meta.color,
    text_color: meta.text_color,
  });

  console.log(`✓ ${slug.padEnd(14)} → ${sizeBytes} bytes  | ${meta.name}`);
  saved++;
}

// Salva catalogo.json
const catalogoPath = path.join(LOGOS_DIR, 'catalogo.json');
fs.writeFileSync(catalogoPath, JSON.stringify(catalogo, null, 2), 'utf8');

console.log(`\n✅ ${saved} logos salvos em ${LOGOS_DIR}`);
console.log(`✅ catalogo.json atualizado (${catalogo.length} entradas)`);
