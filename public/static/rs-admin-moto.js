/* RotaSegura — Admin Motoristas */
var ADMIN_KEY_STORE = 'rs_admin_key_moto';
var AKEY = '';
var todos = [];
var filtroAtual = 'todos';
var modalId = '';

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

function esc(s) {
  return String(s||'').replace(/"/g, '&quot;');
}

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
    '<td><div style="display:flex;gap:5px;flex-wrap:wrap">' + acaoStatus + acaoDocs + '</div></td>' +
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
  var tipoLabel = {selfie:'Selfie',cnh:'CNH',docveiculo:'Doc Ve\u00edculo',cnhverso:'CNH (verso)'};
  document.getElementById('modalTitulo').textContent = (tipoLabel[tipo]||tipo) + ' \u2014 ' + nome;
  document.getElementById('modalInfo').textContent = 'Carregando...';
  var img = document.getElementById('modalImg');
  img.src = ''; img.style.display = 'none';
  document.getElementById('modalAcoes').innerHTML = '';
  var m = todos.find(function(x){ return x.id === id; });
  var tipos = [];
  if (m && m.temSelfie)    tipos.push({k:'selfie',l:'Selfie'});
  if (m && m.temCnh)       tipos.push({k:'cnh',l:'CNH'});
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
    method: 'POST',
    headers: {'Content-Type': 'application/json', 'X-Admin-Key': AKEY},
    body: JSON.stringify({ status: status })
  });
  var m = todos.find(function(x){ return x.id === id; });
  if (m) m.status = status;
  renderTabela();
}

async function aprovarDocs(id, docsStatus) {
  await fetch('/api/rotasegura/admin/motorista/' + id + '/status', {
    method: 'POST',
    headers: {'Content-Type': 'application/json', 'X-Admin-Key': AKEY},
    body: JSON.stringify({ docsStatus: docsStatus })
  });
  var m = todos.find(function(x){ return x.id === id; });
  if (m) m.docsStatus = docsStatus;
  renderTabela();
}

// Auto-login se tiver chave salva
var savedKey = localStorage.getItem(ADMIN_KEY_STORE);
if (savedKey) { AKEY = savedKey; carregarDados(); }
