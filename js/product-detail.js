document.addEventListener('DOMContentLoaded', () => {
    // Handling Size Selection
    const sizeButtons = document.querySelectorAll('.grid.grid-cols-4.gap-2 button:not([disabled])');
    let selectedSize = null;

    sizeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Reset others
            sizeButtons.forEach(b => {
                b.classList.remove('border-primary', 'bg-primary/5', 'text-primary');
                b.classList.add('border-gray-200', 'dark:border-gray-700');
            });
            
            // Activate current
            btn.classList.remove('border-gray-200', 'dark:border-gray-700');
            btn.classList.add('border-primary', 'bg-primary/5', 'text-primary');
            
            selectedSize = btn.innerText;
        });
    });

    // Add to Cart Button on Detail Page
    const addToCartBtn = document.querySelector('button.w-full.bg-primary');
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Stop bubbling to body handler

            if (!selectedSize) {
                alert('Vui lòng chọn kích thước!');
                return;
            }

            const name = document.querySelector('h1').innerText;
            const priceStr = document.querySelector('.text-primary.text-3xl').innerText;
            const image = document.querySelector('.cursor-zoom-in').style.backgroundImage.slice(5, -2); // Extract url("...")

            window.addToCart({
                id: Date.now(),
                name: name,
                price: window.parsePrice(priceStr),
                image: image,
                size: selectedSize
            });
        });
    }
});
