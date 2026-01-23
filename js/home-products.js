/**
 * MODULE SẢN PHẨM TRANG CHỦ
 * - Tải dữ liệu từ Firebase Realtime Database
 * - Hiển thị sản phẩm Flash Sale
 * - Hiển thị sản phẩm Bán chạy (Best Sellers)
 * - Hiển thị sản phẩm Mới (New Arrivals)
 */

import { getFirebaseDatabase } from './firebase-config.js';
import { ref, get } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

// Khởi tạo database
const database = getFirebaseDatabase();

// ============================================================================
// PHẦN 1: TẢI DỮ LIỆU (DATA LOADING)
// ============================================================================

/**
 * Tải sản phẩm Flash Sale
 * @param {number} limit - Số lượng sản phẩm tối đa
 * @returns {Promise<Array>} Danh sách sản phẩm
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
          // Điều kiện: Có giảm giá > 0 hoặc cờ isFlashSale = true
          return (product.discount && product.discount > 0) || product.isFlashSale;
        })
        .sort((a, b) => (b.discount || 0) - (a.discount || 0)) // Sắp xếp giảm dần theo mức giảm giá
        .slice(0, limit);
      
      console.log(`✅ Đã tải ${flashSaleProducts.length} sản phẩm Flash Sale`);
      return flashSaleProducts;
    }
    
    return [];
  } catch (error) {
    console.error('❌ Lỗi tải Flash Sale:', error);
    return [];
  }
}

/**
 * Tải sản phẩm Bán chạy (Best Sellers)
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
        .sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0)) // Sắp xếp theo số lượng bán
        .slice(0, limit);
      
      console.log(`✅ Đã tải ${bestSellers.length} sản phẩm Bán chạy`);
      return bestSellers;
    }
    
    return [];
  } catch (error) {
    console.error('❌ Lỗi tải Best Sellers:', error);
    return [];
  }
}

/**
 * Tải sản phẩm Mới (New Arrivals)
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
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)) // Sắp xếp theo ngày tạo mới nhất
        .slice(0, limit);
      
      console.log(`✅ Đã tải ${newArrivals.length} sản phẩm Mới`);
      return newArrivals;
    }
    
    return [];
  } catch (error) {
    console.error('❌ Lỗi tải New Arrivals:', error);
    return [];
  }
}

// ============================================================================
// PHẦN 2: HIỂN THỊ GIAO DIỆN (RENDERING)
// ============================================================================

/**
 * Định dạng tiền tệ Việt Nam (VND)
 */
function formatPrice(price) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(price);
}

/**
 * Render HTML cho Flash Sale
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
      : 'image/coming_soon.png';
    
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
                 onerror="this.src='image/coming_soon.png'"/>
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
 * Render HTML cho Best Sellers
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
      : 'image/coming_soon.png';

    return `
      <div class="group relative flex flex-col">
        <div class="relative aspect-square bg-[#f3f3f3] dark:bg-[#2a1a1b] rounded-xl overflow-hidden mb-4">
          <a href="Product-detail.html?id=${product.id}">
            <img class="w-full h-full object-contain p-8 group-hover:scale-110 transition-transform duration-500"
                 src="${mainImage}"
                 alt="${product.name}"
                 onerror="this.src='image/coming_soon.png'"/>
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
 * Render HTML cho New Arrivals
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
      : 'image/coming_soon.png';

    return `
      <div class="group relative flex flex-col">
        <div class="relative aspect-square bg-[#f3f3f3] dark:bg-[#2a1a1b] rounded-xl overflow-hidden mb-4">
          <a href="Product-detail.html?id=${product.id}">
            <img class="w-full h-full object-contain p-8 group-hover:scale-110 transition-transform duration-500"
                 src="${mainImage}"
                 alt="${product.name}"
                 onerror="this.src='image/coming_soon.png'"/>
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
 * Hiển thị khung xương (Skeleton Loading) khi đang tải
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
// PHẦN 3: KHỞI TẠO (INITIALIZATION)
// ============================================================================

async function init() {
  console.log('🚀 Đang khởi tạo trang chủ...');

  // 1. Hiển thị skeleton
  showLoadingSkeleton('flash-sale-products', 4);
  showLoadingSkeleton('best-sellers-products', 8);
  showLoadingSkeleton('new-arrivals-products', 8);

  // 2. Tải dữ liệu song song
  const [flashSale, bestSellers, newArrivals] = await Promise.all([
    loadFlashSaleProducts(4),
    loadBestSellers(8),
    loadNewArrivals(8)
  ]);

  // 3. Render dữ liệu
  renderFlashSale(flashSale);
  renderBestSellers(bestSellers);
  renderNewArrivals(newArrivals);

  console.log('✅ Trang chủ khởi tạo hoàn tất');
}

// Chạy khi trang load xong
document.addEventListener('DOMContentLoaded', init);

