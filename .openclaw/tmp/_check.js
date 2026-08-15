
  function refreshIcons() { if (window.lucide) lucide.createIcons(); }
  document.addEventListener('DOMContentLoaded', refreshIcons);

  let toastTimer = null;
  function toast(msg) {
    const t = document.getElementById('toast');
    document.getElementById('toast-msg').textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
  }

  // Theme toggle
  function toggleTheme() {
    const html = document.documentElement;
    const dark = html.getAttribute('data-theme') === 'dark';
    html.setAttribute('data-theme', dark ? 'light' : 'dark');
    document.getElementById('theme-btn').innerHTML = '<i data-lucide="' + (dark ? 'moon' : 'sun') + '" style="width:16px;height:16px;"></i>';
    refreshIcons();
  }

  // Screen switcher
  function switchScreen(screen) {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    const nav = document.querySelector(`[data-screen="${screen}"]`);
    if (nav) nav.classList.add('active');
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById('screen-' + screen);
    if (el) el.classList.add('active');
    closeDeal();
    document.querySelector('.content').scrollTo(0, 0);
    refreshIcons();
  }
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => switchScreen(item.getAttribute('data-screen')));
  });

  // Command palette
  function openCmdk() { document.getElementById('cmdk-overlay').classList.add('open'); setTimeout(() => document.getElementById('cmdk-input').focus(), 100); refreshIcons(); }
  function closeCmdk() { document.getElementById('cmdk-overlay').classList.remove('open'); }
  function cmdkAction(query) {
    toast('🔮 AI parsing: "' + query + '"...');
    closeCmdk();
    setTimeout(() => {
      if (query.includes('stuck')) { switchScreen('pipeline'); toast('✓ Filtered: 17 deals stuck > 14 hari'); }
      else if (query.includes('Novara')) { toast('✓ New Deal modal opened (mockup)'); }
      else if (query.includes('Top 5')) { switchScreen('reports'); toast('✓ Report generated'); }
    }, 900);
  }
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); openCmdk(); }
    if (e.key === 'Escape') { closeCmdk(); closeDeal(); }
  });
  document.getElementById('cmdk-overlay').addEventListener('click', e => { if (e.target === e.currentTarget) closeCmdk(); });

  // Natural language query
  function setNLQuery(q) { document.getElementById('nl-query').value = q; }
  function askAI() {
    const q = document.getElementById('nl-query').value || 'query kosong';
    toast('🔮 AI parsing "' + q + '"...');
    setTimeout(() => toast('✓ Query executed · 17 results'), 1500);
  }

  // Deal drawer
  function openDeal(name, value, stage, owner, score) {
    document.getElementById('drawer-name').textContent = name;
    document.getElementById('drawer-value').textContent = value;
    document.getElementById('drawer-stage').textContent = stage;
    document.getElementById('drawer-score').textContent = score;
    const ring = document.getElementById('drawer-ring');
    const circ = 107; // 2*pi*17
    const off = circ * (1 - score / 100);
    ring.setAttribute('stroke-dashoffset', off);
    ring.setAttribute('stroke', score >= 75 ? '#10B981' : (score >= 50 ? '#F59E0B' : '#EF4444'));
    document.getElementById('drawer').classList.add('open');
    document.getElementById('drawer-overlay').classList.add('open');
    refreshIcons();
  }
  function closeDeal() {
    document.getElementById('drawer').classList.remove('open');
    document.getElementById('drawer-overlay').classList.remove('open');
  }

  // Pipeline view switcher
  function switchView(view) {
    document.querySelectorAll('.view-btn').forEach(btn => {
      const isActive = btn.getAttribute('data-view') === view;
      btn.style.background = isActive ? 'var(--brand)' : 'var(--surface)';
      btn.style.color = isActive ? 'white' : 'var(--txt-2)';
      btn.style.fontWeight = isActive ? '700' : '500';
      if (isActive) btn.classList.add('active'); else btn.classList.remove('active');
    });
    ['kanban','grouped','list','forecast'].forEach(v => {
      const el = document.getElementById('view-' + v);
      if (el) el.style.display = (v === view) ? '' : 'none';
    });
    refreshIcons();
    toast('View: ' + view.charAt(0).toUpperCase() + view.slice(1));
  }

  // Pipeline filter (live)
  function filterPipeline(q) {
    q = q.toLowerCase().trim();
    const rows = document.querySelectorAll('#grouped-table tbody tr');
    let shown = 0;
    rows.forEach(r => {
      const name = (r.getAttribute('data-name') || '').toLowerCase();
      const match = name.includes(q);
      r.style.display = match ? '' : 'none';
      if (match) shown++;
    });
    if (q) toast('✓ ' + shown + ' deal cocok');
  }

  // Sort grouped table
  function sortTable(id, col) {
    const table = document.getElementById(id);
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    rows.sort((a, b) => {
      const av = a.cells[col].textContent.trim();
      const bv = b.cells[col].textContent.trim();
      return av.localeCompare(bv, 'id', { numeric: true });
    });
    rows.forEach(r => tbody.appendChild(r));
    toast('✓ Diurutkan');
  }

  // AI enrich Novara
  function enrichNovara() {
    const i = document.getElementById('cell-industry-novara');
    const p = document.getElementById('cell-profile-novara');
    i.innerHTML = '<div class="shimmer" style="height:20px; width:120px;"></div>';
    p.innerHTML = '<div class="shimmer" style="height:14px; width:80%; margin-bottom:6px;"></div><div class="shimmer" style="height:14px; width:60%;"></div>';
    toast('🔮 Generating with GLM-4-Flash...');
    setTimeout(() => {
      i.innerHTML = '<span class="badge badge-primary">Information Tech</span>';
      p.innerHTML = 'Software development company fokus tools untuk SMB Indonesia. Kompetitor tidak langsung: Talenta + Mekari.<button style="font-size:11px;color:var(--brand);font-weight:600;margin-top:4px;display:inline-flex;align-items:center;gap:3px;background:none;border:none;cursor:pointer;font-family:inherit;" onclick="toast(\'Regenerating...\')"><i data-lucide="refresh-cw" style="width:11px;height:11px;"></i> Regenerate</button>';
      p.style.color = ''; p.style.fontStyle = '';
      refreshIcons();
      toast('✓ Enriched successfully');
    }, 1800);
  }
  function enrichAll() { toast('🔮 Enriching semua company (bulk)...'); setTimeout(() => toast('✓ 8 company baru di-enrich'), 2000); }
