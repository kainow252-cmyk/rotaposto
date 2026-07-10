/* RotaSegura — Admin Passageiros */
var ADMIN_KEY_STORE = 'rs_admin_key';
var AKEY = '';
var todos = [];
var filtroAtual = 'todos';

/* ─── Inject upload modal HTML once ─────────────────────────────── */
(function injectUploadModal() {
  if (document.getElementById('uploadModal')) return;
  var el = document.createElement('div');
  el.id = 'uploadModal';
  el.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:1100;align-items:center;justify-content:center';
  el.innerHTML = [
    '<div style="background:#181c26;border-radius:18px;padding:28px 24px;max-width:440px;width:92%;position:relative">',
      '<button onclick="fecharUpload()" style="position:absolute;top:12px;right:14px;background:none;border:none;color:rgba(255,255,255,.5);font-size:20px;cursor:pointer">&#x2715;</button>',
      '<div id="upTitulo" style="font-size:15px;font-weight:700;margin-bottom:18px"></div>',
      '<div id="upTipos" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px"></div>',
      '<label id="upLabel" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;',
        'border:2px dashed rgba(255,255,255,.15);border-radius:12px;padding:28px 16px;cursor:pointer;',
        'color:rgba(255,255,255,.45);font-size:13px;transition:border .2s;min-height:120px">',
        '<i class="fas fa-cloud-upload-alt" style="font-size:28px;color:rgba(0,200,81,.6)"></i>',
        '<span>Clique para selecionar ou arraste a imagem</span>',
        '<span style="font-size:11px;color:rgba(255,255,255,.25)">JPG, PNG, WEBP &bull; m&aacute;x 1MB</span>',
        '<input id="upInput" type="file" accept="image/*" style="display:none" onchange="upSelecionou(event)">',
      '</label>',
      '<div id="upPreviewWrap" style="display:none;margin-top:14px;text-align:center">',
        '<img id="upPreview" style="max-width:100%;max-height:260px;border-radius:10px;object-fit:contain"/>',
        '<div style="margin-top:8px">',
          '<button onclick="upLimpar()" style="background:rgba(255,68,88,.12);border:1px solid rgba(255,68,88,.3);color:#ff8a95;border-radius:8px;padding:5px 14px;font-size:12px;cursor:pointer">',
            '<i class="fas fa-trash"></i> Trocar</button>',
        '</div>',
      '</div>',
      '<div id="upErro" style="display:none;margin-top:10px;background:rgba(255,68,88,.12);border:1px solid rgba(255,68,88,.3);border-radius:8px;padding:10px;font-size:13px;color:#ff8a95"></div>',
      '<button id="upBtn" onclick="upEnviar()" style="width:100%;margin-top:16px;padding:13px;background:linear-gradient(135deg,#00C851,#007E33);border:none;border-radius:11px;color:#fff;font-size:15px;font-weight:700;cursor:pointer">',
        '<i class="fas fa-upload"></i> Salvar documento',
      '</button>',
    '</div>'
  ].join('');
  el.onclick = function(ev) { if (ev.target === el) fecharUpload(); };
  document.body.appendChild(el);
})();

var _upId = '', _upTipo = '', _upDataUrl = '';

function abrirUpload(id, nome) {
  _upId = id; _upTipo = 'selfie'; _upDataUrl = '';
  document.getElementById('upTitulo').textContent = 'Anexar documento — ' + nome;
  /* botões de tipo */
  var tipos = [{k:'selfie',l:'Selfie'},{k:'doc',l:'Documento / RG / CNH'}];
  document.getElementById('upTipos').innerHTML = tipos.map(function(t) {
    return '<button class="up-tipo-btn' + (t.k === 'selfie' ? ' on' : '') + '" ' +
      'onclick="upTrocarTipo(this,\'' + t.k + '\')" ' +
      'style="padding:6px 14px;border-radius:20px;border:1px solid rgba(255,255,255,' + (t.k==='selfie'?'.35':'.12') + ');' +
      'background:' + (t.k==='selfie'?'rgba(0,200,81,.15)':'transparent') + ';' +
      'color:' + (t.k==='selfie'?'#00C851':'rgba(255,255,255,.45)') + ';font-size:12px;cursor:pointer">' +
      t.l + '</button>';
  }).join('');
  upLimpar();
  document.getElementById('upErro').style.display = 'none';
  var m = document.getElementById('uploadModal');
  m.style.display = 'flex';
}

function fecharUpload() {
  document.getElementById('uploadModal').style.display = 'none';
  upLimpar();
}

function upTrocarTipo(btn, tipo) {
  _upTipo = tipo;
  document.querySelectorAll('.up-tipo-btn').forEach(function(b) {
    b.style.borderColor = 'rgba(255,255,255,.12)';
    b.style.background = 'transparent';
    b.style.color = 'rgba(255,255,255,.45)';
  });
  btn.style.borderColor = 'rgba(0,200,81,.35)';
  btn.style.background = 'rgba(0,200,81,.15)';
  btn.style.color = '#00C851';
}

function upSelecionou(ev) {
  var file = ev.target.files && ev.target.files[0];
  if (!file) return;
  if (file.size > 1500000) {
    document.getElementById('upErro').textContent = 'Arquivo muito grande. Máx 1MB.';
    document.getElementById('upErro').style.display = 'block';
    return;
  }
  document.getElementById('upErro').style.display = 'none';
  var reader = new FileReader();
  reader.onload = function(e) {
    _upDataUrl = e.target.result;
    /* compress via canvas */
    var img = new Image();
    img.onload = function() {
      var canvas = document.createElement('canvas');
      var MAX = 900;
      var w = img.width, h = img.height;
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
        else { w = Math.round(w * MAX / h); h = MAX; }
      }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      _upDataUrl = canvas.toDataURL('image/jpeg', 0.78);
      document.getElementById('upPreview').src = _upDataUrl;
      document.getElementById('upLabel').style.display = 'none';
      document.getElementById('upPreviewWrap').style.display = 'block';
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function upLimpar() {
  _upDataUrl = '';
  document.getElementById('upInput').value = '';
  document.getElementById('upPreview').src = '';
  document.getElementById('upLabel').style.display = 'flex';
  document.getElementById('upPreviewWrap').style.display = 'none';
}

async function upEnviar() {
  if (!_upDataUrl) {
    document.getElementById('upErro').textContent = 'Selecione uma imagem primeiro.';
    document.getElementById('upErro').style.display = 'block';
    return;
  }
  var btn = document.getElementById('upBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
  document.getElementById('upErro').style.display = 'none';
  try {
    var r = await fetch('/api/rotasegura/admin/passageiro/' + _upId + '/foto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Key': AKEY },
      body: JSON.stringify({ tipo: _upTipo, dataUrl: _upDataUrl })
    });
    var d = await r.json();
    if (!d.ok) throw new Error(d.erro || 'Erro desconhecido');
    /* atualizar local */
    var p = todos.find(function(x) { return x.id === _upId; });
    if (p) {
      if (_upTipo === 'selfie') p.temSelfie = true;
      if (_upTipo === 'doc') p.temDoc = true;
      if (!p.docsStatus || p.docsStatus === 'sem_docs') p.docsStatus = 'pendente';
    }
    fecharUpload();
    renderTabela();
    /* carregar thumb se selfie */
    if (_upTipo === 'selfie') carregarThumb(_upId, 'selfie', 'av_' + _upId, 'passageiro');
  } catch(e) {
    document.getElementById('upErro').textContent = 'Erro: ' + e.message;
    document.getElementById('upErro').style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-upload"></i> Salvar documento';
  }
}

/* ─── Login ─────────────────────────────────────────────────────── */
function entrar() {
  var k = document.getElementById('adminKey').value.trim();
  if (!k) return;
  AKEY = k;
  localStorage.setItem(ADMIN_KEY_STORE, k);
  carregarDados();
}

async function carregarDados() {
  try {
    var r = await fetch('/api/rotasegura/admin/passageiros', { headers: { 'X-Admin-Key': AKEY } });
    if (r.status === 401) { mostrarLoginErro('Chave incorreta'); return; }
    var d = await r.json();
    if (!d.ok) { mostrarLoginErro(d.erro); return; }
    todos = d.passageiros || [];
    document.getElementById('loginBox').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';

    var rs = await fetch('/api/rotasegura/admin/stats', { headers: { 'X-Admin-Key': AKEY } });
    var sd = await rs.json();
    var docsPend = todos.filter(function(p){ return p.docsStatus === 'pendente'; }).length;
    document.getElementById('statsRow').innerHTML =
      '<div class="stat-card"><div class="stat-val">' + (sd.passageiros||0) + '</div><div class="stat-label"><i class="fas fa-users"></i> Passageiros</div></div>' +
      '<div class="stat-card"><div class="stat-val" style="color:#4d8bff">' + (sd.motoristas||0) + '</div><div class="stat-label"><i class="fas fa-car"></i> Motoristas</div></div>' +
      '<div class="stat-card"><div class="stat-val" style="color:#ffc107">' + (sd.corridas||0) + '</div><div class="stat-label"><i class="fas fa-route"></i> Corridas</div></div>' +
      '<div class="stat-card"><div class="stat-val" style="color:#ff4458">' + docsPend + '</div><div class="stat-label"><i class="fas fa-clock"></i> Docs Pendentes</div></div>';
    renderTabela();
  } catch(e) { mostrarLoginErro('Erro de conex\u00e3o: ' + e.message); }
}

function mostrarLoginErro(msg) {
  var el = document.getElementById('errLogin');
  el.textContent = msg; el.style.display = 'block';
}

function filtrar(f, btn) {
  filtroAtual = f;
  document.querySelectorAll('.filter-btn').forEach(function(b){ b.classList.remove('on'); });
  btn.classList.add('on');
  renderTabela();
}

function esc(s) { return String(s||'').replace(/"/g, '&quot;'); }
function fmtCpf(cpf) {
  if (!cpf) return '-';
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, function(_,a,b,c,d){ return a+'.'+b+'.'+c+'-'+d; });
}

/* ─── Linha da tabela ────────────────────────────────────────────── */
function rowPassageiro(p) {
  var avatarIcon = p.temSelfie ? '' : '<i class="fas fa-user" style="color:rgba(255,255,255,.3)"></i>';
  /* docs badge */
  var docsBadge = '';
  if (!p.temSelfie && !p.temDoc) {
    docsBadge = '<span class="badge badge-nodocs"><i class="fas fa-image"></i> Sem docs</span>';
  } else {
    var ds = p.docsStatus || 'pendente';
    docsBadge = '<span class="badge badge-' + ds + '">' + ds + '</span>';
    if (p.temSelfie) docsBadge += ' <button class="btn-sm btn-ver" title="Ver selfie" onclick="verFoto(&quot;' + esc(p.id) + '&quot;,&quot;selfie&quot;,&quot;' + esc(p.nome) + '&quot;)"><i class="fas fa-camera"></i></button>';
    if (p.temDoc)    docsBadge += ' <button class="btn-sm btn-ver" title="Ver documento" onclick="verFoto(&quot;' + esc(p.id) + '&quot;,&quot;doc&quot;,&quot;' + esc(p.nome) + '&quot;)"><i class="fas fa-id-card"></i></button>';
  }
  /* geo */
  var geoCell = p.geoLat
    ? '<a class="geo-link" href="https://maps.google.com/?q=' + p.geoLat + ',' + p.geoLng + '" target="_blank"><i class="fas fa-map-marker-alt"></i> Ver mapa</a><br><span style="font-size:10px;color:rgba(255,255,255,.3)">' + (p.geoEndereco||'') + '</span>'
    : '<span style="color:rgba(255,255,255,.2);font-size:12px">\u2014</span>';
  /* ações */
  var acaoStatus = p.status === 'ativo'
    ? '<button class="btn-sm btn-bloquear" onclick="mudarStatus(&quot;' + esc(p.id) + '&quot;,&quot;inativo&quot;)"><i class="fas fa-ban"></i> Bloquear</button>'
    : '<button class="btn-sm btn-aprovar" onclick="mudarStatus(&quot;' + esc(p.id) + '&quot;,&quot;ativo&quot;)"><i class="fas fa-check"></i> Ativar</button>';
  var acaoDocs = p.docsStatus === 'pendente'
    ? '<button class="btn-sm btn-aprovar" onclick="aprovarDocs(&quot;' + esc(p.id) + '&quot;,&quot;aprovado&quot;)"><i class="fas fa-file-check"></i> Aprovar docs</button>'
    : '';
  /* botão anexar sempre visível */
  var acaoAnexar = '<button class="btn-sm" style="background:rgba(77,139,255,.12);color:#4d8bff;border:1px solid rgba(77,139,255,.25)" ' +
    'title="Anexar documento" onclick="abrirUpload(&quot;' + esc(p.id) + '&quot;,&quot;' + esc(p.nome) + '&quot;)">' +
    '<i class="fas fa-paperclip"></i> Anexar</button>';
  var dataCad = p.criadoEm ? new Date(p.criadoEm).toLocaleDateString('pt-BR') : '-';
  var st = p.status || 'inativo';
  return '<tr>' +
    '<td><div class="user-cell">' +
      '<div class="avatar" id="av_' + p.id + '" onclick="verFoto(&quot;' + esc(p.id) + '&quot;,&quot;selfie&quot;,&quot;' + esc(p.nome) + '&quot;)">' + avatarIcon + '</div>' +
      '<div><div style="font-weight:600;font-size:13px">' + (p.nome||'') + '</div><div style="font-size:11px;color:rgba(255,255,255,.35)">' + p.id + '</div></div>' +
    '</div></td>' +
    '<td><div style="font-size:13px">' + (p.email||'') + '</div><div style="font-size:11px;color:rgba(255,255,255,.4)">' + (p.telefone||'-') + '</div></td>' +
    '<td style="font-size:12px;color:rgba(255,255,255,.5)">' + fmtCpf(p.cpf) + '</td>' +
    '<td><span class="badge badge-' + st + '">' + st + '</span></td>' +
    '<td>' + docsBadge + '</td>' +
    '<td>' + geoCell + '</td>' +
    '<td style="font-size:11px;color:rgba(255,255,255,.35)">' + dataCad + '</td>' +
    '<td><div style="display:flex;gap:5px;flex-wrap:wrap">' + acaoAnexar + acaoStatus + acaoDocs + '</div></td>' +
    '</tr>';
}

function renderTabela() {
  var busca = document.getElementById('busca').value.toLowerCase();
  var lista = todos.filter(function(p) {
    if (filtroAtual === 'ativo' && p.status !== 'ativo') return false;
    if (filtroAtual === 'inativo' && p.status !== 'inativo') return false;
    if (filtroAtual === 'pendente' && p.docsStatus !== 'pendente') return false;
    if (filtroAtual === 'aprovado' && p.docsStatus !== 'aprovado') return false;
    if (busca && (!p.nome||!p.nome.toLowerCase().includes(busca)) && (!p.email||!p.email.toLowerCase().includes(busca))) return false;
    return true;
  });
  var tbody = document.getElementById('tbody');
  var empty = document.getElementById('empty');
  if (!lista.length) { tbody.innerHTML = ''; empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  tbody.innerHTML = lista.map(rowPassageiro).join('');
  lista.filter(function(p){ return p.temSelfie; }).forEach(function(p){ carregarThumb(p.id, 'selfie', 'av_' + p.id, 'passageiro'); });
}

async function carregarThumb(id, tipo, elId, entidade) {
  try {
    var r = await fetch('/api/rotasegura/admin/' + entidade + '/' + id + '/foto/' + tipo, { headers: {'X-Admin-Key': AKEY} });
    if (!r.ok) return;
    var blob = await r.blob();
    var url = URL.createObjectURL(blob);
    var el = document.getElementById(elId);
    if (el) el.innerHTML = '<img src="' + url + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>';
  } catch(e) {}
}

async function verFoto(id, tipo, nome) {
  var tipoLabel = {selfie:'Selfie',doc:'Documento',cnh:'CNH',docveiculo:'Doc Ve\u00edculo',cnhverso:'CNH (verso)'};
  document.getElementById('modalTitulo').textContent = (tipoLabel[tipo]||tipo) + ' \u2014 ' + nome;
  document.getElementById('modalInfo').textContent = 'Carregando...';
  document.getElementById('modalImg').src = '';
  document.getElementById('modalAcoes').innerHTML = '';
  document.getElementById('modal').classList.add('open');
  try {
    var r = await fetch('/api/rotasegura/admin/passageiro/' + id + '/foto/' + tipo, { headers: {'X-Admin-Key': AKEY} });
    if (!r.ok) { document.getElementById('modalInfo').textContent = 'Foto n\u00e3o encontrada'; return; }
    var blob = await r.blob();
    var url = URL.createObjectURL(blob);
    document.getElementById('modalImg').src = url;
    document.getElementById('modalInfo').textContent = id;
    document.getElementById('modalAcoes').innerHTML =
      '<button class="btn-sm btn-aprovar" onclick="aprovarDocs(&quot;' + esc(id) + '&quot;,&quot;aprovado&quot;);fecharModal()"><i class="fas fa-check"></i> Aprovar docs</button>' +
      '<button class="btn-sm btn-bloquear" onclick="aprovarDocs(&quot;' + esc(id) + '&quot;,&quot;rejeitado&quot;);fecharModal()"><i class="fas fa-times"></i> Rejeitar</button>';
  } catch(e) { document.getElementById('modalInfo').textContent = 'Erro: ' + e.message; }
}

function fecharModal() { document.getElementById('modal').classList.remove('open'); }

async function mudarStatus(id, status) {
  await fetch('/api/rotasegura/admin/passageiro/' + id + '/status', {
    method: 'POST', headers: {'Content-Type':'application/json','X-Admin-Key': AKEY},
    body: JSON.stringify({ status: status })
  });
  var p = todos.find(function(x){ return x.id === id; });
  if (p) p.status = status;
  renderTabela();
}

async function aprovarDocs(id, docsStatus) {
  await fetch('/api/rotasegura/admin/passageiro/' + id + '/status', {
    method: 'POST', headers: {'Content-Type':'application/json','X-Admin-Key': AKEY},
    body: JSON.stringify({ docsStatus: docsStatus })
  });
  var p = todos.find(function(x){ return x.id === id; });
  if (p) p.docsStatus = docsStatus;
  renderTabela();
}

/* Auto-login */
var savedKey = localStorage.getItem(ADMIN_KEY_STORE);
if (savedKey) { AKEY = savedKey; carregarDados(); }
