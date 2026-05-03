// ==================== AUTH MODULE ====================
const Auth = {
  currentUser: null,

  login(username, password) {
    const user = DB.getUserByUsername(username);
    if (!user) return { success: false, error: 'User not found' };
    if (!user.isActive) return { success: false, error: 'Account is disabled' };
    if (user.password !== password) return { success: false, error: 'Invalid password' };
    this.currentUser = user;
    localStorage.setItem('wh_session', JSON.stringify({ uid: user.uid }));
    return { success: true, user };
  },

  logout() {
    this.currentUser = null;
    localStorage.removeItem('wh_session');
  },

  restoreSession() {
    const session = JSON.parse(localStorage.getItem('wh_session') || 'null');
    if (session && session.uid) {
      const user = DB.getUserById(session.uid);
      if (user && user.isActive) { this.currentUser = user; return true; }
    }
    return false;
  },

  isAdmin() { return this.currentUser?.role === 'admin'; },
  getUsername() { return this.currentUser?.username || ''; },
  getName() { return this.currentUser?.name || ''; },
  getAllowedWarehouses() {
    if(!this.currentUser) return [];
    if(this.isAdmin()) return DB.getWarehouses();
    const allowed = this.currentUser.allowedWarehouses || [];
    return DB.getWarehouses().filter(w => allowed.includes(w.id));
  }
};
