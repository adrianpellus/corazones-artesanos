const ADMIN_PASS = 'corazones2024';

// ─── AUTH ──────────────────────────────────────────────────────────────────
function checkLogin() {
  const pass = document.getElementById('login-pass').value;
  if (pass === ADMIN_PASS) {
    document.getElementById('login-overlay').style.display = 'none';
    document.getElementById('admin-panel').style.display = 'block';
    sessionStorage.setItem('admin_auth', '1');
    initAdmin();
  } else {
    document.getElementById('login-error').style.display = 'block';
    document.getElementById('login-pass').value = '';
    document.getElementById('login-pass').focus();
  }
}

function logout() {
  sessionStorage.removeItem('admin_auth');
  location.reload();
}

// ─── TABS ──────────────────────────────────────────────────────────────────
function showTab(name, btn) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  btn.classList.add('active');
}

// ─── PRODUCTS ──────────────────────────────────────────────────────────────
let adminProducts = [];
let pendingImages = []; // base64 images for current form
let editingIndex = -1;  // -1 = adding new, >= 0 = editing existing

async function loadAdminProducts() {
  const local = localStorage.getItem('productos');
  if (local) {
    try {
      adminProducts = JSON.parse(local);
      renderAdminList();
      return;
    } catch (e) {
      console.warn('Error parsing localStorage products');
    }
  }
  try {
    const res = await fetch('productos.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    adminProducts = await res.json();
  } catch (e) {
    console.warn('Could not load productos.json:', e);
    adminProducts = [];
  }
  renderAdminList();
}

function renderAdminList() {
  const el = document.getElementById('products-admin-list');
  if (!adminProducts.length) {
    el.innerHTML = '<p style="color:#7A6055; font-style:italic; text-align:center; padding:20px 0">No hay productos aún.</p>';
    return;
  }

  // Populate category filter
  const catFilter = document.getElementById('admin-cat-filter');
  if (catFilter) {
    const cats = loadCategorias();
    const current = catFilter.value;
    catFilter.innerHTML = '<option value="">Todas las categorías</option>' +
      cats.map(c => `<option value="${escapeAttr(c.id)}">${c.emoji} ${escapeHTML(c.nombre)}</option>`).join('');
    catFilter.value = current;
  }

  const search = (document.getElementById('admin-search')?.value || '').toLowerCase();
  const catVal = document.getElementById('admin-cat-filter')?.value || '';
  const visVal = document.getElementById('admin-vis-filter')?.value || '';

  const filtered = adminProducts.filter((p, i) => {
    if (search && !p.nombre.toLowerCase().includes(search)) return false;
    if (catVal && p.categoria !== catVal) return false;
    if (visVal === 'visible' && p.visible === false) return false;
    if (visVal === 'hidden' && p.visible !== false) return false;
    return true;
  });

  if (!filtered.length) {
    el.innerHTML = '<p style="color:#7A6055;font-style:italic;text-align:center;padding:20px 0">No hay productos con ese filtro.</p>';
    return;
  }

  el.innerHTML = '<div class="admin-product-list">' +
    filtered.map((p) => {
      const i = adminProducts.indexOf(p);
      const imgs = p.imagenes && p.imagenes.length ? p.imagenes : [p.imagen];
      const thumbs = imgs.slice(0, 2).map(src =>
        `<img src="${escapeAttr(src)}" alt="">`
      ).join('');
      const isHidden = p.visible === false;
      return `
      <div class="admin-product-item${isHidden ? ' product-hidden' : ''}">
        <div class="admin-product-thumbs">${thumbs}</div>
        <div class="admin-product-info">
          <strong>${escapeHTML(p.nombre)}</strong>
          <span>${p.precio} € · ${escapeHTML(p.categoria)} · ${escapeHTML(p.stock)}</span>
        </div>
        <div class="admin-product-actions">
          <button onclick="toggleVisible(${i})" class="btn-toggle-vis">${isHidden ? '👁 Mostrar' : '🙈 Ocultar'}</button>
          <button onclick="editProduct(${i})" class="btn-edit">✏️ Editar</button>
          <button onclick="deleteProduct(${i})" class="btn-delete">🗑 Borrar</button>
        </div>
      </div>`;
    }).join('') + '</div>';
}

function toggleVisible(index) {
  adminProducts[index].visible = adminProducts[index].visible === false ? true : false;
  saveProducts();
  showToast(adminProducts[index].visible === false ? 'Producto oculto 🙈' : 'Producto visible 👁️');
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function addProduct(e) {
  e.preventDefault();
  const categoria = document.getElementById('p-categoria').value;
  const existingImgs = editingIndex >= 0
    ? (adminProducts[editingIndex].imagenes || [adminProducts[editingIndex].imagen])
    : [];
  const imagenes = pendingImages.length
    ? [...existingImgs, ...pendingImages]
    : existingImgs.length ? existingImgs : [`img/${categoria}1.jpg`];

  const product = {
    id: editingIndex >= 0 ? adminProducts[editingIndex].id : Date.now(),
    nombre: document.getElementById('p-nombre').value.trim(),
    categoria,
    precio: parseFloat(document.getElementById('p-precio').value),
    precioMax: document.getElementById('p-precio-max').value ? parseFloat(document.getElementById('p-precio-max').value) : null,
    descripcion: document.getElementById('p-descripcion').value.trim(),
    stock: document.getElementById('p-stock').value.trim() || 'Disponible',
    imagen: imagenes[0],
    imagenes
  };

  if (editingIndex >= 0) {
    adminProducts[editingIndex] = product;
    showToast('Producto actualizado ✅');
  } else {
    adminProducts.unshift(product);
    showToast('Producto añadido ✅');
  }

  saveProducts();
  resetForm();
}

function editProduct(index) {
  const p = adminProducts[index];
  editingIndex = index;
  document.getElementById('p-nombre').value = p.nombre;
  document.getElementById('p-categoria').value = p.categoria;
  document.getElementById('p-precio').value = p.precio;
  document.getElementById('p-precio-max').value = p.precioMax || '';
  document.getElementById('p-descripcion').value = p.descripcion;
  document.getElementById('p-stock').value = p.stock;

  // Show existing images
  pendingImages = [];
  const imgs = p.imagenes && p.imagenes.length ? p.imagenes : [p.imagen];
  const container = document.getElementById('p-fotos-preview');
  container.innerHTML = imgs.map((src, i) => `
    <div class="foto-thumb">
      <img src="${src}">
      <button type="button" class="foto-thumb-remove" onclick="removeExistingFoto(${i})">✕</button>
    </div>
  `).join('');

  // Update form title and button
  document.querySelector('#product-form h3, .admin-card h3').textContent = 'Editando producto';
  document.querySelector('#product-form button[type="submit"]').textContent = '💾 Guardar cambios';
  document.getElementById('btn-cancelar').style.display = 'inline-flex';

  // Scroll to form
  document.getElementById('product-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function removeExistingFoto(index) {
  const p = adminProducts[editingIndex];
  const imgs = p.imagenes && p.imagenes.length ? [...p.imagenes] : [p.imagen];
  imgs.splice(index, 1);
  adminProducts[editingIndex] = { ...p, imagenes: imgs, imagen: imgs[0] || '' };
  editProduct(editingIndex); // re-render
}

function resetForm() {
  editingIndex = -1;
  pendingImages = [];
  document.getElementById('product-form').reset();
  document.getElementById('p-precio-max').value = '';
  document.getElementById('p-fotos-preview').innerHTML = '';
  document.querySelector('#product-form button[type="submit"]').textContent = 'Añadir producto';
  document.getElementById('btn-cancelar').style.display = 'none';
  const cards = document.querySelectorAll('.admin-card h3');
  if (cards[0]) cards[0].textContent = 'Añadir producto';
}

function deleteProduct(index) {
  if (!confirm(`¿Eliminar "${adminProducts[index].nombre}"?`)) return;
  adminProducts.splice(index, 1);
  if (editingIndex === index) resetForm();
  saveProducts();
  showToast('Producto eliminado');
}

function saveProducts() {
  localStorage.setItem('productos', JSON.stringify(adminProducts));
  renderAdminList();
}

function exportJSON() {
  const blob = new Blob([JSON.stringify(adminProducts, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'productos.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  showToast('JSON exportado ⬇️');
}

function openFotosPicker() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.multiple = true;
  input.onchange = () => {
    Array.from(input.files).forEach(file => {
      const reader = new FileReader();
      reader.onload = e => {
        pendingImages.push(e.target.result);
        renderFotosPreview();
      };
      reader.readAsDataURL(file);
    });
  };
  input.click();
}

function renderFotosPreview() {
  const container = document.getElementById('p-fotos-preview');
  container.innerHTML = pendingImages.map((src, i) => `
    <div class="foto-thumb">
      <img src="${src}">
      <button type="button" class="foto-thumb-remove" onclick="removeFoto(${i})">✕</button>
    </div>
  `).join('');
}

function removeFoto(index) {
  pendingImages.splice(index, 1);
  renderFotosPreview();
}

// ─── CATEGORÍAS ──────────────────────────────────────────────────────────────
const DEFAULT_CATEGORIAS = [
  { id: 'velas', nombre: 'Velas', emoji: '🕯️' },
  { id: 'crochet', nombre: 'Crochet', emoji: '🧶' }
];

function loadCategorias() {
  return JSON.parse(localStorage.getItem('categorias') || JSON.stringify(DEFAULT_CATEGORIAS));
}

function saveCategorias(cats) {
  localStorage.setItem('categorias', JSON.stringify(cats));
}

function renderCategoriasAdmin() {
  const cats = loadCategorias();
  const el = document.getElementById('categorias-list');
  if (!cats.length) {
    el.innerHTML = '<p style="color:#7A6055;font-style:italic">No hay categorías.</p>';
  } else {
    el.innerHTML = '<div class="admin-product-list">' +
      cats.map((c, i) => `
        <div class="admin-product-item">
          <span style="font-size:1.5rem">${c.emoji}</span>
          <div class="admin-product-info"><strong>${escapeHTML(c.nombre)}</strong></div>
          <button onclick="deleteCategoria(${i})" class="btn-delete" title="Eliminar">🗑️</button>
        </div>`
      ).join('') + '</div>';
  }
  populateCategoriaSelect(cats);
}

function populateCategoriaSelect(cats) {
  const sel = document.getElementById('p-categoria');
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = '<option value="">Selecciona...</option>' +
    cats.map(c => `<option value="${escapeAttr(c.id)}">${c.emoji} ${escapeHTML(c.nombre)}</option>`).join('');
  if (current) sel.value = current;
}

function addCategoria() {
  const nombre = document.getElementById('cat-nombre').value.trim();
  const emoji = document.getElementById('cat-emoji').value.trim() || '📦';
  if (!nombre) return;
  const cats = loadCategorias();
  const id = nombre.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  if (cats.find(c => c.id === id)) { showToast('Ya existe esa categoría'); return; }
  cats.push({ id, nombre, emoji });
  saveCategorias(cats);
  document.getElementById('cat-nombre').value = '';
  document.getElementById('cat-emoji').value = '';
  renderCategoriasAdmin();
  showToast('Categoría añadida ✅');
}

function deleteCategoria(index) {
  const cats = loadCategorias();
  if (!confirm(`¿Eliminar categoría "${cats[index].nombre}"?`)) return;
  cats.splice(index, 1);
  saveCategorias(cats);
  renderCategoriasAdmin();
  showToast('Categoría eliminada');
}

// ─── BANNER ──────────────────────────────────────────────────────────────────
const BANNER_COLORS = {
  terracota: { bg: '#C4602A', text: '#fff' },
  'verde-musgo': { bg: '#5C6B3A', text: '#fff' },
  'azul-oscuro': { bg: '#2C3E6B', text: '#fff' },
  granate: { bg: '#7B2D3A', text: '#fff' }
};

function loadBannerAdmin() {
  const config = JSON.parse(localStorage.getItem('banner_config') || '{}');
  if (config.texto) document.getElementById('banner-msg').value = config.texto;
  if (config.color) {
    const radio = document.querySelector(`input[name="banner-color"][value="${config.color}"]`);
    if (radio) radio.checked = true;
  }
  if (typeof config.activo !== 'undefined') {
    document.getElementById('banner-activo').checked = config.activo;
  }
}

function saveBanner() {
  const colorRadio = document.querySelector('input[name="banner-color"]:checked');
  const color = colorRadio ? colorRadio.value : 'terracota';
  const msgInput = document.getElementById('banner-msg').value.trim();
  const config = {
    activo: document.getElementById('banner-activo').checked,
    texto: msgInput || '🕯️ Nuevas velas de temporada disponibles — ¡Escríbeme!',
    color
  };
  localStorage.setItem('banner_config', JSON.stringify(config));

  // Update preview
  const colors = BANNER_COLORS[color] || BANNER_COLORS.terracota;
  const preview = document.getElementById('banner-preview');
  if (config.activo) {
    preview.style.display = 'block';
    preview.style.backgroundColor = colors.bg;
    preview.style.color = colors.text;
    preview.style.padding = '12px 20px';
    preview.style.borderRadius = '8px';
    preview.textContent = config.texto;
  } else {
    preview.style.display = 'none';
  }

  const msg = document.getElementById('banner-saved');
  msg.style.display = 'inline-block';
  setTimeout(() => { msg.style.display = 'none'; }, 2500);
}

// ─── SOBRE MÍ ────────────────────────────────────────────────────────────────
function loadSobreMiAdmin() {
  const texto = localStorage.getItem('sobre_mi_texto');
  const foto = localStorage.getItem('sobre_mi_foto');
  if (texto) {
    // Strip HTML tags for the textarea
    const plain = texto.replace(/<p>/g, '').replace(/<\/p>/g, '\n').replace(/<[^>]+>/g, '').trim();
    document.getElementById('sobre-mi-admin').value = plain;
  }
  if (foto) {
    const prev = document.getElementById('sobre-mi-foto-preview');
    prev.src = foto;
    prev.style.display = 'block';
  }
}

function saveSobreMi() {
  const texto = document.getElementById('sobre-mi-admin').value.trim();
  // Wrap each non-empty line in a <p> tag
  const html = texto.split('\n')
    .filter(l => l.trim())
    .map(l => `<p>${l.trim()}</p>`)
    .join('');
  localStorage.setItem('sobre_mi_texto', html);

  const foto = document.getElementById('sobre-mi-foto-preview');
  if (foto.style.display !== 'none' && foto.src && foto.src.startsWith('data:')) {
    localStorage.setItem('sobre_mi_foto', foto.src);
  }

  const msg = document.getElementById('sobre-mi-saved');
  msg.style.display = 'inline-block';
  setTimeout(() => { msg.style.display = 'none'; }, 2500);
}

function previewSobreMiFoto(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const img = document.getElementById('sobre-mi-foto-preview');
    img.src = e.target.result;
    img.style.display = 'block';
  };
  reader.readAsDataURL(file);
}

// ─── TOAST ───────────────────────────────────────────────────────────────────
function showToast(msg) {
  // Remove existing toast if any
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateY(8px)';
    t.style.transition = 'opacity 0.3s, transform 0.3s';
    setTimeout(() => t.remove(), 300);
  }, 2200);
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Auto-login if session exists
  if (sessionStorage.getItem('admin_auth') === '1') {
    document.getElementById('login-overlay').style.display = 'none';
    document.getElementById('admin-panel').style.display = 'block';
    initAdmin();
  }

  // Enter key on password field
  const passInput = document.getElementById('login-pass');
  if (passInput) {
    passInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') checkLogin();
    });
    passInput.focus();
  }
});

function initAdmin() {
  renderCategoriasAdmin();
  loadAdminProducts();
  loadBannerAdmin();
}

// ─── EXPORTAR DATOS ────────────────────────────────────────────────────────
function exportarDatos() {
  const productos = JSON.parse(localStorage.getItem('productos') || '[]');
  const categorias = JSON.parse(localStorage.getItem('categorias') || '[]');

  // Descargar productos.json
  const pBlob = new Blob([JSON.stringify(productos, null, 2)], { type: 'application/json' });
  const pUrl = URL.createObjectURL(pBlob);
  const pA = document.createElement('a');
  pA.href = pUrl;
  pA.download = 'productos.json';
  pA.click();
  URL.revokeObjectURL(pUrl);

  // Descargar categorias.json (pequeño retraso para no bloquear)
  setTimeout(() => {
    const cBlob = new Blob([JSON.stringify(categorias, null, 2)], { type: 'application/json' });
    const cUrl = URL.createObjectURL(cBlob);
    const cA = document.createElement('a');
    cA.href = cUrl;
    cA.download = 'categorias.json';
    cA.click();
    URL.revokeObjectURL(cUrl);
  }, 300);

  alert('✅ Descargados productos.json y categorias.json\n\nPasos para publicar:\n1. Reemplaza los archivos en la carpeta del proyecto\n2. Haz git add + commit + push\n3. Vercel desplegará automáticamente');
}
