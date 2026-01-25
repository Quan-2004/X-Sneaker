import { getFirebaseDatabase } from '../firebase-config.js';
import { ref, push, set, remove, onValue, get } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";
import { uploadAvatarDirect, getOptimizedImageUrl } from '../cloudinary-upload.js';

const db = getFirebaseDatabase();
const productsRef = ref(db, 'products');

// DOM Elements
const tableBody = document.getElementById('products-table-body');
const modal = document.getElementById('product-modal');
const form = document.getElementById('product-form');
const btnAdd = document.getElementById('btn-add-product');
const btnClose = document.getElementById('btn-close-modal');
const btnCancel = document.getElementById('btn-cancel');
const fileInput = document.getElementById('prod-image-file');
const previewDiv = document.getElementById('image-preview');

let currentProducts = {};

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

// 1. Render Table
function renderTable(products) {
    tableBody.innerHTML = '';
    
    if (!products) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-gray-500">No products found.</td></tr>';
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
            <td class="px-6 py-4 text-right">
                <button class="p-2 text-slate-400 hover:text-primary transition-colors btn-edit" data-id="${id}">
                    <span class="material-symbols-outlined text-[20px]">edit_note</span>
                </button>
                <button class="p-2 text-slate-400 hover:text-primary transition-colors btn-delete" data-id="${id}">
                    <span class="material-symbols-outlined text-[20px]">delete</span>
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

import { getFirebaseAuth } from '../firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

// ...

function initProducts() {
    const auth = getFirebaseAuth();
    onAuthStateChanged(auth, (user) => {
        if (user) {
            onValue(productsRef, (snapshot) => {
                currentProducts = snapshot.val();
                renderTable(currentProducts);
            }, (error) => {
                console.error('Error loading products:', error);
                tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-red-500">Error: ${error.message}</td></tr>`;
            });
        }
    });
}

// 3. Modal Handling
function openModal() {
    modal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
}

function closeModal() {
    modal.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
    form.reset();
    document.getElementById('product-id').value = '';
    document.getElementById('prod-image-url').value = '';
    previewDiv.innerHTML = '<span class="material-symbols-outlined text-gray-400">image</span>';
    document.getElementById('modal-title').innerText = 'Add New Product';
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

    if (product.image) {
        previewDiv.innerHTML = `<img src="${product.image}" class="w-full h-full object-cover">`;
    }

    document.getElementById('modal-title').innerText = 'Edit Product';
    openModal();
}

// 4. Form Submission
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm">rotate_right</span> Saving...';
    submitBtn.disabled = true;

    try {
        const id = document.getElementById('product-id').value;
        const file = fileInput.files[0];
        let imageUrl = document.getElementById('prod-image-url').value;

        // Upload image if selected
        if (file) {
            document.getElementById('upload-status').innerText = 'Uploading image...';
            imageUrl = await uploadAvatarDirect(file);
            document.getElementById('upload-status').innerText = 'Upload complete!';
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
            // Update
            await set(ref(db, `products/${id}`), productData); // Use set to overwrite/merge logic if needed, actually update is safer but set works for full object replacement
        } else {
            // Create
            productData.createdAt = new Date().toISOString();
            await push(productsRef, productData);
        }

        closeModal();
        // Toast success?
        
    } catch (error) {
        console.error('Error saving product:', error);
        alert('Failed to save product: ' + error.message);
    } finally {
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
    }
});

// Delete
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

// Event Listeners
btnAdd.addEventListener('click', openModal);
btnClose.addEventListener('click', closeModal);
btnCancel.addEventListener('click', closeModal);

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            previewDiv.innerHTML = `<img src="${e.target.result}" class="w-full h-full object-cover opacity-50">`;
        };
        reader.readAsDataURL(file);
    }
});

// Initialize
initProducts();
console.log('Product Module Loaded');
