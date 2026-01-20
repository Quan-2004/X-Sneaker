// Product Detail Page Logic for X-Sneaker
// Handles single product loading and rendering from Firebase

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getDatabase, ref, get, query, orderByChild, equalTo, limitToFirst } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

// Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyBjCuKcQ5KKlR0gP96mCSPiSxM6l_F4C88",
    authDomain: "x-sneaker.firebaseapp.com",
    databaseURL: "https://x-sneaker-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "x-sneaker",
    storageBucket: "x-sneaker.firebasestorage.app",
    messagingSenderId: "1039080363999",
    appId: "1:1039080363999:web:7e50d81c2cd5f1e67be46f"
};

const app = initializeApp(firebaseConfig, 'product-detail-app');
const database = getDatabase(app);

// Global state
let currentProduct = null;
let selectedSize = null;
let selectedColor = null;

// ============================================================================
// DATA LOADING
// ============================================================================

async function loadProductDetail(productId) {
    try {
        const productRef = ref(database, `products/${productId}`);
        const snapshot = await get(productRef);
        
        if (snapshot.exists()) {
            currentProduct = {
                id: productId,
                ...snapshot.val()
            };
            console.log('✅ Loaded product:', currentProduct.name);
            return currentProduct;
        } else {
            console.error('❌ Product not found:', productId);
            return null;
        }
    } catch (error) {
        console.error('❌ Error loading product:', error);
        return null;
    }
}

async function loadRelatedProducts(category, currentProductId, limit = 4) {
    try {
        const productsRef = ref(database, 'products');
        const snapshot = await get(productsRef);
        
        if (snapshot.exists()) {
            const productsData = snapshot.val();
            const products = Object.keys(productsData)
                .filter(key => key !== currentProductId && productsData[key].category === category)
                .map(key => ({ id: key, ...productsData[key] }))
                .slice(0, limit);
            
            return products;
        }
        return [];
    } catch (error) {
        console.error('Error loading related products:', error);
        return [];
    }
}

// ============================================================================
// RENDERING
// ============================================================================

function renderProductDetail(product) {
    if (!product) {
        showError('Không tìm thấy sản phẩm');
        return;
    }

    // Update page title
    document.title = `${product.name} | X-Sneaker`;

    // Render breadcrumb
    renderBreadcrumb(product);

    // Render main image
    renderMainImage(product);

    // Render thumbnails
    renderThumbnails(product);

    // Render product info
    renderProductInfo(product);

    // Render colors
    renderColors(product);

    // Render sizes
    renderSizes(product);

    // Setup add to cart button
    setupAddToCart(product);
}

function renderBreadcrumb(product) {
    const breadcrumb = document.querySelector('.flex.flex-wrap.gap-2.py-4');
    if (breadcrumb) {
        const productName = breadcrumb.querySelector('span:last-child');
        if (productName) {
            productName.textContent = product.name;
        }
    }
}

function renderMainImage(product) {
    const container = document.querySelector('.w-full.lg\\:w-3\\/5 .aspect-square');
    if (!container) return;

    const mainImage = Array.isArray(product.images) && product.images.length > 0
        ? product.images[0]
        : 'https://via.placeholder.com/800?text=No+Image';

    container.innerHTML = `
        <div class="w-full h-full bg-center bg-no-repeat bg-cover hover:scale-105 transition-transform duration-500 cursor-zoom-in" 
             style="background-image: url('${mainImage}');"
             alt="${product.name}">
        </div>
    `;
}

function renderThumbnails(product) {
    const container = document.querySelector('.grid.grid-cols-4.gap-4');
    if (!container) return;

    const images = Array.isArray(product.images) && product.images.length > 0
        ? product.images
        : ['https://via.placeholder.com/200?text=No+Image'];

    // Show up to 4 images, add "+X" for additional images
    const displayImages = images.slice(0, 4);
    const remainingCount = images.length - 4;

    container.innerHTML = displayImages.map((img, index) => {
        const isLast = index === 3 && remainingCount > 0;
        const isFirst = index === 0;

        return `
            <div class="aspect-square bg-white dark:bg-gray-800 rounded-lg overflow-hidden border${isFirst ? '-2 border-primary' : ' border-transparent hover:border-gray-300 transition-colors'} cursor-pointer"
                 onclick="changeMainImage('${img}', this)">
                <div class="w-full h-full bg-center bg-no-repeat bg-cover ${isLast ? 'opacity-50' : ''}" 
                     style="background-image: url('${img}');">
                </div>
                ${isLast ? `<div class="absolute inset-0 flex items-center justify-center text-white font-bold bg-black/30">+${remainingCount}</div>` : ''}
            </div>
        `;
    }).join('');
}

function renderProductInfo(product) {
    const container = document.querySelector('.w-full.lg\\:w-2\\/5');
    if (!container) return;

    // Update badges
    const badgeContainer = container.querySelector('.mb-2.flex.items-center.gap-2');
    if (badgeContainer) {
        let badges = '';
        if (product.isNew) {
            badges += '<span class="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Hàng Mới</span>';
        }
        if (product.isBestSeller) {
            badges += '<span class="bg-green-100 text-green-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Bán Chạy</span>';
        }

        // Rating
        const rating = product.rating || 0;
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        let starsHTML = '';
        for (let i = 0; i < 5; i++) {
            if (i < fullStars) {
                starsHTML += '<span class="material-symbols-outlined text-sm">star</span>';
            } else if (i === fullStars && hasHalfStar) {
                starsHTML += '<span class="material-symbols-outlined text-sm text-gray-300">star_half</span>';
            } else {
                starsHTML += '<span class="material-symbols-outlined text-sm text-gray-300">star</span>';
            }
        }

        badges += `
            <div class="flex items-center text-amber-500">
                ${starsHTML}
                <span class="text-xs text-gray-500 dark:text-gray-400 ml-1 font-medium">(${product.reviews || 0} Đánh giá)</span>
            </div>
        `;

        badgeContainer.innerHTML = badges;
    }

    // Update title
    const title = container.querySelector('h1');
    if (title) {
        title.textContent = product.name;
    }

    // Update description
    const description = container.querySelector('p.text-gray-500.dark\\:text-gray-400.text-lg');
    if (description) {
        description.textContent = product.description || 'Mô tả sản phẩm đang được cập nhật...';
    }

    // Update price
    const priceContainer = container.querySelector('.flex.items-baseline.gap-4'); 
    if (priceContainer) {
        const hasDiscount = product.discount && product.discount > 0;
        priceContainer.innerHTML = `
            <span class="text-primary text-3xl font-bold">${formatPrice(product.price)}</span>
            ${hasDiscount && product.originalPrice ? `<span class="text-gray-400 line-through text-lg">${formatPrice(product.originalPrice)}</span>` : ''}
        `;
    }
}

function renderColors(product) {
    const container = document.querySelector('.mb-8:has(h3:contains("Màu"))');
    if (!container) return;

    const colors = Array.isArray(product.colors) && product.colors.length > 0
        ? product.colors
        : ['Default'];

    // Simple color mapping (you can expand this)
    const colorMap = {
        'Đỏ': '#ff0000',
        'Đen': '#000000',
        'Trắng': '#ffffff',
        'Xanh': '#0000ff',
        'Xanh dương': '#0000ff',
        'Default': '#ff3c3c'
    };

    const colorButtons = container.querySelector('.flex.gap-3');
    if (colorButtons) {
        colorButtons.innerHTML = colors.map((color, index) => {
            const bgColor = colorMap[color] || colorMap['Default'];
            const isFirst = index === 0;
            
            return `
                <button class="w-10 h-10 rounded-full border${isFirst ? '-2 border-primary ring-offset-2 ring-1 ring-primary' : ' border-gray-200'}" 
                        style="background-color: ${bgColor};"
                        onclick="selectColor('${color}', this)"
                        title="${color}">
                </button>
            `;
        }).join('');

        // Set initial color
        if (colors.length > 0) {
            selectedColor = colors[0];
            const colorLabel = container.querySelector('h3 span.text-gray-500');
            if (colorLabel) {
                colorLabel.textContent = colors[0];
            }
        }
    }
}

function renderSizes(product) {
    const container = document.querySelector('.mb-8:has(h3:contains("Kích Thước"))');
    if (!container) return;

    const sizes = Array.isArray(product.sizes) && product.sizes.length > 0
        ? product.sizes
        : [38, 39, 40, 41, 42, 43];

    const sizeGrid = container.querySelector('.grid.grid-cols-4');
    if (sizeGrid) {
        sizeGrid.innerHTML = sizes.map((size, index) => {
            const isDefault = index === 2; // Select 3rd size by default
            const inStock = product.stock > 0;

            return `
                <button class="py-3 text-center border ${isDefault ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 dark:border-gray-700'} rounded-lg text-sm font-semibold hover:border-primary transition-all ${!inStock ? 'opacity-40 cursor-not-allowed' : ''}"
                        onclick="selectSize(${size}, this)"
                        ${!inStock ? 'disabled' : ''}>
                    US ${size}
                </button>
            `;
        }).join('');

        // Set initial size
        if (sizes.length > 2 && product.stock > 0) {
            selectedSize = sizes[2];
        }
    }
}

function setupAddToCart(product) {
    const addToCartBtn = document.querySelector('button:has(span.material-symbols-outlined:contains("shopping_cart"))');
    if (addToCartBtn) {
        addToCartBtn.onclick = () => {
            if (!selectedSize) {
                window.showToast && window.showToast('Vui lòng chọn size', 'error');
                return;
            }

            const cartItem = {
                id: product.id,
                name: product.name,
                price: product.price,
                image: product.images && product.images[0],
                size: selectedSize,
                color: selectedColor,
                brand: product.brand
            };

            window.addToCart && window.addToCart(cartItem);
        };
    }
}

async function renderRelatedProducts(category, currentProductId) {
    const container = document.querySelector('.grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-4.gap-6');
    if (!container) return;

    const relatedProducts = await loadRelatedProducts(category, currentProductId);

    if (relatedProducts.length === 0) {
        container.innerHTML = '<p class="col-span-full text-center text-gray-500">Không có sản phẩm liên quan</p>';
        return;
    }

    container.innerHTML = relatedProducts.map(product => {
        const mainImage = Array.isArray(product.images) && product.images.length > 0
            ? product.images[0]
            : 'https://via.placeholder.com/400';

        return `
            <div class="group cursor-pointer" onclick="window.location.href='Product-detail.html?id=${product.id}'">
                <div class="aspect-square rounded-xl overflow-hidden mb-4 bg-gray-100 relative">
                    <div class="w-full h-full bg-center bg-no-repeat bg-cover group-hover:scale-105 transition-transform duration-500" 
                         style="background-image: url('${mainImage}');"></div>
                    <button class="absolute top-3 right-3 p-2 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" onclick="event.stopPropagation();">
                        <span class="material-symbols-outlined text-gray-800 text-lg">favorite</span>
                    </button>
                </div>
                <h4 class="font-bold text-[#1b0e0f] dark:text-white group-hover:text-primary transition-colors">${product.name}</h4>
                <p class="text-sm text-gray-500 mb-2">${product.brand || ''}</p>
                <span class="font-bold text-lg">${formatPrice(product.price)}</span>
            </div>
        `;
    }).join('');
}

// ============================================================================
// USER INTERACTIONS
// ============================================================================

window.changeMainImage = function(imageUrl, thumbnail) {
    const mainImageContainer = document.querySelector('.w-full.lg\\:w-3\\/5 .aspect-square > div');
    if (mainImageContainer) {
        mainImageContainer.style.backgroundImage = `url('${imageUrl}')`;
    }

    // Update thumbnail borders
    document.querySelectorAll('.grid.grid-cols-4.gap-4 > div').forEach(thumb => {
        thumb.classList.remove('border-2', 'border-primary');
        thumb.classList.add('border', 'border-transparent');
    });
    
    if (thumbnail) {
        thumbnail.classList.add('border-2', 'border-primary');
        thumbnail.classList.remove('border-transparent');
    }
};

window.selectColor = function(color, button) {
    selectedColor = color;

    // Update UI
    document.querySelectorAll('.mb-8:has(h3:contains("Màu")) button').forEach(btn => {
        btn.classList.remove('border-2', 'border-primary', 'ring-offset-2', 'ring-1', 'ring-primary');
        btn.classList.add('border', 'border-gray-200');
    });

    button.classList.remove('border', 'border-gray-200');
    button.classList.add('border-2', 'border-primary', 'ring-offset-2', 'ring-1', 'ring-primary');

    // Update label
    const colorLabel = document.querySelector('.mb-8:has(h3:contains("Màu")) h3 span.text-gray-500');
    if (colorLabel) {
        colorLabel.textContent = color;
    }
};

window.selectSize = function(size, button) {
    selectedSize = size;

    // Update UI
    document.querySelectorAll('.mb-8:has(h3:contains("Kích Thước")) button').forEach(btn => {
        btn.classList.remove('border-primary', 'bg-primary/5', 'text-primary', 'font-bold');
        btn.classList.add('border-gray-200', 'dark:border-gray-700', 'font-semibold');
    });

    button.classList.remove('border-gray-200', 'dark:border-gray-700', 'font-semibold');
    button.classList.add('border-primary', 'bg-primary/5', 'text-primary', 'font-bold');
};

// ============================================================================
// UTILITY
// ============================================================================

function formatPrice(price) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(price);
}

function showError(message) {
    const main = document.querySelector('main');
    if (main) {
        main.innerHTML = `
            <div class="flex flex-col items-center justify-center py-20">
                <span class="material-symbols-outlined text-6xl text-red-500 mb-4">error</span>
                <h2 class="text-2xl font-bold mb-2">${message}</h2>
                <p class="text-gray-500 mb-6">Sản phẩm bạn tìm kiếm không tồn tại hoặc đã bị xóa</p>
                <a href="Product.html" class="bg-primary text-white px-6 py-3 rounded-lg font-bold hover:bg-red-700 transition-colors">
                    Quay lại cửa hàng
                </a>
            </div>
        `;
    }
}

function getProductIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// ============================================================================
// INITIALIZATION
// ============================================================================

async function init() {
    console.log('🚀 Initializing product detail page...');

    const productId = getProductIdFromURL();
    
    if (!productId) {
        console.error('❌ No product ID in URL');
        showError('Không tìm thấy sản phẩm');
        return;
    }

    // Load product
    const product = await loadProductDetail(productId);
    
    if (!product) {
        showError('Không tìm thấy sản phẩm');
        return;
    }

    // Render product
    renderProductDetail(product);

    // Load and render related products
    if (product.category) {
        await renderRelatedProducts(product.category, productId);
    }

    console.log('✅ Product detail page initialized');
}

// Run on page load
document.addEventListener('DOMContentLoaded', init);

console.log('✅ Product detail module loaded');
