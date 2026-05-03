// ============ RETURNS ============
function renderReturns(c) {
  const list = DB.getReturns().slice().reverse();
  const types = ['RTO', 'Customer Return', 'Manual Adjustment'];
  c.innerHTML = `
    <div class="page-header" style="margin-bottom:16px;">
      <h3 style="font-size:20px; font-weight:700;">Returns</h3>
      <button class="btn btn-primary" style="margin-left:auto" onclick="openReturnForm()">+ Add Return</button>
    </div>
    ${renderFilterBar({ idPrefix: 'ret', placeholder: 'Search by SKU or type...', dropdownLabel: 'Type', dropdownOptions: types, onFilter: 'debouncedFilterReturns' })}
    <div id="return-list">${renderReturnList(list)}</div>
  `;
}
function renderReturnList(list) {
  if(!list.length) return '<div class="empty-state"><span class="material-icons-round">assignment_return</span><p>No returns yet</p></div>';
  let html = `<div class="table-wrapper"><table class="desktop-table">
    <thead><tr><th>Date</th><th>Return Type</th><th>SKU & Product</th><th>Qty</th><th>Added By</th><th>Actions</th></tr></thead><tbody>`;
  
  html += list.map(r => `
    <tr style="cursor:pointer" onclick="showReturnDetails('${r.id}')">
      <td>${fmtDate(r.date)}</td>
      <td><span class="badge" style="background:rgba(99,102,241,0.1);color:var(--primary)">${r.type}</span></td>
      <td><span style="color:var(--primary);font-weight:700">${r.sku}</span> <span style="opacity:0.7;font-size:12px">(${r.productName||'Unknown'})</span></td>
      <td><strong style="color:var(--success)">+${r.quantity}</strong></td>
      <td>${r.addedBy}</td>
      <td>
        <div class="actions" onclick="event.stopPropagation()">
          <button class="icon-btn" onclick="showReturnDetails('${r.id}')" title="View"><span class="material-icons-round">visibility</span></button>
          ${Auth.isAdmin()?`<button class="icon-btn" style="color:var(--error)" onclick="if(confirm('Delete this return?')) { DB.deleteReturn('${r.id}'); renderPage(); }" title="Delete"><span class="material-icons-round">delete</span></button>`:''}
        </div>
      </td>
    </tr>`).join('');
  html += `</tbody></table></div>`;
  return html;
}
function showReturnDetails(id) {
  const r = DB.getReturns().find(x => x.id === id);
  if (!r) return;
  openModal('Return Details', `
    <div style="display:flex; flex-direction:column; gap:16px;">
      <div style="background:var(--bg); padding:20px; border-radius:20px; border:1px solid var(--border);">
        <h4 style="margin-bottom:16px; color:var(--text); font-size:20px; font-weight:800; border-bottom:2px solid var(--border); padding-bottom:12px;">${r.sku} <span style="opacity:0.7;font-weight:600;font-size:16px;">- ${r.productName}</span></h4>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px; font-size:15px;">
          <div><span style="color:var(--text2);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Return Type</span><br><strong style="color:${r.type==='RTO'?'#F59E0B':'#EF4444'}">${r.type}</strong></div>
          <div><span style="color:var(--text2);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Date & Time</span><br><strong style="color:var(--text)">${fmtDate(r.date)}</strong></div>
          <div><span style="color:var(--text2);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Quantity Returned</span><br><strong style="color:var(--success);font-size:18px;">${r.quantity} Units</strong></div>
          <div><span style="color:var(--text2);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Added By</span><br><strong style="color:var(--text)">${r.addedBy || 'System'}</strong></div>
          ${r.isManualAdjustment ? `<div style="grid-column: 1 / -1; margin-top:8px;"><div style="background:var(--error); color:white; padding:12px 16px; border-radius:12px; font-weight:600;">⚠️ This return was generated automatically by a Manual Stock Decrease adjustment in the Admin Panel.</div></div>` : ''}
        </div>
      </div>
      <button class="btn btn-secondary btn-full" onclick="closeModal()">Close</button>
    </div>
  `);
}
function filterReturns() {
  const q = ($('ret-search')?.value || '').toLowerCase();
  const f = $('ret-filter')?.value || 'All';
  const from = $('ret-from')?.value;
  const to = $('ret-to')?.value;
  let list = DB.getReturns().slice().reverse();
  
  if(q) list = list.filter(r=>r.sku.toLowerCase().includes(q) || r.type.toLowerCase().includes(q));
  if(f !== 'All') list = list.filter(r=>r.type === f);
  if(from) { const fd = new Date(from); list = list.filter(r=>new Date(r.date) >= fd); }
  if(to) { const td = new Date(to); td.setHours(23,59,59); list = list.filter(r=>new Date(r.date) <= td); }
  
  $('return-list').innerHTML = renderReturnList(list);
}
const debouncedFilterReturns = debounce(filterReturns, 300);
function openReturnForm() {
  openModal('Add Return', `<form onsubmit="saveReturn(event)">
    <div class="form-row">
      <div class="form-group"><label>Date & Time</label><input class="form-control" type="datetime-local" id="f-rdate" value="${today()}" required></div>
      <div class="form-group"><label>SKU</label><select class="form-control" id="f-rsku" required><option value="">Select SKU</option>${skuOptions()}</select></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Quantity</label><input class="form-control" type="number" id="f-rqty" min="1" required></div>
      <div class="form-group"><label>Type</label><select class="form-control" id="f-rtype" required><option>RTO</option><option>Customer Return</option></select></div>
    </div>
    <div style="margin-top:20px;">
      <button type="submit" class="btn btn-primary btn-full" style="height: 45px; border-radius: 10px; font-size: 15px; font-weight: 700; background: linear-gradient(135deg, #6366F1, #8B5CF6); border: none; box-shadow: 0 4px 10px rgba(99, 102, 241, 0.3); transition: transform 0.2s, box-shadow 0.2s;">Add Return</button>
    </div>
  </form>`);
}
function saveReturn(e) {
  e.preventDefault();
  const sku = DB.getSkuById($('f-rsku').value);
  if(!sku) return toast('Select a valid SKU','error');
  DB.saveReturn({ id:DB.genId(), date:$('f-rdate').value, skuId:sku.id, sku:sku.sku, productName:sku.productName, quantity:parseInt($('f-rqty').value), type:$('f-rtype').value, addedBy:Auth.getUsername(), createdAt:new Date().toISOString() });
  closeModal(); toast('Return added! Stock updated.'); navigate('returns');
}
function deleteReturn(id) { confirmAction('Delete this return?', () => { DB.deleteReturn(id); toast('Deleted','info'); navigate('returns'); }); }

// ============ SEARCH ============
function renderSearch(c) {
  c.innerHTML = `<div class="search-bar"><span class="material-icons-round">search</span><input type="text" id="global-search" placeholder="Search by SKU, Supplier, Order ID, Date..." oninput="doSearch()"></div>
  <div class="filter-chips"><button class="chip active" onclick="setSearchFilter('all',this)">All</button><button class="chip" onclick="setSearchFilter('purchases',this)">Purchases</button><button class="chip" onclick="setSearchFilter('orders',this)">Orders</button><button class="chip" onclick="setSearchFilter('returns',this)">Returns</button></div>
  <div id="search-results"><div class="empty-state"><span class="material-icons-round">search</span><p>Type to search across all data</p></div></div>`;
}
let searchFilter = 'all';
function setSearchFilter(f, btn) { searchFilter=f; document.querySelectorAll('.filter-chips .chip').forEach(c=>c.classList.remove('active')); btn.classList.add('active'); doSearch(); }
function doSearch() {
  const q = document.getElementById('global-search').value;
  if(!q.trim()) { document.getElementById('search-results').innerHTML='<div class="empty-state"><span class="material-icons-round">search</span><p>Type to search</p></div>'; return; }
  const r = DB.globalSearch(q);
  let html = '';
  if(searchFilter==='all'||searchFilter==='purchases') {
    if(r.purchases.length) { html += `<div class="section-header"><h3>Purchases (${r.purchases.length})</h3></div>`; html += r.purchases.map(p=>`<div class="list-item"><div class="list-icon" style="background:linear-gradient(135deg,#22C55E,#4ADE80)"><span class="material-icons-round">add_shopping_cart</span></div><div class="list-body"><h4>${p.sku} - ${p.supplierName}</h4><p>Qty: ${p.quantity} · ${fmtCur(p.rate)} · Total: ${fmtCur(p.total)} · ${fmtDate(p.date)}</p></div></div>`).join(''); }
  }
  if(searchFilter==='all'||searchFilter==='orders') {
    if(r.orders.length) { html += `<div class="section-header" style="margin-top:16px"><h3>Orders (${r.orders.length})</h3></div>`; html += r.orders.map(o=>`<div class="list-item"><div class="list-icon" style="background:linear-gradient(135deg,#3B82F6,#60A5FA)"><span class="material-icons-round">local_shipping</span></div><div class="list-body"><h4>${o.sku} · ${o.platform}</h4><p>Qty: ${o.quantity} · Order: ${o.orderId} · ${fmtDate(o.date)}</p></div></div>`).join(''); }
  }
  if(searchFilter==='all'||searchFilter==='returns') {
    if(r.returns.length) { html += `<div class="section-header" style="margin-top:16px"><h3>Returns (${r.returns.length})</h3></div>`; html += r.returns.map(rt=>`<div class="list-item"><div class="list-icon" style="background:linear-gradient(135deg,#F59E0B,#FBBF24)"><span class="material-icons-round">assignment_return</span></div><div class="list-body"><h4>${rt.sku} · ${rt.type}</h4><p>Qty: ${rt.quantity} · ${fmtDate(rt.date)}</p></div></div>`).join(''); }
  }
  if(!html) html = '<div class="empty-state"><span class="material-icons-round">search_off</span><p>No results found</p></div>';
  document.getElementById('search-results').innerHTML = html;
}

// ============ RACKS ============
function renderRacks(c) {
  const skus = DB.getSkus();
  const allRacks = [...new Set(['A1','A2','A3','A4','A5','B1','B2','B3','B4','B5','C1','C2','C3','C4','C5','D1','D2','D3','D4','D5','E1','E2','E3','E4','E5', ...skus.map(s=>s.rackNumber)])].sort();
  c.innerHTML = `
    <div class="page-header" style="margin-bottom:16px;">
      <h3 style="font-size:20px; font-weight:700;">Racks</h3>
    </div>
    ${renderFilterBar({ idPrefix: 'rack', placeholder: 'Search by SKU or Product...', dropdownLabel: 'Rack', dropdownOptions: allRacks, onFilter: 'debouncedFilterRacks' })}
    <div id="rack-list"></div>
  `;
  debouncedFilterRacks();
}

function filterRacks() {
  const q = ($('rack-search')?.value || '').toLowerCase();
  const f = $('rack-filter')?.value || 'All';
  const skus = DB.getSkus();
  const allRacks = [...new Set(['A1','A2','A3','A4','A5','B1','B2','B3','B4','B5','C1','C2','C3','C4','C5','D1','D2','D3','D4','D5','E1','E2','E3','E4','E5', ...skus.map(s=>s.rackNumber)])].sort();
  
  let validRacks = allRacks;
  if(f !== 'All') validRacks = [f];
  
  const racks = {};
  validRacks.forEach(r=>racks[r]=[]);
  skus.forEach(s => { 
    if(!racks[s.rackNumber]) racks[s.rackNumber]=[]; 
    if(q) {
      if(s.sku.toLowerCase().includes(q) || s.productName.toLowerCase().includes(q)) {
        racks[s.rackNumber].push(s);
      }
    } else {
      racks[s.rackNumber].push(s); 
    }
  });
  
  $('rack-list').innerHTML = `<div class="rack-grid">${validRacks.map(r=>{
    // If searching and rack has no matching items, hide rack
    if(q && racks[r].length === 0) return '';
    return `<div class="rack-card"><h4>${r}</h4><div class="rack-items">${racks[r]&&racks[r].length?racks[r].map(s=>`<div style="padding:8px 0"><strong>${s.sku}</strong><br><span style="font-size:11px;color:var(--text2)">${s.productName}</span><br>Stock: <span style="font-size:14px;font-weight:bold;color:${s.currentStock>0?'var(--success)':'var(--error)'}">${s.currentStock}</span></div>`).join(''):'<div style="color:var(--text3);font-size:11px;padding:8px 0">Empty</div>'}</div></div>`;
  }).join('')}</div>`;
}
const debouncedFilterRacks = debounce(filterRacks, 300);

// ============ PAYMENTS ============
function renderPayments(c) {
  const list = DB.getPayments();
  const hist = DB.getPaymentHistory().slice().reverse();
  const modes = ['UPI', 'Bank Transfer', 'Cash'];
  
  let html = `
  <div class="page-header" style="margin-bottom:16px;">
    <h3 style="font-size:20px; font-weight:700;">Supplier Balances</h3>
    <div style="display:flex;gap:12px;margin-left:auto;">
      <button class="btn btn-secondary" onclick="exportCSV('supplier_balances')"><span class="material-icons-round">download</span> Balances</button>
      ${Auth.isAdmin() ? `<button class="btn btn-primary" onclick="openPaymentForm()">+ Add Balance</button>` : ''}
    </div>
  </div>
  ${renderFilterBar({ idPrefix: 'pay', placeholder: 'Search supplier...', dropdownLabel: '', dropdownOptions: null, onFilter: 'debouncedFilterPayments' })}
  <div id="payment-list" style="margin-bottom:40px;">${renderPaymentList(list)}</div>

  <div class="page-header" style="margin-bottom:16px;">
    <h3 style="font-size:20px; font-weight:700;">Transactions History</h3>
    <button class="btn btn-secondary" style="margin-left:auto" onclick="exportCSV('payments')"><span class="material-icons-round">download</span> History</button>
  </div>
  ${renderFilterBar({ idPrefix: 'txn', placeholder: 'Search history...', dropdownLabel: 'Mode', dropdownOptions: modes, onFilter: 'debouncedFilterTxns' })}
  <div id="txn-list">${renderTxnList(hist)}</div>
  `;
  c.innerHTML = html;
}
function renderPaymentList(list) {
  if(!list.length) return '<div class="empty-state"><p>No supplier balances</p></div>';
  let html = `<div class="table-wrapper"><table class="desktop-table">
    <thead><tr><th>Supplier Name</th><th>Total Amount</th><th>Pending Balance</th><th>Actions</th></tr></thead><tbody>`;
  
  html += list.map(p => `
    <tr>
      <td style="font-weight:700">${p.supplierName}</td>
      <td>${fmtCur(p.totalAmount)}</td>
      <td><strong style="color:var(--error)">${fmtCur(p.pendingBalance)}</strong></td>
      <td>
        <div class="actions">
          <button class="btn btn-small btn-primary" onclick="addPaymentEntry('${p.id}')">Pay</button>
          ${Auth.isAdmin()?`<button class="icon-btn" style="color:var(--error)" onclick="deletePayment('${p.id}')"><span class="material-icons-round">delete</span></button>`:''}
        </div>
      </td>
    </tr>`).join('');
  html += `</tbody></table></div>`;
  return html;
}
function filterPayments() {
  const q = ($('pay-search')?.value || '').toLowerCase();
  const list = DB.getPayments().filter(p=>p.supplierName.toLowerCase().includes(q));
  $('payment-list').innerHTML = renderPaymentList(list);
}
const debouncedFilterPayments = debounce(filterPayments, 300);

function filterTxns() {
  const q = ($('txn-search')?.value || '').toLowerCase();
  const m = $('txn-filter')?.value || 'All';
  const from = $('txn-from')?.value;
  const to = $('txn-to')?.value;
  let f = DB.getPaymentHistory().slice().reverse();
  
  if(q) f = f.filter(h=>(h.supplierName||'').toLowerCase().includes(q) || (h.txnId||'').toLowerCase().includes(q) || (h.notes||'').toLowerCase().includes(q));
  if(m !== 'All') f = f.filter(h=>h.mode === m);
  if(from) { const fd = new Date(from); f = f.filter(h=>new Date(h.date) >= fd); }
  if(to) { const td = new Date(to); td.setHours(23,59,59); f = f.filter(h=>new Date(h.date) <= td); }
  
  $('txn-list').innerHTML = renderTxnList(f);
}
const debouncedFilterTxns = debounce(filterTxns, 300);

function renderTxnList(hist) {
  if(!hist.length) return '<div class="empty-state"><p>No transactions yet</p></div>';
  let html = `<div class="table-wrapper"><table class="desktop-table">
    <thead><tr><th>Date</th><th>Supplier</th><th>Mode</th><th>Amount</th><th>Txn ID</th><th>Added By</th><th>Actions</th></tr></thead><tbody>`;
  
  html += hist.map(t => `
    <tr>
      <td>${fmtDate(t.date)}</td>
      <td style="font-weight:700">${t.supplierName}</td>
      <td><span class="badge" style="background:rgba(99,102,241,0.1);color:var(--primary)">${t.mode}</span></td>
      <td><strong style="color:var(--success)">${fmtCur(t.amount)}</strong></td>
      <td>${t.txnId || '-'}</td>
      <td>${t.addedBy}</td>
      <td>${Auth.isAdmin()?`<button class="icon-btn" style="color:var(--error)" onclick="deleteTxn('${t.id}','${t.supplierId}')"><span class="material-icons-round">delete</span></button>`:''}</td>
    </tr>`).join('');
  html += `</tbody></table></div>`;
  return html;
}
function deleteTxn(id, supplierId) {
  confirmAction('Delete this transaction? Balance will be reversed.', () => {
    DB.deletePaymentEntry(id, supplierId); toast('Transaction deleted','info'); navigate('payments');
  });
}
function openPaymentForm() {
  openModal('Add Supplier Balance', `<form onsubmit="savePayment(event)">
    <div class="form-row">
      <div class="form-group"><label>Supplier Name</label><input class="form-control" id="f-paysupplier" required></div>
      <div class="form-group"><label>Date & Time</label><input class="form-control" type="datetime-local" id="f-paydate" value="${today()}" required></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Total Purchase (₹)</label><input class="form-control" type="number" id="f-paytotal" step="0.01" required></div>
      <div class="form-group"><label>Paid Amount (₹)</label><input class="form-control" type="number" id="f-paypaid" step="0.01" value="0" required oninput="calcPending()"></div>
    </div>
    <div class="form-group"><label>Pending Balance (₹)</label><input class="form-control" id="f-paypending" readonly style="background:var(--bg); font-weight:bold;"></div>
    <div class="form-group"><label>Notes</label><textarea class="form-control" id="f-paynotes" rows="2"></textarea></div>
    <div style="margin-top:20px;">
      <button type="submit" class="btn btn-primary btn-full" style="height: 45px; border-radius: 10px; font-size: 15px; font-weight: 700; background: linear-gradient(135deg, #6366F1, #8B5CF6); border: none; box-shadow: 0 4px 10px rgba(99, 102, 241, 0.3); transition: transform 0.2s, box-shadow 0.2s;">Save Balance</button>
    </div>
  </form>`);
}
function calcPending() { const t=parseFloat($('f-paytotal').value||0), p=parseFloat($('f-paypaid').value||0); $('f-paypending').value=(t-p).toFixed(2); }
function savePayment(e) {
  e.preventDefault();
  DB.savePayment({ id:DB.genId(), supplierName:$('f-paysupplier').value.trim(), totalAmount:parseFloat($('f-paytotal').value), paidAmount:parseFloat($('f-paypaid').value), pendingBalance:parseFloat($('f-paypending').value), date:$('f-paydate').value, notes:$('f-paynotes').value.trim(), createdAt:new Date().toISOString() });
  closeModal(); toast('Balance added'); navigate('payments');
}
function addPaymentEntry(id) {
  openModal('Record Payment', `<form onsubmit="savePaymentEntry(event,'${id}')">
    <div class="form-row">
      <div class="form-group"><label>Amount (₹)</label><input class="form-control" type="number" id="f-peamt" step="0.01" required></div>
      <div class="form-group"><label>Date & Time</label><input class="form-control" type="datetime-local" id="f-pedate" value="${today()}" required></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Mode</label><select class="form-control" id="f-pemode" required><option>UPI</option><option>Bank Transfer</option><option>Cash</option><option>Check</option></select></div>
      <div class="form-group"><label>Txn ID / Details</label><input class="form-control" id="f-petxn" placeholder="UPI / Acc No"></div>
    </div>
    <div class="form-group"><label>Notes</label><textarea class="form-control" id="f-penotes" rows="2"></textarea></div>
    <div style="margin-top:20px;">
      <button type="submit" class="btn btn-primary btn-full" style="height: 45px; border-radius: 10px; font-size: 15px; font-weight: 700; background: linear-gradient(135deg, #6366F1, #8B5CF6); border: none; box-shadow: 0 4px 10px rgba(99, 102, 241, 0.3); transition: transform 0.2s, box-shadow 0.2s;">Record Payment</button>
    </div>
  </form>`);
}
function savePaymentEntry(e, id) {
  e.preventDefault();
  DB.addPaymentEntry(id, { date:$('f-pedate').value, amount:parseFloat($('f-peamt').value), mode:$('f-pemode').value, txnId:$('f-petxn').value.trim(), notes:$('f-penotes').value.trim(), addedBy:Auth.getUsername() });
  closeModal(); toast('Payment recorded'); navigate('payments');
}
function deletePayment(id) { confirmAction('Delete this balance entirely?', () => { DB.deletePayment(id); toast('Deleted','info'); navigate('payments'); }); }

// ============ ADMIN ============
function renderAdmin(c) {
  if(!Auth.isAdmin()) { c.innerHTML='<div class="empty-state"><span class="material-icons-round">lock</span><p>Admin access required</p></div>'; return; }
  const users = DB.getUsers();
  c.innerHTML = `
  <div class="page-header" style="margin-bottom:16px;">
    <h3 style="font-size:20px; font-weight:700;">User Management</h3>
    <button class="btn btn-primary" onclick="openUserForm()">+ Add User</button>
  </div>
  <div class="table-wrapper" style="margin-bottom:40px;">
    <table class="desktop-table">
      <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody>
        ${users.map(u => `
        <tr>
          <td style="font-weight:700">${u.name}</td>
          <td>@${u.username}</td>
          <td><span class="badge" style="background:rgba(99,102,241,0.1);color:var(--primary)">${u.role}</span></td>
          <td><span class="badge ${u.isActive?'normal':'low'}">${u.isActive?'Active':'Disabled'}</span></td>
          <td>
            <div class="actions">
              <button class="icon-btn" onclick="openUserForm('${u.uid}')"><span class="material-icons-round">edit</span></button>
              ${u.uid!==Auth.currentUser.uid?`<button class="icon-btn" style="color:var(--error)" onclick="deleteUser('${u.uid}')"><span class="material-icons-round">delete</span></button>`:''}
            </div>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>
  
  <div class="page-header" style="margin-bottom:16px;">
    <h3 style="font-size:20px; font-weight:700;">Data Management</h3>
  </div>
  <div class="card" style="display:flex;gap:12px;">
    <button class="btn btn-danger" onclick="confirmAction('Clear ALL purchases?', ()=>{localStorage.removeItem('wh_purchases');DB.getSkus().forEach(s=>DB.updateStock(s.id));toast('Purchases cleared');navigate('admin')})">Clear Purchases</button>
    <button class="btn btn-danger" onclick="confirmAction('Clear ALL orders?', ()=>{localStorage.removeItem('wh_orders');DB.getSkus().forEach(s=>DB.updateStock(s.id));toast('Orders cleared');navigate('admin')})">Clear Orders</button>
    <button class="btn btn-danger" onclick="confirmAction('Clear ALL returns?', ()=>{localStorage.removeItem('wh_returns');DB.getSkus().forEach(s=>DB.updateStock(s.id));toast('Returns cleared');navigate('admin')})">Clear Returns</button>
  </div>`;
}
function openUserForm(uid) {
  const u = uid ? DB.getUserById(uid) : null;
  const whs = DB.getWarehouses();
  const allowed = u?.allowedWarehouses || (uid ? [] : whs.map(w=>w.id)); // default all for new
  
  const whHtml = whs.map(w => `
    <label style="display:flex;align-items:center;gap:8px;font-size:14px;cursor:pointer;">
      <input type="checkbox" name="u_whs" value="${w.id}" ${allowed.includes(w.id)?'checked':''} style="width:16px;height:16px;"> ${w.name}
    </label>
  `).join('');

  openModal(u?'Edit User':'Add User', `<form onsubmit="saveUser(event,'${uid||''}')">
    <div class="form-row">
      <div class="form-group"><label>Name</label><input class="form-control" id="f-uname" value="${u?.name||''}" required></div>
      <div class="form-group"><label>Email / Username</label><input class="form-control" id="f-uusername" value="${u?.username||''}" placeholder="your.email@example.com" required></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Password</label>
        <div style="position:relative">
          <input class="form-control" type="password" id="f-upassword" value="${u?.password||''}" required style="padding-right:40px">
          <button type="button" onclick="const p=document.getElementById('f-upassword');p.type=p.type==='password'?'text':'password'" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);color:var(--text3);padding:4px;background:transparent;border:none;"><span class="material-icons-round" style="font-size:20px">visibility</span></button>
        </div>
      </div>
      <div class="form-group"><label>Role</label><select class="form-control" id="f-urole"><option value="user" ${u?.role==='user'?'selected':''}>User</option><option value="admin" ${u?.role==='admin'?'selected':''}>Admin</option></select></div>
    </div>
    <div class="form-group">
      <label>Allowed Warehouses</label>
      <div style="display:flex; flex-direction:column; gap:8px; background:var(--bg); padding:12px; border-radius:8px; border:1px solid var(--border); max-height:150px; overflow-y:auto;">
        ${whHtml}
      </div>
    </div>
    <div class="form-group" style="padding-top:4px;"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="f-uactive" ${u?.isActive!==false?'checked':''} style="width:16px;height:16px;"> Active Account</label></div>
    <div style="margin-top:20px;">
      <button type="submit" class="btn btn-primary btn-full" style="height: 45px; border-radius: 10px; font-size: 15px; font-weight: 700; background: linear-gradient(135deg, #6366F1, #8B5CF6); border: none; box-shadow: 0 4px 10px rgba(99, 102, 241, 0.3); transition: transform 0.2s, box-shadow 0.2s;">${u?'Update':'Create'} User</button>
    </div>
  </form>`);
}
function saveUser(e, uid) {
  e.preventDefault();
  const allowedWarehouses = Array.from(document.querySelectorAll('input[name="u_whs"]:checked')).map(cb => cb.value);
  DB.saveUser({ uid:uid||DB.genId(), name:$('f-uname').value.trim(), username:$('f-uusername').value.trim(), password:$('f-upassword').value, role:$('f-urole').value, isActive:$('f-uactive').checked, allowedWarehouses, createdAt:uid?DB.getUserById(uid)?.createdAt:new Date().toISOString() });
  closeModal(); toast(uid?'User updated':'User created'); navigate('admin');
}
function deleteUser(uid) { confirmAction('Delete this user?', () => { DB.deleteUser(uid); toast('User deleted','info'); navigate('admin'); }); }

// ============ EXPORT ============
function renderExport(c) {
  c.innerHTML = `
  <div class="page-header" style="margin-bottom:16px;">
    <h3 style="font-size:20px; font-weight:700;">Export Data as CSV</h3>
  </div>
  <div class="card">
    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:16px">
      <button class="btn btn-secondary btn-full" onclick="exportCSV('skus')"><span class="material-icons-round">download</span> Export SKU Master</button>
      <button class="btn btn-secondary btn-full" onclick="exportCSV('purchases')"><span class="material-icons-round">download</span> Export Purchases</button>
      <button class="btn btn-secondary btn-full" onclick="exportCSV('orders')"><span class="material-icons-round">download</span> Export Orders</button>
      <button class="btn btn-secondary btn-full" onclick="exportCSV('returns')"><span class="material-icons-round">download</span> Export Returns</button>
      <button class="btn btn-secondary btn-full" onclick="exportCSV('payments')"><span class="material-icons-round">download</span> Export Payments</button>
      <button class="btn btn-primary btn-full" onclick="exportCSV('all')"><span class="material-icons-round">download</span> Export All Data</button>
    </div>
  </div>`;
}
function exportCSV(type) {
  let csv='', fn='';
  if(type==='skus'||type==='all') { csv += 'SKU MASTER\nSKU,Product Name,Warehouse,Rack,Min Stock,Current Stock\n'; DB.getSkus().forEach(s=>{ csv+=`${s.sku},${s.productName},${s.warehouse},${s.rackNumber},${s.minimumStock},${s.currentStock}\n`; }); csv+='\n'; fn='skus'; }
  if(type==='purchases'||type==='all') { csv += 'PURCHASES\nDate,Supplier,SKU,Product,Qty,Rate,Total,Rack,Added By\n'; DB.getPurchases().forEach(p=>{ csv+=`${p.date},${p.supplierName},${p.sku},${p.productName},${p.quantity},${p.rate},${p.total},${p.rackNumber},${p.addedBy}\n`; }); csv+='\n'; fn='purchases'; }
  if(type==='orders'||type==='all') { csv += 'ORDERS\nDate,SKU,Product,Qty,Platform,Order ID,User\n'; DB.getOrders().forEach(o=>{ csv+=`${o.date},${o.sku},${o.productName},${o.quantity},${o.platform},${o.orderId},${o.username}\n`; }); csv+='\n'; fn='orders'; }
  if(type==='returns'||type==='all') { csv += 'RETURNS\nDate,SKU,Product,Qty,Type,Added By\n'; DB.getReturns().forEach(r=>{ csv+=`${r.date},${r.sku},${r.productName},${r.quantity},${r.type},${r.addedBy}\n`; }); csv+='\n'; fn='returns'; }
  if(type==='payments') {
    fn = 'payment_transactions';
    csv = 'Date,Supplier,Amount,Mode,Txn ID,Notes,AddedBy\n';
    DB.getPaymentHistory().forEach(h=>{ csv += `"${new Date(h.date).toLocaleDateString()}","${h.supplierName}",${h.amount},"${h.mode||''}","${h.txnId||''}","${h.notes||''}","${h.addedBy||''}"\n`; });
  }
  if(type==='supplier_balances') {
    fn = 'supplier_balances';
    csv = 'Supplier,Total Amount,Paid Amount,Pending Balance\n';
    DB.getPayments().forEach(p=>{ csv += `"${p.supplierName}",${p.totalAmount},${p.paidAmount},${p.pendingBalance}\n`; });
  }
  if(type==='all') fn='warehouse_all_data';
  const blob = new Blob([csv], {type:'text/csv'});
  const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=fn+'_'+today()+'.csv'; a.click();
  toast('Exported successfully!');
}

// ============ MORE MENU ============
function renderMore(c) {
  c.innerHTML = `<div class="more-grid">
    <button class="more-item" onclick="navigate('returns')"><span class="material-icons-round">assignment_return</span><span>Returns</span></button>
    <button class="more-item" onclick="navigate('search')"><span class="material-icons-round">search</span><span>Search</span></button>
    <button class="more-item" onclick="navigate('racks')"><span class="material-icons-round">shelves</span><span>Racks</span></button>
    <button class="more-item" onclick="navigate('payments')"><span class="material-icons-round">payments</span><span>Payments</span></button>
    ${Auth.isAdmin()?`<button class="more-item" onclick="navigate('admin')"><span class="material-icons-round">admin_panel_settings</span><span>Admin</span></button>`:''}
    <button class="more-item" onclick="navigate('export')"><span class="material-icons-round">download</span><span>Export</span></button>
    <button class="more-item" onclick="toggleTheme()"><span class="material-icons-round">dark_mode</span><span>Theme</span></button>
    <button class="more-item" onclick="showProfile()"><span class="material-icons-round">person</span><span>Profile</span></button>
    <button class="more-item" onclick="Auth.logout();location.reload()"><span class="material-icons-round">logout</span><span>Logout</span></button>
  </div>`;
}
