/* RotaSegura — Admin Passageiros */
var ADMIN_KEY_STORE = 'rs_admin_key';
var AKEY = '';
var todos = [];
var filtroAtual = 'todos';

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
  } catch(e) { mostrarLoginErro('Erro de conexão: ' + e.message); }
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

function fmtCpf(cpf) {
  if (!cpf) return '-';
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, function(_,a,b,c,d){ return a+'.'+b+'.'+c+'-'+d; });
}

function esc(s) {
  return String(s||'').replace(/"/g, '&quot;');
}

function rowPassageiro(p) {
  var avatarIcon = p.temSelfie ? '' : '<i class="fas fa-user" style="color:rgba(255,255,255,.3)"></i>';
  var docsBadge = '';
  if (!p.temSelfie && !p.temDoc) {
    docsBadge = '<span class="badge badge-nodocs"><i class="fas fa-image"></i> Sem docs</span>';
  } else {
    var ds = p.docsStatus || 'pendente';
    docsBadge = '<span class="badge badge-' + ds + '">' + ds + '</span>';
    if (p.temSelfie) docsBadge += ' <button class="btn-sm btn-ver" style="margin-left:4px" onclick="verFoto(&quot;' + esc(p.id) + '&quot;,&quot;selfie&quot;,&quot;' + esc(p.nome) + '&quot;)"><i class="fas fa-camera"></i></button>';
    if (p.temDoc)    docsBadge += ' <button class="btn-sm btn-ver" style="margin-left:4px" onclick="verFoto(&quot;' + esc(p.id) + '&quot;,&quot;doc&quot;,&quot;' + esc(p.nome) + '&quot;)"><i class="fas fa-id-card"></i></button>';
  }
  var geoCell = p.geoLat
    ? '<a class="geo-link" href="https://maps.google.com/?q=' + p.geoLat + ',' + p.geoLng + '" target="_blank"><i class="fas fa-map-marker-alt"></i> Ver mapa</a><br><span style="font-size:10px;color:rgba(255,255,255,.3)">' + (p.geoEndereco||'') + '</span>'
    : '<span style="color:rgba(255,255,255,.2);font-size:12px">\u2014</span>';
  var acaoStatus = p.status === 'ativo'
    ? '<button class="btn-sm btn-bloquear" onclick="mudarStatus(&quot;' + esc(p.id) + '&quot;,&quot;inativo&quot;)"><i class="fas fa-ban"></i> Bloquear</button>'
    : '<button class="btn-sm btn-aprovar" onclick="mudarStatus(&quot;' + esc(p.id) + '&quot;,&quot;ativo&quot;)"><i class="fas fa-check"></i> Ativar</button>';
  var acaoDocs = p.docsStatus === 'pendente'
    ? '<button class="btn-sm btn-aprovar" onclick="aprovarDocs(&quot;' + esc(p.id) + '&quot;,&quot;aprovado&quot;)"><i class="fas fa-file-check"></i> Aprovar docs</button>'
    : '';
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
    '<td><div style="display:flex;gap:6px">' + acaoStatus + acaoDocs + '</div></td>' +
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
  var tipoLabel = {selfie:'Selfie',doc:'Documento',cnh:'CNH',docveiculo:'Doc Veículo',cnhverso:'CNH (verso)'};
  document.getElementById('modalTitulo').textContent = (tipoLabel[tipo]||tipo) + ' \u2014 ' + nome;
  document.getElementById('modalInfo').textContent = 'Carregando...';
  document.getElementById('modalImg').src = '';
  document.getElementById('modalAcoes').innerHTML = '';
  document.getElementById('modal').classList.add('open');
  try {
    var r = await fetch('/api/rotasegura/admin/passageiro/' + id + '/foto/' + tipo, { headers: {'X-Admin-Key': AKEY} });
    if (!r.ok) { document.getElementById('modalInfo').textContent = 'Foto não encontrada'; return; }
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
    method: 'POST',
    headers: {'Content-Type': 'application/json', 'X-Admin-Key': AKEY},
    body: JSON.stringify({ status: status })
  });
  var p = todos.find(function(x){ return x.id === id; });
  if (p) p.status = status;
  renderTabela();
}

async function aprovarDocs(id, docsStatus) {
  await fetch('/api/rotasegura/admin/passageiro/' + id + '/status', {
    method: 'POST',
    headers: {'Content-Type': 'application/json', 'X-Admin-Key': AKEY},
    body: JSON.stringify({ docsStatus: docsStatus })
  });
  var p = todos.find(function(x){ return x.id === id; });
  if (p) p.docsStatus = docsStatus;
  renderTabela();
}

// Auto-login se tiver chave salva
var savedKey = localStorage.getItem(ADMIN_KEY_STORE);
if (savedKey) { AKEY = savedKey; carregarDados(); }
