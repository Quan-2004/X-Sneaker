/**
 * Checkout Logic
 * Handles cart summary display and order placement (COD & VNPay)
 */


import { initAuthStateObserver, getUserData } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
    const checkoutItemsContainer = document.getElementById('checkout-items');
    const subtotalEl = document.getElementById('checkout-subtotal');
    const taxEl = document.getElementById('checkout-tax');
    const totalEl = document.getElementById('checkout-total');
    const checkoutForm = document.getElementById('checkout-form');

    // --- VNPAY RETURN HANDLING - REMOVED ---

    // Auto-fill User Data
    // Auto-fill User Data
    initAuthStateObserver(async (user) => {
        if (user) {
            const userData = await getUserData(user.uid);
            if (userData) {
                if (document.getElementById('fullname')) document.getElementById('fullname').value = userData.displayName || '';
                
                // Fix: Key name is 'phone', not 'phoneNumber'
                if (document.getElementById('phone')) document.getElementById('phone').value = userData.phone || userData.phoneNumber || '';
                
                if (document.getElementById('email')) document.getElementById('email').value = userData.email || '';

                // Fix: Address is an object {street, ward, district, city}, not array or string
                const addr = userData.address;
                if (addr && typeof addr === 'object') {
                    // Fill City
                    if (document.getElementById('city')) document.getElementById('city').value = addr.city || '';
                    
                    // Fill Address (Street + Ward + District)
                    if (document.getElementById('address')) {
                        const addressParts = [addr.street, addr.ward, addr.district].filter(Boolean);
                        document.getElementById('address').value = addressParts.join(', ');
                    }
                } else if (userData.addresses && userData.addresses.length > 0) {
                     // Fallback for legacy array format if exists
                     if (document.getElementById('address')) document.getElementById('address').value = userData.addresses[0].fullAddress || '';
                } 
            }
        }
    });

    const TAX_RATE = 0.08;
    let _currentTotal = 0; // Biến lưu tổng tiền để dùng cho thanh toán

    // --- 1. Load Cart Summary ---
    function loadOrderSummary() {
        const cart = window.getCart ? window.getCart() : [];
        
        if (!cart || cart.length === 0) {
             window.location.href = 'Cart.html';
             return;
        }

        if (checkoutItemsContainer) {
            checkoutItemsContainer.innerHTML = '';
            
            cart.forEach(item => {
                const itemEl = document.createElement('div');
                itemEl.className = 'flex items-center justify-between text-sm';
                itemEl.innerHTML = `
                    <div class="flex items-center gap-3">
                        <div class="relative">
                            <img src="${item.image}" class="w-12 h-12 rounded bg-gray-100 object-cover">
                            <span class="absolute -top-2 -right-2 bg-gray-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">${item.quantity}</span>
                        </div>
                        <div>
                            <p class="font-bold text-[#1b0e0f] dark:text-white line-clamp-1">${item.name}</p>
                            <p class="text-xs text-[#974e52] dark:text-[#c48e91]">${item.size}</p>
                        </div>
                    </div>
                    <span class="font-bold text-[#1b0e0f] dark:text-white">${window.formatPrice(item.price * item.quantity)}</span>
                `;
                checkoutItemsContainer.appendChild(itemEl);
            });
        }

        // Calculate Totals
        let subtotal = 0;
        cart.forEach(item => subtotal += item.price * item.quantity);
        const tax = subtotal * TAX_RATE;
        _currentTotal = subtotal + tax;

        if (subtotalEl) subtotalEl.textContent = window.formatPrice(subtotal);
        if (taxEl) taxEl.textContent = window.formatPrice(tax);
        if (totalEl) totalEl.textContent = window.formatPrice(_currentTotal);
    }

    // --- 2. Handle Order Submission ---
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Validate inputs
            const fullname = document.getElementById('fullname').value;
            const email = document.getElementById('email').value;
            const phone = document.getElementById('phone').value;
            const address = document.getElementById('address').value;
            const city = document.getElementById('city').value;
            
            // Get selected payment method
            const paymentMethod = document.querySelector('input[name="payment-method"]:checked').value;

            if (!fullname || !email || !phone || !address || !city) {
                window.showToast('Vui lòng điền đầy đủ thông tin bắt buộc!', 'error');
                return;
            }

            // UI Loading State
            const submitBtn = checkoutForm.querySelector('button[type="submit"]');
            const originalBtnContent = submitBtn.innerHTML;
            
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<span class="material-symbols-outlined animate-spin">progress_activity</span> Đang xử lý...`;

            try {
                // XỬ LÝ THANH TOÁN

                    // 2. THANH TOÁN COD (Mặc định)
                    await new Promise(resolve => setTimeout(resolve, 2000)); // Fake delay

                    // Clear Cart
                    localStorage.removeItem('cart');
                    
                    // Show Success
                    submitBtn.innerHTML = `<span class="material-symbols-outlined">check</span> Thành công!`;
                    window.showToast('Đặt hàng thành công! Cảm ơn bạn đã mua sắm.');

                    // Redirect
                    setTimeout(() => {
                         window.location.href = 'index.html?orderSuccess=true';
                    }, 1500);

            } catch (error) {
                console.error('Checkout error:', error);
                window.showToast('Có lỗi xảy ra. Vui lòng thử lại.', 'error');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnContent;
            }
        });
    }

    // Initialize
    loadOrderSummary();
});

