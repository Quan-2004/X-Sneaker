/**
 * Cart Functionality for X-Sneaker
 * Handles rendering cart items, updating quantities, removing items, and calculating totals.
 */

import { getFirebaseDatabase } from './firebase-config.js';
import { ref, get } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

const database = getFirebaseDatabase();

document.addEventListener('DOMContentLoaded', () => {
    const cartContainer = document.getElementById('cart-items-container');
    const subtotalEl = document.getElementById('cart-subtotal');
    const discountEl = document.getElementById('cart-discount');
    const discountRowEl = document.getElementById('discount-row');
    const taxEl = document.getElementById('cart-tax');
    const totalEl = document.getElementById('cart-total');
    const couponInput = document.getElementById('coupon-input');
    const applyCouponBtn = document.getElementById('apply-coupon-btn');
    const removeCouponBtn = document.getElementById('remove-coupon-btn');
    const couponMessage = document.getElementById('coupon-message');
    const appliedCouponBox = document.getElementById('applied-coupon');
    const couponNameEl = document.getElementById('coupon-name');
    const couponDescEl = document.getElementById('coupon-description');

    // Tax rate (8%)
    const TAX_RATE = 0.08;
    
    // Applied coupon state
    let appliedCoupon = null;

    /**
     * Render the cart items
     */
    function renderCart() {
        const cart = window.getCart ? window.getCart() : [];
        
        if (!cartContainer) return;

        cartContainer.innerHTML = '';

        if (cart.length === 0) {
            cartContainer.innerHTML = `
                <div class="text-center py-10">
                    <span class="material-symbols-outlined text-6xl text-gray-300 mb-4">shopping_cart_off</span>
                    <p class="text-gray-500 text-lg">Giỏ hàng của bạn đang trống.</p>
                    <a href="Product.html" class="inline-block mt-4 px-6 py-2 bg-primary text-white rounded-lg hover:bg-red-700 transition-colors">Mua sắm ngay</a>
                </div>
            `;
            updateTotals(0);
            return;
        }

        cart.forEach((item, index) => {
            const itemElement = document.createElement('div');
            itemElement.className = 'flex flex-col sm:flex-row items-center gap-4 p-4 bg-white dark:bg-[#2d1a1b] rounded-xl border border-[#f3e7e8] dark:border-[#3a2526] transition-all hover:shadow-md';
            
            itemElement.innerHTML = `
                <div class="w-full sm:w-24 h-24 bg-gray-100 dark:bg-black rounded-lg overflow-hidden shrink-0">
                    <img src="${item.image}" alt="${item.name}" class="w-full h-full object-cover">
                </div>
                
                <div class="flex-1 w-full text-center sm:text-left">
                    <h3 class="font-bold text-[#1b0e0f] dark:text-white text-lg leading-tight mb-1">${item.name}</h3>
                    <p class="text-sm text-[#974e52] dark:text-[#c48e91] mb-2">Size: ${item.size}</p>
                    <div class="font-extrabold text-primary text-lg">${window.formatPrice(item.price)}</div>
                </div>

                <div class="flex items-center gap-3">
                    <div class="flex items-center border border-[#d1c2c3] dark:border-[#3a2526] rounded-lg overflow-hidden">
                        <button class="px-3 py-1 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors btn-decrease" data-index="${index}">-</button>
                        <input type="number" value="${item.quantity}" min="1" class="w-12 text-center border-none bg-transparent text-sm font-bold focus:ring-0 p-0" readonly>
                        <button class="px-3 py-1 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors btn-increase" data-index="${index}">+</button>
                    </div>
                </div>

                <button class="p-2 text-gray-400 hover:text-red-500 transition-colors btn-remove" data-index="${index}">
                    <span class="material-symbols-outlined">delete</span>
                </button>
            `;
            
            cartContainer.appendChild(itemElement);
        });

        // Add Event Listeners for buttons
        document.querySelectorAll('.btn-decrease').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                updateQuantity(index, -1);
            });
        });

        document.querySelectorAll('.btn-increase').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                updateQuantity(index, 1);
            });
        });

        document.querySelectorAll('.btn-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.dataset.index); // Use currentTarget for button with icon
                removeItem(index);
            });
        });

        calculateTotals(cart);
    }

    /**
     * Update item quantity
     */
    function updateQuantity(index, change) {
        let cart = window.getCart();
        if (cart[index]) {
            cart[index].quantity += change;
            
            if (cart[index].quantity < 1) {
                cart[index].quantity = 1; // Minimum 1, use delete to remove
            }
            
            window.saveCart(cart);
            renderCart();
        }
    }

    /**
     * Remove item from cart
     */
    function removeItem(index) {
        let cart = window.getCart();
        cart.splice(index, 1);
        window.saveCart(cart);
        renderCart();
        window.showToast('Đã xóa sản phẩm khỏi giỏ hàng');
    }

    /**
     * Calculate and display totals
     */
    function calculateTotals(cart) {
        let subtotal = 0;
        cart.forEach(item => {
            subtotal += item.price * item.quantity;
        });

        let discount = 0;
        if (appliedCoupon) {
            discount = calculateDiscount(subtotal, appliedCoupon);
        }

        const afterDiscount = subtotal - discount;
        const tax = afterDiscount * TAX_RATE;
        const total = afterDiscount + tax; // Shipping is free as per UI

        updateTotals(subtotal, discount, tax, total);
    }

    function updateTotals(subtotal, discount = 0, tax = 0, total = 0) {
        if (subtotalEl) subtotalEl.textContent = window.formatPrice(subtotal);
        
        if (discount > 0) {
            if (discountRowEl) discountRowEl.classList.remove('hidden');
            if (discountEl) discountEl.textContent = '-' + window.formatPrice(discount);
        } else {
            if (discountRowEl) discountRowEl.classList.add('hidden');
        }
        
        if (taxEl) taxEl.textContent = window.formatPrice(tax);
        if (totalEl) totalEl.textContent = window.formatPrice(total);
    }

    /**
     * Calculate discount amount based on coupon
     */
    function calculateDiscount(subtotal, coupon) {
        let discount = 0;
        
        if (coupon.type === 'percentage') {
            discount = subtotal * (coupon.value / 100);
            // Apply max discount limit if exists
            if (coupon.maxDiscount && discount > coupon.maxDiscount) {
                discount = coupon.maxDiscount;
            }
        } else if (coupon.type === 'fixed') {
            discount = coupon.value;
        }
        
        // Discount cannot exceed subtotal
        return Math.min(discount, subtotal);
    }

    /**
     * Validate and apply coupon code
     */
    async function applyCoupon() {
        const code = couponInput.value.trim().toUpperCase();
        
        if (!code) {
            showCouponMessage('Vui lòng nhập mã giảm giá', 'error');
            return;
        }

        try {
            applyCouponBtn.disabled = true;
            applyCouponBtn.textContent = 'Đang xử lý...';
            
            // Fetch promotions from Firebase
            const promotionsRef = ref(database, 'promotions');
            const snapshot = await get(promotionsRef);
            
            if (!snapshot.exists()) {
                showCouponMessage('Mã giảm giá không hợp lệ', 'error');
                return;
            }
            
            const promotions = snapshot.val();
            let foundCoupon = null;
            
            // Find matching coupon
            for (const [key, promo] of Object.entries(promotions)) {
                if (promo.code === code) {
                    foundCoupon = { id: key, ...promo };
                    break;
                }
            }
            
            if (!foundCoupon) {
                showCouponMessage('Mã giảm giá không hợp lệ', 'error');
                return;
            }
            
            // Validate coupon
            const now = Date.now();
            
            if (!foundCoupon.active) {
                showCouponMessage('Mã giảm giá đã hết hạn sử dụng', 'error');
                return;
            }
            
            if (foundCoupon.startDate && now < foundCoupon.startDate) {
                showCouponMessage('Mã giảm giá chưa bắt đầu', 'error');
                return;
            }
            
            if (foundCoupon.endDate && now > foundCoupon.endDate) {
                showCouponMessage('Mã giảm giá đã hết hạn', 'error');
                return;
            }
            
            if (foundCoupon.usageLimit && foundCoupon.usageCount >= foundCoupon.usageLimit) {
                showCouponMessage('Mã giảm giá đã hết lượt sử dụng', 'error');
                return;
            }
            
            // Check minimum order value
            const cart = window.getCart();
            const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            
            if (foundCoupon.minOrder && subtotal < foundCoupon.minOrder) {
                showCouponMessage(`Đơn hàng tối thiểu ${window.formatPrice(foundCoupon.minOrder)} để áp dụng mã này`, 'error');
                return;
            }
            
            // Apply coupon
            appliedCoupon = foundCoupon;
            couponInput.value = '';
            showAppliedCoupon();
            calculateTotals(cart);
            showCouponMessage('Áp dụng mã giảm giá thành công!', 'success');
            
            // Save to localStorage for checkout page
            localStorage.setItem('appliedCoupon', JSON.stringify(appliedCoupon));
            
        } catch (error) {
            console.error('Error applying coupon:', error);
            showCouponMessage('Có lỗi xảy ra. Vui lòng thử lại!', 'error');
        } finally {
            applyCouponBtn.disabled = false;
            applyCouponBtn.textContent = 'Áp Dụng';
        }
    }

    /**
     * Remove applied coupon
     */
    function removeCoupon() {
        appliedCoupon = null;
        appliedCouponBox.classList.add('hidden');
        const cart = window.getCart();
        calculateTotals(cart);
        showCouponMessage('Đã xóa mã giảm giá', 'success');
        localStorage.removeItem('appliedCoupon');
    }

    /**
     * Show coupon message (success/error)
     */
    function showCouponMessage(message, type) {
        couponMessage.textContent = message;
        couponMessage.classList.remove('hidden', 'text-red-600', 'text-green-600');
        couponMessage.classList.add(type === 'error' ? 'text-red-600' : 'text-green-600');
        
        setTimeout(() => {
            couponMessage.classList.add('hidden');
        }, 3000);
    }

    /**
     * Display applied coupon info
     */
    function showAppliedCoupon() {
        if (!appliedCoupon) return;
        
        couponNameEl.textContent = appliedCoupon.code;
        couponDescEl.textContent = appliedCoupon.description || appliedCoupon.name;
        appliedCouponBox.classList.remove('hidden');
    }

    /**
     * Load saved coupon from localStorage
     */
    function loadSavedCoupon() {
        const saved = localStorage.getItem('appliedCoupon');
        if (saved) {
            try {
                appliedCoupon = JSON.parse(saved);
                showAppliedCoupon();
                const cart = window.getCart();
                calculateTotals(cart);
            } catch (e) {
                console.error('Error loading saved coupon:', e);
                localStorage.removeItem('appliedCoupon');
            }
        }
    }

    // Initialize
    renderCart();
    loadSavedCoupon();

    // Event listeners for coupon
    if (applyCouponBtn) {
        applyCouponBtn.addEventListener('click', applyCoupon);
    }
    
    if (removeCouponBtn) {
        removeCouponBtn.addEventListener('click', removeCoupon);
    }
    
    if (couponInput) {
        couponInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                applyCoupon();
            }
        });
    }

    // Listen for cart updates (e.g. from header)
    window.addEventListener('storage', () => {
        renderCart();
    });
});
