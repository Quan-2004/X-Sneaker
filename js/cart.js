document.addEventListener('DOMContentLoaded', () => {
    const cartItemsContainer = document.querySelector('.space-y-4'); // Needs better selector in HTML update
    // We will target the container more specifically after HTML update, but for now let's assume class presence
    const subtotalEl = document.querySelector('#cart-subtotal') || createSummaryId('Tạm tính').nextElementSibling;
    const totalEl = document.querySelector('.text-primary.text-xl') || document.querySelector('#cart-total'); // Will update HTML to have IDs

    function renderCart() {
        // Find the container. Ideally we add ID 'cart-items-container' in HTML
        const container = document.getElementById('cart-items-container');
        if (!container) return; // Wait for HTML update

        const cart = window.getCart();
        container.innerHTML = '';

        if (cart.length === 0) {
            container.innerHTML = '<div class="text-center py-10"><p class="text-gray-500">Giỏ hàng của bạn đang trống</p><a href="Product.html" class="text-primary font-bold mt-4 inline-block">Mua sắm ngay</a></div>';
            updateTotals(0);
            return;
        }

        let subtotal = 0;

        cart.forEach((item, index) => {
            const itemTotal = item.price * item.quantity;
            subtotal += itemTotal;

            const html = `
                <div class="flex flex-col sm:flex-row gap-4 bg-white dark:bg-[#2d1a1b] p-4 rounded-xl border border-[#f3e7e8] dark:border-[#3a2526] shadow-sm">
                    <div class="flex items-start gap-4 flex-1">
                        <div class="bg-center bg-no-repeat aspect-square bg-cover rounded-lg size-[100px] shrink-0" style='background-image: url("${item.image}");'></div>
                        <div class="flex flex-1 flex-col justify-between py-1">
                            <div>
                                <div class="flex justify-between">
                                    <a href="#" class="hover:text-primary transition-colors">
                                        <p class="text-[#1b0e0f] dark:text-white text-lg font-bold">${item.name}</p>
                                    </a>
                                    <button onclick="removeItem(${index})" class="text-[#974e52] hover:text-primary transition-colors">
                                        <span class="material-symbols-outlined text-xl">delete</span>
                                    </button>
                                </div>
                                <p class="text-[#974e52] dark:text-[#c48e91] text-sm font-medium">Size: ${item.size}</p>
                            </div>
                            <div class="flex items-center justify-between mt-4">
                                <p class="text-primary text-lg font-bold">${window.formatPrice(item.price)}</p>
                                <div class="flex items-center gap-3 text-[#1b0e0f] dark:text-white">
                                    <button onclick="updateQuantity(${index}, -1)" class="flex h-8 w-8 items-center justify-center rounded-lg bg-background-light dark:bg-[#3a2526] hover:bg-primary/10 hover:text-primary transition-colors">-</button>
                                    <span class="text-base font-bold w-4 text-center">${item.quantity}</span>
                                    <button onclick="updateQuantity(${index}, 1)" class="flex h-8 w-8 items-center justify-center rounded-lg bg-background-light dark:bg-[#3a2526] hover:bg-primary/10 hover:text-primary transition-colors">+</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            container.innerHTML += html;
        });

        updateTotals(subtotal);
    }

    function updateTotals(subtotal) {
        const subtotalEl = document.getElementById('cart-subtotal');
        const totalEl = document.getElementById('cart-total');
        const taxEl = document.getElementById('cart-tax');

        if (subtotalEl) subtotalEl.innerText = window.formatPrice(subtotal);
        
        const tax = subtotal * 0.08; // 8% VAT example
        if (taxEl) taxEl.innerText = window.formatPrice(tax);

        const total = subtotal + tax; // Free shipping
        if (totalEl) totalEl.innerText = window.formatPrice(total);
    }

    // Expose helpers to global scope for onclick handlers (simple approach)
    window.removeItem = function(index) {
        let cart = window.getCart();
        cart.splice(index, 1);
        window.saveCart(cart);
        renderCart();
    }

    window.updateQuantity = function(index, change) {
        let cart = window.getCart();
        const item = cart[index];
        const newQty = item.quantity + change;
        
        if (newQty > 0) {
            item.quantity = newQty;
            window.saveCart(cart);
            renderCart();
        } else {
            // Optional: confirm delete?
            // For now do nothing or remove
        }
    }

    // Helper to find elements if IDs missing (temporary)
    function createSummaryId(text) {
        const spans = Array.from(document.querySelectorAll('span'));
        return spans.find(s => s.innerText.includes(text));
    }

    renderCart();
});
