/**
 * Checkout Logic
 * Handles cart summary display and order placement
 */

document.addEventListener('DOMContentLoaded', () => {
    const checkoutItemsContainer = document.getElementById('checkout-items');
    const subtotalEl = document.getElementById('checkout-subtotal');
    const taxEl = document.getElementById('checkout-tax');
    const totalEl = document.getElementById('checkout-total');
    const checkoutForm = document.getElementById('checkout-form');

    const TAX_RATE = 0.08;

    // --- 1. Load Cart Summary ---
    function loadOrderSummary() {
        const cart = window.getCart ? window.getCart() : [];
        
        if (!cart || cart.length === 0) {
            // If empty, redirect to cart or home
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
        const total = subtotal + tax;

        if (subtotalEl) subtotalEl.textContent = window.formatPrice(subtotal);
        if (taxEl) taxEl.textContent = window.formatPrice(tax);
        if (totalEl) totalEl.textContent = window.formatPrice(total);
    }

    // --- 2. Handle Order Submission ---
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Validate inputs (Basic HTML5 validation handles most, but we can check specific fields if needed)
            const fullname = document.getElementById('fullname').value;
            const email = document.getElementById('email').value;
            const phone = document.getElementById('phone').value;
            const address = document.getElementById('address').value;
            const city = document.getElementById('city').value;

            if (!fullname || !email || !phone || !address || !city) {
                window.showToast('Vui lòng điền đầy đủ thông tin bắt buộc!', 'error');
                return;
            }

            // Simulate Processing
            const submitBtn = checkoutForm.querySelector('button[type="submit"]');
            const originalBtnContent = submitBtn.innerHTML;
            
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<span class="material-symbols-outlined animate-spin">progress_activity</span> Đang xử lý...`;

            try {
                // Simulate API delay
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Process Order
                // 1. Clear Cart
                localStorage.removeItem('cart');
                
                // 2. Clear Wishlist?? No, keep wishlist.
                
                // 3. Show Success
                submitBtn.innerHTML = `<span class="material-symbols-outlined">check</span> Thành công!`;
                window.showToast('Đặt hàng thành công! Cảm ơn bạn đã mua sắm.');

                // 4. Redirect
                setTimeout(() => {
                    window.location.href = 'index.html'; // Or separate Success page
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
