// Home Page Products Module for X-Sneaker
// Handles dynamic product loading for Flash Sale, Best Sellers, and New Arrivals

import { getFirebaseDatabase } from './firebase-config.js';
import { ref, get, query, orderByChild, limitToFirst } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

// Get Firebase database instance
const database = getFirebaseDatabase();

// ============================================================================
// DATA LOADING
// ============================================================================

/**
 * Load Flash Sale products (products with discounts)
 * @param {number} limit - Maximum number of products to load
 * @returns {Promise<Array>} Array of flash sale products
 */
async function loadFlashSaleProducts(limit = 4) {
    try {
        const productsRef = ref(database, 'products');
        const snapshot = await get(productsRef);
        
        if (snapshot.exists()) {
            const productsData = snapshot.val();
            const flashSaleProducts = Object.keys(productsData)
                .map(key => ({ id: key, ...productsData[key] }))
                .filter(product => {
                    // Flash sale: products with discount > 0 or isFlashSale flag
                    return (product.discount && product.discount > 0) || product.isFlashSale;
                })
                .sort((a, b) => (b.discount || 0) - (a.discount || 0)) // Sort by discount descending
                .slice(0, limit);
            
            console.log(`✅ Loaded ${flashSaleProducts.length} flash sale products`);
            return flashSaleProducts;
        }
        
        return [];
    } catch (error) {
        console.error('❌ Error loading flash sale products:', error);
        return [];
    }
}

/**
 * Load Best Seller products
 * @param {number} limit - Maximum number of products to load
 * @returns {Promise<Array>} Array of best seller products
 */
async function loadBestSellers(limit = 8) {
    try {
        const productsRef = ref(database, 'products');
        const snapshot = await get(productsRef);
        
        if (snapshot.exists()) {
            const productsData = snapshot.val();
            const bestSellers = Object.keys(productsData)
                .map(key => ({ id: key, ...productsData[key] }))
                .filter(product => product.isBestSeller || product.salesCount > 0)
                .sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0)) // Sort by sales
                .slice(0, limit);
            
            console.log(`✅ Loaded ${bestSellers.length} best seller products`);
            return bestSellers;
        }
        
        return [];
    } catch (error) {
        console.error('❌ Error loading best sellers:', error);
        return [];
    }
}

/**
 * Load New Arrival products
 * @param {number} limit - Maximum number of products to load
 * @returns {Promise<Array>} Array of new arrival products
 */
async function loadNewArrivals(limit = 8) {
    try {
        const productsRef = ref(database, 'products');
        const snapshot = await get(productsRef);
        
        if (snapshot.exists()) {
            const productsData = snapshot.val();
            const newArrivals = Object.keys(productsData)
                .map(key => ({ id: key, ...productsData[key] }))
                .filter(product => product.isNew)
                .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)) // Sort by creation date
                .slice(0, limit);
            
            console.log(`✅ Loaded ${newArrivals.length} new arrival products`);
            return newArrivals;
        }
        
        return [];
    } catch (error) {
        console.error('❌ Error loading new arrivals:', error);
        return [];
    }
}

// ============================================================================
// RENDERING
// ============================================================================

/**
 * Format price in Vietnamese currency
 */
function formatPrice(price) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(price);
}

/**
 * Render Flash Sale products
 */
function renderFlashSale(products) {
    const container = document.getElementById('flash-sale-products');
    if (!container) return;

    if (products.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-12">
                <p class="text-gray-500 font-medium">Chưa có sản phẩm flash sale</p>
            </div>
        `;
        return;
    }

    container.innerHTML = products.map(product => {
        const mainImage = Array.isArray(product.images) && product.images.length > 0
            ? product.images[0]
            : 'https://via.placeholder.com/400?text=No+Image';
        
        const discountPercent = product.discount || 0;
        const originalPrice = product.originalPrice || (product.price / (1 - discountPercent / 100));

        return `
            <div class="group bg-white dark:bg-background-dark rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-transparent hover:border-primary/20">
                <div class="relative aspect-square bg-gray-100 overflow-hidden">
                    <div class="absolute top-4 left-4 z-10 bg-primary text-white text-[10px] font-bold px-2 py-1 rounded">
                        ${discountPercent}% OFF
                    </div>
                    <a href="Product-detail.html?id=${product.id}">
                        <img class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                             src="${mainImage}"
                             alt="${product.name}"
                             onerror="this.src='https://via.placeholder.com/400?text=No+Image'"/>
                    </a>
                </div>
                <div class="p-5">
                    <p class="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">
                        ${product.brand || product.category || 'Product'}
                    </p>
                    <a href="Product-detail.html?id=${product.id}">
                        <h3 class="text-lg font-bold leading-tight mb-2 dark:text-white hover:text-primary transition-colors">
                            ${product.name}
                        </h3>
                    </a>
                    <div class="flex items-center gap-3">
                        <span class="text-primary text-xl font-black">${formatPrice(product.price)}</span>
                        ${discountPercent > 0 ? `<span class="text-gray-400 line-through text-sm font-medium">${formatPrice(originalPrice)}</span>` : ''}
                    </div>
                    <button class="w-full mt-4 bg-black dark:bg-primary py-3 text-white text-sm font-bold rounded-lg hover:bg-primary transition-colors flex items-center justify-center gap-2">
                        <span class="material-symbols-outlined text-sm">shopping_bag</span>
                        Thêm vào giỏ
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Render Best Sellers products
 */
function renderBestSellers(products) {
    const container = document.getElementById('best-sellers-products');
    if (!container) return;

    if (products.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-12">
                <p class="text-gray-500 font-medium">Chưa có sản phẩm bán chạy</p>
            </div>
        `;
        return;
    }

    container.innerHTML = products.map(product => {
        const mainImage = Array.isArray(product.images) && product.images.length > 0
            ? product.images[0]
            : 'https://via.placeholder.com/400?text=No+Image';

        return `
            <div class="group relative flex flex-col">
                <div class="relative aspect-square bg-[#f3f3f3] dark:bg-[#2a1a1b] rounded-xl overflow-hidden mb-4">
                    <a href="Product-detail.html?id=${product.id}">
                        <img class="w-full h-full object-contain p-8 group-hover:scale-110 transition-transform duration-500"
                             src="${mainImage}"
                             alt="${product.name}"
                             onerror="this.src='https://via.placeholder.com/400?text=No+Image'"/>
                    </a>
                    ${product.isNew ? '<div class="absolute top-4 left-4 bg-black text-white text-[10px] font-bold px-2 py-1 rounded">MỚI</div>' : ''}
                    ${product.isBestSeller ? '<div class="absolute top-4 right-4 bg-green-600 text-white text-[10px] font-bold px-2 py-1 rounded">BÁN CHẠY</div>' : ''}
                    <button class="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black text-white text-xs font-bold px-6 py-3 rounded-lg opacity-0 group-hover:opacity-100 transition-all transform translate-y-4 group-hover:translate-y-0 w-[80%] whitespace-nowrap">
                        THÊM NHANH
                    </button>
                </div>
                <div class="flex flex-col gap-1">
                    <p class="text-gray-500 text-xs font-semibold uppercase tracking-wider">${product.brand || 'Brand'}</p>
                    <a href="Product-detail.html?id=${product.id}">
                        <h3 class="text-base font-bold text-gray-900 dark:text-white leading-tight hover:text-primary transition-colors">
                            ${product.name}
                        </h3>
                    </a>
                    <div class="flex items-center gap-2 mt-1">
                        <p class="text-primary font-bold text-lg">${formatPrice(product.price)}</p>
                        ${product.discount > 0 && product.originalPrice ? `<span class="text-gray-400 line-through text-sm">${formatPrice(product.originalPrice)}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Render New Arrivals products
 */
function renderNewArrivals(products) {
    const container = document.getElementById('new-arrivals-products');
    if (!container) return;

    if (products.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-12">
                <p class="text-gray-500 font-medium">Chưa có sản phẩm mới</p>
            </div>
        `;
        return;
    }

    container.innerHTML = products.map(product => {
        const mainImage = Array.isArray(product.images) && product.images.length > 0
            ? product.images[0]
            : 'https://via.placeholder.com/400?text=No+Image';

        return `
            <div class="group relative flex flex-col">
                <div class="relative aspect-square bg-[#f3f3f3] dark:bg-[#2a1a1b] rounded-xl overflow-hidden mb-4">
                    <a href="Product-detail.html?id=${product.id}">
                        <img class="w-full h-full object-contain p-8 group-hover:scale-110 transition-transform duration-500"
                             src="${mainImage}"
                             alt="${product.name}"
                             onerror="this.src='https://via.placeholder.com/400?text=No+Image'"/>
                    </a>
                    <div class="absolute top-4 left-4 bg-primary text-white text-[10px] font-bold px-2 py-1 rounded">MỚI</div>
                    <button class="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black text-white text-xs font-bold px-6 py-3 rounded-lg opacity-0 group-hover:opacity-100 transition-all transform translate-y-4 group-hover:translate-y-0 w-[80%] whitespace-nowrap">
                        THÊM NHANH
                    </button>
                </div>
                <div class="flex flex-col gap-1">
                    <p class="text-gray-500 text-xs font-semibold uppercase tracking-wider">${product.brand || 'Brand'}</p>
                    <a href="Product-detail.html?id=${product.id}">
                        <h3 class="text-base font-bold text-gray-900 dark:text-white leading-tight hover:text-primary transition-colors">
                            ${product.name}
                        </h3>
                    </a>
                    <p class="text-primary font-bold text-lg">${formatPrice(product.price)}</p>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Show loading skeleton
 */
function showLoadingSkeleton(containerId, count = 4) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const skeletons = Array(count).fill(0).map(() => `
        <div class="flex flex-col">
            <div class="aspect-square bg-gray-200 dark:bg-gray-700 rounded-xl mb-4 skeleton animate-pulse"></div>
            <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2 skeleton animate-pulse"></div>
            <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-2 skeleton animate-pulse"></div>
            <div class="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/2 skeleton animate-pulse"></div>
        </div>
    `).join('');

    container.innerHTML = skeletons;
}

// ============================================================================
// INITIALIZATION
// ============================================================================

async function init() {
    console.log('🚀 Initializing home products...');

    // Show loading skeletons
    showLoadingSkeleton('flash-sale-products', 4);
    showLoadingSkeleton('best-sellers-products', 8);
    showLoadingSkeleton('new-arrivals-products', 8);

    // Load products in parallel
    const [flashSale, bestSellers, newArrivals] = await Promise.all([
        loadFlashSaleProducts(4),
        loadBestSellers(8),
        loadNewArrivals(8)
    ]);

    // Render products
    renderFlashSale(flashSale);
    renderBestSellers(bestSellers);
    renderNewArrivals(newArrivals);

    console.log('✅ Home products initialized');
}

// Run on page load
document.addEventListener('DOMContentLoaded', init);

console.log('✅ Home products module loaded');
