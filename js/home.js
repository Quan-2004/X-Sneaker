document.addEventListener('DOMContentLoaded', () => {
    // --- Flash Sale Countdown ---
    const endHours = 2; 
    const endMinutes = 45;
    const endSeconds = 30;
    let totalSeconds = endHours * 3600 + endMinutes * 60 + endSeconds;

    function updateCountdown() {
        const hoursElement = document.getElementById('hours');
        const minutesElement = document.getElementById('minutes');
        const secondsElement = document.getElementById('seconds');

        if (!hoursElement || !minutesElement || !secondsElement) return;

        if (totalSeconds <= 0) {
            totalSeconds = 0;
        }

        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;

        hoursElement.innerText = h < 10 ? '0' + h : h;
        minutesElement.innerText = m < 10 ? '0' + m : m;
        secondsElement.innerText = s < 10 ? '0' + s : s;

        totalSeconds--;
    }

    setInterval(updateCountdown, 1000);
    updateCountdown();

    // --- Hero Slider ---
    const sliderContainer = document.querySelector('.slider-container');
    const slides = document.querySelectorAll('.slide');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const dots = document.querySelectorAll('#slider-dots .dot');
    
    if (sliderContainer && slides.length > 0) {
        let currentSlide = 0;
        const slideCount = slides.length;
        let autoSlideInterval;

        function updateSlider() {
            sliderContainer.style.transform = `translateX(-${currentSlide * 100}%)`;
            
            slides.forEach((slide, index) => {
                if (index === currentSlide) {
                    slide.classList.add('active');
                } else {
                    slide.classList.remove('active');
                }
            });

            dots.forEach((dot, index) => {
                if (index === currentSlide) {
                    dot.classList.add('active', 'bg-white/100');
                    dot.classList.remove('bg-white/30');
                } else {
                    dot.classList.remove('active', 'bg-white/100');
                    dot.classList.add('bg-white/30');
                }
            });
        }

        function nextSlide() {
            currentSlide = (currentSlide + 1) % slideCount;
            updateSlider();
        }

        function prevSlide() {
            currentSlide = (currentSlide - 1 + slideCount) % slideCount;
            updateSlider();
        }

        function startAutoSlide() {
            stopAutoSlide();
            autoSlideInterval = setInterval(nextSlide, 5000);
        }

        function stopAutoSlide() {
            if (autoSlideInterval) clearInterval(autoSlideInterval);
        }

        if (nextBtn) nextBtn.addEventListener('click', () => {
            nextSlide();
            startAutoSlide();
        });

        if (prevBtn) prevBtn.addEventListener('click', () => {
            prevSlide();
            startAutoSlide();
        });

        dots.forEach(dot => {
            dot.addEventListener('click', () => {
                currentSlide = parseInt(dot.getAttribute('data-index'));
                updateSlider();
                startAutoSlide();
            });
        });

        updateSlider();
        startAutoSlide();
    }
});
