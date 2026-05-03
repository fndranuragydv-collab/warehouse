// ============ DASHBOARD ============
function renderDashboard(c) {
  const s = DB.getStats();
  c.innerHTML = `
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-icon purple"><span class="material-icons-round">qr_code_2</span></div>
      <div class="stat-info"><h3>${fmt(s.totalSkus)}</h3><p>Total SKUs</p></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon blue"><span class="material-icons-round">inventory_2</span></div>
      <div class="stat-info"><h3>${fmt(s.totalStock)}</h3><p>Total Stock</p></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon green"><span class="material-icons-round">payments</span></div>
      <div class="stat-info"><h3>${fmtCur(s.totalPurchaseValue)}</h3><p>Purchase Value</p></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon orange"><span class="material-icons-round">local_shipping</span></div>
      <div class="stat-info"><h3>${fmt(s.totalOrders)}</h3><p>Total Orders</p></div>
    </div>
  </div>

  <div style="display:flex;gap:24px;">
    <!-- Low Stock -->
    <div class="card" style="flex:1;">
      <h3 style="margin-bottom:16px;font-size:16px;">Low Stock Alerts</h3>
      <div id="low-stock-list">
        ${s.lowStockItems.length===0?'<div class="empty-state"><span class="material-icons-round">check_circle</span><p>All stock levels are healthy</p></div>':
        s.lowStockItems.map(i=>`<div class="alert-card"><div class="left"><span class="material-icons-round">warning</span><div><strong>${i.sku}</strong><br><span>${i.productName}</span></div></div><strong style="color:var(--danger)">${i.currentStock} left</strong></div>`).join('')}
      </div>
    </div>
    <!-- Recent Orders -->
    <div class="card" style="flex:1;">
      <h3 style="margin-bottom:16px;font-size:16px;">Recent Orders</h3>
      <div>${DB.getOrders().slice(-5).reverse().map(o=>`<div class="alert-card" style="border-left-color:var(--primary)"><div class="left"><span class="material-icons-round" style="color:var(--primary)">local_shipping</span><div><strong>${o.sku}</strong><br><span>${o.platform}</span></div></div><strong>-${o.quantity} Qty</strong></div>`).join('')||'<div class="empty-state"><span class="material-icons-round">local_shipping</span><p>No orders yet</p></div>'}</div>
    </div>
  </div>`;
}

// ============ INVENTORY / SKU ============
function renderInventory(c) {
  const skus = DB.getSkus();
  const racks = [...new Set(skus.map(s=>s.rackNumber))].sort();
  c.innerHTML = `
    <div class="page-header" style="margin-bottom:16px;">
      <h3 style="font-size:20px; font-weight:700;">SKU Master</h3>
      ${Auth.isAdmin() ? `<button class="btn btn-primary" onclick="openSkuForm()">+ Add SKU</button>` : ''}
    </div>
    ${renderFilterBar({ idPrefix: 'inv', placeholder: 'Search by SKU or Product...', dropdownLabel: 'Rack', dropdownOptions: racks, onFilter: 'debouncedFilterSkus' })}
    <div id="sku-list">${renderSkuList(skus)}</div>
  `;
}
function renderSkuList(skus) {
  if(!skus.length) return '<div class="empty-state"><span class="material-icons-round">inventory_2</span><p>No SKUs added yet</p></div>';
  let html = `<div class="table-wrapper"><table class="desktop-table">
    <thead><tr><th>SKU</th><th>Product Name</th><th>Rack</th><th>Status</th><th>Stock</th><th>Actions</th></tr></thead><tbody>`;
  
  html += skus.map(s => {
    const isLow = s.currentStock < 10;
    const statusHtml = isLow ? `<span style="color:var(--error); font-weight:700;"><span class="material-icons-round" style="font-size:14px;vertical-align:middle;margin-right:4px;">warning</span>Low Stock</span>` : `<span style="color:var(--success); font-weight:700;">Normal</span>`;
    return `<tr style="cursor:pointer" onclick="openSkuForm('${s.id}')">
      <td style="font-weight:700; color:var(--primary)">${s.sku}</td>
      <td>${s.productName}</td>
      <td>${s.rackNumber}</td>
      <td>${statusHtml}</td>
      <td style="font-weight:800; font-size:16px;">${s.currentStock}</td>
      <td>
        <div class="actions" onclick="event.stopPropagation()">
          ${Auth.isAdmin()?`<button class="icon-btn" onclick="openSkuForm('${s.id}')"><span class="material-icons-round">edit</span></button><button class="icon-btn" style="color:var(--error)" onclick="deleteSku('${s.id}')"><span class="material-icons-round">delete</span></button>`:'<span style="opacity:0.5;font-size:12px;">No Access</span>'}
        </div>
      </td>
    </tr>`;
  }).join('');
  html += `</tbody></table></div>`;
  return html;
}
function filterSkus() {
  const q = ($('inv-search')?.value || '').toLowerCase();
  const f = $('inv-filter')?.value || 'All';
  let list = DB.getSkus();
  if(q) list = list.filter(s=>s.sku.toLowerCase().includes(q) || s.productName.toLowerCase().includes(q));
  if(f !== 'All') list = list.filter(s=>s.rackNumber === f);
  $('sku-list').innerHTML = renderSkuList(list);
}
const debouncedFilterSkus = debounce(filterSkus, 300);
function openSkuForm(id) {
  const s = id ? DB.getSkuById(id) : null;
  const racks = ['A1','A2','A3','A4','A5','B1','B2','B3','B4','B5','C1','C2','C3','C4','C5','D1','D2','D3','D4','D5','E1','E2','E3','E4','E5'];
  openModal(s?'Edit SKU':'Add SKU', `<form onsubmit="saveSku(event,'${id||''}')">
    <div class="form-row">
      <div class="form-group"><label>SKU Code</label><input class="form-control" id="f-sku" value="${s?.sku||''}" required></div>
      <div class="form-group"><label>Product Name</label><input class="form-control" id="f-pname" value="${s?.productName||''}" required></div>
    </div>
    
    <div class="form-row">
      <div class="form-group"><label>Warehouse</label><input class="form-control" value="${DB.getActiveWarehouseName()}" disabled></div>
      <div class="form-group"><label>Rack Number</label><input class="form-control" id="f-rack" value="${s?.rackNumber||'A1'}" list="rack-list" required>
        <datalist id="rack-list">${racks.map(r=>`<option value="${r}">`).join('')}</datalist>
      </div>
    </div>
    
    <div class="form-row">
      <div class="form-group"><label>Minimum Stock</label><input class="form-control" type="number" id="f-minstock" value="${s?.minimumStock||10}" min="0" required></div>
      <div class="form-group"><label>Initial Opening Stock</label><input class="form-control" type="number" id="f-openstock" value="0" min="0" ${s?'disabled':''}></div>
    </div>
    
    ${s && Auth.isAdmin() ? `<div class="form-group"><label style="color:var(--primary)">Manual Stock Override (Admin Only)</label><input class="form-control" type="number" id="f-overridestock" value="${s.currentStock}" min="0">
    <p style="font-size:12px; color:var(--text3); margin-top:4px;">Warning: This will create a manual adjustment record to force the stock to this number.</p></div>` : ''}
    
    <div style="margin-top:20px;">
      <button type="submit" class="btn btn-primary btn-full" style="height: 45px; border-radius: 10px; font-size: 15px; font-weight: 700; background: linear-gradient(135deg, #6366F1, #8B5CF6); border: none; box-shadow: 0 4px 10px rgba(99, 102, 241, 0.3); transition: transform 0.2s, box-shadow 0.2s;">${s?'Update':'Add'} SKU</button>
    </div>
  </form>`);
}
function saveSku(e, id) {
  e.preventDefault();
  const currentStock = id?DB.getSkuById(id)?.currentStock||0:0;
  const data = { id: id||DB.genId(), sku:$('f-sku').value.trim(), productName:$('f-pname').value.trim(), warehouse:DB.getActiveWarehouseName(), rackNumber:$('f-rack').value, minimumStock:parseInt($('f-minstock').value), currentStock: currentStock, createdAt: id?DB.getSkuById(id)?.createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() };
  DB.saveSku(data); 
  if (!id) {
    const initialQty = parseInt($('f-openstock')?.value||0, 10);
    if (initialQty > 0) {
      DB.savePurchase({ id:DB.genId(), date:today(), supplierName:'Opening Balance', skuId:data.id, sku:data.sku, productName:data.productName, quantity:initialQty, rate:0, total:0, rackNumber:data.rackNumber, addedBy:Auth.getUsername(), createdAt:new Date().toISOString() });
    }
  } else if (Auth.isAdmin()) {
    const overrideInput = $('f-overridestock');
    if (overrideInput) {
      const newStock = parseInt(overrideInput.value, 10);
      if (newStock !== currentStock && !isNaN(newStock) && newStock >= 0) {
        const difference = newStock - currentStock;
        if (difference > 0) {
          DB.savePurchase({ id:DB.genId(), date:today(), supplierName:'Manual Adjustment (Admin)', skuId:data.id, sku:data.sku, productName:data.productName, quantity:difference, rate:0, total:0, rackNumber:data.rackNumber, notes:'Forced stock increase', addedBy:Auth.getUsername(), createdAt:new Date().toISOString() });
        } else {
          DB.saveReturn({ id:DB.genId(), date:today(), skuId:data.id, sku:data.sku, productName:data.productName, quantity:Math.abs(difference), type:'Customer Return', addedBy:Auth.getUsername(), createdAt:new Date().toISOString(), isManualAdjustment: true });
        }
      }
    }
  }
  closeModal(); toast(id?'SKU updated':'SKU added'); navigate('inventory');
}
function deleteSku(id) { confirmAction('Delete this SKU?', () => { DB.deleteSku(id); toast('SKU deleted','info'); navigate('inventory'); }); }

// ============ PURCHASE ============
function renderPurchase(c) {
  const p = DB.getPurchases().slice().reverse();
  const suppliers = [...new Set(p.map(x=>x.supplierName))].sort();
  c.innerHTML = `
    <div class="page-header" style="margin-bottom:16px;">
      <h3 style="font-size:20px; font-weight:700;">Purchases</h3>
      ${Auth.isAdmin() ? `<button class="btn btn-primary" onclick="openBulkPurchaseForm()">+ Add Purchase</button>` : ''}
    </div>
    ${renderFilterBar({ idPrefix: 'pur', placeholder: 'Search by SKU or Supplier...', dropdownLabel: 'Supplier', dropdownOptions: suppliers, onFilter: 'debouncedFilterPurchases' })}
    <div id="purchase-list">${renderPurchaseList(p)}</div>
  `;
}
function renderPurchaseList(list) {
  if(!list.length) return '<div class="empty-state"><span class="material-icons-round">shopping_cart</span><p>No purchases yet</p></div>';
  let html = `<div class="table-wrapper"><table class="desktop-table">
    <thead><tr><th>Date</th><th>Supplier</th><th>SKU & Product</th><th>Qty</th><th>Total Amount</th><th>Actions</th></tr></thead><tbody>`;
  
  html += list.map(p => `
    <tr style="cursor:pointer" onclick="showPurchaseDetails('${p.id}')">
      <td>${fmtDate(p.date)}</td>
      <td style="font-weight:700">${p.supplierName}</td>
      <td><span style="color:var(--primary);font-weight:700">${p.sku}</span> <span style="opacity:0.7;font-size:12px">(${p.productName})</span></td>
      <td><strong style="color:var(--success)">+${p.quantity}</strong></td>
      <td style="font-weight:700">₹${p.total.toFixed(2)}</td>
      <td>
        <div class="actions" onclick="event.stopPropagation()">
          <button class="icon-btn" onclick="showPurchaseDetails('${p.id}')" title="View"><span class="material-icons-round">visibility</span></button>
          ${Auth.isAdmin()?`<button class="icon-btn" style="color:var(--error)" onclick="if(confirm('Delete this purchase?')) { DB.deletePurchase('${p.id}'); renderPage(); }" title="Delete"><span class="material-icons-round">delete</span></button>`:''}
        </div>
      </td>
    </tr>`).join('');
  html += `</tbody></table></div>`;
  return html;
}
function showPurchaseDetails(id) {
  const p = DB.getPurchases().find(x => x.id === id);
  if (!p) return;
  openModal('Purchase Details', `
    <div style="display:flex; flex-direction:column; gap:16px;">
      <div style="background:var(--bg); padding:20px; border-radius:20px; border:1px solid var(--border);">
        <h4 style="margin-bottom:16px; color:var(--text); font-size:20px; font-weight:800; border-bottom:2px solid var(--border); padding-bottom:12px;">${p.sku} <span style="opacity:0.7;font-weight:600;font-size:16px;">- ${p.productName}</span></h4>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px; font-size:15px;">
          <div><span style="color:var(--text2);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Supplier</span><br><strong style="color:var(--text)">${p.supplierName}</strong></div>
          <div><span style="color:var(--text2);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Date & Time</span><br><strong style="color:var(--text)">${fmtDate(p.date)}</strong></div>
          <div><span style="color:var(--text2);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Quantity</span><br><strong style="color:var(--success);font-size:18px;">${p.quantity} Units</strong></div>
          <div><span style="color:var(--text2);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Rate</span><br><strong style="color:var(--text)">${fmtCur(p.rate)}</strong></div>
          <div><span style="color:var(--text2);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Total Amount</span><br><strong style="font-size:18px;color:var(--primary)">${fmtCur(p.total)}</strong></div>
          <div><span style="color:var(--text2);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Added By</span><br><strong style="color:var(--text)">${p.addedBy || 'System'}</strong></div>
          ${p.notes ? `<div style="grid-column: 1 / -1; margin-top:8px;"><span style="color:var(--text2);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Notes / Remarks</span><br><div style="background:var(--surface); padding:12px 16px; border-radius:12px; margin-top:8px; font-weight:500; border:1px solid rgba(99,102,241,0.2); border-left:4px solid var(--primary);">${p.notes}</div></div>` : ''}
        </div>
      </div>
      <button class="btn btn-secondary btn-full" onclick="closeModal()">Close</button>
    </div>
  `);
}
function filterPurchases() {
  const q = ($('pur-search')?.value || '').toLowerCase();
  const f = $('pur-filter')?.value || 'All';
  const from = $('pur-from')?.value;
  const to = $('pur-to')?.value;
  let list = DB.getPurchases().slice().reverse();
  
  if(q) list = list.filter(p=>p.sku.toLowerCase().includes(q) || p.supplierName.toLowerCase().includes(q));
  if(f !== 'All') list = list.filter(p=>p.supplierName === f);
  if(from) { const fd = new Date(from); list = list.filter(p=>new Date(p.date) >= fd); }
  if(to) { const td = new Date(to); td.setHours(23,59,59); list = list.filter(p=>new Date(p.date) <= td); }
  
  $('purchase-list').innerHTML = renderPurchaseList(list);
}
const debouncedFilterPurchases = debounce(filterPurchases, 300);

function openBulkPurchaseForm() {
  openModal('Add Bulk Purchase', `<form onsubmit="saveBulkPurchase(event)">
    <div class="form-row">
      <div class="form-group"><label>Supplier Name</label><input class="form-control" id="f-supplier" required></div>
      <div class="form-group"><label>Date & Time</label><input class="form-control" type="datetime-local" id="f-pdate" value="${today()}" required></div>
    </div>
    
    <div class="section-header" style="margin-top:20px; align-items:center;">
      <h3 style="margin:0;">Purchase Items</h3>
      <button type="button" class="btn btn-small btn-secondary" onclick="addPurchaseRow()">+ Add Row</button>
    </div>
    
    <div class="table-wrapper" style="max-height: 250px; overflow-y: auto; overflow-x: hidden; margin-top:12px;">
      <table class="desktop-table" id="purchase-rows-table" style="margin-bottom:0;">
        <thead><tr><th style="width:40%">SKU</th><th style="width:20%">Qty</th><th style="width:20%">Rate</th><th style="width:15%">Total</th><th style="width:5%"></th></tr></thead>
        <tbody></tbody>
      </table>
    </div>
    
    <div class="form-group" style="margin-top:16px;"><label>Notes / Remarks</label><textarea class="form-control" id="f-pnotes" rows="2" placeholder="Damaged items, urgent stock, etc." style="resize:none;"></textarea></div>
    
    <div class="form-row" style="margin-top:16px; align-items:center;">
      <div class="form-group" style="margin-bottom:0;"><h3 style="color:var(--primary); font-size:22px; font-weight:800;">Total: <span id="bulk-total">₹0.00</span></h3></div>
      <div class="form-group" style="margin-bottom:0; text-align:right;"><button type="submit" class="btn btn-primary btn-full">Save Purchase</button></div>
    </div>
  </form>`);
  addPurchaseRow();
}
function addPurchaseRow() {
  const tbody = document.querySelector('#purchase-rows-table tbody');
  const tr = document.createElement('tr');
  tr.className = 'p-row';
  tr.innerHTML = `
    <td style="padding:8px 12px;"><select class="form-control p-sku" style="margin:0; width:100%;" required>${skuOptions()}</select></td>
    <td style="padding:8px 12px;"><input type="number" class="form-control p-qty" min="1" value="1" required oninput="calcBulkTotal()" style="margin:0; width:100%;"></td>
    <td style="padding:8px 12px;"><input type="number" class="form-control p-rate" min="0" value="0" step="0.01" required oninput="calcBulkTotal()" style="margin:0; width:100%;"></td>
    <td style="padding:8px 12px; font-weight:800; color:var(--text)" class="p-total-cell">₹0.00</td>
    <td style="padding:8px 12px;"><button type="button" class="icon-btn" style="color:var(--error);" onclick="this.closest('tr').remove(); calcBulkTotal()"><span class="material-icons-round">close</span></button></td>
  `;
  tbody.appendChild(tr);
  calcBulkTotal();
}
function calcBulkTotal() {
  let total = 0;
  document.querySelectorAll('.p-row').forEach(row => {
    const qty = parseFloat(row.querySelector('.p-qty').value || 0);
    const rate = parseFloat(row.querySelector('.p-rate').value || 0);
    const rowTotal = qty * rate;
    row.querySelector('.p-total-cell').innerText = '₹' + rowTotal.toFixed(2);
    total += rowTotal;
  });
  const totalEl = document.getElementById('bulk-total');
  if(totalEl) totalEl.innerText = '₹' + total.toFixed(2);
}
function saveBulkPurchase(e) {
  e.preventDefault();
  const supplier = $('f-supplier').value.trim();
  const date = $('f-pdate').value;
  const notes = $('f-pnotes').value.trim();
  const groupId = DB.genId();
  
  const rows = document.querySelectorAll('.p-row');
  if(rows.length === 0) return toast('Add at least one item', 'error');
  
  rows.forEach(row => {
    const skuId = row.querySelector('.p-sku').value;
    const qty = parseInt(row.querySelector('.p-qty').value);
    const rate = parseFloat(row.querySelector('.p-rate').value);
    const sku = DB.getSkuById(skuId);
    
    if(sku && qty > 0) {
      DB.savePurchase({
        id: DB.genId(), groupId: groupId, date: date, supplierName: supplier,
        skuId: sku.id, sku: sku.sku, productName: sku.productName,
        quantity: qty, rate: rate, total: qty * rate,
        rackNumber: sku.rackNumber, notes: notes, addedBy: Auth.getUsername(),
        createdAt: new Date().toISOString()
      });
    }
  });
  
  closeModal(); toast('Bulk purchase added! Stock updated.'); navigate('purchase');
}
function deletePurchase(id) { confirmAction('Delete this purchase?', () => { DB.deletePurchase(id); toast('Purchase deleted','info'); navigate('purchase'); }); }

// ============ ORDERS ============
function renderOrders(c) {
  const list = DB.getOrders().slice().reverse();
  const platforms = ['Amazon','Flipkart','Myntra','JioMart'];
  c.innerHTML = `
    <div class="page-header" style="margin-bottom:16px;">
      <h3 style="font-size:20px; font-weight:700;">Orders</h3>
      ${Auth.isAdmin() ? `<button class="btn btn-primary" style="margin-left:auto" onclick="openOrderForm()">+ Add Order</button>` : ''}
    </div>
    ${renderFilterBar({ idPrefix: 'ord', placeholder: 'Search by SKU, Order ID...', dropdownLabel: 'Platform', dropdownOptions: platforms, onFilter: 'debouncedFilterOrders' })}
    <div id="order-list">${renderOrderList(list)}</div>
  `;
}
function renderOrderList(list) {
  if(!list.length) return '<div class="empty-state"><span class="material-icons-round">local_shipping</span><p>No orders yet</p></div>';
  let html = `<div class="table-wrapper"><table class="desktop-table">
    <thead><tr><th>Date</th><th>Tracking ID</th><th>Platform</th><th>SKU & Product</th><th>Qty</th><th>Actions</th></tr></thead><tbody>`;
  
  html += list.map(o => `
    <tr style="cursor:pointer" onclick="showOrderDetails('${o.id}')">
      <td>${fmtDate(o.date)}</td>
      <td style="font-weight:700">${o.orderId}</td>
      <td><span class="badge" style="background:rgba(99,102,241,0.1);color:var(--primary)">${o.platform}</span></td>
      <td><span style="color:var(--primary);font-weight:700">${o.sku}</span> <span style="opacity:0.7;font-size:12px">(${o.productName})</span></td>
      <td><strong style="color:var(--warning)">-${o.quantity}</strong></td>
      <td>
        <div class="actions" onclick="event.stopPropagation()">
          <button class="icon-btn" onclick="showOrderDetails('${o.id}')" title="View"><span class="material-icons-round">visibility</span></button>
          ${Auth.isAdmin()?`<button class="icon-btn" style="color:var(--error)" onclick="if(confirm('Delete this order?')) { DB.deleteOrder('${o.id}'); renderPage(); }" title="Delete"><span class="material-icons-round">delete</span></button>`:''}
        </div>
      </td>
    </tr>`).join('');
  html += `</tbody></table></div>`;
  return html;
}
function showOrderDetails(id) {
  const o = DB.getOrders().find(x => x.id === id);
  if (!o) return;
  openModal('Order Details', `
    <div style="display:flex; flex-direction:column; gap:16px;">
      <div style="background:var(--bg); padding:20px; border-radius:20px; border:1px solid var(--border);">
        <h4 style="margin-bottom:16px; color:var(--text); font-size:20px; font-weight:800; border-bottom:2px solid var(--border); padding-bottom:12px;">${o.sku} <span style="opacity:0.7;font-weight:600;font-size:16px;">- ${o.productName}</span></h4>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px; font-size:15px;">
          <div><span style="color:var(--text2);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Order ID</span><br><strong style="color:var(--text)">${o.orderId}</strong></div>
          <div><span style="color:var(--text2);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Platform</span><br><strong style="color:var(--text)">${o.platform}</strong></div>
          <div><span style="color:var(--text2);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Date & Time</span><br><strong style="color:var(--text)">${fmtDate(o.date)}</strong></div>
          <div><span style="color:var(--text2);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Quantity</span><br><strong style="color:var(--error);font-size:18px;">${o.quantity} Units</strong></div>
          <div><span style="color:var(--text2);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Dispatched By</span><br><strong style="color:var(--text)">${o.username || 'System'}</strong></div>
          <div><span style="color:var(--text2);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Rack Number</span><br><strong style="color:var(--text)">${o.rackNumber || 'N/A'}</strong></div>
        </div>
      </div>
      <button class="btn btn-secondary btn-full" onclick="closeModal()">Close</button>
    </div>
  `);
}
function filterOrders() {
  const q = ($('ord-search')?.value || '').toLowerCase();
  const f = $('ord-filter')?.value || 'All';
  const from = $('ord-from')?.value;
  const to = $('ord-to')?.value;
  let list = DB.getOrders().slice().reverse();
  
  if(q) list = list.filter(o=>o.sku.toLowerCase().includes(q) || o.orderId.toLowerCase().includes(q));
  if(f !== 'All') list = list.filter(o=>o.platform === f);
  if(from) { const fd = new Date(from); list = list.filter(o=>new Date(o.date) >= fd); }
  if(to) { const td = new Date(to); td.setHours(23,59,59); list = list.filter(o=>new Date(o.date) <= td); }
  
  $('order-list').innerHTML = renderOrderList(list);
}
const debouncedFilterOrders = debounce(filterOrders, 300);
function openOrderForm() {
  openModal('Add Order', `<form onsubmit="saveOrder(event)">
    <div class="form-group"><label>Date & Time</label><input class="form-control" type="datetime-local" id="f-odate" value="${today()}" required></div>
    <div class="form-row">
      <div class="form-group"><label>SKU</label><select class="form-control" id="f-osku" required><option value="">Select SKU</option>${skuOptions()}</select></div>
      <div class="form-group"><label>Platform</label><select class="form-control" id="f-oplatform" required><option>Amazon</option><option>Flipkart</option><option>Myntra</option><option>JioMart</option></select></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Quantity</label><input class="form-control" type="number" id="f-oqty" min="1" required></div>
      <div class="form-group"><label>Order ID</label><input class="form-control" id="f-oid" required></div>
    </div>
    <div class="form-group"><label>User / Customer</label><input class="form-control" id="f-ouser" value="${Auth.getUsername()}" required></div>
    <div style="margin-top:20px;">
      <button type="submit" class="btn btn-primary btn-full" style="height: 45px; border-radius: 10px; font-size: 15px; font-weight: 700; background: linear-gradient(135deg, #6366F1, #8B5CF6); border: none; box-shadow: 0 4px 10px rgba(99, 102, 241, 0.3); transition: transform 0.2s, box-shadow 0.2s;">Add Order</button>
    </div>
  </form>`);
}
function saveOrder(e) {
  e.preventDefault();
  const sku = DB.getSkuById($('f-osku').value);
  if(!sku) return toast('Select a valid SKU','error');
  if(parseInt($('f-oqty').value) > sku.currentStock) return toast('Not enough stock!','error');
  const data = { id:DB.genId(), date:$('f-odate').value, skuId:sku.id, sku:sku.sku, productName:sku.productName, quantity:parseInt($('f-oqty').value), platform:$('f-oplatform').value, orderId:$('f-oid').value.trim(), username:$('f-ouser').value.trim(), createdAt:new Date().toISOString() };
  DB.saveOrder(data); closeModal(); toast('Order added! Stock reduced.'); navigate('orders');
}
function deleteOrder(id) { confirmAction('Delete this order?', () => { DB.deleteOrder(id); toast('Order deleted','info'); navigate('orders'); }); }
