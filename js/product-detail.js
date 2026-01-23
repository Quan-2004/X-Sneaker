// Product Detail Page Logic for X-Sneaker
// Handles product loading, gallery, options, cart, and related products

import { getFirebaseDatabase } from './firebase-config.js';
import { ref, get } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

// Get Firebase database instance
const database = getFirebaseDatabase();

// Global state
let currentProduct = null;
let selectedColor = null;
let selectedSize = null;
let currentImageIndex = 0;

// ============================================================================
// DATA LOADING
// ============================================================================

/**
 * Get product ID from URL parameter
 */
function getProductIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

/**
 * Load product by ID from Firebase
 */
async function loadProductById(productId) {
    try {
        const productRef = ref(database, `products/${productId}`);
        const snapshot = await get(productRef);
        
        if (snapshot.exists()) {
            const productData = { id: productId, ...snapshot.val() };
            console.log('✅ Product loaded:', productData);
            return productData;
        } else {
            console.warn('⚠️ Product not found:', productId);
            return null;
        }
    } catch (error) {
        console.error('❌ Error loading product:', error);
        return null;
    }
}

/**
 * Load related products from same category
 */
async function loadRelatedProducts(category, currentProductId, limit = 4) {
    try {
        const productsRef = ref(database, 'products');
        const snapshot = await get(productsRef);
        
        if (snapshot.exists()) {
            const productsData = snapshot.val();
            const related = Object.keys(productsData)
                .map(key => ({ id: key, ...productsData[key] }))
                .filter(p => p.category === category && p.id !== currentProductId)
                .slice(0, limit);
            
            console.log(`✅ Loaded ${related.length} related products`);
            return related;
        }
        return [];
    } catch (error) {
        console.error('❌ Error loading related products:', error);
        return [];
    }
}

// ============================================================================
// RENDERING
// ============================================================================

/**
 * Render product data to page
 */
function renderProductData(product) {
    currentProduct = product;
    
    // Update product name
    const nameEl = document.querySelector('h1');
    if (nameEl) nameEl.textContent = product.name;
    
    // Update description
    const descEl = document.querySelector('p.text-gray-500.dark\\:text-gray-400.text-lg');
    if (descEl) descEl.textContent = product.description || 'Giày thể thao cao cấp';
    
    // Update price
    const priceEl = document.querySelector('.text-primary.text-3xl');
    if (priceEl) priceEl.textContent = formatPrice(product.price);
    
    // Update original price if discount exists
    const originalPriceEl = document.querySelector('.text-gray-400.line-through');
    if (product.originalPrice && originalPriceEl) {
        originalPriceEl.textContent = formatPrice(product.originalPrice);
    } else if (originalPriceEl) {
        originalPriceEl.style.display = 'none';
    }
    
    // Update breadcrumb
    const breadcrumbProduct = document.querySelector('.flex.flex-wrap.gap-2 span.text-\\[\\#1b0e0f\\]');
    if (breadcrumbProduct) breadcrumbProduct.textContent = product.name;
    
    // Update gallery images
    renderGallery(product.images || []);
    
    // Update color variants
    renderColorVariants(product.colors || []);
    
    // Update sizes
    renderSizes(product.sizes || []);
}

/**
 * Render product gallery
 */
function renderGallery(images) {
    if (!images || images.length === 0) return;
    
    // Update main image
    const mainImageDiv = document.querySelector('.w-full.h-full.bg-center.bg-no-repeat.bg-cover');
    if (mainImageDiv) {
        mainImageDiv.style.backgroundImage = `url("${images[0]}")`;
        mainImageDiv.dataset.alt = currentProduct?.name || 'Product image';
    }
    
    // Update thumbnails
    const thumbnailContainer = document.querySelector('.grid.grid-cols-4.gap-4');
    if (thumbnailContainer && images.length > 0) {
        thumbnailContainer.innerHTML = images.slice(0, 4).map((img, index) => `
            <div class="aspect-square bg-white dark:bg-gray-800 rounded-lg overflow-hidden border ${index === 0 ? 'border-2 border-primary' : 'border border-transparent hover:border-gray-300'} transition-colors cursor-pointer thumbnail-image" data-index="${index}">
                <div class="w-full h-full bg-center bg-no-repeat bg-cover" 
                     style='background-image: url("${img}");'
                     data-alt="${currentProduct?.name || 'Product'} view ${index + 1}"></div>
            </div>
        `).join('');
        
        // Add remaining images indicator if more than 4
        if (images.length > 4) {
            const lastThumb = thumbnailContainer.lastElementChild;
            if (lastThumb) {
                lastThumb.innerHTML += `
                    <div class="absolute inset-0 flex items-center justify-center text-white font-bold bg-black/30">
                        +${images.length - 3}
                    </div>
                `;
            }
        }
    }
}

/**
 * Render color variants
 */
function renderColorVariants(colors) {
    if (!colors || colors.length === 0) return;
    
    const colorContainer = document.querySelector('.flex.gap-3');
    if (colorContainer && colorContainer.parentElement.querySelector('h3')?.textContent.includes('Màu Sắc')) {
        colorContainer.innerHTML = colors.map((color, index) => `
            <button class="w-10 h-10 rounded-full border ${index === 0 ? 'border-2 border-primary ring-offset-2 ring-1 ring-primary' : 'border border-gray-200'} transition-all color-btn" 
                    style="background-color: ${color.hex || color.value || '#000'}"
                    data-color="${color.name || `Color ${index + 1}`}"
                    data-index="${index}">
            </button>
        `).join('');
        
        // Set first color as selected
        if (colors.length > 0) {
            selectedColor = colors[0].name || 'Mặc định';
            updateSelectedColorName(selectedColor);
        }
    }
}

/**
 * Render size options
 */
function renderSizes(sizes) {
    if (!sizes || sizes.length === 0) return;
    
    const sizeContainer = document.querySelector('.grid.grid-cols-4.gap-2');
    if (sizeContainer) {
        sizeContainer.innerHTML = sizes.map((size, index) => {
            const isSoldOut = size.stock === 0;
            return `
                <button class="py-3 text-center border ${index === 2 ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 dark:border-gray-700'} rounded-lg text-sm font-semibold hover:border-primary transition-all size-btn ${isSoldOut ? 'opacity-40 cursor-not-allowed' : ''}"
                        data-size="US ${size.value || size}"
                        ${isSoldOut ? 'disabled' : ''}>
                    US ${size.value || size}
                </button>
            `;
        }).join('');
    }
}

/**
 * Render related products
 */
function renderRelatedProducts(products) {
    const container = document.querySelector('.grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-4.gap-6');
    if (!container) return;
    
    if (products.length === 0) return;
    
    container.innerHTML = products.map(product => {
        const mainImage = Array.isArray(product.images) && product.images.length > 0
            ? product.images[0]
            : 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'400\' height=\'400\' viewBox=\'0 0 400 400\'%3E%3Crect width=\'400\' height=\'400\' fill=\'%23f3f4f6\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' font-family=\'Arial\' font-size=\'24\' fill=\'%239ca3af\' dominant-baseline=\'middle\' text-anchor=\'middle\'%3ENo Image%3C/text%3E%3C/svg%3E';
        
        return `
            <div class="group cursor-pointer">
                <div class="aspect-square rounded-xl overflow-hidden mb-4 bg-gray-100 relative">
                    <a href="Product-detail.html?id=${product.id}">
                        <div class="w-full h-full bg-center bg-no-repeat bg-cover group-hover:scale-105 transition-transform duration-500" 
                             style='background-image: url("${mainImage}");'
                             data-alt="${product.name}"></div>
                    </a>
                    <button class="wishlist-btn absolute top-3 right-3 p-2 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" data-product-id="${product.id}">
                        <span class="material-symbols-outlined text-gray-800 text-lg">favorite</span>
                    </button>
                </div>
                <h4 class="font-bold text-[#1b0e0f] dark:text-white group-hover:text-primary transition-colors">${product.name}</h4>
                <p class="text-sm text-gray-500 mb-2">${product.category || 'Sneakers'}</p>
                <span class="font-bold text-lg">${formatPrice(product.price)}</span>
            </div>
        `;
    }).join('');
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    // Gallery - Thumbnail clicks
    document.addEventListener('click', (e) => {
        const thumbnail = e.target.closest('.thumbnail-image');
        if (thumbnail) {
            const index = parseInt(thumbnail.dataset.index);
            updateMainImage(index);
        }
    });
    
    // Color selection
    document.addEventListener('click', (e) => {
        const colorBtn = e.target.closest('.color-btn');
        if (colorBtn) {
            document.querySelectorAll('.color-btn').forEach(btn => {
                btn.classList.remove('border-2', 'border-primary', 'ring-offset-2', 'ring-1', 'ring-primary');
                btn.classList.add('border', 'border-gray-200');
            });
            
            colorBtn.classList.remove('border', 'border-gray-200');
            colorBtn.classList.add('border-2', 'border-primary', 'ring-offset-2', 'ring-1', 'ring-primary');
            
            selectedColor = colorBtn.dataset.color;
            updateSelectedColorName(selectedColor);
        }
    });
    
    // Size selection
    document.addEventListener('click', (e) => {
        const sizeBtn = e.target.closest('.size-btn');
        if (sizeBtn && !sizeBtn.disabled) {
            document.querySelectorAll('.size-btn').forEach(btn => {
                btn.classList.remove('border-primary', 'bg-primary/5', 'text-primary');
                btn.classList.add('border-gray-200', 'dark:border-gray-700');
            });
            
            sizeBtn.classList.remove('border-gray-200', 'dark:border-gray-700');
            sizeBtn.classList.add('border-primary', 'bg-primary/5', 'text-primary');
            
            selectedSize = sizeBtn.dataset.size;
        }
    });
    
    // Add to Cart button
    const addToCartBtn = document.querySelector('button.bg-primary.hover\\:bg-\\[\\#c4141d\\]');
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', handleAddToCart);
    }
    
    // Add to Wishlist button
    const addToWishlistBtn = document.querySelector('button.border-2.border-gray-200');
    if (addToWishlistBtn) {
        addToWishlistBtn.addEventListener('click', handleAddToWishlist);
    }
    
    // Product tabs
    setupTabs();
    
    // Related products carousel
    setupCarousel();
}

/**
 * Update main image
 */
function updateMainImage(index) {
    if (!currentProduct || !currentProduct.images) return;
    
    currentImageIndex = index;
    const mainImageDiv = document.querySelector('.w-full.h-full.bg-center.bg-no-repeat.bg-cover');
    if (mainImageDiv && currentProduct.images[index]) {
        mainImageDiv.style.backgroundImage = `url("${currentProduct.images[index]}")`;
    }
    
    // Update thumbnail borders
    document.querySelectorAll('.thumbnail-image').forEach((thumb, i) => {
        if (i === index) {
            thumb.classList.remove('border-transparent', 'hover:border-gray-300');
            thumb.classList.add('border-2', 'border-primary');
        } else {
            thumb.classList.remove('border-2', 'border-primary');
            thumb.classList.add('border', 'border-transparent', 'hover:border-gray-300');
        }
    });
}

/**
 * Update selected color name display
 */
function updateSelectedColorName(colorName) {
    const colorNameEl = document.querySelector('h3 span.text-gray-500');
    if (colorNameEl) {
        colorNameEl.textContent = colorName;
    }
}

/**
 * Handle Add to Cart
 */
function handleAddToCart() {
    if (!currentProduct) {
        window.showToast?.('Không tìm thấy thông tin sản phẩm');
        return;
    }
    
    if (!selectedSize) {
        window.showToast?.('Vui lòng chọn kích thước');
        return;
    }
    
    const cartItem = {
        id: currentProduct.id,
        name: currentProduct.name,
        price: currentProduct.price,
        image: currentProduct.images?.[0] || '',
        color: selectedColor || 'Mặc định',
        size: selectedSize,
        quantity: 1
    };
    
    if (window.addToCart) {
        window.addToCart(cartItem);
    } else {
        // Fallback if common.js not loaded
        let cart = JSON.parse(localStorage.getItem('cart')) || [];
        const existing = cart.find(item => 
            item.id === cartItem.id && 
            item.color === cartItem.color && 
            item.size === cartItem.size
        );
        
        if (existing) {
            existing.quantity += 1;
        } else {
            cart.push(cartItem);
        }
        
        localStorage.setItem('cart', JSON.stringify(cart));
        window.showToast?.(`Đã thêm ${currentProduct.name} vào giỏ hàng`);
    }
}

/**
 * Handle Add to Wishlist
 */
function handleAddToWishlist() {
    if (!currentProduct) return;
    
    let wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
    const existingIndex = wishlist.findIndex(item => item.id === currentProduct.id);
    
    const btn = document.querySelector('button.border-2.border-gray-200 span.material-symbols-outlined');
    
    if (existingIndex >= 0) {
        // Remove from wishlist
        wishlist.splice(existingIndex, 1);
        if (btn) btn.textContent = 'favorite';
        window.showToast?.('Đã xóa khỏi danh sách yêu thích');
    } else {
        // Add to wishlist
        wishlist.push({
            id: currentProduct.id,
            name: currentProduct.name,
            price: currentProduct.price,
            image: currentProduct.images?.[0] || ''
        });
        if (btn) btn.textContent = 'favorite';
        window.showToast?.('Đã thêm vào danh sách yêu thích');
    }
    
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
}

/**
 * Setup product tabs
 */
function setupTabs() {
    const tabButtons = document.querySelectorAll('.flex.gap-10.border-b button');
    
    tabButtons.forEach((btn, index) => {
        btn.addEventListener('click', () => {
            // Remove active from all
            tabButtons.forEach(b => {
                b.classList.remove('border-primary', 'text-primary');
                b.classList.add('border-transparent', 'text-gray-500');
            });
            
            // Add active to clicked
            btn.classList.remove('border-transparent', 'text-gray-500');
            btn.classList.add('border-primary', 'text-primary');
            
            // Note: In a full implementation, you would show/hide different content panels here
            console.log(`Switched to tab: ${btn.textContent}`);
        });
    });
}

/**
 * Setup related products carousel
 */
function setupCarousel() {
    const leftBtn = document.querySelector('.flex.gap-2 button:first-child');
    const rightBtn = document.querySelector('.flex.gap-2 button:last-child');
    const container = document.querySelector('.grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-4.gap-6');
    
    if (leftBtn && rightBtn && container) {
        leftBtn.addEventListener('click', () => {
            container.scrollBy({ left: -300, behavior: 'smooth' });
        });
        
        rightBtn.addEventListener('click', () => {
            container.scrollBy({ left: 300, behavior: 'smooth' });
        });
    }
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

/**
 * Show error page
 */
function showErrorPage() {
    const main = document.querySelector('main');
    if (main) {
        main.innerHTML = `
            <div class="flex flex-col items-center justify-center py-20">
                <span class="material-symbols-outlined text-8xl text-gray-300 mb-4">error</span>
                <h2 class="text-2xl font-bold mb-2">Không tìm thấy sản phẩm</h2>
                <p class="text-gray-500 mb-6">Sản phẩm bạn đang tìm không tồn tại hoặc đã bị xóa</p>
                <a href="Product.html" class="bg-primary text-white px-6 py-3 rounded-lg font-bold hover:bg-[#c4141d] transition-colors">
                    Về trang sản phẩm
                </a>
            </div>
        `;
    }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

async function init() {
    console.log('🚀 Initializing product detail page...');
    
    const productId = getProductIdFromUrl();
    
    if (!productId) {
        console.error('❌ No product ID in URL');
        showErrorPage();
        return;
    }
    
    // Load product data
    const product = await loadProductById(productId);
    
    if (!product) {
        showErrorPage();
        return;
    }
    
    // Render product
    renderProductData(product);
    
    // Load and render related products
    const relatedProducts = await loadRelatedProducts(product.category, productId);
    renderRelatedProducts(relatedProducts);
    
    // Setup event listeners
    setupEventListeners();
    
    console.log('✅ Product detail page initialized');
}

// Run on page load
document.addEventListener('DOMContentLoaded', init);

console.log('✅ Product detail module loaded');
