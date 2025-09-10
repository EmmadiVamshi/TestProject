/* Water Bubbly - shared app logic using localStorage */
(function() {
  const STORAGE_KEYS = {
    users: 'wb_users',
    session: 'wb_session',
    cart: (phone) => `wb_cart_${phone}`,
    orders: (phone) => `wb_orders_${phone}`,
  };

  const PRODUCTS = [
    { id: 'normal', name: 'Normal Water Can', price: 10, image: 'assets/normal-can.svg' },
    { id: 'cool', name: 'Cool Water Can', price: 20, image: 'assets/cool-can.svg' },
    { id: '5l', name: '5 Ltr', price: 20, image: 'assets/water-5l.svg' },
    { id: '10l', name: '10 Ltr', price: 25, image: 'assets/water-10l.svg' },
    { id: '20l', name: '20 Ltr', price: 35, image: 'assets/water-20l.svg' },
    { id: '15l-chilled', name: '15 Ltr Chilled', price: 50, image: 'assets/water-15l.svg' },
    { id: '20l-chilled', name: '20 Ltr Chilled', price: 60, image: 'assets/water-20l-chilled.svg' },
  ];

  const GST_RATE = 0.12;

  function read(key) {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
  }
  function write(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
  function remove(key) { localStorage.removeItem(key); }

  function getUsers() { return read(STORAGE_KEYS.users) || []; }
  function saveUsers(users) { write(STORAGE_KEYS.users, users); }
  function getSession() { return read(STORAGE_KEYS.session); }
  function setSession(phone) { write(STORAGE_KEYS.session, { phone }); }
  function clearSession() { remove(STORAGE_KEYS.session); }

  function getCart(phone) { return read(STORAGE_KEYS.cart(phone)) || []; }
  function saveCart(phone, cart) { write(STORAGE_KEYS.cart(phone), cart); }
  function getOrders(phone) { return read(STORAGE_KEYS.orders(phone)) || []; }
  function saveOrders(phone, orders) { write(STORAGE_KEYS.orders(phone), orders); }

  function upsertUser(user) {
    const users = getUsers();
    const idx = users.findIndex(u => u.phone === user.phone);
    if (idx >= 0) users[idx] = { ...users[idx], ...user };
    else users.push(user);
    saveUsers(users);
    return user;
  }

  function findUserByPhone(phone) {
    return getUsers().find(u => u.phone === phone);
  }

  function ensureAuthOrRedirect() {
    const s = getSession();
    if (!s || !s.phone) {
      window.location.href = '../index.html';
    }
    return s;
  }

  function signOut() {
    clearSession();
    window.location.href = '../index.html';
  }

  function getProducts() { return PRODUCTS.slice(); }

  function addToCart(phone, productId) {
    const cart = getCart(phone);
    const item = cart.find(i => i.id === productId);
    if (item) item.qty += 1; else cart.push({ id: productId, qty: 1 });
    saveCart(phone, cart);
  }
  function updateQty(phone, productId, qty) {
    let cart = getCart(phone);
    cart = cart.map(i => i.id === productId ? { ...i, qty } : i).filter(i => i.qty > 0);
    saveCart(phone, cart);
  }
  function clearCart(phone) { saveCart(phone, []); }

  function priceFor(productId) {
    const p = PRODUCTS.find(p => p.id === productId);
    return p ? p.price : 0;
  }
  function nameFor(productId) {
    const p = PRODUCTS.find(p => p.id === productId);
    return p ? p.name : productId;
  }

  function computeTotals(cart) {
    const subtotal = cart.reduce((sum, i) => sum + i.qty * priceFor(i.id), 0);
    const gst = +(subtotal * GST_RATE).toFixed(2);
    const total = +(subtotal + gst).toFixed(2);
    return { subtotal, gst, total };
  }

  function placeOrder(phone) {
    const cart = getCart(phone);
    if (!cart.length) return null;
    const totals = computeTotals(cart);
    const order = {
      id: 'ORD-' + Date.now(),
      items: cart,
      totals,
      status: 'Pending',
      createdAt: new Date().toISOString(),
    };
    const orders = getOrders(phone);
    orders.unshift(order);
    saveOrders(phone, orders);
    clearCart(phone);
    return order;
  }

  function progressOrder(phone, orderId) {
    const orders = getOrders(phone);
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx < 0) return;
    const flow = ['Pending', 'Confirmed', 'Delivered'];
    const cur = orders[idx].status;
    const ni = Math.min(flow.indexOf(cur) + 1, flow.length - 1);
    orders[idx].status = flow[ni];
    saveOrders(phone, orders);
  }

  // Expose globally
  window.WB = {
    STORAGE_KEYS,
    getUsers, saveUsers, getSession, setSession, clearSession,
    upsertUser, findUserByPhone, ensureAuthOrRedirect, signOut,
    getProducts, addToCart, updateQty, getCart, clearCart,
    priceFor, nameFor, computeTotals, placeOrder, getOrders, saveOrders, progressOrder,
  };
})();

