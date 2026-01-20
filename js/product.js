// Product Listing Page Logic for X-Sneaker
// Handles product loading, filtering, and rendering from Firebase

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

// Firebase config (same as auth.js)
const firebaseConfig = {
    apiKey: "AIzaSyBjCuKcQ5KKlR0gP96mCSPiSxM6l_F4C88",
    authDomain: "x-sneaker.firebaseapp.com",
    databaseURL: "https://x-sneaker-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "x-sneaker",
    storageBucket: "x-sneaker.firebasestorage.app",
    messagingSenderId: "1039080363999",
    appId: "1:1039080363999:web:7e50d81c2cd5f1e67be46f"
};

const app = initializeApp(firebaseConfig, 'product-app');
const database = getDatabase(app);

// Global state
let allProducts = [];
let allBrands = [];
let allCategories = [];
let currentFilters = {
    categories: [],
    brands: [],
    genders: [],
    sizes: [],
    priceMin: 0,
    priceMax: 999999999
};

// ============================================================================
// DATA LOADING
// ============================================================================

async function loadAllProducts() {
    try {
        const productsRef = ref(database, 'products');
        const snapshot = await get(productsRef);
        
        if (snapshot.exists()) {
            const productsData = snapshot.val();
            allProducts = Object.keys(productsData).map(key => ({
                id: key,
                ...productsData[key]
            }));
            console.log(`✅ Loaded ${allProducts.length} products from Firebase`);
            return allProducts;
        } else {
            console.warn('⚠️ No products found in Firebase');
            return [];
        }
    } catch (error) {
        console.error('❌ Error loading products:', error);
        return [];
    }
}

async function loadBrands() {
    try {
        const brandsRef = ref(database, 'brands');
        const snapshot = await get(brandsRef);
        
        if (snapshot.exists()) {
            const brandsData = snapshot.val();
            allBrands = Object.keys(brandsData).map(key => ({
                id: key,
                ...brandsData[key]
            }));
            return allBrands;
        }
        return [];
    } catch (error) {
        console.error('Error loading brands:', error);
        return [];
    }
}

async function loadCategories() {
    try {
        const categoriesRef = ref(database, 'categories');
        const snapshot = await get(categoriesRef);
        
        if (snapshot.exists()) {
            const categoriesData = snapshot.val();
            allCategories = Object.keys(categoriesData).map(key => ({
                id: key,
                ...categoriesData[key]
            }));
            return allCategories;
        }
        return [];
    } catch (error) {
        console.error('Error loading categories:', error);
        return [];
    }
}

// ============================================================================
// FILTERING
// ============================================================================

function applyFilters() {
    let filtered = [...allProducts];

    // Filter by category
    if (currentFilters.categories.length > 0) {
        filtered = filtered.filter(p => currentFilters.categories.includes(p.category));
    }

    // Filter by brand
    if (currentFilters.brands.length > 0) {
        filtered = filtered.filter(p => 
            currentFilters.brands.some(brand => 
                p.brand && p.brand.toLowerCase() === brand.toLowerCase()
            )
        );
    }

    // Filter by gender
    if (currentFilters.genders.length > 0) {
        filtered = filtered.filter(p => {
            // Unisex products appear in all gender filters
            if (p.gender === 'unisex') return true;
            return currentFilters.genders.includes(p.gender);
        });
    }

    // Filter by size
    if (currentFilters.sizes.length > 0) {
        filtered = filtered.filter(p => {
            if (!p.sizes) return false;
            return currentFilters.sizes.some(size => p.sizes.includes(parseInt(size)));
        });
    }

    // Filter by price range
    filtered = filtered.filter(p => 
        p.price >= currentFilters.priceMin && 
        p.price <= currentFilters.priceMax
    );

    return filtered;
}

function updateFilterFromCheckbox(type, value, isChecked) {
    if (isChecked) {
        if (!currentFilters[type].includes(value)) {
            currentFilters[type].push(value);
        }
    } else {
        currentFilters[type] = currentFilters[type].filter(v => v !== value);
    }
    
    const filtered = applyFilters();
    renderProducts(filtered);
}

// ============================================================================
// RENDERING
// ============================================================================

function renderProducts(products) {
    const container = document.getElementById('products-container');
    if (!container) return;

    if (products.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-20">
                <span class="material-symbols-outlined text-6xl text-gray-300 mb-4">shopping_bag</span>
                <p class="text-xl font-bold text-gray-500">Không tìm thấy sản phẩm nào</p>
                <p class="text-gray-400 mt-2">Thử điều chỉnh bộ lọc của bạn</p>
            </div>
        `;
        return;
    }

    container.innerHTML = products.map(product => {
        const mainImage = Array.isArray(product.images) && product.images.length > 0 
            ? product.images[0] 
            : 'https://via.placeholder.com/400';
        
        const discountPercent = product.discount || 0;
        const hasDiscount = discountPercent > 0;

        return `
            <div class="group relative flex flex-col">
                <div class="relative aspect-square bg-[#f3f3f3] dark:bg-[#2a1a1b] rounded-xl overflow-hidden mb-4">
                    <a href="Product-detail.html?id=${product.id}">
                        <img class="w-full h-full object-contain p-8 group-hover:scale-110 transition-transform duration-500" 
                             src="${mainImage}" 
                             alt="${product.name}"
                             onerror="this.src='https://via.placeholder.com/400?text=No+Image'"/>
                    </a>
                    ${hasDiscount ? `<div class="absolute top-4 left-4 bg-primary text-white text-[10px] font-bold px-2 py-1 rounded">${discountPercent}% OFF</div>` : ''}
                    ${product.isNew ? `<div class="absolute top-4 left-4 bg-black text-white text-[10px] font-bold px-2 py-1 rounded">MỚI</div>` : ''}
                    <button class="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black text-white text-xs font-bold px-6 py-3 rounded-lg opacity-0 group-hover:opacity-100 transition-all transform translate-y-4 group-hover:translate-y-0 w-[80%] whitespace-nowrap">
                        THÊM NHANH
                    </button>
                </div>
                <div class="flex flex-col gap-1">
                    <p class="text-gray-500 text-xs font-semibold uppercase tracking-wider">${product.brand || 'Brand'}</p>
                    <a href="Product-detail.html?id=${product.id}">
                        <h3 class="text-base font-bold text-gray-900 dark:text-white leading-tight hover:text-primary transition-colors">${product.name}</h3>
                    </a>
                    <div class="flex items-center gap-2 mt-1">
                        <p class="text-primary font-bold text-lg">${formatPrice(product.price)}</p>
                        ${hasDiscount && product.originalPrice ? `<span class="text-gray-400 line-through text-sm">${formatPrice(product.originalPrice)}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderLoadingSkeleton() {
    const container = document.getElementById('products-container');
    if (!container) return;

    const skeletonHTML = Array(8).fill(0).map(() => `
        <div class="flex flex-col">
            <div class="aspect-square bg-gray-200 dark:bg-gray-700 rounded-xl mb-4 skeleton"></div>
            <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2 skeleton"></div>
            <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-2 skeleton"></div>
            <div class="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/2 skeleton"></div>
        </div>
    `).join('');

    container.innerHTML = skeletonHTML;
}

// ============================================================================
// UTILITY
// ============================================================================

function formatPrice(price) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(price);
}

// ============================================================================
// INITIALIZATION
// ============================================================================

async function init() {
    console.log('🚀 Initializing product listing page...');
    
    // Show loading
    renderLoadingSkeleton();

    // Load data
    await Promise.all([
        loadAllProducts(),
        loadBrands(),
        loadCategories()
    ]);

    // Initial render
    renderProducts(allProducts);

    // Setup event listeners for filters
    setupFilterListeners();

    console.log('✅ Product listing page initialized');
}

function setupFilterListeners() {
    // Category filters
    document.querySelectorAll('input[data-filter="category"]').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            updateFilterFromCheckbox('categories', e.target.value, e.target.checked);
        });
    });

    // Brand filters
    document.querySelectorAll('input[data-filter="brand"]').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            updateFilterFromCheckbox('brands', e.target.value, e.target.checked);
        });
    });

    // Gender filters
    document.querySelectorAll('input[data-filter="gender"]').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            updateFilterFromCheckbox('genders', e.target.value, e.target.checked);
        });
    });

    // Size filters
    document.querySelectorAll('button[data-filter="size"]').forEach(button => {
        button.addEventListener('click', (e) => {
            const size = e.target.dataset.size;
            const isActive = e.target.classList.contains('border-primary');
            
            if (isActive) {
                e.target.classList.remove('border-primary', 'bg-primary/5', 'text-primary', 'font-bold');
                e.target.classList.add('border-gray-200', 'dark:border-gray-800');
                currentFilters.sizes = currentFilters.sizes.filter(s => s !== size);
            } else {
                e.target.classList.add('border-primary', 'bg-primary/5', 'text-primary', 'font-bold');
                e.target.classList.remove('border-gray-200', 'dark:border-gray-800');
                currentFilters.sizes.push(size);
            }
            
            const filtered = applyFilters();
            renderProducts(filtered);
        });
    });

    // Clear filters button
    const clearBtn = document.querySelector('button[data-action="clear-filters"]');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            // Reset all checkboxes
            document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
            
            // Reset size buttons
            document.querySelectorAll('button[data-filter="size"]').forEach(btn => {
                btn.classList.remove('border-primary', 'bg-primary/5', 'text-primary', 'font-bold');
                btn.classList.add('border-gray-200', 'dark:border-gray-800');
            });

            // Reset filters
            currentFilters = {
                categories: [],
                brands: [],
                genders: [],
                sizes: [],
                priceMin: 0,
                priceMax: 999999999
            };

            renderProducts(allProducts);
        });
    }
}

// Run on page load
document.addEventListener('DOMContentLoaded', init);

console.log('✅ Product module loaded');
