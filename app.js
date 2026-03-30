const WA_NUMBER = '34655197603';

// ─── BANNER ──────────────────────────────────────────────────────────────────
const DEFAULT_BANNER = {
  activo: true,
  texto: '🕯️ Nuevas velas de temporada disponibles — ¡Escríbeme!',
  color: 'terracota'
};

const BANNER_COLORS = {
  terracota: { bg: '#C4602A', text: '#fff' },
  'verde-musgo': { bg: '#5C6B3A', text: '#fff' },
  'azul-oscuro': { bg: '#2C3E6B', text: '#fff' },
  granate: { bg: '#7B2D3A', text: '#fff' }
};

function initBanner() {
  const config = JSON.parse(localStorage.getItem('banner_config') || JSON.stringify(DEFAULT_BANNER));
  const banner = document.getElementById('banner');
  const bannerText = document.getElementById('banner-text');

  if (!config.activo) {
    banner.style.display = 'none';
    return;
  }

  const colors = BANNER_COLORS[config.color] || BANNER_COLORS.terracota;
  banner.style.display = 'flex';
  banner.style.backgroundColor = colors.bg;
  banner.style.color = colors.text;
  bannerText.textContent = config.texto;

  if (sessionStorage.getItem('banner_closed')) {
    banner.style.display = 'none';
  }
}

function closeBanner() {
  document.getElementById('banner').style.display = 'none';
  sessionStorage.setItem('banner_closed', '1');
}

// ─── PRODUCTS ────────────────────────────────────────────────────────────────
let allProducts = [];
let currentFilter = 'todo';

function getStockClass(stock) {
  const s = stock.toLowerCase();
  if (s.includes('disponible')) return 'stock-ok';
  if (s.includes('últim') || s.includes('ultim') || s.includes('pocas') || s.includes('solo')) return 'stock-low';
  return 'stock-order';
}

function getCategoriaLabel(catId) {
  const DEFAULT = [
    { id: 'velas', nombre: 'Velas', emoji: '🕯️' },
    { id: 'crochet', nombre: 'Crochet', emoji: '🧶' }
  ];
  const cats = JSON.parse(localStorage.getItem('categorias') || JSON.stringify(DEFAULT));
  const cat = cats.find(c => c.id === catId);
  return cat ? `${cat.emoji} ${cat.nombre}` : catId;
}

function renderProducts(products) {
  const grid = document.getElementById('products-grid');

  if (!products.length) {
    grid.innerHTML = '<p class="no-products">No hay productos en esta categoría todavía.</p>';
    return;
  }

  grid.innerHTML = products.map(p => {
    const imgs = (p.imagenes && p.imagenes.length) ? p.imagenes : [p.imagen];
    const hasMany = imgs.length > 1;
    const dots = hasMany ? `<div class="gallery-dots">${imgs.map((_, i) => `<span class="gallery-dot${i === 0 ? ' active' : ''}"></span>`).join('')}</div>` : '';
    const arrows = hasMany ? `
      <button class="gallery-prev" onclick="galleryPrev(this)" type="button">&#8249;</button>
      <button class="gallery-next" onclick="galleryNext(this)" type="button">&#8250;</button>` : '';
    return `
    <div class="product-card" data-category="${p.categoria}">
      <div class="product-img-wrap" data-imgs='${JSON.stringify(imgs).replace(/'/g, "&#39;")}' data-idx="0">
        <img src="${imgs[0]}" alt="${p.nombre}" loading="lazy">
        ${arrows}
        ${dots}
      </div>
      <div class="product-body">
        <span class="product-category">${getCategoriaLabel(p.categoria)}</span>
        <h3 class="product-name">${escapeHTML(p.nombre)}</h3>
        <p class="product-desc">${escapeHTML(p.descripcion)}</p>
        <div class="product-footer">
          <span class="product-price">${p.precioMax ? `${p.precio} € – ${p.precioMax} €` : `${p.precio} €`}</span>
          <span class="stock-badge ${getStockClass(p.stock)}">${escapeHTML(p.stock)}</span>
        </div>
        <a href="${buildWaLink(p)}" target="_blank" class="btn-wa-product">
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.535 5.858L0 24l6.335-1.508A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.003-1.367l-.36-.214-3.733.888.935-3.629-.234-.373A9.818 9.818 0 1112 21.818z"/></svg>
          Pedir por WhatsApp
        </a>
      </div>
    </div>
  `;
  }).join('');
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function encodeHTMLAttr(str) {
  return encodeURIComponent(String(str));
}

function buildWaLink(p) {
  const msg = encodeURIComponent(`Hola! Me interesa: ${p.nombre} (${p.precio}€). ¿Está disponible?`);
  return `https://wa.me/${WA_NUMBER}?text=${msg}`;
}

let currentSearch = '';

function getFilteredProducts() {
  let products = allProducts.filter(p => p.visible !== false);
  if (currentFilter !== 'todo') products = products.filter(p => p.categoria === currentFilter);
  if (currentSearch) {
    const q = currentSearch.toLowerCase();
    products = products.filter(p =>
      p.nombre.toLowerCase().includes(q) || (p.descripcion && p.descripcion.toLowerCase().includes(q))
    );
  }
  return products;
}

function filterProducts(cat, btn) {
  currentFilter = cat;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderProducts(getFilteredProducts());
}

function searchProducts(query) {
  currentSearch = query.trim();
  renderProducts(getFilteredProducts());
}

async function loadProducts() {
  // Try localStorage first (admin changes)
  const local = localStorage.getItem('productos');
  if (local) {
    try {
      allProducts = JSON.parse(local);
      loadFilters(allProducts);
      renderProducts(allProducts.filter(p => p.visible !== false));
      return;
    } catch (e) {
      console.warn('Error parsing localStorage products, falling back to JSON file');
    }
  }

  // Fallback to productos.json
  try {
    const res = await fetch('productos.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    allProducts = await res.json();
  } catch (e) {
    console.warn('Could not load productos.json:', e);
    allProducts = [];
  }
  loadFilters(allProducts);
  renderProducts(allProducts.filter(p => p.visible !== false));
}

// ─── FILTROS DINÁMICOS ────────────────────────────────────────────────────────
function loadFilters(products) {
  const DEFAULT_CATEGORIAS = [
    { id: 'velas', nombre: 'Velas', emoji: '🕯️' },
    { id: 'crochet', nombre: 'Crochet', emoji: '🧶' }
  ];
  const stored = JSON.parse(localStorage.getItem('categorias') || JSON.stringify(DEFAULT_CATEGORIAS));

  // Only show categories that have at least one product
  const usedIds = [...new Set(products.map(p => p.categoria))];
  const visible = stored.filter(c => usedIds.includes(c.id));

  const container = document.getElementById('filters-container');
  const extra = visible.map(c =>
    `<button class="filter-btn" data-filter="${c.id}" onclick="filterProducts('${c.id}', this)">${c.emoji} ${c.nombre}</button>`
  ).join('');
  container.innerHTML = `<button class="filter-btn active" data-filter="todo" onclick="filterProducts('todo', this)">Todo</button>${extra}`;
}

// ─── GALLERY NAV ─────────────────────────────────────────────────────────────
function galleryNav(btn, dir) {
  const wrap = btn.closest('.product-img-wrap');
  const imgs = JSON.parse(wrap.dataset.imgs);
  let idx = parseInt(wrap.dataset.idx) + dir;
  if (idx < 0) idx = imgs.length - 1;
  if (idx >= imgs.length) idx = 0;
  wrap.dataset.idx = idx;
  wrap.querySelector('img').src = imgs[idx];
  wrap.querySelectorAll('.gallery-dot').forEach((d, i) => d.classList.toggle('active', i === idx));
}
function galleryPrev(btn) { galleryNav(btn, -1); }
function galleryNext(btn) { galleryNav(btn, 1); }

// ─── SOBRE MÍ ────────────────────────────────────────────────────────────────
function loadSobreMi() {
  const texto = localStorage.getItem('sobre_mi_texto');
  const foto = localStorage.getItem('sobre_mi_foto');
  if (texto) {
    document.getElementById('sobre-mi-content').innerHTML = texto;
  }
  const imgEl = document.getElementById('sobre-mi-img');
  if (foto && imgEl) {
    imgEl.src = foto;
  }
}

// ─── HAMBURGER MENU ───────────────────────────────────────────────────────────
function toggleMenu() {
  const menu = document.getElementById('mobile-menu');
  const btn = document.getElementById('hamburger');
  if (!menu || !btn) return;
  const isOpen = menu.classList.toggle('open');
  btn.classList.toggle('open', isOpen);
  btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  menu.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
}

document.addEventListener('DOMContentLoaded', () => {
  // Close mobile menu on link click
  document.querySelectorAll('.mobile-menu-link').forEach(l => l.addEventListener('click', () => {
    const menu = document.getElementById('mobile-menu');
    const btn = document.getElementById('hamburger');
    if (menu) { menu.classList.remove('open'); menu.setAttribute('aria-hidden', 'true'); }
    if (btn) { btn.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); }
  }));
});

// ─── INIT ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initBanner();
  loadProducts();
  loadSobreMi();
});
