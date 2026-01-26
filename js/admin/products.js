import { getFirebaseDatabase } from '../firebase-config.js';
import { ref, push, set, remove, onValue, get } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";
import { uploadAvatarDirect, getOptimizedImageUrl } from '../cloudinary-upload.js';
import { getFirebaseAuth } from '../firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

const db = getFirebaseDatabase();
const productsRef = ref(db, 'products');

let currentProducts = {};
let isInitialized = false;

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function renderTable(products) {
    const tableBody = document.getElementById('products-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = '';
    
    if (!products) {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-gray-500">No products found.</td></tr>';
        return;
    }

    Object.entries(products).forEach(([id, product]) => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors border-b border-slate-100 dark:border-border-dark';
        
        const imgUrl = product.image ? getOptimizedImageUrl(product.image, { width: 40, height: 40 }) : 'https://placehold.co/40';

        row.innerHTML = `
            <td class="px-6 py-4">
                <div class="w-10 h-10 bg-slate-100 dark:bg-white/5 rounded overflow-hidden">
                    <img src="${imgUrl}" class="w-full h-full object-cover">
                </div>
            </td>
            <td class="px-6 py-4 font-bold text-slate-900 dark:text-white">${product.name}</td>
            <td class="px-6 py-4 font-bold text-slate-700 dark:text-slate-300">${formatCurrency(product.price)}</td>
            <td class="px-6 py-4 text-slate-500 dark:text-slate-400">${product.brand || 'N/A'}</td>
            <td class="px-6 py-4 text-slate-500 dark:text-slate-400 capitalize">${product.gender || 'Unisex'}</td>
            <td class="px-6 py-4 text-center">
                 <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                    In Stock
                </span>
            </td>
            <td class="px-6 py-4 text-right">
                <button class="p-2 text-slate-400 hover:text-primary transition-colors btn-edit" data-id="${id}">
                    <span class="material-symbols-rounded text-[20px]">edit</span>
                </button>
                <button class="p-2 text-slate-400 hover:text-primary transition-colors btn-delete" data-id="${id}">
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
    const tableBody = document.getElementById('products-table-body');
    if (!tableBody) return; // Prevent collecting if tab is not active

    onValue(productsRef, (snapshot) => {
        currentProducts = snapshot.val();
        renderTable(currentProducts);
    }, (error) => {
        console.error('Error loading products:', error);
        if(tableBody) tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-red-500">Error: ${error.message}</td></tr>`;
    });
}

// Modal Handling
function openModal() {
    const modal = document.getElementById('product-modal');
    if(modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex'); // Ensure flex display
        // document.body.classList.add('overflow-hidden');
    }
}

function closeModal() {
    const modal = document.getElementById('product-modal');
    const form = document.getElementById('product-form');
    const previewDiv = document.getElementById('image-preview');
    
    if(modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        // document.body.classList.remove('overflow-hidden');
    }
    
    if(form) {
        form.reset();
        document.getElementById('product-id').value = '';
        document.getElementById('prod-image-url').value = '';
        if(previewDiv) previewDiv.innerHTML = '<span class="material-symbols-rounded text-slate-400">image</span>';
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

// Reload function: Re-binds events and re-renders
function reload() {
    console.log('Products Module: Reloading...');
    
    // 1. Re-bind static button events if elements exist
    const btnAdd = document.getElementById('btn-add-product');
    const btnClose = document.getElementById('btn-close-modal');
    const btnCancel = document.getElementById('btn-cancel');
    const fileInput = document.getElementById('prod-image-file');
    const form = document.getElementById('product-form');

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
