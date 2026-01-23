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

    // --- 2. Toast Notification ---
    window.showToast = function(message) { // Make global
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
            <span class="material-symbols-outlined text-green-500">check_circle</span>
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

    // --- 3. Active Navigation Highlight ---
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('header nav a, .mobile-menu a');

    navLinks.forEach(link => {
        const linkPath = link.getAttribute('href');
        if (linkPath === currentPath) {
            link.classList.add('text-primary');
            link.classList.remove('text-white');
        }
    });

    // --- 4. Search Modal (Kept simple for now) ---
    const searchBtn = document.querySelector('button span.material-symbols-outlined:first-child')?.closest('button'); // Simple selector
    // ... Simplified Search or keep existing if needed. 
    // integrating basic search toggle from original script
    const searchModal = document.getElementById('search-modal');
    const closeSearchBtn = document.getElementById('close-search-btn');
    
    // Helper to toggle search (Re-implementing minimal logic for verify)
    if (searchBtn && searchModal && closeSearchBtn) {
         // Re-attach original logic if needed, or keeping it lightweight
         // For now, assuming user wants Cart focus, I'll keep the Search logic minimal or copy fully if critical.
         // Let's copy the modal toggle logic from original script.js efficiently
         const toggleSearch = () => {
             const isHidden = searchModal.classList.contains('hidden');
             if(isHidden) {
                 searchModal.classList.remove('hidden');
                 setTimeout(() => searchModal.classList.remove('opacity-0'), 10);
             } else {
                 searchModal.classList.add('opacity-0');
                 setTimeout(() => searchModal.classList.add('hidden'), 300);
             }
         };
         searchBtn.addEventListener('click', toggleSearch);
         closeSearchBtn.addEventListener('click', toggleSearch);
    }


    // --- 5. CART LOGIC (CORE) ---
    
    // Get Cart
    window.getCart = function() {
        return JSON.parse(localStorage.getItem('cart')) || [];
    }

    // Save Cart
    window.saveCart = function(cart) {
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartCount();
    }

    // Update Header Count
    function updateCartCount() {
        const cart = getCart();
        const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
        const badges = document.querySelectorAll('.shopping_cart_badge'); // Will need to add this class or selector
        // Using existing selector strategy
        const badgeElement = document.querySelector('a[href="Cart.html"] span.absolute');
        if (badgeElement) {
            badgeElement.textContent = totalCount;
            badgeElement.style.display = totalCount > 0 ? 'flex' : 'none';
        }
    }

    // Add To Cart
    window.addToCart = function(product) {
        let cart = getCart();
        const existingItem = cart.find(item => item.name === product.name && item.size === product.size);

        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({ ...product, quantity: 1 });
        }


        saveCart(cart);
        showToast(`Đã thêm <b>${product.name}</b> vào giỏ!`);
    }

    // Format Price helper
    window.formatPrice = function(price) {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
    }
    
    // Parse Price helper
    window.parsePrice = function(priceString) {
        // Remove non-digits
        return parseInt(priceString.replace(/\D/g, '')) || 0;
    }

    // --- 6. WISHLIST LOGIC ---
    
    // Get Wishlist
    window.getWishlist = function() {
        return JSON.parse(localStorage.getItem('wishlist')) || [];
    }

    // Save Wishlist
    window.saveWishlist = function(wishlist) {
        localStorage.setItem('wishlist', JSON.stringify(wishlist));
    }

    // Add to Wishlist
    window.addToWishlist = function(product) {
        let wishlist = getWishlist();
        const existingIndex = wishlist.findIndex(item => item.id === product.id);

        if (existingIndex >= 0) {
            // Already in wishlist, remove it
            wishlist.splice(existingIndex, 1);
            showToast(`Đã xóa <b>${product.name}</b> khỏi danh sách yêu thích`);
        } else {
            // Add to wishlist
            wishlist.push(product);
            showToast(`Đã thêm <b>${product.name}</b> vào danh sách yêu thích`);
        }

        saveWishlist(wishlist);
        return existingIndex < 0; // Return true if added, false if removed
    }

    // Check if product is in wishlist
    window.isInWishlist = function(productId) {
        const wishlist = getWishlist();
        return wishlist.some(item => item.id === productId);
    }

    // Initialize
    updateCartCount();

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
