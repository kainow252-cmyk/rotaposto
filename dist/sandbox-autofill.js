/**
 * RotaPosto — Sandbox AutoFill + Auto-Login
 * Só executa fora de rotaposto.com.br
 * Preenche campos e faz login automático em todas as telas
 */
(function() {
  'use strict';

  // ── Só sandbox ───────────────────────────────────────────────────────────
  var host = window.location.hostname;
  var isSandbox = host.includes('novita.ai') || host.includes('sandbox')
               || host === 'localhost' || host === '127.0.0.1'
               || host.includes('e2b.dev') || host.includes('.local');
  if (!isSandbox) return;

  // ── Credenciais de teste por tela ────────────────────────────────────────
  var CREDS = {
    // RotaSegura Passageiro (login/cadastro)
    passageiro: { email: 'passageiro.teste@rotaposto.com.br', senha: 'teste@123', nome: 'Ana Passageiro Teste' },
    // RotaSegura Motorista (login/cadastro)
    motorista:  { email: 'motorista.teste@rotaposto.com.br', senha: 'teste@123', nome: 'Carlos Motorista Teste',
                  cpf: '123.456.789-00', cnh: '12345678900', placa: 'ABC-1234',
                  telefone: '(11) 99999-0001', pix: '123.456.789-00' },
    // Parceiros / Posto
    parceiro:   { email: 'teste@rotaposto.com.br', senha: 'teste123' },
    // Admin painel (chave)
    admin:      { key: 'rotaposto@admin2026' },
    // Admin equipe / staff
    staff:      { email: 'staff@rotaposto.com.br', senha: 'staff@123' }
  };

  // ── Detectar qual tela estamos ───────────────────────────────────────────
  var path = window.location.pathname;
  var isPassageiroLogin  = path === '/rotasegura/login';
  var isMotoLogin        = path === '/rotasegura/motorista/login';
  var isParcLogin        = path === '/parcerias/login';
  var isAdminMotLogin    = path === '/rotasegura/motorista/admin';
  var isAdminPassLogin   = path === '/rotasegura/admin';

  // ── Utilitário: preencher campo e disparar eventos ───────────────────────
  function fill(id, value) {
    var el = document.getElementById(id);
    if (!el) return false;
    el.value = value;
    el.dispatchEvent(new Event('input',  { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    // Highlight visual para mostrar que foi preenchido
    el.style.background    = 'rgba(255, 109, 0, 0.08)';
    el.style.borderColor   = '#FF6D00';
    el.style.transition    = 'all 0.3s';
    setTimeout(function() {
      el.style.background  = '';
      el.style.borderColor = '';
    }, 2000);
    return true;
  }

  // ── Mostrar badge sandbox no topo ────────────────────────────────────────
  function showSandboxBadge(info) {
    var badge = document.createElement('div');
    badge.id  = 'sandbox-badge';
    badge.innerHTML = '🧪 <strong>SANDBOX</strong> · ' + info + ' · <span style="opacity:.7;font-size:11px;">Credenciais preenchidas automaticamente</span>';
    badge.style.cssText = [
      'position:fixed', 'top:0', 'left:0', 'right:0', 'z-index:99999',
      'background:linear-gradient(90deg,#E65100,#FF6D00)',
      'color:#fff', 'font-size:12px', 'font-weight:700',
      'padding:7px 16px', 'text-align:center',
      'letter-spacing:0.3px', 'box-shadow:0 2px 8px rgba(0,0,0,.3)'
    ].join(';');
    document.body.insertBefore(badge, document.body.firstChild);
    // Empurrar conteúdo para baixo
    document.body.style.paddingTop = '34px';
  }

  // ── Botão "Entrar Direto" — clica no botão de submit ────────────────────
  function addLoginDireto(btnId, label, onClick) {
    var original = document.getElementById(btnId);
    if (!original) return;

    var wrap = document.createElement('div');
    wrap.style.cssText = 'margin-top:10px;';

    var btn = document.createElement('button');
    btn.type        = 'button';
    btn.innerHTML   = '⚡ ' + label;
    btn.style.cssText = [
      'width:100%', 'padding:14px', 'border-radius:12px', 'border:none',
      'background:linear-gradient(135deg,#FF6D00,#E65100)',
      'color:#fff', 'font-size:15px', 'font-weight:800',
      'cursor:pointer', 'letter-spacing:0.3px',
      'box-shadow:0 4px 12px rgba(255,109,0,.4)',
      'display:flex', 'align-items:center', 'justify-content:center', 'gap:8px'
    ].join(';');

    btn.onclick = onClick;

    // Hover
    btn.onmouseenter = function() { btn.style.transform = 'translateY(-1px)'; btn.style.boxShadow = '0 6px 16px rgba(255,109,0,.5)'; };
    btn.onmouseleave = function() { btn.style.transform = '';                 btn.style.boxShadow = '0 4px 12px rgba(255,109,0,.4)'; };

    wrap.appendChild(btn);
    original.parentNode.insertBefore(wrap, original.nextSibling);
  }

  // ── Execução por tela ────────────────────────────────────────────────────

  // ─────────────────────────────────────────────────────────────────────────
  // TELA 1: /rotasegura/login  →  Passageiro
  // ─────────────────────────────────────────────────────────────────────────
  if (isPassageiroLogin) {
    // Se já tem token salvo, redirecionar direto
    if (localStorage.getItem('rs_token_passageiro')) {
      window.location.href = '/rotasegura';
      return;
    }

    document.addEventListener('DOMContentLoaded', function() {
      fill('loginEmail', CREDS.passageiro.email);
      fill('loginSenha', CREDS.passageiro.senha);
      showSandboxBadge('Login Passageiro: ' + CREDS.passageiro.email);

      addLoginDireto('btnLogin', 'Entrar como Passageiro Teste', function() {
        // Garantir campos preenchidos e chamar função de login
        fill('loginEmail', CREDS.passageiro.email);
        fill('loginSenha', CREDS.passageiro.senha);
        if (typeof fazerLogin === 'function') {
          fazerLogin();
        } else {
          document.getElementById('btnLogin').click();
        }
      });

      // Auto-registrar conta teste se não existir (silencioso)
      _ensurePassageiroTestExists();
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TELA 2: /rotasegura/motorista/login  →  Motorista
  // ─────────────────────────────────────────────────────────────────────────
  if (isMotoLogin) {
    // Se já tem token salvo, redirecionar direto
    if (localStorage.getItem('rs_token_motorista')) {
      window.location.href = '/rotasegura/motorista';
      return;
    }

    document.addEventListener('DOMContentLoaded', function() {
      fill('loginEmail', CREDS.motorista.email);
      fill('loginSenha', CREDS.motorista.senha);
      showSandboxBadge('Login Motorista: ' + CREDS.motorista.email);

      addLoginDireto('btnLogin', 'Entrar como Motorista Teste', function() {
        fill('loginEmail', CREDS.motorista.email);
        fill('loginSenha', CREDS.motorista.senha);
        if (typeof fazerLogin === 'function') {
          fazerLogin();
        } else {
          document.getElementById('btnLogin').click();
        }
      });

      // Auto-registrar conta teste motorista se não existir
      _ensureMotoristaTeste();
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TELA 3: /parcerias/login  →  Posto Parceiro
  // ─────────────────────────────────────────────────────────────────────────
  if (isParcLogin) {
    document.addEventListener('DOMContentLoaded', function() {
      // IDs diferentes — buscar por tipo
      var emails = document.querySelectorAll('input[type="email"]');
      var senhas  = document.querySelectorAll('input[type="password"]');
      emails.forEach(function(el) {
        el.value = CREDS.parceiro.email;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.style.borderColor = '#FF6D00';
      });
      senhas.forEach(function(el) {
        el.value = CREDS.parceiro.senha;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.style.borderColor = '#FF6D00';
      });
      showSandboxBadge('Parceiro: ' + CREDS.parceiro.email + ' / ' + CREDS.parceiro.senha);

      // Botão direto
      var btns = document.querySelectorAll('button[type="submit"], button.btn-login, #btn-entrar, #btnLogin');
      if (btns.length > 0) {
        var wrap = document.createElement('div');
        wrap.style.marginTop = '10px';
        var btn = document.createElement('button');
        btn.type      = 'button';
        btn.innerHTML = '⚡ Entrar como Posto Teste';
        btn.style.cssText = 'width:100%;padding:14px;border-radius:12px;border:none;background:linear-gradient(135deg,#FF6D00,#E65100);color:#fff;font-size:15px;font-weight:800;cursor:pointer;';
        btn.onclick = function() {
          emails.forEach(function(el) { el.value = CREDS.parceiro.email; el.dispatchEvent(new Event('input',{bubbles:true})); });
          senhas.forEach(function(el) { el.value = CREDS.parceiro.senha;  el.dispatchEvent(new Event('input',{bubbles:true})); });
          btns[0].click();
        };
        btns[0].parentNode.insertBefore(wrap, btns[0].nextSibling);
        wrap.appendChild(btn);
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TELA 4: /rotasegura/admin  →  Admin Passageiros (chave)
  // TELA 5: /rotasegura/motorista/admin  →  Admin Motoristas (chave)
  // ─────────────────────────────────────────────────────────────────────────
  if (isAdminPassLogin || isAdminMotLogin) {
    document.addEventListener('DOMContentLoaded', function() {
      fill('adminKey', CREDS.admin.key);
      showSandboxBadge('Admin RotaSegura · chave preenchida');

      // Botão direto
      var btnEntrar = document.getElementById('btnEntrar') || document.querySelector('button.btn-entrar') || document.querySelector('button[onclick*="entrar"]');
      if (btnEntrar) {
        var wrap = document.createElement('div');
        wrap.style.marginTop = '10px';
        var btn = document.createElement('button');
        btn.type      = 'button';
        btn.innerHTML = '⚡ Acessar Admin Direto';
        btn.style.cssText = 'width:100%;padding:14px;border-radius:12px;border:none;background:linear-gradient(135deg,#212121,#424242);color:#fff;font-size:15px;font-weight:800;cursor:pointer;';
        btn.onclick = function() {
          fill('adminKey', CREDS.admin.key);
          if (typeof entrar === 'function') { entrar(); }
          else { btnEntrar.click(); }
        };
        btnEntrar.parentNode.insertBefore(wrap, btnEntrar.nextSibling);
        wrap.appendChild(btn);
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // AUTO-REGISTRO: Criar contas de teste se não existirem
  // ─────────────────────────────────────────────────────────────────────────

  function _ensurePassageiroTestExists() {
    fetch('/api/rotasegura/passageiro/cadastro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome:     CREDS.passageiro.nome,
        email:    CREDS.passageiro.email,
        senha:    CREDS.passageiro.senha,
        telefone: '(11) 99999-0002',
        cpf:      '987.654.321-00'
      })
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
      // Conta criada OU já existe — em ambos os casos está OK
      console.log('[Sandbox] Passageiro teste:', d.ok ? 'criado' : (d.erro || 'já existe'));
    })
    .catch(function() {});
  }

  function _ensureMotoristaTeste() {
    fetch('/api/rotasegura/motorista/cadastro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome:     CREDS.motorista.nome,
        email:    CREDS.motorista.email,
        senha:    CREDS.motorista.senha,
        telefone: CREDS.motorista.telefone,
        cpf:      CREDS.motorista.cpf,
        cnh:      CREDS.motorista.cnh,
        placa:    CREDS.motorista.placa,
        pixChave: CREDS.motorista.pix
      })
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
      console.log('[Sandbox] Motorista teste:', d.ok ? 'criado' : (d.erro || 'já existe'));
    })
    .catch(function() {});
  }

})();
