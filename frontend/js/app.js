// ── API ──────────────────────────────────────────────────────────
const API = 'http://localhost:3000/api';

const api = {
  async req(method, path, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    const token = localStorage.getItem('token');
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    if (body) opts.body = JSON.stringify(body);
    try {
      const res = await fetch(API + path, opts);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      return data;
    } catch (e) {
      throw e;
    }
  },
  get: (path) => api.req('GET', path),
  post: (path, body) => api.req('POST', path, body),
  put: (path, body) => api.req('PUT', path, body),
  delete: (path, body) => api.req('DELETE', path, body),
};

// ── State ─────────────────────────────────────────────────────────
const state = {
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  cart: null,
  cartCount: 0,
  currentPage: 'home',
  currentProduct: null,
  categories: [],
  filters: { search: '', category_id: '', min_price: '', max_price: '', brand: '' },
};

function setUser(user, token) {
  state.user = user;
  if (user) {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  }
  renderNav();
}

// ── Image helpers ─────────────────────────────────────────────────
const categoryImages = [
  'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&q=80',
  'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=400&q=80',
  'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&q=80',
  'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=400&q=80',
  'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80',
  'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=400&q=80',
];

const categoryEmojis = ['💻', '👗', '📚', '⚽', '🏡', '🛍'];

const productFallbacks = [
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80',
  'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=600&q=80',
  'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=600&q=80',
  'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=600&q=80',
  'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&q=80',
  'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80',
  'https://images.unsplash.com/photo-1560343090-f0409e92791a?w=600&q=80',
  'https://images.unsplash.com/photo-1567721913486-6585f069b332?w=600&q=80',
];

function getProductImg(p, size = 600) {
  if (p.image_url) return p.image_url;
  const idx = (p.id || 0) % productFallbacks.length;
  return productFallbacks[idx];
}

// ── Toast ─────────────────────────────────────────────────────────
function toast(msg, type = 'info') {
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<div class="toast-icon">${icons[type] || '●'}</div><span>${msg}</span>`;
  document.getElementById('toastContainer').appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(60px)';
    el.style.transition = '0.3s ease';
    setTimeout(() => el.remove(), 300);
  }, 3000);
}

// ── Navigation ────────────────────────────────────────────────────
function navigate(page, data) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

  state.currentPage = page;
  const pageEl = document.getElementById(`page-${page}`);
  if (pageEl) pageEl.classList.add('active');

  const navLink = document.querySelector(`.nav-link[data-page="${page}"]`);
  if (navLink) navLink.classList.add('active');

  window.scrollTo({ top: 0, behavior: 'smooth' });

  switch (page) {
    case 'home': renderHome(); break;
    case 'catalog': renderCatalog(); break;
    case 'product': renderProductDetail(data); break;
    case 'cart': renderCart(); break;
    case 'checkout': renderCheckout(); break;
    case 'orders': renderOrders(); break;
    case 'auth': renderAuth(); break;
  }
}

function renderNav() {
  const navLinks = document.getElementById('navLinks');
  const cartBtn = document.getElementById('navCartBtn');

  if (state.user) {
    navLinks.innerHTML = `
      <span class="nav-link" data-page="home" onclick="navigate('home')">Главная</span>
      <span class="nav-link" data-page="catalog" onclick="navigate('catalog')">Каталог</span>
      <span class="nav-link" data-page="orders" onclick="navigate('orders')">Заказы</span>
      <span class="nav-link" onclick="logout()">Выйти</span>
    `;
    cartBtn.style.display = 'flex';
  } else {
    navLinks.innerHTML = `
      <span class="nav-link" data-page="home" onclick="navigate('home')">Главная</span>
      <span class="nav-link" data-page="catalog" onclick="navigate('catalog')">Каталог</span>
      <span class="nav-link" data-page="auth" onclick="navigate('auth')">Войти</span>
    `;
    cartBtn.style.display = 'none';
  }

  const active = document.querySelector(`.nav-link[data-page="${state.currentPage}"]`);
  if (active) active.classList.add('active');
}

function logout() {
  setUser(null, null);
  state.cart = null;
  state.cartCount = 0;
  updateCartBadge(0);
  navigate('home');
  toast('Вы вышли из аккаунта', 'info');
}

function updateCartBadge(count) {
  state.cartCount = count;
  const badge = document.getElementById('cartBadge');
  if (count > 0) {
    badge.textContent = count > 9 ? '9+' : count;
    badge.classList.add('show');
  } else {
    badge.classList.remove('show');
  }
}

// ── Helpers ───────────────────────────────────────────────────────
function formatPrice(p) {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(p);
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

function requireAuth(action) {
  if (!state.user) {
    toast('Войдите в аккаунт', 'error');
    navigate('auth');
    return false;
  }
  return true;
}

// ── Home ──────────────────────────────────────────────────────────
async function renderHome() {
  try {
    const products = await api.get('/products');
    const featured = products.slice(0, 8);

    // Hero mini cards
    const heroCards = document.getElementById('heroCards');
    if (heroCards && featured.length >= 4) {
      heroCards.innerHTML = featured.slice(0, 4).map(p => `
        <div class="hero-card-mini" onclick="navigate('product', ${p.id})">
          <img src="${getProductImg(p)}" alt="${p.name}" class="hero-card-mini-img"
            onerror="this.src='${productFallbacks[p.id % productFallbacks.length]}'">
          <div class="hero-card-mini-name">${p.name.substring(0, 20)}${p.name.length > 20 ? '…' : ''}</div>
          <div class="hero-card-mini-price">${formatPrice(p.price)}</div>
        </div>
      `).join('');
    }

    // Featured grid
    const grid = document.getElementById('featuredGrid');
    if (grid) {
      grid.innerHTML = featured.map(p => productCard(p)).join('');
    }

    // Category banners
    const cats = await api.get('/categories');
    state.categories = cats;
    const catBanners = document.getElementById('categoryBanners');
    if (catBanners) {
      catBanners.innerHTML = cats.map((c, i) => `
        <div class="category-banner" onclick="navigate('catalog'); setFilterCategory(${c.id})">
          <div class="category-banner-bg" style="background-image:url('${categoryImages[i] || categoryImages[0]}')"></div>
          <div class="category-banner-content">
            <div class="category-banner-icon">${categoryEmojis[i] || '🛍'}</div>
            <div class="category-banner-name">${c.name}</div>
          </div>
        </div>
      `).join('');
    }
  } catch (e) {
    console.error(e);
  }
}

// ── Catalog ───────────────────────────────────────────────────────
async function renderCatalog() {
  try {
    if (!state.categories.length) {
      state.categories = await api.get('/categories');
    }

    const pills = document.getElementById('catalogCategoryPills');
    if (pills) {
      pills.innerHTML = `
        <button class="category-pill ${!state.filters.category_id ? 'active' : ''}" onclick="setCatalogCategory('')">Все</button>
        ${state.categories.map(c => `
          <button class="category-pill ${state.filters.category_id == c.id ? 'active' : ''}"
            onclick="setCatalogCategory(${c.id})">${c.name}</button>
        `).join('')}
      `;
    }

    await loadProducts();
  } catch (e) {
    console.error(e);
    toast('Ошибка загрузки каталога', 'error');
  }
}

function setCatalogCategory(id) {
  state.filters.category_id = id;
  renderCatalog();
}

function setFilterCategory(id) {
  state.filters.category_id = id;
}

async function loadProducts() {
  const grid = document.getElementById('catalogGrid');
  if (!grid) return;

  grid.innerHTML = '<div class="loading"><div class="spinner"></div>Загрузка...</div>';

  const params = new URLSearchParams();
  Object.entries(state.filters).forEach(([k, v]) => { if (v) params.append(k, v); });

  try {
    const products = await api.get(`/products?${params}`);
    if (products.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <span class="empty-state-icon">🔍</span>
          <h3>Ничего не найдено</h3>
          <p>Попробуйте изменить параметры поиска</p>
          <button class="btn btn-outline" onclick="resetFilters()">Сбросить фильтры</button>
        </div>`;
      return;
    }
    grid.innerHTML = products.map(p => productCard(p)).join('');
  } catch (e) {
    grid.innerHTML = `
      <div class="empty-state">
        <span class="empty-state-icon">⚠️</span>
        <h3>Ошибка загрузки</h3>
        <p>Не удалось загрузить товары</p>
      </div>`;
  }
}

function applyFilters() {
  state.filters.search = document.getElementById('filterSearch')?.value || '';
  state.filters.min_price = document.getElementById('filterMinPrice')?.value || '';
  state.filters.max_price = document.getElementById('filterMaxPrice')?.value || '';
  state.filters.brand = document.getElementById('filterBrand')?.value || '';
  loadProducts();
}

function productCard(p) {
  const stockClass = p.stock_quantity <= 5 ? 'low' : '';
  const stockText = p.stock_quantity === 0 ? 'Нет в наличии' : p.stock_quantity <= 5 ? `Осталось ${p.stock_quantity} шт.` : `В наличии`;
  const imgSrc = getProductImg(p);
  const fallback = productFallbacks[(p.id || 0) % productFallbacks.length];
  const isNew = p.id % 5 === 0;

  return `
    <div class="product-card" onclick="navigate('product', ${p.id})">
      ${isNew ? '<div class="product-card-badge">New</div>' : ''}
      <div class="product-card-img-wrapper">
        <img src="${imgSrc}" alt="${p.name}" class="product-card-img" loading="lazy"
          onerror="this.src='${fallback}'">
        <div class="product-card-img-placeholder" style="display:none">🛍</div>
        <div class="product-card-overlay">
          <button class="product-card-quick-add" onclick="event.stopPropagation(); addToCart(${p.id}, 1)">
            + В корзину
          </button>
        </div>
      </div>
      <div class="product-card-body">
        <div class="product-card-brand">${p.brand || p.category_name || 'LUXE'}</div>
        <div class="product-card-name">${p.name}</div>
        <div class="product-card-footer">
          <div>
            <div class="product-price">${formatPrice(p.price)}</div>
            <div class="product-stock ${stockClass}">${stockText}</div>
          </div>
          <button class="product-card-add" onclick="event.stopPropagation(); addToCart(${p.id}, 1)" title="В корзину">+</button>
        </div>
      </div>
    </div>
  `;
}

// ── Product Detail ────────────────────────────────────────────────
async function renderProductDetail(productId) {
  const container = document.getElementById('productDetailContent');
  if (!container) return;
  container.innerHTML = '<div class="loading"><div class="spinner"></div>Загрузка...</div>';

  try {
    const p = await api.get(`/products/${productId}`);
    state.currentProduct = p;

    const imgSrc = getProductImg(p);
    const fallback = productFallbacks[(p.id || 0) % productFallbacks.length];
    const stockText = p.stock_quantity === 0
      ? '<span style="color:var(--red);font-size:0.875rem">● Нет в наличии</span>'
      : p.stock_quantity <= 5
        ? `<span class="product-stock low">● Осталось ${p.stock_quantity} шт.</span>`
        : `<span class="product-stock" style="color:var(--green)">● В наличии: ${p.stock_quantity} шт.</span>`;

    container.innerHTML = `
      <div class="breadcrumb">
        <span onclick="navigate('home')">Главная</span>
        <span class="breadcrumb-sep">›</span>
        <span onclick="navigate('catalog')">Каталог</span>
        <span class="breadcrumb-sep">›</span>
        <span class="current">${p.name}</span>
      </div>
      <div class="product-detail">
        <div class="product-detail-gallery">
          <div class="product-detail-img-wrapper">
            <img src="${imgSrc}" alt="${p.name}" class="product-detail-img"
              onerror="this.src='${fallback}'">
          </div>
        </div>
        <div class="product-detail-info">
          <div class="product-detail-category">
            ${p.category_name || 'Товар'}
          </div>
          <h1 class="product-detail-name">${p.name}</h1>
          <div class="product-detail-brand">Бренд: <strong style="color:var(--text)">${p.brand || 'Не указан'}</strong></div>
          <div class="product-detail-divider"></div>
          <div class="product-detail-price">${formatPrice(p.price)}</div>
          <p class="product-detail-desc">${p.description || 'Качественный товар от проверенного поставщика. Гарантия соответствия описанию.'}</p>
          <div style="margin-bottom:20px">${stockText}</div>
          <div style="margin-bottom:24px">
            <div style="font-size:0.68rem;color:var(--text3);letter-spacing:0.15em;text-transform:uppercase;font-family:'DM Mono',monospace;margin-bottom:10px">Количество</div>
            <div class="quantity-selector">
              <button class="qty-btn" onclick="changeQty(-1)">−</button>
              <input class="qty-value" id="qtyInput" type="number" value="1" min="1" max="${p.stock_quantity}">
              <button class="qty-btn" onclick="changeQty(1)">+</button>
            </div>
          </div>
          <div style="display:flex;gap:14px;flex-wrap:wrap">
            <button class="btn btn-primary btn-lg" onclick="addCurrentToCart()" ${p.stock_quantity === 0 ? 'disabled' : ''}>
              🛒 В корзину
            </button>
            <button class="btn btn-outline btn-lg" onclick="navigate('catalog')">← Назад</button>
          </div>
          <div style="margin-top:24px;display:flex;flex-direction:column;gap:8px">
            <div style="font-size:0.8rem;color:var(--text3);display:flex;align-items:center;gap:8px">
              🚚 <span>Доставка 1–7 рабочих дней</span>
            </div>
            <div style="font-size:0.8rem;color:var(--text3);display:flex;align-items:center;gap:8px">
              ↩️ <span>Возврат в течение 30 дней</span>
            </div>
            <div style="font-size:0.8rem;color:var(--text3);display:flex;align-items:center;gap:8px">
              🛡️ <span>Гарантия оригинальности</span>
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (e) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-state-icon">⚠️</span>
        <h3>Товар не найден</h3>
        <p>Возможно, товар был удалён</p>
        <button class="btn btn-outline" onclick="navigate('catalog')">← В каталог</button>
      </div>`;
  }
}

function changeQty(delta) {
  const input = document.getElementById('qtyInput');
  if (!input) return;
  let val = parseInt(input.value) + delta;
  const max = state.currentProduct?.stock_quantity || 999;
  val = Math.max(1, Math.min(max, val));
  input.value = val;
}

async function addCurrentToCart() {
  if (!requireAuth()) return;
  const qty = parseInt(document.getElementById('qtyInput')?.value || '1');
  await addToCart(state.currentProduct.id, qty);
}

// ── Cart ──────────────────────────────────────────────────────────
async function addToCart(productId, quantity = 1) {
  if (!requireAuth()) return;
  try {
    await api.post('/cart/add', { product_id: productId, quantity });
    toast('Товар добавлен в корзину', 'success');
    await refreshCartCount();
  } catch (e) {
    toast(e.message || 'Ошибка добавления', 'error');
  }
}

async function refreshCartCount() {
  if (!state.user) return;
  try {
    const cart = await api.get('/cart');
    const count = cart.items?.reduce((s, i) => s + i.quantity, 0) || 0;
    updateCartBadge(count);
    state.cart = cart;
  } catch {}
}

async function renderCart() {
  if (!requireAuth()) return;
  const container = document.getElementById('cartContent');
  if (!container) return;
  container.innerHTML = '<div class="loading"><div class="spinner"></div>Загрузка корзины...</div>';

  try {
    const cart = await api.get('/cart');
    state.cart = cart;
    updateCartBadge(cart.items?.reduce((s, i) => s + i.quantity, 0) || 0);

    if (!cart.items || cart.items.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column:unset">
          <span class="empty-state-icon">🛒</span>
          <h3>Корзина пуста</h3>
          <p>Добавьте товары из каталога</p>
          <button class="btn btn-primary" onclick="navigate('catalog')">Перейти в каталог</button>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="section-label" style="margin-bottom:10px">Корзина</div>
      <div class="cart-layout">
        <div>
          <h2 style="margin-bottom:28px">Ваши товары <span style="color:var(--text3);font-size:1rem;font-family:'Jost',sans-serif;font-weight:300">${cart.items.length} позиций</span></h2>
          <div class="cart-items-list" id="cartItemsList">
            ${cart.items.map(item => cartItemHTML(item)).join('')}
          </div>
        </div>
        <div class="order-summary">
          <h3>Итого</h3>
          ${cart.items.map(i => `
            <div class="summary-row">
              <span style="color:var(--text2);font-size:0.82rem;max-width:160px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${i.product.name}</span>
              <span style="font-size:0.9rem;white-space:nowrap">× ${i.quantity} = ${formatPrice(i.product.price * i.quantity)}</span>
            </div>
          `).join('')}
          <div class="summary-row total">
            <span>Итого</span>
            <span id="cartTotal">${formatPrice(cart.total)}</span>
          </div>
          <button class="btn btn-primary btn-full" style="margin-top:22px" onclick="navigate('checkout')">
            Оформить заказ →
          </button>
          <button class="btn btn-ghost btn-full" style="margin-top:10px" onclick="navigate('catalog')">
            Продолжить покупки
          </button>
          <div class="security-badge">
            🔒 <span>Платёж защищён SSL-шифрованием</span>
          </div>
        </div>
      </div>`;
  } catch (e) {
    container.innerHTML = `<div class="empty-state"><span class="empty-state-icon">⚠️</span><h3>Ошибка загрузки корзины</h3></div>`;
  }
}

function cartItemHTML(item) {
  const imgSrc = item.product.image_url || productFallbacks[(item.product_id || 0) % productFallbacks.length];
  return `
    <div class="cart-item" id="cart-item-${item.product_id}">
      <img src="${imgSrc}" alt="${item.product.name}" class="cart-item-img"
        onerror="this.src='${productFallbacks[(item.product_id || 0) % productFallbacks.length]}'">
      <div class="cart-item-info">
        <div class="cart-item-brand">${item.product.brand || 'LUXE'}</div>
        <div class="cart-item-name">${item.product.name}</div>
        <div class="cart-item-price">${formatPrice(item.product.price)} / шт.</div>
      </div>
      <div class="cart-item-controls">
        <div class="cart-item-qty">
          <button class="cart-item-qty-btn" onclick="updateCartQty(${item.product_id}, ${item.quantity - 1})">−</button>
          <input class="cart-item-qty-val" value="${item.quantity}" readonly>
          <button class="cart-item-qty-btn" onclick="updateCartQty(${item.product_id}, ${item.quantity + 1})">+</button>
        </div>
        <div class="cart-item-subtotal">${formatPrice(item.product.price * item.quantity)}</div>
        <button class="btn btn-danger btn-sm" onclick="removeCartItem(${item.product_id})">✕</button>
      </div>
    </div>`;
}

async function updateCartQty(productId, qty) {
  try {
    await api.put('/cart/update', { product_id: productId, quantity: qty });
    await renderCart();
  } catch (e) {
    toast('Ошибка обновления', 'error');
  }
}

async function removeCartItem(productId) {
  try {
    await api.delete('/cart/remove', { product_id: productId });
    await renderCart();
    toast('Товар удалён', 'info');
  } catch (e) {
    toast('Ошибка удаления', 'error');
  }
}

// ── Checkout ──────────────────────────────────────────────────────
async function renderCheckout() {
  if (!requireAuth()) return;
  const container = document.getElementById('checkoutContent');
  if (!container) return;

  try {
    const cart = state.cart || await api.get('/cart');
    state.cart = cart;

    if (!cart.items || cart.items.length === 0) {
      container.innerHTML = `<div class="empty-state"><span class="empty-state-icon">🛒</span><h3>Корзина пуста</h3><button class="btn btn-primary" onclick="navigate('catalog')">В каталог</button></div>`;
      return;
    }

    container.innerHTML = `
      <div class="section-label" style="margin-bottom:10px">Оформление</div>
      <h2 style="margin-bottom:36px">Оформление заказа</h2>
      <div class="checkout-layout">
        <div>
          <div class="form-section-title">Адрес доставки</div>
          <div class="form-group">
            <label>Имя получателя</label>
            <input class="form-input" id="recipientName" placeholder="${state.user?.username || 'Введите имя'}">
          </div>
          <div class="form-group">
            <label>Улица, дом, квартира</label>
            <input class="form-input" id="streetAddress" placeholder="ул. Пушкина, д. 10, кв. 5">
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
            <div class="form-group">
              <label>Город</label>
              <input class="form-input" id="city" placeholder="Москва">
            </div>
            <div class="form-group">
              <label>Индекс</label>
              <input class="form-input" id="postal" placeholder="123456">
            </div>
          </div>

          <div class="form-section-title" style="margin-top:8px">Способ доставки</div>
          <div class="delivery-options">
            <label class="delivery-option selected" id="del-standard">
              <input type="radio" name="delivery" value="standard" checked onchange="selectDelivery('standard')">
              <div class="delivery-option-info">
                <div class="delivery-option-name">Стандартная доставка</div>
                <div class="delivery-option-desc">5–7 рабочих дней</div>
              </div>
              <div class="delivery-option-price">Бесплатно</div>
            </label>
            <label class="delivery-option" id="del-express">
              <input type="radio" name="delivery" value="express" onchange="selectDelivery('express')">
              <div class="delivery-option-info">
                <div class="delivery-option-name">Экспресс-доставка</div>
                <div class="delivery-option-desc">1–2 рабочих дня</div>
              </div>
              <div class="delivery-option-price">${formatPrice(490)}</div>
            </label>
            <label class="delivery-option" id="del-pickup">
              <input type="radio" name="delivery" value="pickup" onchange="selectDelivery('pickup')">
              <div class="delivery-option-info">
                <div class="delivery-option-name">Самовывоз</div>
                <div class="delivery-option-desc">Готов через 2 часа</div>
              </div>
              <div class="delivery-option-price">Бесплатно</div>
            </label>
          </div>

          <div id="checkoutAlert"></div>
          <button class="btn btn-primary btn-lg btn-full" style="margin-top:28px" onclick="placeOrder()">
            Подтвердить и оплатить
          </button>
        </div>

        <div class="order-summary">
          <h3>Ваш заказ</h3>
          ${cart.items.map(i => `
            <div class="summary-row">
              <span style="color:var(--text2);font-size:0.82rem;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${i.product.name}<br><small style="color:var(--text3)">× ${i.quantity}</small></span>
              <span style="font-size:0.9rem">${formatPrice(i.product.price * i.quantity)}</span>
            </div>
          `).join('')}
          <div class="summary-row total">
            <span>Итого</span>
            <span>${formatPrice(cart.total)}</span>
          </div>
          <div class="security-badge">
            🔒 <span>Платёж защищён. Данные не передаются третьим лицам.</span>
          </div>
        </div>
      </div>`;
  } catch (e) {
    container.innerHTML = `<div class="empty-state"><span class="empty-state-icon">⚠️</span><h3>Ошибка</h3></div>`;
  }
}

function selectDelivery(type) {
  document.querySelectorAll('.delivery-option').forEach(el => el.classList.remove('selected'));
  document.getElementById(`del-${type}`)?.classList.add('selected');
}

async function placeOrder() {
  const name = document.getElementById('recipientName')?.value.trim();
  const street = document.getElementById('streetAddress')?.value.trim();
  const city = document.getElementById('city')?.value.trim();
  const postal = document.getElementById('postal')?.value.trim();
  const alertEl = document.getElementById('checkoutAlert');

  if (!street || !city) {
    alertEl.innerHTML = '<div class="alert alert-error">⚠️ Заполните адрес доставки</div>';
    return;
  }

  const address = `${name ? name + ', ' : ''}${street}, ${city}${postal ? ', ' + postal : ''}`;
  const btn = document.querySelector('#checkoutContent .btn-primary');
  btn.disabled = true;
  btn.textContent = 'Оформляем...';

  try {
    const order = await api.post('/orders', { shipping_address: address });
    state.cart = null;
    updateCartBadge(0);
    toast('Заказ успешно оформлен!', 'success');
    renderOrderSuccess(order);
  } catch (e) {
    alertEl.innerHTML = `<div class="alert alert-error">${e.message}</div>`;
    btn.disabled = false;
    btn.textContent = 'Подтвердить и оплатить';
  }
}

function renderOrderSuccess(order) {
  const container = document.getElementById('checkoutContent');
  container.innerHTML = `
    <div class="success-screen">
      <div class="success-check">✓</div>
      <h2 style="margin-bottom:14px;font-size:2.4rem">Заказ оформлен!</h2>
      <p style="color:var(--text2);margin-bottom:8px;font-size:1rem">Номер заказа: <strong style="color:var(--accent);font-family:'DM Mono',monospace">#${String(order.order_id).padStart(6, '0')}</strong></p>
      <p style="color:var(--text2);margin-bottom:8px;font-size:1rem">Сумма: <strong style="color:var(--white)">${formatPrice(order.total)}</strong></p>
      <p style="color:var(--text3);margin-bottom:40px;font-size:0.875rem">Мы уведомим вас о статусе доставки</p>
      <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap">
        <button class="btn btn-primary btn-lg" onclick="navigate('orders')">Мои заказы</button>
        <button class="btn btn-outline btn-lg" onclick="navigate('catalog')">Продолжить покупки</button>
      </div>
    </div>`;
}

// ── Orders ────────────────────────────────────────────────────────
async function renderOrders() {
  if (!requireAuth()) return;
  const container = document.getElementById('ordersContent');
  if (!container) return;
  container.innerHTML = '<div class="loading"><div class="spinner"></div>Загрузка заказов...</div>';

  try {
    const orders = await api.get('/orders/my');
    if (!orders || orders.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="empty-state-icon">📦</span>
          <h3>Заказов пока нет</h3>
          <p>Сделайте первый заказ в нашем каталоге</p>
          <button class="btn btn-primary" onclick="navigate('catalog')">В каталог</button>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="section-label" style="margin-bottom:10px">История</div>
      <h2 style="margin-bottom:36px">История заказов</h2>
      <div class="orders-list">
        ${orders.map(o => orderCard(o)).join('')}
      </div>`;
  } catch (e) {
    container.innerHTML = `<div class="empty-state"><span class="empty-state-icon">⚠️</span><h3>Ошибка загрузки</h3></div>`;
  }
}

function statusLabel(status) {
  const map = {
    processing: ['status-processing', '● В обработке'],
    shipped:    ['status-shipped', '● Отправлен'],
    delivered:  ['status-delivered', '● Доставлен'],
    cancelled:  ['status-cancelled', '● Отменён'],
  };
  const [cls, label] = map[status] || ['status-processing', status];
  return `<span class="order-status ${cls}">${label}</span>`;
}

function orderCard(o) {
  const id = `order-body-${o.id}`;
  return `
    <div class="order-card" id="order-card-${o.id}">
      <div class="order-card-header" onclick="toggleOrderBody('${id}', ${o.id})">
        <div>
          <div class="order-id">#${String(o.id).padStart(6, '0')}</div>
          <div class="order-date">${formatDate(o.created_at)}</div>
        </div>
        <div style="text-align:center">
          ${statusLabel(o.status)}
          <div style="font-size:0.72rem;color:var(--text3);margin-top:6px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${o.shipping_address.substring(0, 32)}…</div>
        </div>
        <div style="display:flex;align-items:center;gap:14px">
          <div>
            <div class="order-total">${formatPrice(o.total_price)}</div>
          </div>
          <div class="order-chevron">▼</div>
        </div>
      </div>
      <div class="order-card-body" id="${id}">
        <div class="order-card-body-inner">
          <div class="order-items-mini">
            ${(o.items || []).map(i => `
              <div class="order-item-mini">
                <div class="order-item-mini-name">${i.product_name || 'Товар #' + i.product_id}</div>
                <div style="display:flex;gap:16px;align-items:center;flex-shrink:0">
                  <div class="order-item-mini-qty">× ${i.quantity}</div>
                  <div class="order-item-mini-price">${formatPrice(i.price_at_purchase * i.quantity)}</div>
                </div>
              </div>
            `).join('')}
          </div>
          <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border);font-size:0.82rem;color:var(--text3);display:flex;align-items:flex-start;gap:8px">
            <span>📍</span> <span>${o.shipping_address}</span>
          </div>
        </div>
      </div>
    </div>`;
}

function toggleOrderBody(id, cardId) {
  const el = document.getElementById(id);
  const card = document.getElementById(`order-card-${cardId}`);
  if (el) {
    el.classList.toggle('open');
    card?.classList.toggle('open');
  }
}

// ── Auth ──────────────────────────────────────────────────────────
function renderAuth() {
  if (state.user) { navigate('home'); return; }

  const container = document.getElementById('authContent');
  if (!container) return;

  container.innerHTML = `
    <div class="auth-wrapper">
      <div class="auth-card">
        <div class="auth-logo">✦ LUXE SHOP</div>
        <div class="auth-logo-divider"></div>
        <div class="auth-subtitle">Войдите или создайте аккаунт</div>
        <div class="auth-tabs">
          <button class="auth-tab active" id="tab-login" onclick="switchAuthTab('login')">Вход</button>
          <button class="auth-tab" id="tab-register" onclick="switchAuthTab('register')">Регистрация</button>
        </div>
        <div id="authForm"></div>
      </div>
    </div>`;

  renderLoginForm();
}

function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`tab-${tab}`)?.classList.add('active');
  if (tab === 'login') renderLoginForm();
  else renderRegisterForm();
}

function renderLoginForm() {
  document.getElementById('authForm').innerHTML = `
    <div id="authAlert"></div>
    <div class="form-group">
      <label>Email</label>
      <input class="form-input" id="loginEmail" type="email" placeholder="you@example.com">
    </div>
    <div class="form-group">
      <label>Пароль</label>
      <input class="form-input" id="loginPassword" type="password" placeholder="••••••••">
    </div>
    <button class="btn btn-primary btn-full" onclick="doLogin()">Войти в аккаунт</button>
    <div style="text-align:center;margin-top:18px;font-size:0.82rem;color:var(--text3)">
      Нет аккаунта? <span style="color:var(--accent);cursor:pointer;font-weight:500" onclick="switchAuthTab('register')">Зарегистрироваться</span>
    </div>`;
}

function renderRegisterForm() {
  document.getElementById('authForm').innerHTML = `
    <div id="authAlert"></div>
    <div class="form-group">
      <label>Имя пользователя</label>
      <input class="form-input" id="regUsername" placeholder="username">
    </div>
    <div class="form-group">
      <label>Email</label>
      <input class="form-input" id="regEmail" type="email" placeholder="you@example.com">
    </div>
    <div class="form-group">
      <label>Пароль</label>
      <input class="form-input" id="regPassword" type="password" placeholder="Минимум 6 символов">
    </div>
    <button class="btn btn-primary btn-full" onclick="doRegister()">Создать аккаунт</button>
    <div style="text-align:center;margin-top:18px;font-size:0.82rem;color:var(--text3)">
      Уже есть аккаунт? <span style="color:var(--accent);cursor:pointer;font-weight:500" onclick="switchAuthTab('login')">Войти</span>
    </div>`;
}

async function doLogin() {
  const email = document.getElementById('loginEmail')?.value.trim();
  const password = document.getElementById('loginPassword')?.value;
  const alertEl = document.getElementById('authAlert');

  if (!email || !password) {
    alertEl.innerHTML = '<div class="alert alert-error">⚠️ Заполните все поля</div>';
    return;
  }
  try {
    const data = await api.post('/auth/login', { email, password });
    setUser({ id: data.user_id, username: data.username }, data.token);
    await refreshCartCount();
    toast(`Добро пожаловать, ${data.username}!`, 'success');
    navigate('home');
  } catch (e) {
    alertEl.innerHTML = `<div class="alert alert-error">⚠️ ${e.message}</div>`;
  }
}

async function doRegister() {
  const username = document.getElementById('regUsername')?.value.trim();
  const email = document.getElementById('regEmail')?.value.trim();
  const password = document.getElementById('regPassword')?.value;
  const alertEl = document.getElementById('authAlert');

  if (!username || !email || !password) {
    alertEl.innerHTML = '<div class="alert alert-error">⚠️ Заполните все поля</div>';
    return;
  }
  if (password.length < 6) {
    alertEl.innerHTML = '<div class="alert alert-error">⚠️ Пароль минимум 6 символов</div>';
    return;
  }
  try {
    const data = await api.post('/auth/register', { username, email, password });
    setUser({ id: data.user_id, username: data.username }, data.token);
    await refreshCartCount();
    toast('Аккаунт создан!', 'success');
    navigate('home');
  } catch (e) {
    alertEl.innerHTML = `<div class="alert alert-error">⚠️ ${e.message}</div>`;
  }
}

// ── Init ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  renderNav();
  if (state.user) {
    await refreshCartCount();
  }
  navigate('home');
});
