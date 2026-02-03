/**
 * Checkout Logic
 * Handles cart summary display and order placement (COD & QR Transfer)
 */

import { initAuthStateObserver, getUserData } from './auth.js';
import { getFirebaseAuth, getFirebaseDatabase } from './firebase-config.js';
import { ref, push, set } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";
import { showQRPaymentModal } from './qr-payment.js';

const auth = getFirebaseAuth();
const database = getFirebaseDatabase();

document.addEventListener('DOMContentLoaded', () => {
    const checkoutItemsContainer = document.getElementById('checkout-items');
    const subtotalEl = document.getElementById('checkout-subtotal');
    const taxEl = document.getElementById('checkout-tax');
    const totalEl = document.getElementById('checkout-total');
    const checkoutForm = document.getElementById('checkout-form');

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
                const cart = window.getCart ? window.getCart() : [];
                const user = auth.currentUser;
                
                // Tạo order data
                const orderData = {
                    userId: user ? user.uid : 'guest',
                    userEmail: user ? user.email : email,
                    orderId: 'ORD-' + Date.now(),
                    customerInfo: {
                        fullname,
                        email,
                        phone,
                        address,
                        city
                    },
                    customerName: fullname,
                    customerPhone: phone,
                    items: cart.map(item => ({
                        id: item.id || '',
                        name: item.name || 'Sản phẩm',
                        price: item.price || 0,
                        quantity: item.quantity || 1,
                        size: item.size || '',
                        color: item.color || '',
                        image: item.image || ''
                    })),
                    total: _currentTotal,
                    subtotal: _currentTotal / (1 + TAX_RATE),
                    tax: _currentTotal - (_currentTotal / (1 + TAX_RATE)),
                    paymentMethod: paymentMethod === 'qr-transfer' ? 'QR Transfer' : 'COD',
                    status: paymentMethod === 'qr-transfer' ? 'pending' : 'processing',
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                };

                // XỬ LÝ THEO PHƯƠNG THỨC THANH TOÁN
                if (paymentMethod === 'qr-transfer') {
                    // ===== THANH TOÁN QR CODE =====
                    submitBtn.innerHTML = originalBtnContent;
                    submitBtn.disabled = false;

                    // Hiển thị QR Modal
                    showQRPaymentModal(
                        orderData.orderId,
                        Math.round(_currentTotal),
                        async () => {
                            // Callback khi thanh toán thành công
                            submitBtn.disabled = true;
                            submitBtn.innerHTML = `<span class="material-symbols-outlined animate-spin">progress_activity</span> Đang lưu đơn hàng...`;

                            try {
                                // Lưu đơn hàng vào Firebase với status 'pending'
                                const ordersRef = ref(database, 'orders');
                                const newOrderRef = push(ordersRef);
                                await set(newOrderRef, orderData);
                                console.log('✅ Đơn hàng QR đã được lưu:', orderData.orderId);

                                // Clear Cart
                                localStorage.removeItem('cart');
                                
                                // Show Success
                                submitBtn.innerHTML = `<span class="material-symbols-outlined">check</span> Thành công!`;
                                window.showToast('Thanh toán thành công! Đơn hàng đang chờ xử lý.');

                                // Redirect
                                setTimeout(() => {
                                    window.location.href = 'Account.html?tab=orders&orderSuccess=true';
                                }, 1500);
                            } catch (saveError) {
                                console.error('❌ Lỗi lưu đơn hàng:', saveError);
                                window.showToast('Thanh toán thành công nhưng không thể lưu đơn hàng. Vui lòng liên hệ CSKH.', 'error');
                                submitBtn.disabled = false;
                                submitBtn.innerHTML = originalBtnContent;
                            }
                        },
                        () => {
                            // Callback khi hủy thanh toán
                            submitBtn.disabled = false;
                            submitBtn.innerHTML = originalBtnContent;
                            window.showToast('Đã hủy thanh toán QR', 'error');
                        }
                    );

                } else {
                    // ===== THANH TOÁN COD (Mặc định) =====
                    await new Promise(resolve => setTimeout(resolve, 1000)); // Fake delay

                    // Lưu đơn hàng vào Firebase
                    try {
                        const ordersRef = ref(database, 'orders');
                        const newOrderRef = push(ordersRef);
                        await set(newOrderRef, orderData);
                        console.log('✅ Đơn hàng COD đã được lưu:', orderData.orderId);
                    } catch (saveError) {
                        console.error('❌ Lỗi lưu đơn hàng:', saveError);
                        // Vẫn cho phép tiếp tục nếu lưu Firebase thất bại
                    }

                    // Clear Cart
                    localStorage.removeItem('cart');
                    
                    // Show Success
                    submitBtn.innerHTML = `<span class="material-symbols-outlined">check</span> Thành công!`;
                    window.showToast('Đặt hàng thành công! Cảm ơn bạn đã mua sắm.');

                    // Redirect
                    setTimeout(() => {
                        window.location.href = 'Account.html?tab=orders&orderSuccess=true';
                    }, 1500);
                }

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

