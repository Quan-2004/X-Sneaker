// Product Detail Page Logic for X-Sneaker
// Handles product loading, gallery, options, cart, and related products

import { getFirebaseAuth, getFirebaseDatabase } from './firebase-config.js';
import { ref, get, set, remove } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";
import { initProductReviews } from './product-reviews.js';

// Get Firebase instances
const auth = getFirebaseAuth();

// Get Firebase database instance
const database = getFirebaseDatabase();

// Global state
let currentProduct = null;
let selectedColor = null;
let selectedSize = null;
let currentImageIndex = 0;
let relatedProducts = []; // Store all related products
let relatedProductsStartIndex = 0; // Current carousel position

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
 * Get blog ID from URL parameter (if coming from blog)
 */
function getBlogIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('blog');
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
 * Load featured products from a specific blog
 */
async function loadFeaturedProductsFromBlog(blogId, currentProductId, limit = 6) {
    try {
        // Load blog data
        const blogRef = ref(database, `blogs/${blogId}`);
        const blogSnapshot = await get(blogRef);
        
        if (!blogSnapshot.exists()) {
            console.log('⚠️ Blog not found, loading random products');
            return await loadRelatedProducts('', currentProductId, limit);
        }
        
        const blogData = blogSnapshot.val();
        
        // Check if blog has featured products
        if (!blogData.featuredProducts || blogData.featuredProducts.length === 0) {
            console.log('⚠️ No featured products in blog, loading random products');
            return await loadRelatedProducts('', currentProductId, limit);
        }
        
        // Load all products
        const productsRef = ref(database, 'products');
        const productsSnapshot = await get(productsRef);
        
        if (!productsSnapshot.exists()) {
            return [];
        }
        
        const productsData = productsSnapshot.val();
        
        // Get featured products from blog (excluding current product)
        const featuredProducts = blogData.featuredProducts
            .filter(productId => productId !== currentProductId) // Exclude current product
            .map(productId => {
                const product = productsData[productId];
                return product ? { id: productId, ...product } : null;
            })
            .filter(p => p !== null);
        
        // If we have enough featured products, return them
        if (featuredProducts.length >= 3) {
            console.log(`✅ Loaded ${featuredProducts.length} featured products from blog`);
            return featuredProducts.slice(0, limit);
        }
        
        // If not enough featured products, mix with random products
        const allProducts = Object.keys(productsData)
            .map(key => ({ id: key, ...productsData[key] }))
            .filter(p => p.id !== currentProductId && !featuredProducts.find(fp => fp.id === p.id));
        
        const shuffled = allProducts.sort(() => 0.5 - Math.random());
        const mixedProducts = [...featuredProducts, ...shuffled.slice(0, limit - featuredProducts.length)];
        
        console.log(`✅ Loaded ${featuredProducts.length} featured + ${mixedProducts.length - featuredProducts.length} random products`);
        return mixedProducts.slice(0, limit);
        
    } catch (error) {
        console.error('❌ Error loading featured products from blog:', error);
        return await loadRelatedProducts('', currentProductId, limit);
    }
}

/**
 * Load related products from same category
 */
async function loadRelatedProducts(category, currentProductId, limit = 6) {
    try {
        const productsRef = ref(database, 'products');
        const snapshot = await get(productsRef);
        
        if (snapshot.exists()) {
            const productsData = snapshot.val();
            // Load random products (excluding current product)
            const allProducts = Object.keys(productsData)
                .map(key => ({ id: key, ...productsData[key] }))
                .filter(p => p.id !== currentProductId);
            
            // Shuffle array and take first 'limit' items
            const shuffled = allProducts.sort(() => 0.5 - Math.random());
            const related = shuffled.slice(0, limit);
            
            console.log(`✅ Loaded ${related.length} other products`);
            return related;
        }
        return [];
    } catch (error) {
        console.error('❌ Error loading other products:', error);
        return [];
    }
}

/**
 * Load blog data by ID
 */
async function loadBlogById(blogId) {
    try {
        const blogRef = ref(database, `blogs/${blogId}`);
        const snapshot = await get(blogRef);
        
        if (snapshot.exists()) {
            const blogData = { id: blogId, ...snapshot.val() };
            console.log('✅ Blog loaded:', blogData);
            return blogData;
        } else {
            console.warn('⚠️ Blog not found:', blogId);
            return null;
        }
    } catch (error) {
        console.error('❌ Error loading blog:', error);
        return null;
    }
}

/**
 * Load featured products from blog
 */
async function loadFeaturedProductsFromBlog(blogId, currentProductId, limit = 6) {
    try {
        const blog = await loadBlogById(blogId);
        if (!blog || !blog.featuredProducts || blog.featuredProducts.length === 0) {
            console.log('📝 No featured products in blog, loading random products');
            return await loadRelatedProducts(null, currentProductId, limit);
        }
        
        const productsRef = ref(database, 'products');
        const snapshot = await get(productsRef);
        
        if (snapshot.exists()) {
            const productsData = snapshot.val();
            
            // Load featured products from blog (excluding current product)
            const featuredProducts = blog.featuredProducts
                .filter(productId => productId !== currentProductId)
                .map(productId => {
                    const product = productsData[productId];
                    return product ? { id: productId, ...product } : null;
                })
                .filter(p => p !== null);
            
            // If we need more products to reach the limit, add random ones
            if (featuredProducts.length < limit) {
                const remainingLimit = limit - featuredProducts.length;
                const randomProducts = await loadRelatedProducts(null, currentProductId, remainingLimit * 2);
                
                // Filter out already featured products
                const additionalProducts = randomProducts
                    .filter(p => !featuredProducts.find(fp => fp.id === p.id))
                    .slice(0, remainingLimit);
                
                featuredProducts.push(...additionalProducts);
            }
            
            console.log(`✅ Loaded ${featuredProducts.length} products from blog (${blog.featuredProducts.length} featured)`);
            return featuredProducts.slice(0, limit);
        }
        
        return [];
    } catch (error) {
        console.error('❌ Error loading featured products from blog:', error);
        return await loadRelatedProducts(null, currentProductId, limit);
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
    
    // Store color images if available
    if (product.colorImages) {
        currentProduct.colorImages = product.colorImages;
    }
    
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
    
    // Update gender info
    const genderEl = document.getElementById('product-gender');
    if (genderEl && product.gender) {
        const genderMap = {
            'male': 'Nam',
            'female': 'Nữ',
            'unisex': 'Unisex'
        };
        genderEl.textContent = genderMap[product.gender] || 'Unisex';
    }
    
    // Update gallery images
    renderGallery(product.images || []);
    
    // Update color variants
    renderColorVariants(product.colors || []);
    
    // Update sizes
    renderSizes(product.sizes || []);
    
    // Initialize default selections (will be set by render functions)
    // selectedColor and selectedSize are set in renderColorVariants and renderSizes
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
}

/**
 * Render color thumbnails - Hiển thị ảnh thumbnail cho từng màu
 */
function renderColorThumbnails() {
    if (!currentProduct) return;
    
    const container = document.getElementById('color-thumbnails-container');
    if (!container) return;
    
    const colors = currentProduct.colors || [];
    const colorImages = currentProduct.colorImages || {};
    const defaultImages = currentProduct.images || [];
    
    if (colors.length === 0) return;
    
    // Map color names to CSS colors
    const colorMap = {
        'Đen': '#000000',
        'Trắng': '#FFFFFF',
        'Đỏ': '#E30B17',
        'Xanh Navy': '#1E3A8A',
        'Vàng': '#FACC15'
    };
    
    container.innerHTML = colors.map((colorName, index) => {
        // Lấy ảnh đầu tiên của màu này, hoặc fallback sang default
        let thumbnailImage = '';
        if (colorImages[colorName] && colorImages[colorName].length > 0) {
            thumbnailImage = colorImages[colorName][0];
        } else if (defaultImages.length > 0) {
            thumbnailImage = defaultImages[0];
        }
        
        const isSelected = selectedColor === colorName;
        const colorValue = colorMap[colorName] || '#666666';
        
        return `
            <div class="color-thumbnail relative cursor-pointer group" data-color="${colorName}">
                <div class="aspect-square bg-white dark:bg-gray-800 rounded-lg overflow-hidden border-2 ${
                    isSelected ? 'border-primary shadow-lg' : 'border-gray-200 dark:border-gray-700 hover:border-primary'
                } transition-all">
                    <div class="w-full h-full bg-center bg-no-repeat bg-cover"
                         style='background-image: url("${thumbnailImage}");'
                         data-alt="${currentProduct.name} - ${colorName}"></div>
                </div>
                <!-- Hiển thị chấm màu và tên màu -->
                <div class="mt-2 flex items-center justify-center gap-2">
                    <div class="w-4 h-4 rounded-full border border-gray-300" 
                         style="background-color: ${colorValue}; ${colorValue === '#FFFFFF' ? 'border-width: 2px;' : ''}"></div>
                    <span class="text-xs font-semibold text-gray-700 dark:text-gray-300">${colorName}</span>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Render color variants
 */
/**
 * Render color variants from Firebase data
 */
function renderColorVariants(colors) {
    if (!colors || colors.length === 0) return;
    
    const colorContainer = document.getElementById('color-container');
    if (colorContainer) {
        // Map color names to CSS colors (chỉ 5 màu cơ bản)
        const colorMap = {
            'Đen': '#000000',
            'Trắng': '#FFFFFF',
            'Đỏ': '#E30B17',
            'Xanh Navy': '#1E3A8A',
            'Vàng': '#FACC15'
        };
        
        colorContainer.innerHTML = colors.map((colorName, index) => {
            const colorValue = colorMap[colorName] || '#666666';
            const isGradient = colorValue.includes('gradient');
            
            return `
                <button class="color-btn w-10 h-10 rounded-full ${index === 0 ? 'border-2 border-primary ring-offset-2 ring-1 ring-primary' : 'border border-gray-200'} transition-all" 
                        style="${isGradient ? 'background: ' + colorValue : 'background-color: ' + colorValue}"
                        data-color="${colorName}"
                        title="${colorName}">
                </button>
            `;
        }).join('');
        
        // Set first color as selected and load its images
        if (colors.length > 0) {
            selectedColor = colors[0];
            updateSelectedColorName(selectedColor);
            // Load images for first color
            loadImagesForColor(selectedColor);
        }
    }
    
    // Render color thumbnails
    renderColorThumbnails();
}

/**
 * Render size options
 */
function renderSizes(sizes) {
    if (!sizes || sizes.length === 0) return;
    
    const sizeContainer = document.querySelector('.grid.grid-cols-4.gap-2');
    if (sizeContainer) {
        sizeContainer.innerHTML = sizes.map((size, index) => {
            // Size from Firebase is just a number (e.g., 37, 38, 39)
            const sizeValue = typeof size === 'object' ? size.value : size;
            const isSoldOut = typeof size === 'object' && size.stock === 0;
            
            return `
                <button class="py-3 text-center border ${index === 0 ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 dark:border-gray-700'} rounded-lg text-sm font-semibold hover:border-primary transition-all size-btn ${isSoldOut ? 'opacity-40 cursor-not-allowed' : ''}"
                        data-size="${sizeValue}"
                        ${isSoldOut ? 'disabled' : ''}>
                    ${sizeValue}
                </button>
            `;
        }).join('');
        
        // Set first size as selected
        if (sizes.length > 0) {
            selectedSize = typeof sizes[0] === 'object' ? sizes[0].value : sizes[0];
        }
    }
}

/**
 * Render related products
 */
function renderRelatedProducts(products) {
    relatedProducts = products; // Store globally for carousel
    relatedProductsStartIndex = 0; // Reset to start
    renderRelatedProductsCarousel();
}

/**
 * Render carousel view (4 products at a time)
 */
function renderRelatedProductsCarousel() {
    const container = document.querySelector('.grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-4.gap-6');
    if (!container) return;
    
    if (relatedProducts.length === 0) return;
    
    // Show 4 products at a time
    const visibleProducts = relatedProducts.slice(relatedProductsStartIndex, relatedProductsStartIndex + 4);
    
    container.innerHTML = visibleProducts.map(product => {
        const mainImage = Array.isArray(product.images) && product.images.length > 0
            ? product.images[0]
            : 'image/coming_soon.png';
        
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
    
    // Update button states
    updateCarouselButtons();
}

/**
 * Update carousel button states (disable if at start/end)
 */
function updateCarouselButtons() {
    const prevBtn = document.getElementById('related-prev-btn');
    const nextBtn = document.getElementById('related-next-btn');
    
    if (prevBtn) {
        if (relatedProductsStartIndex === 0) {
            prevBtn.classList.add('opacity-50', 'cursor-not-allowed');
            prevBtn.disabled = true;
        } else {
            prevBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            prevBtn.disabled = false;
        }
    }
    
    if (nextBtn) {
        if (relatedProductsStartIndex + 4 >= relatedProducts.length) {
            nextBtn.classList.add('opacity-50', 'cursor-not-allowed');
            nextBtn.disabled = true;
        } else {
            nextBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            nextBtn.disabled = false;
        }
    }
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    // Color thumbnails - Click để chuyển màu
    document.addEventListener('click', (e) => {
        const colorThumb = e.target.closest('.color-thumbnail');
        if (colorThumb) {
            const colorName = colorThumb.dataset.color;
            if (colorName && colorName !== selectedColor) {
                // Update selected color
                selectedColor = colorName;
                updateSelectedColorName(selectedColor);
                
                // Load images for this color
                loadImagesForColor(selectedColor);
                
                // Update color button selection
                document.querySelectorAll('.color-btn').forEach(btn => {
                    if (btn.dataset.color === colorName) {
                        btn.classList.remove('border', 'border-gray-200');
                        btn.classList.add('border-2', 'border-primary', 'ring-offset-2', 'ring-1', 'ring-primary');
                    } else {
                        btn.classList.remove('border-2', 'border-primary', 'ring-offset-2', 'ring-1', 'ring-primary');
                        btn.classList.add('border', 'border-gray-200');
                    }
                });
                
                // Update thumbnail borders
                renderColorThumbnails();
            }
        }
    });
    
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
            
            // Load images for selected color
            loadImagesForColor(selectedColor);
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
    
    // Size guide button
    const sizeGuideBtn = document.getElementById('size-guide-btn');
    if (sizeGuideBtn) {
        sizeGuideBtn.addEventListener('click', showSizeGuide);
    }
    
    // Wishlist buttons on related products
    document.addEventListener('click', (e) => {
        const wishlistBtn = e.target.closest('.wishlist-btn');
        if (wishlistBtn) {
            e.preventDefault();
            e.stopPropagation();
            const productId = wishlistBtn.dataset.productId;
            toggleWishlistForRelated(productId, wishlistBtn);
        }
    });
    
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
    const colorNameEl = document.getElementById('selected-color-name');
    if (colorNameEl) {
        colorNameEl.textContent = colorName;
    }
}

/**
 * Load images for selected color
 */
function loadImagesForColor(colorName) {
    if (!currentProduct) return;
    
    let imagesToLoad = [];
    
    // Check if product has color-specific images
    if (currentProduct.colorImages && currentProduct.colorImages[colorName]) {
        imagesToLoad = currentProduct.colorImages[colorName];
    } else if (currentProduct.images && currentProduct.images.length > 0) {
        // Fallback to default images
        imagesToLoad = currentProduct.images;
    }
    
    if (imagesToLoad.length > 0) {
        // Update gallery with new images
        renderGallery(imagesToLoad);
        
        // Update color thumbnails to highlight selected color
        renderColorThumbnails();
        
        // Add smooth transition effect
        const mainImageDiv = document.querySelector('.w-full.h-full.bg-center.bg-no-repeat.bg-cover');
        if (mainImageDiv) {
            mainImageDiv.style.opacity = '0';
            setTimeout(() => {
                mainImageDiv.style.backgroundImage = `url("${imagesToLoad[0]}")`;
                mainImageDiv.style.transition = 'opacity 0.3s ease-in-out';
                mainImageDiv.style.opacity = '1';
            }, 150);
        }
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
async function handleAddToWishlist() {
    if (!currentProduct) return;
    
    const user = auth.currentUser;
    let wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
    const existingIndex = wishlist.findIndex(item => item.id === currentProduct.id);
    
    const btn = document.querySelector('button.border-2.border-gray-200 span.material-symbols-outlined');
    
    if (existingIndex >= 0) {
        // Remove from wishlist
        wishlist.splice(existingIndex, 1);
        if (btn) btn.textContent = 'favorite';
        window.showToast?.('Đã xóa khỏi danh sách yêu thích');
        
        // Xóa khỏi Firebase nếu đã đăng nhập
        if (user) {
            try {
                const wishlistItemRef = ref(database, `wishlist/${user.uid}/${currentProduct.id}`);
                await remove(wishlistItemRef);
                console.log('✅ Đã xóa khỏi Firebase wishlist');
            } catch (error) {
                console.error('❌ Lỗi xóa Firebase wishlist:', error);
            }
        }
    } else {
        // Add to wishlist
        const wishlistItem = {
            id: currentProduct.id,
            name: currentProduct.name,
            price: currentProduct.price,
            image: currentProduct.images?.[0] || '',
            addedAt: Date.now()
        };
        
        wishlist.push(wishlistItem);
        if (btn) btn.textContent = 'favorite';
        window.showToast?.('Đã thêm vào danh sách yêu thích');
        
        // Lưu lên Firebase nếu đã đăng nhập
        if (user) {
            try {
                const wishlistItemRef = ref(database, `wishlist/${user.uid}/${currentProduct.id}`);
                await set(wishlistItemRef, wishlistItem);
                console.log('✅ Đã lưu vào Firebase wishlist');
            } catch (error) {
                console.error('❌ Lỗi lưu Firebase wishlist:', error);
            }
        }
    }
    
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
}

/**
 * Toggle wishlist for related products
 */
async function toggleWishlistForRelated(productId, button) {
    const user = auth.currentUser;
    let wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
    const existingIndex = wishlist.findIndex(item => item.id === productId);
    
    const icon = button.querySelector('span.material-symbols-outlined');
    
    if (existingIndex >= 0) {
        // Remove from wishlist
        wishlist.splice(existingIndex, 1);
        if (icon) {
            icon.textContent = 'favorite';
            icon.classList.remove('text-red-500');
            icon.classList.add('text-gray-800');
        }
        window.showToast?.('Đã xóa khỏi yêu thích');
        
        // Xóa khỏi Firebase
        if (user) {
            try {
                const wishlistItemRef = ref(database, `wishlist/${user.uid}/${productId}`);
                await remove(wishlistItemRef);
            } catch (error) {
                console.error('❌ Lỗi xóa Firebase wishlist:', error);
            }
        }
    } else {
        // Add to wishlist - need to fetch product data from related products
        const relatedCard = button.closest('.group');
        const productName = relatedCard?.querySelector('h4')?.textContent || '';
        const productPrice = relatedCard?.querySelector('.font-bold.text-lg')?.textContent || '';
        const productImage = relatedCard?.querySelector('[style*="background-image"]')?.style.backgroundImage.match(/url\("(.+)"\)/)?.[1] || '';
        
        const wishlistItem = {
            id: productId,
            name: productName,
            price: parseFloat(productPrice.replace(/[^\d]/g, '')),
            image: productImage,
            addedAt: Date.now()
        };
        
        wishlist.push(wishlistItem);
        
        if (icon) {
            icon.textContent = 'favorite';
            icon.classList.remove('text-gray-800');
            icon.classList.add('text-red-500');
        }
        window.showToast?.('Đã thêm vào yêu thích');
        
        // Lưu lên Firebase
        if (user) {
            try {
                const wishlistItemRef = ref(database, `wishlist/${user.uid}/${productId}`);
                await set(wishlistItemRef, wishlistItem);
            } catch (error) {
                console.error('❌ Lỗi lưu Firebase wishlist:', error);
            }
        }
    }
    
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
}

/**
 * Show size guide modal
 */
function showSizeGuide() {
    window.showToast?.('Đang mở bảng hướng dẫn chọn size...', 'info');
    
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4';
    modal.innerHTML = `
        <div class="bg-white dark:bg-background-dark rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div class="sticky top-0 bg-white dark:bg-background-dark border-b border-gray-200 dark:border-white/10 p-6 flex items-center justify-between z-10">
                <h2 class="text-2xl font-bold">Bảng Hướng Dẫn Chọn Size</h2>
                <button class="close-modal text-gray-400 hover:text-gray-600 transition-colors">
                    <span class="material-symbols-outlined text-3xl">close</span>
                </button>
            </div>
            <div class="p-6">
                <p class="text-gray-500 mb-6">Chọn size phù hợp với chiều dài bàn chân của bạn (tính bằng cm):</p>
                <div class="overflow-x-auto">
                    <table class="w-full border-collapse">
                        <thead>
                            <tr class="bg-gray-50 dark:bg-white/5">
                                <th class="border border-gray-200 dark:border-gray-700 px-4 py-3 text-left font-bold">US Size</th>
                                <th class="border border-gray-200 dark:border-gray-700 px-4 py-3 text-left font-bold">EU Size</th>
                                <th class="border border-gray-200 dark:border-gray-700 px-4 py-3 text-left font-bold">UK Size</th>
                                <th class="border border-gray-200 dark:border-gray-700 px-4 py-3 text-left font-bold">Chiều dài (cm)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td class="border border-gray-200 dark:border-gray-700 px-4 py-2">US 7</td><td class="border border-gray-200 dark:border-gray-700 px-4 py-2">40</td><td class="border border-gray-200 dark:border-gray-700 px-4 py-2">6</td><td class="border border-gray-200 dark:border-gray-700 px-4 py-2">25.0</td></tr>
                            <tr><td class="border border-gray-200 dark:border-gray-700 px-4 py-2">US 8</td><td class="border border-gray-200 dark:border-gray-700 px-4 py-2">41</td><td class="border border-gray-200 dark:border-gray-700 px-4 py-2">7</td><td class="border border-gray-200 dark:border-gray-700 px-4 py-2">25.5</td></tr>
                            <tr><td class="border border-gray-200 dark:border-gray-700 px-4 py-2">US 9</td><td class="border border-gray-200 dark:border-gray-700 px-4 py-2">42</td><td class="border border-gray-200 dark:border-gray-700 px-4 py-2">8</td><td class="border border-gray-200 dark:border-gray-700 px-4 py-2">26.0</td></tr>
                            <tr><td class="border border-gray-200 dark:border-gray-700 px-4 py-2">US 10</td><td class="border border-gray-200 dark:border-gray-700 px-4 py-2">43</td><td class="border border-gray-200 dark:border-gray-700 px-4 py-2">9</td><td class="border border-gray-200 dark:border-gray-700 px-4 py-2">26.5</td></tr>
                            <tr><td class="border border-gray-200 dark:border-gray-700 px-4 py-2">US 11</td><td class="border border-gray-200 dark:border-gray-700 px-4 py-2">44</td><td class="border border-gray-200 dark:border-gray-700 px-4 py-2">10</td><td class="border border-gray-200 dark:border-gray-700 px-4 py-2">27.0</td></tr>
                            <tr><td class="border border-gray-200 dark:border-gray-700 px-4 py-2">US 12</td><td class="border border-gray-200 dark:border-gray-700 px-4 py-2">45</td><td class="border border-gray-200 dark:border-gray-700 px-4 py-2">11</td><td class="border border-gray-200 dark:border-gray-700 px-4 py-2">27.5</td></tr>
                            <tr><td class="border border-gray-200 dark:border-gray-700 px-4 py-2">US 13</td><td class="border border-gray-200 dark:border-gray-700 px-4 py-2">46</td><td class="border border-gray-200 dark:border-gray-700 px-4 py-2">12</td><td class="border border-gray-200 dark:border-gray-700 px-4 py-2">28.0</td></tr>
                        </tbody>
                    </table>
                </div>
                <div class="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h3 class="font-bold mb-2 flex items-center gap-2">
                        <span class="material-symbols-outlined text-blue-600">lightbulb</span>
                        Mẹo chọn size:
                    </h3>
                    <ul class="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
                        <li>Đo chân vào buổi chiều khi bàn chân có xu hướng sưng lên</li>
                        <li>Để lại khoảng trống 0.5-1cm ở phía trước ngón chân dài nhất</li>
                        <li>Nếu rơi vào giữa 2 size, chọn size lớn hơn</li>
                        <li>Đối với giày chạy bộ, nên chọn size lớn hơn 0.5-1 size so với giày thường</li>
                    </ul>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal
    modal.querySelector('.close-modal').addEventListener('click', () => {
        modal.remove();
    });
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
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
/**
 * Setup carousel navigation for related products
 */
function setupCarousel() {
    const relatedSection = document.querySelector('.mt-24.mb-12');
    if (!relatedSection) return;
    
    const leftBtn = relatedSection.querySelector('.flex.gap-2 button:first-child');
    const rightBtn = relatedSection.querySelector('.flex.gap-2 button:last-child');
    
    if (leftBtn && rightBtn) {
        leftBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (relatedProductsStartIndex > 0) {
                relatedProductsStartIndex = Math.max(0, relatedProductsStartIndex - 1);
                renderRelatedProductsCarousel();
            }
        });
        
        rightBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (relatedProductsStartIndex + 4 < relatedProducts.length) {
                relatedProductsStartIndex = Math.min(relatedProducts.length - 4, relatedProductsStartIndex + 1);
                renderRelatedProductsCarousel();
            }
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
            <div class="flex flex-col items-center justify-center py-20 px-4">
                <div class="size-24 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-6">
                    <span class="material-symbols-outlined text-5xl text-red-500">error</span>
                </div>
                <h2 class="text-3xl font-black mb-3 text-center">Không Tìm Thấy Sản Phẩm</h2>
                <p class="text-gray-500 mb-2 text-center">Sản phẩm bạn đang tìm không tồn tại hoặc đã bị xóa.</p>
                <p class="text-gray-400 text-sm mb-8 text-center">Vui lòng kiểm tra lại đường dẫn hoặc tìm kiếm sản phẩm khác.</p>
                <div class="flex flex-col sm:flex-row gap-4">
                    <a href="Product.html" class="bg-primary text-white px-8 py-3 rounded-lg font-bold hover:bg-[#c4141d] transition-colors inline-flex items-center justify-center gap-2">
                        <span class="material-symbols-outlined">storefront</span>
                        Về trang sản phẩm
                    </a>
                    <a href="index.html" class="bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 px-8 py-3 rounded-lg font-bold hover:bg-gray-200 dark:hover:bg-white/20 transition-colors inline-flex items-center justify-center gap-2">
                        <span class="material-symbols-outlined">home</span>
                        Về trang chủ
                    </a>
                </div>
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
    const blogId = getBlogIdFromUrl();
    
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
    
    // Load and render related products (prioritize blog featured products if available)
    let relatedProducts;
    if (blogId) {
        console.log(`📝 Loading featured products from blog: ${blogId}`);
        relatedProducts = await loadFeaturedProductsFromBlog(blogId, productId);
        
        // Update the related products title if coming from blog
        const relatedTitle = document.querySelector('h2');
        if (relatedTitle && relatedTitle.textContent === 'Sản Phẩm Khác') {
            relatedTitle.textContent = 'Sản Phẩm Được Đề Xuất';
            const relatedSubtitle = relatedTitle.nextElementSibling;
            if (relatedSubtitle) {
                relatedSubtitle.textContent = 'Các sản phẩm liên quan được giới thiệu trong bài viết.';
            }
        }
    } else {
        relatedProducts = await loadRelatedProducts(product.category, productId);
    }
    
    renderRelatedProducts(relatedProducts);
    
    // Initialize product reviews
    await initProductReviews(productId);
    
    // Setup event listeners
    setupEventListeners();
    
    console.log('✅ Product detail page initialized');
}

// Run on page load
document.addEventListener('DOMContentLoaded', init);

console.log('✅ Product detail module loaded');
