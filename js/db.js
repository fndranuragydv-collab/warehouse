// ==================== LOCAL DATABASE ENGINE ====================
const DB = {
  _store(key) { return JSON.parse(localStorage.getItem(key) || '[]'); },
  _save(key, data) { localStorage.setItem(key, JSON.stringify(data)); },
  _get(key) { return JSON.parse(localStorage.getItem(key) || 'null'); },
  _set(key, val) { localStorage.setItem(key, JSON.stringify(val)); },

  // ---- USERS ----
  getUsers() { return this._store('wh_users'); },
  getUserById(id) { return this.getUsers().find(u => u.uid === id) || null; },
  getUserByUsername(uname) { return this.getUsers().find(u => u.username === uname) || null; },
  saveUser(user) {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.uid === user.uid);
    if (idx >= 0) users[idx] = user; else users.push(user);
    this._save('wh_users', users);
  },
  deleteUser(uid) {
    this._save('wh_users', this.getUsers().filter(u => u.uid !== uid));
  },

  // ---- WAREHOUSES ----
  getWarehouses() { 
    let w = this._store('wh_warehouses'); 
    if(!w || !w.length || typeof w[0] === 'string') {
      w = [{id: 'wh-main', name: 'Main Warehouse'}];
      this._save('wh_warehouses', w);
    }
    return w; 
  },
  getActiveWarehouse() {
    let active = localStorage.getItem('wh_active');
    // If Auth is loaded, restrict to allowed warehouses
    const allowed = (typeof Auth !== 'undefined' && Auth.currentUser) ? Auth.getAllowedWarehouses() : this.getWarehouses();
    if(allowed.length === 0) return null;
    
    if(!active || !allowed.find(x=>x.id===active)) {
      active = allowed[0].id;
      localStorage.setItem('wh_active', active);
    }
    return active;
  },
  getActiveWarehouseName() {
    const w = this.getWarehouses().find(x => x.id === this.getActiveWarehouse());
    return w ? w.name : 'Unknown';
  },
  setActiveWarehouse(id) {
    localStorage.setItem('wh_active', id);
    window.location.reload();
  },
  addWarehouse(name) {
    const w = this.getWarehouses();
    if(w.length >= 8) return { success: false, msg: 'Maximum 8 warehouses allowed.' };
    if(w.find(x => x.name.toLowerCase() === name.toLowerCase())) return { success: false, msg: 'Warehouse name already exists.' };
    const id = 'wh-' + Date.now();
    w.push({ id, name });
    this._save('wh_warehouses', w);
    return { success: true, id };
  },
  deleteWarehouse(id) {
    let w = this.getWarehouses();
    if(w.length <= 1) return { success: false, msg: 'Cannot delete the last warehouse.' };
    const hasData = this._store('wh_skus').some(s => (s.warehouseId || 'wh-main') === id) || 
                    this._store('wh_purchases').some(p => (p.warehouseId || 'wh-main') === id) ||
                    this._store('wh_orders').some(o => (o.warehouseId || 'wh-main') === id);
    if(hasData) return { success: false, msg: 'Warehouse has data. Delete all SKUs/Orders first.' };
    
    w = w.filter(x => x.id !== id);
    this._save('wh_warehouses', w);
    if(this.getActiveWarehouse() === id) {
      this.setActiveWarehouse(w[0].id);
    }
    return { success: true };
  },

  // ---- SKUs ----
  getSkus() { return this._store('wh_skus').filter(s => (s.warehouseId || 'wh-main') === this.getActiveWarehouse()); },
  getSkuById(id) { return this.getSkus().find(s => s.id === id) || null; },
  getSkuBySku(sku) { return this.getSkus().find(s => s.sku === sku) || null; },
  saveSku(sku) {
    sku.warehouseId = sku.warehouseId || this.getActiveWarehouse();
    const skus = this._store('wh_skus');
    const idx = skus.findIndex(s => s.id === sku.id);
    if (idx >= 0) skus[idx] = sku; else skus.push(sku);
    this._save('wh_skus', skus);
  },
  deleteSku(id) {
    this._save('wh_skus', this._store('wh_skus').filter(s => s.id !== id));
  },
  updateStock(skuId) {
    const sku = this.getSkuById(skuId);
    if(!sku) return;
    const purchases = this.getPurchases().filter(p => p.skuId === skuId);
    const orders = this.getOrders().filter(o => o.skuId === skuId);
    const returns = this.getReturns().filter(r => r.skuId === skuId);
    const totalPurchased = purchases.reduce((s, p) => s + parseInt(p.quantity||0, 10), 0);
    const totalOrdered = orders.reduce((s, o) => s + parseInt(o.quantity||0, 10), 0);
    const totalReturned = returns.filter(r => r.type === 'Customer Return' || r.type === 'RTO').reduce((s, r) => s + parseInt(r.quantity||0, 10), 0);
    
    sku.currentStock = totalPurchased - totalOrdered + totalReturned + parseInt(sku.openingStock||0, 10);
    this.saveSku(sku);
  },

  // ---- PURCHASES ----
  getPurchases() { return this._store('wh_purchases').filter(p => (p.warehouseId || 'wh-main') === this.getActiveWarehouse()); },
  savePurchase(p) {
    p.warehouseId = p.warehouseId || this.getActiveWarehouse();
    const list = this._store('wh_purchases');
    const idx = list.findIndex(x => x.id === p.id);
    if (idx >= 0) list[idx] = p; else list.push(p);
    this._save('wh_purchases', list);
    this.updateStock(p.skuId);
  },
  deletePurchase(id) {
    const p = this.getPurchases().find(x => x.id === id);
    this._save('wh_purchases', this._store('wh_purchases').filter(x => x.id !== id));
    if (p) this.updateStock(p.skuId);
  },

  // ---- ORDERS ----
  getOrders() { return this._store('wh_orders').filter(o => (o.warehouseId || 'wh-main') === this.getActiveWarehouse()); },
  saveOrder(o) {
    o.warehouseId = o.warehouseId || this.getActiveWarehouse();
    const list = this._store('wh_orders');
    const idx = list.findIndex(x => x.id === o.id);
    if (idx >= 0) list[idx] = o; else list.push(o);
    this._save('wh_orders', list);
    this.updateStock(o.skuId);
  },
  deleteOrder(id) {
    const o = this.getOrders().find(x => x.id === id);
    this._save('wh_orders', this._store('wh_orders').filter(x => x.id !== id));
    if (o) this.updateStock(o.skuId);
  },

  // ---- RETURNS ----
  getReturns() { return this._store('wh_returns').filter(r => (r.warehouseId || 'wh-main') === this.getActiveWarehouse()); },
  saveReturn(r) {
    r.warehouseId = r.warehouseId || this.getActiveWarehouse();
    const list = this._store('wh_returns');
    const idx = list.findIndex(x => x.id === r.id);
    if (idx >= 0) list[idx] = r; else list.push(r);
    this._save('wh_returns', list);
    this.updateStock(r.skuId);
  },
  addPaymentEntry(supplierId, entry) {
    entry.id = this.genId();
    entry.supplierId = supplierId;
    const p = this.getPayments().find(x=>x.id===supplierId);
    entry.supplierName = p ? p.supplierName : 'Unknown';
    this.savePaymentHistory(entry);
    
    if (p) {
      p.paidAmount += entry.amount;
      p.pendingBalance = p.totalAmount - p.paidAmount;
      this.savePayment(p);
    }
  },
  deletePaymentEntry(id, supplierId) {
    const list = this._store('wh_payment_history');
    const entry = list.find(x => x.id === id);
    if(!entry) return;
    this._save('wh_payment_history', list.filter(x => x.id !== id));
    
    const p = this.getPayments().find(x=>x.id===supplierId);
    if(p) {
      p.paidAmount -= entry.amount;
      p.pendingBalance = p.totalAmount - p.paidAmount;
      this.savePayment(p);
    }
  },
  deleteReturn(id) {
    const r = this.getReturns().find(x => x.id === id);
    this._save('wh_returns', this._store('wh_returns').filter(x => x.id !== id));
    if (r) this.updateStock(r.skuId);
  },

  // ---- PAYMENTS ----
  getPayments() { return this._store('wh_payments').filter(p => (p.warehouseId || 'wh-main') === this.getActiveWarehouse()); },
  savePayment(p) {
    p.warehouseId = p.warehouseId || this.getActiveWarehouse();
    const list = this._store('wh_payments');
    const idx = list.findIndex(x => x.id === p.id);
    if (idx >= 0) list[idx] = p; else list.push(p);
    this._save('wh_payments', list);
  },
  deletePayment(id) {
    this._save('wh_payments', this._store('wh_payments').filter(x => x.id !== id));
  },
  getPaymentHistory() { return this._store('wh_payment_history').filter(h => (h.warehouseId || 'wh-main') === this.getActiveWarehouse()); },
  savePaymentHistory(h) {
    h.warehouseId = h.warehouseId || this.getActiveWarehouse();
    const list = this._store('wh_payment_history');
    list.push(h);
    this._save('wh_payment_history', list);
  },

  // ---- DASHBOARD STATS ----
  getStats() {
    const skus = this.getSkus();
    const purchases = this.getPurchases();
    const orders = this.getOrders();
    const returns = this.getReturns();
    const totalStock = skus.reduce((s, k) => s + (k.currentStock || 0), 0);
    const totalPurchaseValue = purchases.reduce((s, p) => s + (p.total || 0), 0);
    const lowStockItems = skus.filter(s => s.currentStock <= s.minimumStock);
    return {
      totalStock,
      totalOrders: orders.length,
      totalReturns: returns.length,
      totalPurchaseValue,
      lowStockItems,
      totalSkus: skus.length,
    };
  },

  // ---- SEARCH ----
  globalSearch(query) {
    const q = query.toLowerCase().trim();
    if (!q) return { purchases: [], orders: [], returns: [] };
    const purchases = this.getPurchases().filter(p =>
      p.sku?.toLowerCase().includes(q) || p.supplierName?.toLowerCase().includes(q) ||
      p.productName?.toLowerCase().includes(q) || p.date?.includes(q)
    );
    const orders = this.getOrders().filter(o =>
      o.sku?.toLowerCase().includes(q) || o.orderId?.toLowerCase().includes(q) ||
      o.productName?.toLowerCase().includes(q) || o.platform?.toLowerCase().includes(q) || o.date?.includes(q)
    );
    const returns = this.getReturns().filter(r =>
      r.sku?.toLowerCase().includes(q) || r.productName?.toLowerCase().includes(q) ||
      r.type?.toLowerCase().includes(q) || r.date?.includes(q)
    );
    return { purchases, orders, returns };
  },

  // ---- INIT DEFAULT ADMIN ----
  initDefaults() {
    if (this.getUsers().length === 0) {
      this.saveUser({
        uid: 'admin-001',
        name: 'Administrator',
        username: 'admin',
        password: 'admin123',
        role: 'admin',
        isActive: true,
        createdAt: new Date().toISOString(),
      });
    }
    if (!localStorage.getItem('wh_warehouses')) {
      localStorage.setItem('wh_warehouses', JSON.stringify(['Main Warehouse']));
    }
    this.recalcAll();
  },
  
  recalcAll() {
    const skus = this.getSkus();
    if (!skus.length) return;
    skus.forEach(sku => {
      const purchases = this.getPurchases().filter(p => p.skuId === sku.id);
      const orders = this.getOrders().filter(o => o.skuId === sku.id);
      const returns = this.getReturns().filter(r => r.skuId === sku.id);
      let stock = purchases.reduce((sum, p) => sum + parseInt(p.quantity||0, 10), 0);
      stock -= orders.reduce((sum, o) => sum + parseInt(o.quantity||0, 10), 0);
      stock += returns.filter(r => r.type === 'Customer Return' || r.type === 'RTO').reduce((sum, r) => sum + parseInt(r.quantity||0, 10), 0);
      sku.currentStock = stock;
    });
    this._save('wh_skus', skus);
  },

  // ---- GENERATE ID ----
  genId() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 9); },
};

DB.initDefaults();
