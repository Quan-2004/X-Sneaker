import { getFirebaseDatabase } from '../firebase-config.js';
import { ref, push, set, remove, onValue, get } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";
import { uploadAvatarDirect, getOptimizedImageUrl } from '../cloudinary-upload.js';
import { getFirebaseAuth } from '../firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

const db = getFirebaseDatabase();
const productsRef = ref(db, 'products');

let currentProducts = {};
let filteredProducts = []; // For search/filter
let currentPage = 1;
const itemsPerPage = 10;
let isInitialized = false;

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

/**
 * Render Statistics
 */
function renderStats() {
    const products = Object.values(currentProducts);
    const total = products.length;
    const inStock = products.filter(p => (parseInt(p.quantity) || 0) > 10).length;
    const lowStock = products.filter(p => (parseInt(p.quantity) || 0) > 0 && (parseInt(p.quantity) || 0) <= 10).length;
    const outStock = products.filter(p => (parseInt(p.quantity) || 0) === 0).length;

    const setStat = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    setStat('stat-prod-total', total);
    setStat('stat-prod-instock', inStock);
    setStat('stat-prod-low', lowStock);
    setStat('stat-prod-out', outStock);
}

/**
 * Render Pagination
 */
function renderPagination() {
    const container = document.getElementById('products-pagination');
    if (!container) return;

    const totalItems = filteredProducts.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    let controlsHtml = '';
    
    // Prev Button
    controlsHtml += `
        <button onclick="window.productsModule.setPage(${currentPage - 1})" 
            class="p-2 rounded-lg border border-slate-200 dark:border-border-dark text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            ${currentPage === 1 ? 'disabled' : ''}>
            <span class="material-symbols-rounded text-[18px]">chevron_left</span>
        </button>
    `;

    // Pages
    for (let i = 1; i <= totalPages; i++) {
        if (i === currentPage) {
             controlsHtml += `<button class="w-9 h-9 rounded-lg bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20">${i}</button>`;
        } else {
             // Simple logic: show all pages or truncated. For now show all if < 7, else ellipsis logic could be added.
             // Showing limited pages for simplicity
             if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
                controlsHtml += `<button onclick="window.productsModule.setPage(${i})" class="w-9 h-9 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 text-sm font-medium transition-all">${i}</button>`;
             } else if (i === currentPage - 2 || i === currentPage + 2) {
                controlsHtml += `<span class="text-slate-400">...</span>`;
             }
        }
    }

    // Next Button
    controlsHtml += `
        <button onclick="window.productsModule.setPage(${currentPage + 1})" 
            class="p-2 rounded-lg border border-slate-200 dark:border-border-dark text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''}>
            <span class="material-symbols-rounded text-[18px]">chevron_right</span>
        </button>
    `;

    container.innerHTML = `
        <p class="text-sm text-slate-500 font-medium">Showing <span class="text-slate-900 dark:text-white font-bold">${totalItems > 0 ? startItem : 0}-${endItem}</span> of <span class="text-slate-900 dark:text-white font-bold">${totalItems}</span> results</p>
        <div class="flex items-center gap-2">
            ${controlsHtml}
        </div>
    `;
}

/**
 * Filter and Render
 */
function applyFilterAndRender() {
    const searchTerm = (document.getElementById('product-search-input')?.value || '').toLowerCase();
    
    // Filter
    filteredProducts = Object.entries(currentProducts).map(([id, p]) => ({ ...p, id })).filter(p => {
        return !searchTerm || 
               p.name.toLowerCase().includes(searchTerm) || 
               (p.brand && p.brand.toLowerCase().includes(searchTerm));
    });

    // Sort (optional, default newest)
    filteredProducts.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    // Pagination
    const start = (currentPage - 1) * itemsPerPage;
    const paginatedItems = filteredProducts.slice(start, start + itemsPerPage);

    renderStats(); // Update stats (global or filtered? Doing global inside renderStats reading currentProducts)
    renderTable(paginatedItems); // Render sliced items
    renderPagination();
}

function setPage(page) {
    if (page < 1 || page > Math.ceil(filteredProducts.length / itemsPerPage)) return;
    currentPage = page;
    applyFilterAndRender();
}

function renderTable(products) {
    const tableBody = document.getElementById('products-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = '';
    
    if (!products || products.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-slate-400">No products found.</td></tr>';
        return;
    }

    products.forEach(product => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors border-b border-slate-100 dark:border-border-dark';
        
        const imgUrl = product.image ? getOptimizedImageUrl(product.image, { width: 40, height: 40 }) : 'https://placehold.co/40';
        
        // Status Logic
        const qty = parseInt(product.quantity) || 0;
        let statusHtml = '';
        if (qty === 0) {
            statusHtml = '<span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20">Out of Stock</span>';
        } else if (qty <= 10) {
             statusHtml = '<span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-yellow-100 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-500/20">Low Stock</span>';
        } else {
             statusHtml = '<span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">In Stock</span>';
        }

        row.innerHTML = `
            <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-slate-100 dark:bg-white/5 rounded overflow-hidden flex-shrink-0">
                        <img src="${imgUrl}" class="w-full h-full object-cover">
                    </div>
                    <div>
                         <p class="font-bold text-slate-900 dark:text-white text-sm line-clamp-1">${product.name}</p>
                         <p class="text-xs text-slate-500 hidden sm:block">${product.style || ''}</p>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 text-xs font-mono text-slate-500 dark:text-slate-400">${product.id.substring(0,8)}...</td>
            <td class="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">${product.brand || 'N/A'}</td>
            <td class="px-6 py-4 font-bold text-slate-900 dark:text-white">${formatCurrency(product.price)}</td>
            <td class="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-300">${qty}</td>
            <td class="px-6 py-4 text-center">
                 ${statusHtml}
            </td>
            <td class="px-6 py-4 text-right">
                <button class="p-2 text-slate-400 hover:text-primary transition-colors btn-edit" data-id="${product.id}">
                    <span class="material-symbols-rounded text-[20px]">edit</span>
                </button>
                <button class="p-2 text-slate-400 hover:text-primary transition-colors btn-delete" data-id="${product.id}">
                    <span class="material-symbols-rounded text-[20px]">delete</span>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    // Add Listeners
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', () => openEditModal(btn.dataset.id));
    });

    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', () => deleteProduct(btn.dataset.id));
    });
}

function loadProducts() {
    onValue(productsRef, (snapshot) => {
        currentProducts = snapshot.val() || {};
        applyFilterAndRender();
    }, (error) => {
        console.error('Error loading products:', error);
        const tableBody = document.getElementById('products-table-body');
        if(tableBody) tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-red-500">Error: ${error.message}</td></tr>`;
    });
}

// Modal Handling
function openModal() {
    const modal = document.getElementById('product-modal');
    if(modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function closeModal() {
    const modal = document.getElementById('product-modal');
    const form = document.getElementById('product-form');
    const previewDiv = document.getElementById('image-preview');
    
    if(modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    
    if(form) {
        form.reset();
        document.getElementById('product-id').value = '';
        document.getElementById('prod-image-url').value = '';
        if(previewDiv) previewDiv.innerHTML = '<span class="material-symbols-rounded text-slate-400 text-4xl">image</span>';
        document.getElementById('modal-title').innerText = 'Add New Product';
    }
}

function openEditModal(id) {
    const product = currentProducts[id];
    if (!product) return;

    document.getElementById('product-id').value = id;
    document.getElementById('prod-name').value = product.name;
    document.getElementById('prod-brand').value = product.brand || 'Other';
    document.getElementById('prod-gender').value = product.gender || 'unisex';
    document.getElementById('prod-price').value = product.price;
    document.getElementById('prod-original-price').value = product.originalPrice || '';
    document.getElementById('prod-desc').value = product.description;
    document.getElementById('prod-style').value = product.style || '';
    document.getElementById('prod-color').value = product.color || '';
    document.getElementById('prod-quantity').value = product.quantity || 0;
    document.getElementById('prod-image-url').value = product.image || '';

    const previewDiv = document.getElementById('image-preview');
    if (previewDiv && product.image) {
        previewDiv.innerHTML = `<img src="${product.image}" class="w-full h-full object-cover">`;
    }

    document.getElementById('modal-title').innerText = 'Edit Product';
    openModal();
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const form = document.getElementById('product-form');
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="material-symbols-rounded animate-spin text-sm">rotate_right</span> Saving...';
    submitBtn.disabled = true;

    try {
        const id = document.getElementById('product-id').value;
        const fileInput = document.getElementById('prod-image-file');
        const file = fileInput ? fileInput.files[0] : null;
        let imageUrl = document.getElementById('prod-image-url').value;

        // Upload image if selected
        if (file) {
            const statusEl = document.getElementById('upload-status');
            if(statusEl) statusEl.innerText = 'Uploading image...';
            imageUrl = await uploadAvatarDirect(file);
            if(statusEl) statusEl.innerText = 'Upload complete!';
        }

        const productData = {
            name: document.getElementById('prod-name').value,
            brand: document.getElementById('prod-brand').value,
            gender: document.getElementById('prod-gender').value,
            price: parseInt(document.getElementById('prod-price').value),
            originalPrice: parseInt(document.getElementById('prod-original-price').value) || 0,
            description: document.getElementById('prod-desc').value,
            style: document.getElementById('prod-style').value,
            color: document.getElementById('prod-color').value,
            quantity: parseInt(document.getElementById('prod-quantity').value) || 0,
            image: imageUrl,
            updatedAt: new Date().toISOString()
        };

        if (id) {
            await set(ref(db, `products/${id}`), productData);
        } else {
            productData.createdAt = new Date().toISOString();
            await push(productsRef, productData);
        }

        closeModal();
        alert('Product saved successfully!');
        
    } catch (error) {
        console.error('Error saving product:', error);
        alert('Failed to save product: ' + error.message);
    } finally {
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
    }
}

async function deleteProduct(id) {
    if (confirm('Are you sure you want to delete this product?')) {
        try {
            await remove(ref(db, `products/${id}`));
        } catch (error) {
            console.error(error);
            alert('Failed to delete product');
        }
    }
}

/**
 * Parsed CSV Import
 */
async function importCSV(file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
        const text = e.target.result;
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        let successCount = 0;
        let failCount = 0;

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            
            const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            const product = {};
            
            headers.forEach((header, index) => {
                if(values[index]) product[header] = values[index];
            });

            if (product.name && product.price) {
                try {
                    // Normalize data
                    product.price = parseInt(product.price) || 0;
                    product.quantity = parseInt(product.quantity) || 0;
                    product.createdAt = new Date().toISOString();
                    product.updatedAt = new Date().toISOString();
                    
                    await push(productsRef, product);
                    successCount++;
                } catch (err) {
                    console.error('Row error:', err);
                    failCount++;
                }
            }
        }
        
        alert(`Import completed!\nSuccess: ${successCount}\nFailed: ${failCount}`);
        loadProducts(); // Refresh
    };
    reader.readAsText(file);
}

// Reload function: Re-binds events and re-renders
function reload() {
    console.log('Products Module: Reloading...');
    
    // 1. Re-bind static button events if elements exist
    const btnAdd = document.getElementById('btn-add-product');
    const btnClose = document.getElementById('btn-close-modal');
    const btnCancel = document.getElementById('btn-cancel');
    const fileInput = document.getElementById('prod-image-file');
    const form = document.getElementById('product-form');
    // New Elements
    const searchInput = document.getElementById('product-search-input');
    const btnImport = document.getElementById('btn-import-csv');
    const csvInput = document.getElementById('csv-file-input');

    if (btnAdd) {
        btnAdd.replaceWith(btnAdd.cloneNode(true)); // Remove old listeners
        document.getElementById('btn-add-product').addEventListener('click', openModal);
    }
    
    if (btnClose) btnClose.onclick = closeModal;
    if (btnCancel) btnCancel.onclick = closeModal;
    
    if (form) {
        form.removeEventListener('submit', handleFormSubmit); // Hard to remove with bound args, easier to clone or use onclick
        form.onsubmit = handleFormSubmit;
    }

    if (fileInput) {
        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            const previewDiv = document.getElementById('image-preview');
            if (file && previewDiv) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    previewDiv.innerHTML = `<img src="${e.target.result}" class="w-full h-full object-cover">`;
                };
                reader.readAsDataURL(file);
            }
        };
    }

    // New Event Bindings
    if (searchInput) {
        searchInput.oninput = () => {
             currentPage = 1; // Reset to page 1 on search
             applyFilterAndRender();
        };
    }

    if (btnImport && csvInput) {
        btnImport.onclick = () => csvInput.click();
        csvInput.onchange = (e) => {
            if(e.target.files[0]) importCSV(e.target.files[0]);
            e.target.value = ''; // Reset
        };
    }

    // 2. Load Data
    loadProducts();
}

function init() {
    if (isInitialized) return;
    
    const auth = getFirebaseAuth();
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log('Products: User authenticated');
            // We don't load data here immediately because tab might not be active
        }
    });

    isInitialized = true;
}

window.productsModule = {
    init,
    reload
};

// Auto init
init();
