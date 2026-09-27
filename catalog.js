const PRODUCTS_API = 'https://dummyjson.com/products?limit=0';
const CATEGORIES_API = 'https://dummyjson.com/products/category-list';
const ITEMS_PER_PAGE = 12;

let allProducts = [];
let displayedProducts = [];
let currentlyShown = 0;

const productGrid = document.getElementById('productGrid');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const noResultsMessage = document.getElementById('noResultsMessage');
const loadingIndicator = document.getElementById('loadingIndicator');
const globalError = document.getElementById('globalError');


/* Inisialisasi */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Auth Guard 
    if (!checkAuth()) return;

    // 2. Navbar
    renderNavbar();
    setupLogout();
    updateCartBadge();

    // 3. Ambil & render produk dari API
    fetchProducts();

    // 4. Load More (pagination)
    setupLoadMore();

    // 5. Bagian 2 dipanggil di sini juga, supaya semua inisialisasi terkumpul di satu tempat
    setupSearch();
    setupFilterAndSort();
    setupCartEvents();
    setupModalEvents();
});


/* Auth Guard */
function checkAuth() {
    const firstName = localStorage.getItem('userFirstName');
    if (!firstName) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}


/* Navbar */
function renderNavbar() {
    const firstName = localStorage.getItem('userFirstName') || 'Pengguna';
    document.getElementById('userName').textContent = firstName;
}

function setupLogout() {
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('userFirstName');
        localStorage.removeItem('userUsername');
        window.location.href = 'login.html';
    });
}


/* Fetch product*/
async function fetchProducts() {
    setLoading(true);
    hideGlobalError();

    try {
        const [productsRes, categoriesRes] = await Promise.all([
            fetch(PRODUCTS_API),
            fetch(CATEGORIES_API)
        ]);

        if (!productsRes.ok || !categoriesRes.ok) {
            throw new Error('Error: Periksa koneksi internet kamu dan coba lagi.');
        }

        const productsData = await productsRes.json();
        const categoriesData = await categoriesRes.json();

        allProducts = productsData.products || [];
        displayedProducts = [...allProducts];

        populateCategoryFilter(categoriesData);
        resetAndRender();

    } catch (error) {
        console.error(error);
        showGlobalError(error.message || 'Terjadi kesalahan saat mengambil data produk. Silakan coba lagi.');
    } finally {
        setLoading(false);
    }
}

function populateCategoryFilter(categories) {
    const select = document.getElementById('categoryFilter');
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = formatCategoryName(cat);
        select.appendChild(option);
    });
}

function formatCategoryName(slug) {
    return slug
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

function createProductCardHTML(product) {
    const hasDiscount = product.discountPercentage && product.discountPercentage > 0;
    const discountBadge = hasDiscount
        ? `<span class="product-discount-badge">-${Math.round(product.discountPercentage)}%</span>`
        : '';

    return `
        <div class="product-card" data-id="${product.id}">
            <div class="product-image-wrapper">
                ${discountBadge}
                <img src="${product.thumbnail}" alt="${escapeHTML(product.title)}" loading="lazy">
            </div>
            <div class="product-card-body">
                <span class="product-category-tag">${escapeHTML(product.category)}</span>
                <h3 class="product-title">${escapeHTML(product.title)}</h3>
                <div class="product-price-row">
                    <span class="product-price">$${product.price}</span>
                </div>
                <span class="product-rating">⭐ ${Number(product.rating).toFixed(1)}</span>
                <button type="button" class="btn-add-cart" data-id="${product.id}">+ Tambah ke Keranjang</button>
            </div>
        </div>
    `;
}

function escapeHTML(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function appendProductCards(products) {
    const html = products.map(createProductCardHTML).join('');
    productGrid.insertAdjacentHTML('beforeend', html);
}

/* Load More */

function resetAndRender() {
    productGrid.innerHTML = '';
    currentlyShown = 0;
    renderNextBatch();
}
function renderNextBatch() {
    if (displayedProducts.length === 0) {
        noResultsMessage.classList.remove('hidden');
    } else {
        noResultsMessage.classList.add('hidden');
    }

    const nextBatch = displayedProducts.slice(currentlyShown, currentlyShown + ITEMS_PER_PAGE);
    appendProductCards(nextBatch);
    currentlyShown += nextBatch.length;

    updateLoadMoreButton();
}

function updateLoadMoreButton() {
    const masihAdaSisa = currentlyShown < displayedProducts.length;
    loadMoreBtn.classList.toggle('hidden', !masihAdaSisa);
}

function setupLoadMore() {
    loadMoreBtn.addEventListener('click', renderNextBatch);
}


/* Loading dan error */
function setLoading(isLoading) {
    loadingIndicator.classList.toggle('hidden', !isLoading);
}

function showGlobalError(message) {
    globalError.textContent = message;
    globalError.classList.remove('hidden');
}

function hideGlobalError() {
    globalError.classList.add('hidden');
}


/* =========================================================================
   6. CART BADGE (helper kecil untuk Navbar — dipakai juga oleh Bagian 2)
   -------------------------------------------------------------------------
   Asumsi bentuk data di localStorage('cart'): array of
   { id, title, price, thumbnail, qty }
   Bagian 2 bebas menyesuaikan, yang penting panggil updateCartBadge()
   lagi setiap kali isi cart berubah (tambah/kurang/hapus item).
   ========================================================================= */
function updateCartBadge() {
    let cart = [];
    try {
        cart = JSON.parse(localStorage.getItem('cart')) || [];
    } catch (e) {
        cart = [];
    }
    const totalQty = cart.reduce((sum, item) => sum + (item.qty || 1), 0);
    document.getElementById('cartBadge').textContent = totalQty;
}


/* =========================================================================
   =========================================================================
   BAGIAN 2 — Dikerjakan oleh: [ISI NAMA TEMAN]

   Fitur yang perlu diisi di sini:
   - Pencarian Real-Time (Debounce & Closure)
   - Filter kategori & Sorting harga/rating (Functional Programming)
   - Keranjang Belanja (Local Storage CRUD)
   - Modal Detail Produk (Event Delegation)

   ---- KONTRAK: hal-hal yang SUDAH disiapkan Bagian 1 untuk kamu pakai ----
   Variabel:
     - allProducts        : semua produk asli dari API (jangan diubah)
     - displayedProducts  : produk yang lagi ditampilkan setelah difilter
     - currentlyShown     : jumlah produk yang sudah tampil di layar

   Fungsi:
     - resetAndRender()   : panggil ini SETELAH kamu mengubah
                             `displayedProducts`, biar grid dirender ulang
                             dari awal (pagination-nya ikut ke-reset juga)
     - updateCartBadge()  : panggil ini setiap kali isi cart berubah

   Elemen HTML yang sudah ada & siap dipasangi listener:
     - #searchInput            (input pencarian)
     - #categoryFilter         (<select>, sudah terisi kategori dari API)
     - #sortSelect             (<select>, opsi: price-asc/price-desc/rating-desc)
     - #productGrid            (parent untuk Event Delegation klik kartu/tombol cart)
       -> tiap kartu: .product-card[data-id]
       -> tiap tombol tambah: .btn-add-cart[data-id]
     - #cartIconWrapper        (klik untuk buka panel keranjang)
     - #cartBackdrop, #cartPanel, #cartItemsList, #cartTotal, #cartCloseBtn
     - #productModal, #modalBody, #modalCloseBtn

   Contoh pola filter + search + sort digabung (silakan dikembangkan):

     function applyFiltersAndSearch() {
         const keyword = searchInput.value.trim().toLowerCase();
         const kategori = categoryFilter.value;
         const urutan = sortSelect.value;

         let hasil = allProducts.filter(p =>
             p.title.toLowerCase().includes(keyword) ||
             p.category.toLowerCase().includes(keyword)
         );

         if (kategori !== 'all') {
             hasil = hasil.filter(p => p.category === kategori);
         }

         if (urutan === 'price-asc') hasil = [...hasil].sort((a, b) => a.price - b.price);
         if (urutan === 'price-desc') hasil = [...hasil].sort((a, b) => b.price - a.price);
         if (urutan === 'rating-desc') hasil = [...hasil].sort((a, b) => b.rating - a.rating);

         displayedProducts = hasil;
         resetAndRender();
     }
   ========================================================================= */

function setupSearch() {
    // TODO (Bagian 2): implementasi debounce pakai closure, lalu panggil
    // fungsi filter/search di atas setelah user berhenti mengetik.
}

function setupFilterAndSort() {
    // TODO (Bagian 2): tambahkan event listener 'change' pada
    // #categoryFilter dan #sortSelect.
}

function setupCartEvents() {
    // TODO (Bagian 2): pasang Event Delegation pada #productGrid untuk
    // menangkap klik tombol .btn-add-cart, lalu simpan/update ke
    // localStorage('cart') dan panggil updateCartBadge().
    // Pasang juga listener buka/tutup panel keranjang (#cartIconWrapper,
    // #cartCloseBtn, #cartBackdrop).
}

function setupModalEvents() {
    // TODO (Bagian 2): pasang Event Delegation pada #productGrid untuk
    // menangkap klik pada .product-card (selain tombol .btn-add-cart),
    // cari produknya lewat allProducts.find(p => p.id === id), lalu
    // tampilkan detailnya (stok, brand, deskripsi) ke #modalBody dan
    // buka #productModal. Jangan lupa listener untuk #modalCloseBtn.
}