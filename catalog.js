const PRODUCTS_API = "https://dummyjson.com/products?limit=0";
const CATEGORIES_API = "https://dummyjson.com/products/category-list";
const ITEMS_PER_PAGE = 12;

let allProducts = [];
let displayedProducts = [];
let currentlyShown = 0;

const productGrid = document.getElementById("productGrid");
const loadMoreBtn = document.getElementById("loadMoreBtn");
const noResultsMessage = document.getElementById("noResultsMessage");
const loadingIndicator = document.getElementById("loadingIndicator");
const globalError = document.getElementById("globalError");

/* Inisialisasi */
document.addEventListener("DOMContentLoaded", () => {
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
    const firstName = localStorage.getItem("userFirstName");
    if (!firstName) {
        window.location.href = "login.html";
        return false;
    }
    return true;
}

/* Navbar */
function renderNavbar() {
    const firstName = localStorage.getItem("userFirstName") || "Pengguna";
    document.getElementById("userName").textContent = firstName;
}

function setupLogout() {
    document.getElementById("logoutBtn").addEventListener("click", () => {
        localStorage.removeItem("userFirstName");
        localStorage.removeItem("userUsername");
        window.location.href = "login.html";
    });
}

/* Fetch product*/
async function fetchProducts() {
    setLoading(true);
    hideGlobalError();

    try {
        const [productsRes, categoriesRes] = await Promise.all([fetch(PRODUCTS_API), fetch(CATEGORIES_API)]);

        if (!productsRes.ok || !categoriesRes.ok) {
            throw new Error("Error: Periksa koneksi internet kamu dan coba lagi.");
        }

        const productsData = await productsRes.json();
        const categoriesData = await categoriesRes.json();

        allProducts = productsData.products || [];
        displayedProducts = [...allProducts];

        populateCategoryFilter(categoriesData);
        resetAndRender();
    } catch (error) {
        console.error(error);
        showGlobalError(error.message || "Terjadi kesalahan saat mengambil data produk. Silakan coba lagi.");
    } finally {
        setLoading(false);
    }
}

function populateCategoryFilter(categories) {
    const select = document.getElementById("categoryFilter");
    categories.forEach(cat => {
        const option = document.createElement("option");
        option.value = cat;
        option.textContent = formatCategoryName(cat);
        select.appendChild(option);
    });
}

function formatCategoryName(slug) {
    return slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function createProductCardHTML(product) {
    const hasDiscount = product.discountPercentage && product.discountPercentage > 0;
    const discountBadge = hasDiscount
        ? `<span class="product-discount-badge">-${Math.round(product.discountPercentage)}%</span>`
        : "";

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
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function appendProductCards(products) {
    const html = products.map(createProductCardHTML).join("");
    productGrid.insertAdjacentHTML("beforeend", html);
}

/* Load More */

function resetAndRender() {
    productGrid.innerHTML = "";
    currentlyShown = 0;
    renderNextBatch();
}
function renderNextBatch() {
    if (displayedProducts.length === 0) {
        noResultsMessage.classList.remove("hidden");
    } else {
        noResultsMessage.classList.add("hidden");
    }

    const nextBatch = displayedProducts.slice(currentlyShown, currentlyShown + ITEMS_PER_PAGE);
    appendProductCards(nextBatch);
    currentlyShown += nextBatch.length;

    updateLoadMoreButton();
}

function updateLoadMoreButton() {
    const masihAdaSisa = currentlyShown < displayedProducts.length;
    loadMoreBtn.classList.toggle("hidden", !masihAdaSisa);
}

function setupLoadMore() {
    loadMoreBtn.addEventListener("click", renderNextBatch);
}

/* Loading dan error */
function setLoading(isLoading) {
    loadingIndicator.classList.toggle("hidden", !isLoading);
}

function showGlobalError(message) {
    globalError.textContent = message;
    globalError.classList.remove("hidden");
}

function hideGlobalError() {
    globalError.classList.add("hidden");
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
        cart = JSON.parse(localStorage.getItem("cart")) || [];
    } catch (e) {
        cart = [];
    }
    const totalQty = cart.reduce((sum, item) => sum + (item.qty || 1), 0);
    document.getElementById("cartBadge").textContent = totalQty;
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

// >>> TAMBAHAN ANGGOTA 3 (mulai dari sini sampai akhir file) >>>
/* =========================================================================
   BAGIAN 3 — Dikerjakan oleh: Anggota 3
   Fitur: Pencarian (Debounce & Closure), Filter & Sort, Keranjang (CRUD),
   Modal Detail Produk (Event Delegation)
   ========================================================================= */

const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const sortSelect = document.getElementById("sortSelect");

const cartIconWrapper = document.getElementById("cartIconWrapper");
const cartBackdrop = document.getElementById("cartBackdrop");
const cartPanel = document.getElementById("cartPanel");
const cartCloseBtn = document.getElementById("cartCloseBtn");
const cartItemsList = document.getElementById("cartItemsList");
const cartTotal = document.getElementById("cartTotal");

const productModal = document.getElementById("productModal");
const modalBody = document.getElementById("modalBody");
const modalCloseBtn = document.getElementById("modalCloseBtn");

/* ---------- Debounce (memanfaatkan Closure) ---------- */
function debounce(fn, delay = 400) {
    let timeoutId; // disimpan lewat closure, bertahan antar pemanggilan
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
}

/* ---------- Search + Filter + Sort (Functional Programming) ---------- */
function applyFiltersAndSearch() {
    const keyword = searchInput.value.trim().toLowerCase();
    const kategori = categoryFilter.value;
    const urutan = sortSelect.value;

    let hasil = allProducts.filter(
        p => p.title.toLowerCase().includes(keyword) || p.category.toLowerCase().includes(keyword),
    );

    if (kategori !== "all") {
        hasil = hasil.filter(p => p.category === kategori);
    }

    if (urutan === "price-asc") hasil = [...hasil].sort((a, b) => a.price - b.price);
    if (urutan === "price-desc") hasil = [...hasil].sort((a, b) => b.price - a.price);
    if (urutan === "rating-desc") hasil = [...hasil].sort((a, b) => b.rating - a.rating);

    displayedProducts = hasil;
    resetAndRender();
}

const debouncedFilter = debounce(applyFiltersAndSearch, 400);

function setupSearch() {
    // Debounce: baru memicu filter setelah user berhenti mengetik 400ms
    searchInput.addEventListener("input", debouncedFilter);
}

function setupFilterAndSort() {
    categoryFilter.addEventListener("change", applyFiltersAndSearch);
    sortSelect.addEventListener("change", applyFiltersAndSearch);
}

/* ---------- Keranjang Belanja (Local Storage CRUD) ---------- */
function getCart() {
    try {
        return JSON.parse(localStorage.getItem("cart")) || [];
    } catch (e) {
        return [];
    }
}

function saveCart(cart) {
    localStorage.setItem("cart", JSON.stringify(cart));
    updateCartBadge();
    renderCartPanel();
}

function addToCart(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    const cart = getCart();
    const existing = cart.find(item => item.id === productId);

    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({
            id: product.id,
            title: product.title,
            price: product.price,
            thumbnail: product.thumbnail,
            qty: 1,
        });
    }

    saveCart(cart);
}

function updateCartItemQty(productId, delta) {
    let cart = getCart();
    const item = cart.find(i => i.id === productId);
    if (!item) return;

    item.qty += delta;
    if (item.qty <= 0) {
        cart = cart.filter(i => i.id !== productId); // Delete otomatis kalau qty habis
    }
    saveCart(cart);
}

function removeFromCart(productId) {
    const cart = getCart().filter(i => i.id !== productId);
    saveCart(cart);
}

function renderCartPanel() {
    const cart = getCart();

    if (cart.length === 0) {
        cartItemsList.innerHTML = '<p style="text-align:center;color:#888;padding:20px 0;">Keranjang masih kosong.</p>';
        cartTotal.textContent = "$0";
        return;
    }

    cartItemsList.innerHTML = cart
        .map(
            item => `
        <div class="cart-item" data-id="${item.id}" style="display:flex;gap:10px;align-items:center;background:#fff;border-radius:8px;padding:8px;">
            <img src="${item.thumbnail}" alt="${escapeHTML(item.title)}" style="width:48px;height:48px;object-fit:cover;border-radius:6px;flex-shrink:0;">
            <div style="flex:1;min-width:0;">
                <p style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHTML(item.title)}</p>
                <p style="font-size:12px;color:#555;">$${item.price} x ${item.qty}</p>
            </div>
            <div style="display:flex;align-items:center;gap:4px;">
                <button type="button" class="btn-cart-decrease" data-id="${item.id}" style="width:22px;height:22px;border-radius:6px;border:1px solid #d1d5db;background:#fff;cursor:pointer;">-</button>
                <span style="min-width:16px;text-align:center;font-size:13px;">${item.qty}</span>
                <button type="button" class="btn-cart-increase" data-id="${item.id}" style="width:22px;height:22px;border-radius:6px;border:1px solid #d1d5db;background:#fff;cursor:pointer;">+</button>
                <button type="button" class="btn-cart-remove" data-id="${item.id}" style="color:#dc2626;margin-left:6px;background:none;border:none;font-size:16px;cursor:pointer;">&times;</button>
            </div>
        </div>
    `,
        )
        .join("");

    const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    cartTotal.textContent = `$${total.toFixed(2)}`;
}

function openCartPanel() {
    cartBackdrop.classList.remove("hidden");
    cartPanel.classList.remove("hidden");
}

function closeCartPanel() {
    cartBackdrop.classList.add("hidden");
    cartPanel.classList.add("hidden");
}

function setupCartEvents() {
    // Event Delegation: satu listener di parent #productGrid,
    // menangkap klik tombol .btn-add-cart di kartu manapun.
    productGrid.addEventListener("click", e => {
        const addBtn = e.target.closest(".btn-add-cart");
        if (!addBtn) return;
        addToCart(Number(addBtn.dataset.id));
    });

    cartIconWrapper.addEventListener("click", () => {
        renderCartPanel();
        openCartPanel();
    });
    cartCloseBtn.addEventListener("click", closeCartPanel);
    cartBackdrop.addEventListener("click", closeCartPanel);

    // Event Delegation juga untuk tombol +/- dan hapus di dalam panel keranjang
    cartItemsList.addEventListener("click", e => {
        const incBtn = e.target.closest(".btn-cart-increase");
        const decBtn = e.target.closest(".btn-cart-decrease");
        const rmBtn = e.target.closest(".btn-cart-remove");

        if (incBtn) updateCartItemQty(Number(incBtn.dataset.id), 1);
        if (decBtn) updateCartItemQty(Number(decBtn.dataset.id), -1);
        if (rmBtn) removeFromCart(Number(rmBtn.dataset.id));
    });

    renderCartPanel();
}

/* ---------- Modal Detail Produk (Event Delegation) ---------- */
function renderModalContent(product) {
    modalBody.innerHTML = `
        <img src="${product.thumbnail}" alt="${escapeHTML(product.title)}" style="width:100%;max-height:220px;object-fit:cover;border-radius:8px;margin-bottom:14px;">
        <span class="product-category-tag">${escapeHTML(product.category)}</span>
        <h2 style="margin:10px 0 6px;">${escapeHTML(product.title)}</h2>
        <p style="font-weight:700;font-size:18px;margin-bottom:8px;">$${product.price}</p>
        <p style="margin-bottom:6px;"><strong>Brand:</strong> ${escapeHTML(product.brand || "-")}</p>
        <p style="margin-bottom:6px;"><strong>Stok:</strong> ${product.stock}</p>
        <p style="margin-bottom:6px;"><strong>Rating:</strong> ⭐ ${Number(product.rating).toFixed(1)}</p>
        <p style="margin-top:10px;line-height:1.5;color:#444;">${escapeHTML(product.description)}</p>
        <button type="button" class="btn-add-cart" data-id="${product.id}" style="margin-top:16px;width:100%;">+ Tambah ke Keranjang</button>
    `;
}

function openModal() {
    productModal.classList.remove("hidden");
}

function closeModal() {
    productModal.classList.add("hidden");
}

function setupModalEvents() {
    // Event Delegation: klik kartu (selain tombol tambah) buka modal detail
    productGrid.addEventListener("click", e => {
        if (e.target.closest(".btn-add-cart")) return; // biar tidak dobel sama setupCartEvents

        const card = e.target.closest(".product-card");
        if (!card) return;

        const product = allProducts.find(p => p.id === Number(card.dataset.id));
        if (!product) return;

        renderModalContent(product);
        openModal();
    });

    modalCloseBtn.addEventListener("click", closeModal);

    // Tombol "+ Tambah ke Keranjang" di dalam modal juga didelegasikan
    modalBody.addEventListener("click", e => {
        const addBtn = e.target.closest(".btn-add-cart");
        if (!addBtn) return;
        addToCart(Number(addBtn.dataset.id));
        closeModal();
    });
}
