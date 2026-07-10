/* RotaSegura — Admin Motoristas */
var ADMIN_KEY_STORE = 'rs_admin_key_moto';
var AKEY = '';
var todos = [];
var filtroAtual = 'todos';
var modalId = '';

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
        '<i class="fas fa-cloud-upload-alt" style="font-size:28px;color:rgba(26,106,255,.7)"></i>',
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
      '<button id="upBtn" onclick="upEnviar()" style="width:100%;margin-top:16px;padding:13px;background:linear-gradient(135deg,#1a6aff,#0044cc);border:none;border-radius:11px;color:#fff;font-size:15px;font-weight:700;cursor:pointer">',
        '<i class="fas fa-upload"></i> Salvar documento',
      '</button>',
    '</div>'
  ].join('');
  el.onclick = function(ev) { if (ev.target === el) fecharUpload(); };
  document.body.appendChild(el);
})();

var _upId = '', _upTipo = 'selfie', _upDataUrl = '';

function abrirUpload(id, nome) {
  _upId = id; _upTipo = 'selfie'; _upDataUrl = '';
  document.getElementById('upTitulo').textContent = 'Anexar documento — ' + nome;
  var tipos = [
    {k:'selfie',    l:'Selfie'},
    {k:'cnh',       l:'CNH Frente'},
    {k:'cnhverso',  l:'CNH Verso'},
    {k:'docveiculo',l:'Doc Ve\u00edculo (CRLV)'}
  ];
  document.getElementById('upTipos').innerHTML = tipos.map(function(t, i) {
    var isFirst = i === 0;
    return '<button class="up-tipo-btn' + (isFirst?' on':'') + '" ' +
      'onclick="upTrocarTipo(this,\'' + t.k + '\')" ' +
      'style="padding:6px 14px;border-radius:20px;border:1px solid rgba(255,255,255,' + (isFirst?'.35':'.12') + ');' +
      'background:' + (isFirst?'rgba(26,106,255,.15)':'transparent') + ';' +
      'color:' + (isFirst?'#4d8bff':'rgba(255,255,255,.45)') + ';font-size:12px;cursor:pointer">' +
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
  btn.style.borderColor = 'rgba(26,106,255,.35)';
  btn.style.background = 'rgba(26,106,255,.15)';
  btn.style.color = '#4d8bff';
}

function upSelecionou(ev) {
  var file = ev.target.files && ev.target.files[0];
  if (!file) return;
  if (file.size > 1500000) {
    document.getElementById('upErro').textContent = 'Arquivo muito grande. M\u00e1x 1MB.';
    document.getElementById('upErro').style.display = 'block';
    return;
  }
  document.getElementById('upErro').style.display = 'none';
  var reader = new FileReader();
  reader.onload = function(e) {
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
    var r = await fetch('/api/rotasegura/admin/motorista/' + _upId + '/foto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Key': AKEY },
      body: JSON.stringify({ tipo: _upTipo, dataUrl: _upDataUrl })
    });
    var d = await r.json();
    if (!d.ok) throw new Error(d.erro || 'Erro desconhecido');
    var m = todos.find(function(x) { return x.id === _upId; });
    if (m) {
      if (_upTipo === 'selfie')     m.temSelfie = true;
      if (_upTipo === 'cnh')        m.temCnh = true;
      if (_upTipo === 'cnhverso')   m.temCnh = true;
      if (_upTipo === 'docveiculo') m.temDocVeiculo = true;
      if (!m.docsStatus || m.docsStatus === 'sem_docs') m.docsStatus = 'pendente';
    }
    fecharUpload();
    renderTabela();
    if (_upTipo === 'selfie') carregarThumb(_upId, 'selfie', 'av_' + _upId, 'motorista');
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
    var r = await fetch('/api/rotasegura/admin/motoristas', { headers: { 'X-Admin-Key': AKEY } });
    if (r.status === 401) { mostrarLoginErro('Chave incorreta'); return; }
    var d = await r.json();
    if (!d.ok) { mostrarLoginErro(d.erro); return; }
    todos = d.motoristas || [];
    document.getElementById('loginBox').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';

    var rs = await fetch('/api/rotasegura/admin/stats', { headers: { 'X-Admin-Key': AKEY } });
    var sd = await rs.json();
    var comAsaas = todos.filter(function(m){ return m.asaasStatus === 'aprovado'; }).length;
    var docsPend = todos.filter(function(m){ return m.docsStatus === 'pendente'; }).length;
    var totalGanhos = todos.reduce(function(s,m){ return s + (m.ganhoTotal||0); }, 0);
    document.getElementById('statsRow').innerHTML =
      '<div class="stat-card"><div class="stat-val">' + (sd.motoristas||0) + '</div><div class="stat-label"><i class="fas fa-car"></i> Motoristas</div></div>' +
      '<div class="stat-card"><div class="stat-val" style="color:#00C851">' + comAsaas + '</div><div class="stat-label"><i class="fas fa-bolt"></i> Com Asaas</div></div>' +
      '<div class="stat-card"><div class="stat-val" style="color:#ffc107">' + docsPend + '</div><div class="stat-label"><i class="fas fa-clock"></i> Docs Pendentes</div></div>' +
      '<div class="stat-card"><div class="stat-val" style="color:#ffc107">' + (sd.corridas||0) + '</div><div class="stat-label"><i class="fas fa-route"></i> Corridas</div></div>' +
      '<div class="stat-card"><div class="stat-val" style="color:#00C851;font-size:22px">R$' + (totalGanhos/100).toFixed(2) + '</div><div class="stat-label"><i class="fas fa-hand-holding-usd"></i> Total Motoristas</div></div>';
    renderTabela();
  } catch(e) { mostrarLoginErro('Erro: ' + e.message); }
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

/* ─── Linha da tabela ────────────────────────────────────────────── */
function rowMotorista(m) {
  var docsIcons = '';
  if (m.temSelfie)    docsIcons += '<button class="btn-sm btn-ver" title="Selfie" onclick="verFoto(&quot;' + esc(m.id) + '&quot;,&quot;selfie&quot;,&quot;' + esc(m.nome) + '&quot;)"><i class="fas fa-camera"></i></button>';
  if (m.temCnh)       docsIcons += '<button class="btn-sm btn-ver" title="CNH" onclick="verFoto(&quot;' + esc(m.id) + '&quot;,&quot;cnh&quot;,&quot;' + esc(m.nome) + '&quot;)"><i class="fas fa-id-card"></i></button>';
  if (m.temDocVeiculo)docsIcons += '<button class="btn-sm btn-ver" title="Doc Ve\u00edculo" onclick="verFoto(&quot;' + esc(m.id) + '&quot;,&quot;docveiculo&quot;,&quot;' + esc(m.nome) + '&quot;)"><i class="fas fa-car"></i></button>';
  var nenhum = !m.temSelfie && !m.temCnh && !m.temDocVeiculo;
  var ds = m.docsStatus || 'pendente';
  var docsCell = nenhum
    ? '<span class="badge badge-nodocs">Sem docs</span>'
    : '<div style="margin-bottom:4px"><span class="badge badge-' + ds + '">' + ds + '</span></div><div class="docs-icons">' + docsIcons + '</div>';
  var asaasCell = '<span class="badge badge-' + (m.asaasStatus||'sem_cnpj') + '">' + (m.asaasStatus||'sem_cnpj') + '</span>' +
    (m.asaasWalletId ? '<div class="asaas-ok" title="' + esc(m.asaasWalletId) + '"><i class="fas fa-bolt"></i> Split ativo</div>' : '<div class="asaas-no">Sem split</div>');
  var geoCell = m.geoLat
    ? '<a class="geo-link" href="https://maps.google.com/?q=' + m.geoLat + ',' + m.geoLng + '" target="_blank"><i class="fas fa-map-marker-alt"></i> Ver mapa</a><br><span style="font-size:10px;color:rgba(255,255,255,.25)">' + (m.geoEndereco||'') + '</span>'
    : '<span style="color:rgba(255,255,255,.2);font-size:11px">\u2014</span>';
  var acaoStatus = m.status === 'ativo'
    ? '<button class="btn-sm btn-bloquear" onclick="mudarStatus(&quot;' + esc(m.id) + '&quot;,&quot;bloqueado&quot;)"><i class="fas fa-ban"></i> Bloquear</button>'
    : '<button class="btn-sm btn-aprovar" onclick="mudarStatus(&quot;' + esc(m.id) + '&quot;,&quot;ativo&quot;)"><i class="fas fa-check"></i> Ativar</button>';
  var acaoDocs = m.docsStatus === 'pendente'
    ? '<button class="btn-sm btn-aprovar" onclick="aprovarDocs(&quot;' + esc(m.id) + '&quot;,&quot;aprovado&quot;)"><i class="fas fa-file-check"></i> Aprovar</button>' +
      '<button class="btn-sm btn-bloquear" onclick="aprovarDocs(&quot;' + esc(m.id) + '&quot;,&quot;rejeitado&quot;)"><i class="fas fa-times"></i> Rejeitar</button>'
    : '';
  var acaoAnexar = '<button class="btn-sm" style="background:rgba(26,106,255,.12);color:#4d8bff;border:1px solid rgba(26,106,255,.25)" ' +
    'title="Anexar documento" onclick="abrirUpload(&quot;' + esc(m.id) + '&quot;,&quot;' + esc(m.nome) + '&quot;)">' +
    '<i class="fas fa-paperclip"></i> Anexar</button>';
  var st = m.status || 'inativo';
  var avatarIcon = m.temSelfie ? '' : '<i class="fas fa-user" style="color:rgba(255,255,255,.3)"></i>';
  var ganho = 'R$' + ((m.ganhoTotal||0)/100).toFixed(2);
  return '<tr>' +
    '<td><div class="user-cell">' +
      '<div class="avatar" id="av_' + m.id + '" onclick="verFoto(&quot;' + esc(m.id) + '&quot;,&quot;selfie&quot;,&quot;' + esc(m.nome) + '&quot;)">' + avatarIcon + '</div>' +
      '<div><div style="font-weight:600;font-size:13px">' + (m.nome||'') + '</div><div style="font-size:10px;color:rgba(255,255,255,.3)">' + m.id + '</div></div>' +
    '</div></td>' +
    '<td><div style="font-weight:600">' + (m.veiculo||'-') + '</div><div style="font-size:11px;color:rgba(255,255,255,.4)">' + (m.placa||'-') + '</div></td>' +
    '<td><div>' + (m.email||'') + '</div><div style="font-size:11px;color:rgba(255,255,255,.4)">' + (m.telefone||'-') + '</div></td>' +
    '<td><span class="badge badge-' + st + '">' + st + '</span></td>' +
    '<td>' + docsCell + '</td>' +
    '<td>' + asaasCell + '</td>' +
    '<td style="text-align:center">' + (m.corridasTotal||0) + '</td>' +
    '<td style="color:#00C851;font-weight:600">' + ganho + '</td>' +
    '<td>' + geoCell + '</td>' +
    '<td><div style="display:flex;gap:5px;flex-wrap:wrap">' + acaoAnexar + acaoStatus + acaoDocs + '</div></td>' +
    '</tr>';
}

function renderTabela() {
  var busca = document.getElementById('busca').value.toLowerCase();
  var lista = todos.filter(function(m) {
    if (filtroAtual === 'ativo' && m.status !== 'ativo') return false;
    if (filtroAtual === 'bloqueado' && m.status !== 'bloqueado') return false;
    if (filtroAtual === 'docs_pend' && m.docsStatus !== 'pendente') return false;
    if (filtroAtual === 'sem_asaas' && m.asaasStatus !== 'sem_cnpj') return false;
    if (busca && (!m.nome||!m.nome.toLowerCase().includes(busca)) && (!m.email||!m.email.toLowerCase().includes(busca)) && (!m.placa||!m.placa.toLowerCase().includes(busca))) return false;
    return true;
  });
  var tbody = document.getElementById('tbody');
  var empty = document.getElementById('empty');
  if (!lista.length) { tbody.innerHTML = ''; empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  tbody.innerHTML = lista.map(rowMotorista).join('');
  lista.filter(function(m){ return m.temSelfie; }).forEach(function(m){ carregarThumb(m.id, 'selfie', 'av_' + m.id, 'motorista'); });
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
  modalId = id;
  var tipoLabel = {selfie:'Selfie',cnh:'CNH Frente',cnhverso:'CNH Verso',docveiculo:'Doc Ve\u00edculo'};
  document.getElementById('modalTitulo').textContent = (tipoLabel[tipo]||tipo) + ' \u2014 ' + nome;
  document.getElementById('modalInfo').textContent = 'Carregando...';
  var img = document.getElementById('modalImg');
  img.src = ''; img.style.display = 'none';
  document.getElementById('modalAcoes').innerHTML = '';
  var m = todos.find(function(x){ return x.id === id; });
  var tipos = [];
  if (m && m.temSelfie)    tipos.push({k:'selfie',    l:'Selfie'});
  if (m && m.temCnh)       tipos.push({k:'cnh',       l:'CNH'});
  if (m && m.temDocVeiculo)tipos.push({k:'docveiculo',l:'Doc Ve\u00edculo'});
  document.getElementById('modalTabs').innerHTML = tipos.map(function(t) {
    return '<button class="modal-tab ' + (t.k===tipo?'on':'') + '" onclick="verFoto(&quot;' + esc(id) + '&quot;,&quot;' + t.k + '&quot;,&quot;' + esc(nome) + '&quot;)">' + t.l + '</button>';
  }).join('');
  document.getElementById('modal').classList.add('open');
  try {
    var r = await fetch('/api/rotasegura/admin/motorista/' + id + '/foto/' + tipo, { headers: {'X-Admin-Key': AKEY} });
    if (!r.ok) { document.getElementById('modalInfo').textContent = 'Foto n\u00e3o encontrada'; return; }
    var blob = await r.blob();
    img.src = URL.createObjectURL(blob);
    img.style.display = 'block';
    document.getElementById('modalInfo').textContent = id;
    var docsAprov = m && m.docsStatus === 'aprovado';
    var btnAprovar = docsAprov ? '' : '<button class="btn-sm btn-aprovar" onclick="aprovarDocs(&quot;' + esc(id) + '&quot;,&quot;aprovado&quot;);fecharModal()"><i class="fas fa-check"></i> Aprovar docs</button>';
    var btnRejeitar = '<button class="btn-sm btn-bloquear" onclick="aprovarDocs(&quot;' + esc(id) + '&quot;,&quot;rejeitado&quot;);fecharModal()"><i class="fas fa-times"></i> Rejeitar</button>';
    var btnStatusM = (m && m.status === 'ativo')
      ? '<button class="btn-sm btn-bloquear" onclick="mudarStatus(&quot;' + esc(id) + '&quot;,&quot;bloqueado&quot;);fecharModal()"><i class="fas fa-ban"></i> Bloquear motorista</button>'
      : '<button class="btn-sm btn-aprovar" onclick="mudarStatus(&quot;' + esc(id) + '&quot;,&quot;ativo&quot;);fecharModal()"><i class="fas fa-check"></i> Ativar motorista</button>';
    document.getElementById('modalAcoes').innerHTML = btnAprovar + btnRejeitar + btnStatusM;
  } catch(e) { document.getElementById('modalInfo').textContent = 'Erro: ' + e.message; }
}

function fecharModal() { document.getElementById('modal').classList.remove('open'); }

async function mudarStatus(id, status) {
  await fetch('/api/rotasegura/admin/motorista/' + id + '/status', {
    method: 'POST', headers: {'Content-Type':'application/json','X-Admin-Key': AKEY},
    body: JSON.stringify({ status: status })
  });
  var m = todos.find(function(x){ return x.id === id; });
  if (m) m.status = status;
  renderTabela();
}

async function aprovarDocs(id, docsStatus) {
  await fetch('/api/rotasegura/admin/motorista/' + id + '/status', {
    method: 'POST', headers: {'Content-Type':'application/json','X-Admin-Key': AKEY},
    body: JSON.stringify({ docsStatus: docsStatus })
  });
  var m = todos.find(function(x){ return x.id === id; });
  if (m) m.docsStatus = docsStatus;
  renderTabela();
}

/* Auto-login */
var savedKey = localStorage.getItem(ADMIN_KEY_STORE);
if (savedKey) { AKEY = savedKey; carregarDados(); }
