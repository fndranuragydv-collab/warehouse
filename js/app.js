// ============ APP CONTROLLER ============
let currentPage = 'dashboard';
const $ = id => document.getElementById(id);
const fmt = n => Number(n||0).toLocaleString('en-IN');
const fmtCur = n => '₹' + fmt(n);
const fmtDate = d => { const dt = new Date(d); return dt.toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:true}); };
const today = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0,16); };

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => { clearTimeout(timeout); func(...args); };
    clearTimeout(timeout); timeout = setTimeout(later, wait);
  };
}

function renderFilterBar(opts) {
  return `
    <div class="card" style="margin-bottom: 16px; display:flex; flex-wrap:wrap; gap:16px; align-items:flex-end;">
      <div style="flex: 2; min-width: 250px;">
        <label style="font-size:12px; color:var(--text2); font-weight:700; text-transform:uppercase; margin-bottom:6px; display:block;">Search</label>
        <div class="search-bar" style="margin:0; width:100%; border:1px solid var(--border); box-shadow:none;">
          <span class="material-icons-round">search</span>
          <input type="text" id="${opts.idPrefix}-search" placeholder="${opts.placeholder || 'Search...'}" oninput="${opts.onFilter}">
        </div>
      </div>
      <div style="flex: 1; min-width: 150px;">
        <label style="font-size:12px; color:var(--text2); font-weight:700; text-transform:uppercase; margin-bottom:6px; display:block;">From Date</label>
        <input type="date" class="form-control" id="${opts.idPrefix}-from" onchange="${opts.onFilter}">
      </div>
      <div style="flex: 1; min-width: 150px;">
        <label style="font-size:12px; color:var(--text2); font-weight:700; text-transform:uppercase; margin-bottom:6px; display:block;">To Date</label>
        <input type="date" class="form-control" id="${opts.idPrefix}-to" onchange="${opts.onFilter}">
      </div>
      ${opts.dropdownOptions ? `
      <div style="flex: 1; min-width: 150px;">
        <label style="font-size:12px; color:var(--text2); font-weight:700; text-transform:uppercase; margin-bottom:6px; display:block;">${opts.dropdownLabel}</label>
        <select class="form-control" id="${opts.idPrefix}-filter" onchange="${opts.onFilter}">
          <option value="All">All</option>
          ${opts.dropdownOptions.map(o=>`<option value="${o}">${o}</option>`).join('')}
        </select>
      </div>` : ''}
      <div>
        <button class="btn btn-secondary" style="height:40px" onclick="document.getElementById('${opts.idPrefix}-search').value=''; document.getElementById('${opts.idPrefix}-from').value=''; document.getElementById('${opts.idPrefix}-to').value=''; ${opts.dropdownOptions ? `document.getElementById('${opts.idPrefix}-filter').value='All';` : ''} ${opts.onFilter}()"><span class="material-icons-round">restart_alt</span> Reset</button>
      </div>
    </div>
  `;
}
let pendingConfirm = null;
function confirmAction(msg, callback) {
  pendingConfirm = callback;
  openModal('Warning', `
    <div style="text-align:center;padding:10px 0">
      <span class="material-icons-round" style="font-size:48px;color:var(--error);margin-bottom:12px">warning</span>
      <h3 style="margin-bottom:24px">${msg}</h3>
      <div style="display:flex;gap:12px">
        <button class="btn btn-secondary btn-full" onclick="closeModal()">Cancel</button>
        <button class="btn btn-danger btn-full" onclick="closeModal(); if(pendingConfirm) pendingConfirm();">Yes, Delete</button>
      </div>
    </div>
  `);
}

// ---- INIT ----
window.addEventListener('DOMContentLoaded', () => {
  enforceDesktopOnly();
  setTimeout(() => {
    $('splash-screen').style.opacity = '0';
    setTimeout(() => {
      $('splash-screen').style.display = 'none';
      if (window.innerWidth < 1024) return; // blocked
      if (Auth.restoreSession()) showApp();
      else $('login-screen').style.display = 'flex';
    }, 400);
  }, 1200);
});

function handleLogin(e) {
  e.preventDefault();
  const u = $('username').value.trim();
  const p = $('password').value;
  const res = Auth.login(u, p);
  if (res.success) { 
    $('login-screen').style.display='none'; 
    showApp(); 
  } else { 
    toast(res.error, 'error'); 
  }
}

function showApp() {
  $('app-shell').style.display = 'flex';
  $('welcome-name').textContent = Auth.getName();
  $('avatar-initial').textContent = Auth.getName().charAt(0).toUpperCase();
  renderWarehouseSwitcher();
  navigate('dashboard');
}

function logout() {
  Auth.logout();
  location.reload();
}

function renderWarehouseSwitcher() {
  const container = $('warehouse-switcher-container');
  if(!container) return;
  const allowed = Auth.getAllowedWarehouses();
  if(allowed.length <= 1 && !Auth.isAdmin()) {
    container.innerHTML = `<span style="font-size:14px; font-weight:600; color:var(--text-light);">${allowed[0]?.name || ''}</span>`;
    return;
  }
  const activeId = DB.getActiveWarehouse();
  let html = `<select class="form-control" style="width:200px; height:36px; padding:0 12px; font-weight:600; cursor:pointer;" onchange="DB.setActiveWarehouse(this.value)">`;
  allowed.forEach(w => {
    html += `<option value="${w.id}" ${w.id === activeId ? 'selected' : ''}>${w.name}</option>`;
  });
  html += `</select>`;
  container.innerHTML = html;
}

function navigate(page) {
  currentPage = page;
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const nav = $('nav-'+page);
  if(nav) nav.classList.add('active');
  
  const titles = {
    dashboard:'Dashboard',
    inventory:'SKU Master',
    purchase:'Purchases',
    orders:'Orders',
    returns:'Returns',
    payments:'Payments',
    racks:'Rack View',
    export:'Export Data',
    admin:'Admin Panel'
  };
  const t = titles[page] || 'Warehouse';
  const el = $('page-title');
  if(el) el.textContent = t;
  
  const pc = $('page-content');
  if(!pc) return;
  pc.innerHTML = '';
  
  const existing = document.querySelector('.fab');
  if (existing) existing.remove();
  
  renderWarehouseSwitcher();
  
  switch(page) {
    case 'dashboard': renderDashboard(pc); break;
    case 'inventory': renderInventory(pc); break;
    case 'purchase': renderPurchase(pc); break;
    case 'orders': renderOrders(pc); break;
    case 'returns': renderReturns(pc); break;
    case 'payments': renderPayments(pc); break;
    case 'racks': renderRacks(pc); break;
    case 'export': renderExport(pc); break;
    case 'admin': renderAdmin(pc); break;
  }
}

function togglePassword() {
  const inp = $('login-password');
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

function toggleTheme() {
  const d = document.documentElement;
  d.setAttribute('data-theme', d.getAttribute('data-theme') === 'dark' ? '' : 'dark');
}

function showProfile() {
  const whs = DB.getWarehouses();
  openModal('Profile', `<div class="profile-panel">
    <div class="profile-avatar"><span class="material-icons-round">person</span></div>
    <h3>${Auth.getName()}</h3>
    <p>@${Auth.getUsername()} · ${Auth.isAdmin()?'Admin':'User'}</p>
    
    ${Auth.isAdmin() ? `
    <div style="margin:24px 0;text-align:left;background:var(--card);padding:16px;border-radius:12px;border:1px solid var(--border)">
      <h4 style="margin-bottom:12px;font-size:14px">Manage Warehouses</h4>
      <div style="display:flex;gap:8px;margin-bottom:12px">
        <input id="f-new-wh" placeholder="New Warehouse Name" style="flex:1;padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:14px">
        <button class="btn btn-primary btn-small" onclick="const v=document.getElementById('f-new-wh').value.trim();if(v){const r=DB.addWarehouse(v); if(r.success){toast('Warehouse added'); showProfile(); renderWarehouseSwitcher();}else{toast(r.msg,'error');}}">Add</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px">
        ${whs.map(w=>`
          <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg); border:1px solid var(--border); padding:6px 12px; border-radius:8px;">
            <span style="font-size:14px; font-weight:600;">${w.name}</span>
            <button class="icon-btn" style="color:var(--error)" onclick="handleDeleteWarehouse('${w.id}', '${w.name.replace(/'/g, "\\'")}')">
              <span class="material-icons-round" style="font-size:16px;">delete</span>
            </button>
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}

    <div class="profile-actions">
      <button class="btn btn-danger btn-full" onclick="Auth.logout();location.reload();">
        <span class="material-icons-round">logout</span> Sign Out
      </button>
    </div>
  </div>`);
}

window.handleDeleteWarehouse = function(id, name) {
  confirmAction(`Delete warehouse ${name}?`, () => {
    const r = DB.deleteWarehouse(id);
    if(r.success) {
      toast('Deleted');
      location.reload();
    } else {
      toast(r.msg, 'error');
    }
  });
};

function toast(msg, type='success') {
  const c = $('toast-container');
  const t = document.createElement('div');
  t.className = 'toast toast-'+type;
  t.innerHTML = `<span class="material-icons-round">${type==='success'?'check_circle':type==='error'?'error':'info'}</span>${msg}`;
  c.appendChild(t);
  setTimeout(() => { t.style.opacity='0'; setTimeout(()=>t.remove(),300); }, 3000);
}

function openModal(title, html) {
  $('modal-title').textContent = title;
  $('modal-body').innerHTML = html;
  const m = $('modal-overlay');
  m.style.display = 'flex';
  setTimeout(() => m.classList.add('active'), 10);
}
function closeModal() {
  const m = $('modal-overlay');
  m.classList.remove('active');
  setTimeout(() => m.style.display = 'none', 400);
}

function addFab(icon, onclick) {
  const f = document.createElement('button');
  f.className = 'fab'; f.onclick = onclick;
  f.innerHTML = `<span class="material-icons-round">${icon}</span>`;
  document.getElementById('app-shell').appendChild(f);
}

function skuOptions(selected) {
  return DB.getSkus().map(s => `<option value="${s.id}" ${s.id===selected?'selected':''}>${s.sku} - ${s.productName}</option>`).join('');
}

// ==== DESKTOP RESTRICTION ====
function enforceDesktopOnly() {
  const w = window.innerWidth;
  const blocker = document.getElementById('mobile-blocker');
  if(w < 1024) {
    if(blocker) blocker.style.display = 'flex';
  } else {
    if(blocker) blocker.style.display = 'none';
  }
}
window.addEventListener('resize', enforceDesktopOnly);
window.addEventListener('DOMContentLoaded', enforceDesktopOnly);
enforceDesktopOnly();
