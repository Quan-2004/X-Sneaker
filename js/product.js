// Product Listing Page Logic for X-Sneaker
// Handles product loading, filtering, and rendering from Firebase

import { getFirebaseDatabase } from './firebase-config.js';
import { ref, get } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

// Get Firebase database instance from shared config
const database = getFirebaseDatabase();

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
    priceMax: 10000000 // 10 million VND
};
let currentPage = 1;
let itemsPerPage = 12;
let currentSort = 'popular'; // popular, price-asc, price-desc, newest

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

    // Apply sorting
    filtered = applySort(filtered);
    
    return filtered;
}

function applySort(products) {
    const sorted = [...products];
    
    switch(currentSort) {
        case 'price-asc':
            return sorted.sort((a, b) => a.price - b.price);
        case 'price-desc':
            return sorted.sort((a, b) => b.price - a.price);
        case 'newest':
            return sorted.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        case 'popular':
        default:
            return sorted.sort((a, b) => (b.sold || 0) - (a.sold || 0));
    }
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
        // Hide pagination
        renderPagination(0);
        return;
    }

    // Calculate pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedProducts = products.slice(startIndex, endIndex);
    
    // Render paginated products
    container.innerHTML = paginatedProducts.map(product => {
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
                             onerror="if(this.src!='image/default-avatar.jpg'){this.src='image/default-avatar.jpg'}"/>
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
    
    // Render pagination controls
    renderPagination(products.length);
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

    // Clear filters button
    const clearBtn = document.querySelector('button[data-action="clear-filters"]');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            // Reset all checkboxes
            document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
            
            // Reset dual range sliders
            const priceMin = document.getElementById('price-min');
            const priceMax = document.getElementById('price-max');
            const priceDisplay = document.getElementById('price-display');
            const priceRangeTrack = document.getElementById('price-range-track');
            
            if (priceMin) priceMin.value = 0;
            if (priceMax) priceMax.value = 10000000;
            if (priceDisplay) priceDisplay.textContent = '0₫ - 10.000.000₫';
            if (priceRangeTrack) {
                priceRangeTrack.style.left = '0%';
                priceRangeTrack.style.right = '0%';
            }

            // Reset filters
            currentFilters = {
                categories: [],
                brands: [],
                genders: [],
                sizes: [],
                priceMin: 0,
                priceMax: 10000000
            };

            renderProducts(allProducts);
        });
    }

    // Dual Range Price Slider
    const priceMin = document.getElementById('price-min');
    const priceMax = document.getElementById('price-max');
    const priceDisplay = document.getElementById('price-display');
    const priceRangeTrack = document.getElementById('price-range-track');
    
    if (priceMin && priceMax && priceDisplay && priceRangeTrack) {
        const maxPrice = 10000000; // 10 million
        
        function updatePriceRange() {
            let minVal = parseInt(priceMin.value);
            let maxVal = parseInt(priceMax.value);
            
            // Prevent min from exceeding max
            if (minVal > maxVal - 100000) {
                minVal = maxVal - 100000;
                priceMin.value = minVal;
            }
            
            // Update filters
            currentFilters.priceMin = minVal;
            currentFilters.priceMax = maxVal;
            
            // Update display
            priceDisplay.textContent = `${formatPrice(minVal)} - ${formatPrice(maxVal)}`;
            
            // Update visual track
            const percentMin = (minVal / maxPrice) * 100;
            const percentMax = (maxVal / maxPrice) * 100;
            priceRangeTrack.style.left = percentMin + '%';
            priceRangeTrack.style.right = (100 - percentMax) + '%';
            
            // Apply filter
            const filtered = applyFilters();
            renderProducts(filtered);
        }
        
        priceMin.addEventListener('input', updatePriceRange);
        priceMax.addEventListener('input', updatePriceRange);
        
        // Set initial state
        updatePriceRange();
    }

    // Sort dropdown
    setupSortDropdown();

    // Pagination
    setupPagination();
}

function setupSortDropdown() {
    const sortButton = document.querySelector('.relative.inline-block button');
    if (!sortButton) return;
    
    // Create dropdown menu
    const dropdown = document.createElement('div');
    dropdown.className = 'absolute right-0 mt-2 w-56 bg-white dark:bg-background-dark border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg z-10 hidden';
    dropdown.innerHTML = `
        <button data-sort="popular" class="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 font-medium">
            Phổ biến nhất
        </button>
        <button data-sort="price-asc" class="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 font-medium">
            Giá: Thấp đến Cao
        </button>
        <button data-sort="price-desc" class="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 font-medium">
            Giá: Cao đến Thấp
        </button>
        <button data-sort="newest" class="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 font-medium">
            Mới nhất
        </button>
    `;
    
    sortButton.parentElement.appendChild(dropdown);
    
    // Toggle dropdown
    sortButton.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('hidden');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
        dropdown.classList.add('hidden');
    });
    
    // Handle sort selection
    dropdown.querySelectorAll('[data-sort]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            currentSort = e.target.dataset.sort;
            
            // Update button text
            sortButton.childNodes[0].textContent = e.target.textContent.trim() + ' ';
            
            // Hide dropdown
            dropdown.classList.add('hidden');
            
            // Re-render with new sort
            const filtered = applyFilters();
            renderProducts(filtered);
        });
    });
}

function setupPagination() {
    // Initial render will show pagination
    // Pagination is rendered dynamically in renderProducts
}

function renderPagination(totalItems) {
    const paginationContainer = document.querySelector('.mt-16.flex.items-center');
    if (!paginationContainer) return;
    
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    if (totalPages <= 1) {
        paginationContainer.style.display = 'none';
        return;
    }
    
    paginationContainer.style.display = 'flex';
    
    let paginationHTML = `
        <button class="pagination-prev flex items-center justify-center w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}">
            <span class="material-symbols-outlined">chevron_left</span>
        </button>
        <div class="flex items-center gap-2">
    `;
    
    // Show first page
    paginationHTML += `<button class="pagination-num w-10 h-10 rounded-lg font-bold text-sm ${currentPage === 1 ? 'bg-black text-white' : 'border border-transparent hover:border-gray-200 dark:hover:border-gray-800'}" data-page="1">1</button>`;
    
    if (currentPage > 3) {
        paginationHTML += `<span class="px-2 text-gray-400">...</span>`;
    }
    
    // Show pages around current
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        paginationHTML += `<button class="pagination-num w-10 h-10 rounded-lg font-bold text-sm ${currentPage === i ? 'bg-black text-white' : 'border border-transparent hover:border-gray-200 dark:hover:border-gray-800'}" data-page="${i}">${i}</button>`;
    }
    
    if (currentPage < totalPages - 2) {
        paginationHTML += `<span class="px-2 text-gray-400">...</span>`;
    }
    
    // Show last page
    if (totalPages > 1) {
        paginationHTML += `<button class="pagination-num w-10 h-10 rounded-lg font-bold text-sm ${currentPage === totalPages ? 'bg-black text-white' : 'border border-transparent hover:border-gray-200 dark:hover:border-gray-800'}" data-page="${totalPages}">${totalPages}</button>`;
    }
    
    paginationHTML += `
        </div>
        <button class="pagination-next flex items-center justify-center w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}">
            <span class="material-symbols-outlined">chevron_right</span>
        </button>
    `;
    
    paginationContainer.innerHTML = paginationHTML;
    
    // Add event listeners
    paginationContainer.querySelector('.pagination-prev').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            const filtered = applyFilters();
            renderProducts(filtered);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });
    
    paginationContainer.querySelector('.pagination-next').addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            const filtered = applyFilters();
            renderProducts(filtered);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });
    
    paginationContainer.querySelectorAll('.pagination-num').forEach(btn => {
        btn.addEventListener('click', () => {
            currentPage = parseInt(btn.dataset.page);
            const filtered = applyFilters();
            renderProducts(filtered);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
}

// Run on page load
document.addEventListener('DOMContentLoaded', init);

console.log('✅ Product module loaded');
