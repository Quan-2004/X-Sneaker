/**
 * Cart Functionality for X-Sneaker
 * Handles rendering cart items, updating quantities, removing items, and calculating totals.
 */

document.addEventListener('DOMContentLoaded', () => {
    const cartContainer = document.getElementById('cart-items-container');
    const subtotalEl = document.getElementById('cart-subtotal');
    const taxEl = document.getElementById('cart-tax');
    const totalEl = document.getElementById('cart-total');

    // Tax rate (8%)
    const TAX_RATE = 0.08;

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

        const tax = subtotal * TAX_RATE;
        const total = subtotal + tax; // Shipping is free as per UI

        updateTotals(subtotal, tax, total);
    }

    function updateTotals(subtotal, tax = 0, total = 0) {
        if (subtotalEl) subtotalEl.textContent = window.formatPrice(subtotal);
        if (taxEl) taxEl.textContent = window.formatPrice(tax);
        if (totalEl) totalEl.textContent = window.formatPrice(total);
    }

    // Initialize
    renderCart();

    // Listen for cart updates (e.g. from header)
    window.addEventListener('storage', () => {
        renderCart();
    });
});
