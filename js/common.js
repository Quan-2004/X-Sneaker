// Utility Functions (Available immediately)
window.getCart = function() {
    return JSON.parse(localStorage.getItem('cart')) || [];
}

window.saveCart = function(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
    window.updateCartCount && window.updateCartCount();
}

window.updateCartCount = function() {
    const cart = window.getCart();
    const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const badgeElement = document.querySelector('a[href="Cart.html"] span.absolute') || document.querySelector('.shopping_cart_badge');
    if (badgeElement) {
        badgeElement.textContent = totalCount;
        badgeElement.style.display = totalCount > 0 ? 'flex' : 'none';
        badgeElement.classList.add('shopping_cart_badge'); // Ensure class exists
    }
}

window.addToCart = function(product) {
    let cart = window.getCart();
    const existingItem = cart.find(item => item.name === product.name && item.size === product.size);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }

    window.saveCart(cart);
    window.showToast(`Đã thêm <b>${product.name}</b> vào giỏ!`);
}

window.formatPrice = function(price) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
}

window.parsePrice = function(priceString) {
    if (typeof priceString === 'number') return priceString;
    return parseInt(priceString.replace(/\D/g, '')) || 0;
}

window.getWishlist = function() {
    return JSON.parse(localStorage.getItem('wishlist')) || [];
}

window.saveWishlist = function(wishlist) {
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
}

window.addToWishlist = function(product) {
    let wishlist = window.getWishlist();
    const existingIndex = wishlist.findIndex(item => item.id === product.id);

    if (existingIndex >= 0) {
        wishlist.splice(existingIndex, 1);
        window.saveWishlist(wishlist);
        window.showToast(`Đã xóa <b>${product.name}</b> khỏi danh sách yêu thích`);
        return false; // Removed
    } else {
        wishlist.push(product);
        window.saveWishlist(wishlist);
        window.showToast(`Đã thêm <b>${product.name}</b> vào danh sách yêu thích`);
        return true; // Added
    }
}

window.isInWishlist = function(productId) {
    const wishlist = window.getWishlist();
    return wishlist.some(item => item.id === productId);
}

// Toast Notification Helper (Needs DOM, but function can be defined early)
window.showToast = function(message, type = 'success') {
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'fixed bottom-5 right-5 z-[100] flex flex-col gap-3';
        document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    toast.className = 'bg-black text-white px-6 py-4 rounded shadow-2xl flex items-center gap-3 transform translate-y-10 opacity-0 transition-all duration-300';
    toast.innerHTML = `
        <span class="material-symbols-outlined ${type === 'error' ? 'text-red-500' : 'text-green-500'}">${type === 'error' ? 'error' : 'check_circle'}</span>
        <span class="font-bold text-sm">${message}</span>
    `;

    toastContainer.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.remove('translate-y-10', 'opacity-0');
    });

    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-10');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}


document.addEventListener('DOMContentLoaded', () => {
    // --- 1. Mobile Menu Toggle ---
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const closeMenuBtn = document.getElementById('close-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');

    function toggleMenu() {
        if (!mobileMenu) return;
        const isHidden = mobileMenu.classList.contains('hidden');
        if (isHidden) {
            mobileMenu.classList.remove('hidden');
            mobileMenu.classList.add('flex');
            document.body.style.overflow = 'hidden';
        } else {
            mobileMenu.classList.add('hidden');
            mobileMenu.classList.remove('flex');
            document.body.style.overflow = '';
        }
    }

    if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', toggleMenu);
    if (closeMenuBtn) closeMenuBtn.addEventListener('click', toggleMenu);

    // --- 5. CART LOGIC (CORE) ---
    // Moved to global scope
    window.updateCartCount(); // Initial update

    // --- 6. WISHLIST LOGIC ---
    // Moved to global scope

    // Initialize


    // Global Event Listener for "Quick Add" buttons on Grid Items
    document.body.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        
        // Check if it's an "Add to Cart" button (inner text check)
        const btnText = btn.innerText.toUpperCase();
        if (btnText.includes('THÊM NHANH') || (btnText.includes('THÊM VÀO GIỎ') && !btn.closest('.w-full.lg\\:w-2\\/5'))) { // Exclude detail page main button which needs specific size logic
            // Find product card context
            const card = btn.closest('.group');
            if (card) {
                const name = card.querySelector('h3')?.innerText;
                const priceStr = card.querySelector('.text-primary')?.innerText;
                const img = card.querySelector('img')?.src;
                
                if (name && priceStr) {
                    const price = parsePrice(priceStr);
                    addToCart({
                        id: Date.now(), // Generate rough ID
                        name: name,
                        price: price,
                        image: img,
                        size: 'Free Size' // Default for quick add
                    });
                }
            }
        }
    });

});
