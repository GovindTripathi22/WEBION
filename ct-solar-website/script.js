// ===== CT Solar - JavaScript =====

document.addEventListener('DOMContentLoaded', function () {
    // ===== Mobile Menu Toggle =====
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const nav = document.getElementById('nav');
    const navLinks = document.querySelectorAll('.nav-link');

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', function () {
            this.classList.toggle('active');
            nav.classList.toggle('active');
            document.body.style.overflow = nav.classList.contains('active') ? 'hidden' : '';
        });

        // Close mobile menu when clicking on a link
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                mobileMenuBtn.classList.remove('active');
                nav.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
    }

    // ===== Sticky Header =====
    const header = document.getElementById('header');

    window.addEventListener('scroll', function () {
        if (window.scrollY > 100) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // ===== Active Nav Link on Scroll =====
    const sections = document.querySelectorAll('section[id]');

    function highlightNavLink() {
        const scrollY = window.pageYOffset;

        sections.forEach(section => {
            const sectionHeight = section.offsetHeight;
            const sectionTop = section.offsetTop - 150;
            const sectionId = section.getAttribute('id');
            const navLink = document.querySelector(`.nav-link[href="#${sectionId}"]`);

            if (navLink) {
                if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
                    navLinks.forEach(link => link.classList.remove('active'));
                    navLink.classList.add('active');
                }
            }
        });
    }

    window.addEventListener('scroll', highlightNavLink);

    // ===== Smooth Scrolling =====
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                const headerHeight = header.offsetHeight;
                const targetPosition = targetElement.offsetTop - headerHeight;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // ===== Stats Counter Animation =====
    const statNumbers = document.querySelectorAll('.stat-number');
    let statsAnimated = false;

    function animateStats() {
        if (statsAnimated) return;

        statNumbers.forEach(stat => {
            const target = parseInt(stat.getAttribute('data-target'));
            const duration = 2000;
            const increment = target / (duration / 16);
            let current = 0;

            const updateCount = () => {
                current += increment;
                if (current < target) {
                    stat.textContent = Math.floor(current).toLocaleString();
                    requestAnimationFrame(updateCount);
                } else {
                    stat.textContent = target.toLocaleString();
                }
            };

            updateCount();
        });

        statsAnimated = true;
    }

    // Intersection Observer for Stats
    const statsSection = document.querySelector('.stats');

    if (statsSection) {
        const statsObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    animateStats();
                }
            });
        }, { threshold: 0.5 });

        statsObserver.observe(statsSection);
    }

    // ===== Testimonials Carousel =====
    const track = document.querySelector('.testimonials-track');
    const cards = document.querySelectorAll('.testimonial-card');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const dotsContainer = document.getElementById('testimonialsDots');

    if (track && cards.length > 0) {
        let currentIndex = 0;
        let cardsPerView = getCardsPerView();
        let maxIndex = Math.max(0, cards.length - cardsPerView);
        let autoSlideInterval;

        function getCardsPerView() {
            if (window.innerWidth <= 768) return 1;
            if (window.innerWidth <= 1024) return 2;
            return 3;
        }

        // Create dots
        function createDots() {
            dotsContainer.innerHTML = '';
            const numDots = maxIndex + 1;

            for (let i = 0; i < numDots; i++) {
                const dot = document.createElement('span');
                dot.classList.add('dot');
                if (i === 0) dot.classList.add('active');
                dot.addEventListener('click', () => goToSlide(i));
                dotsContainer.appendChild(dot);
            }
        }

        function updateDots() {
            const dots = dotsContainer.querySelectorAll('.dot');
            dots.forEach((dot, i) => {
                dot.classList.toggle('active', i === currentIndex);
            });
        }

        function goToSlide(index) {
            currentIndex = Math.max(0, Math.min(index, maxIndex));
            const cardWidth = cards[0].offsetWidth + 30; // Including gap
            track.style.transform = `translateX(-${currentIndex * cardWidth}px)`;
            updateDots();
        }

        function nextSlide() {
            if (currentIndex < maxIndex) {
                goToSlide(currentIndex + 1);
            } else {
                goToSlide(0);
            }
        }

        function prevSlide() {
            if (currentIndex > 0) {
                goToSlide(currentIndex - 1);
            } else {
                goToSlide(maxIndex);
            }
        }

        // Auto slide
        function startAutoSlide() {
            autoSlideInterval = setInterval(nextSlide, 5000);
        }

        function stopAutoSlide() {
            clearInterval(autoSlideInterval);
        }

        // Event listeners
        if (nextBtn) nextBtn.addEventListener('click', () => {
            stopAutoSlide();
            nextSlide();
            startAutoSlide();
        });

        if (prevBtn) prevBtn.addEventListener('click', () => {
            stopAutoSlide();
            prevSlide();
            startAutoSlide();
        });

        // Handle resize
        window.addEventListener('resize', () => {
            cardsPerView = getCardsPerView();
            maxIndex = Math.max(0, cards.length - cardsPerView);
            currentIndex = Math.min(currentIndex, maxIndex);
            createDots();
            goToSlide(currentIndex);
        });

        // Initialize
        createDots();
        startAutoSlide();

        // Touch support
        let touchStartX = 0;
        let touchEndX = 0;

        track.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            stopAutoSlide();
        }, { passive: true });

        track.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
            startAutoSlide();
        }, { passive: true });

        function handleSwipe() {
            const swipeThreshold = 50;
            const diff = touchStartX - touchEndX;

            if (diff > swipeThreshold) {
                nextSlide();
            } else if (diff < -swipeThreshold) {
                prevSlide();
            }
        }
    }

    // ===== Contact Form =====
    const contactForm = document.getElementById('contactForm');

    if (contactForm) {
        contactForm.addEventListener('submit', function (e) {
            e.preventDefault();

            // Get form data
            const formData = new FormData(this);
            const data = Object.fromEntries(formData.entries());

            // Basic validation
            if (!data.name || !data.phone || !data.monthlyBill || !data.propertyType) {
                alert('Please fill in all required fields.');
                return;
            }

            // Phone validation
            const phoneRegex = /^[+]?[\d\s-]{10,}$/;
            if (!phoneRegex.test(data.phone)) {
                alert('Please enter a valid phone number.');
                return;
            }

            // Show loading state
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.classList.add('loading');
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

            // Simulate form submission
            setTimeout(() => {
                // Replace form with success message
                const formWrapper = document.querySelector('.contact-form-wrapper');
                formWrapper.innerHTML = `
                    <div class="form-success">
                        <i class="fas fa-check-circle"></i>
                        <h3>Thank You!</h3>
                        <p>Your enquiry has been submitted successfully. Our solar experts will contact you within 24 hours.</p>
                    </div>
                `;
            }, 1500);
        });
    }

    // ===== Back to Top Button =====
    const backToTopBtn = document.getElementById('backToTop');

    if (backToTopBtn) {
        window.addEventListener('scroll', function () {
            if (window.scrollY > 500) {
                backToTopBtn.classList.add('visible');
            } else {
                backToTopBtn.classList.remove('visible');
            }
        });

        backToTopBtn.addEventListener('click', function () {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    // ===== Scroll Reveal Animation =====
    function revealOnScroll() {
        const reveals = document.querySelectorAll('.feature-card, .service-card, .stat-card, .testimonial-card, .partner-logo');

        reveals.forEach(element => {
            const windowHeight = window.innerHeight;
            const elementTop = element.getBoundingClientRect().top;
            const revealPoint = 150;

            if (elementTop < windowHeight - revealPoint) {
                element.classList.add('revealed');
            }
        });
    }

    // Add reveal class to elements
    document.querySelectorAll('.feature-card, .service-card, .stat-card, .partner-logo').forEach(el => {
        el.classList.add('reveal');
    });

    window.addEventListener('scroll', revealOnScroll);
    revealOnScroll(); // Initial check

    // ===== Parallax Effect for Hero =====
    const heroSection = document.querySelector('.hero');
    const heroBgImage = document.querySelector('.hero-bg-image');

    if (heroSection && heroBgImage) {
        window.addEventListener('scroll', function () {
            const scrolled = window.scrollY;
            if (scrolled < heroSection.offsetHeight) {
                heroBgImage.style.transform = `translateY(${scrolled * 0.4}px)`;
            }
        });
    }

    // ===== Form Input Animation =====
    const inputs = document.querySelectorAll('.form-group input, .form-group select, .form-group textarea');

    inputs.forEach(input => {
        input.addEventListener('focus', function () {
            this.parentElement.classList.add('focused');
        });

        input.addEventListener('blur', function () {
            if (!this.value) {
                this.parentElement.classList.remove('focused');
            }
        });
    });

    // ===== Preloader (Optional) =====
    // If you want to add a preloader, uncomment the following code
    /*
    window.addEventListener('load', function() {
        const preloader = document.querySelector('.preloader');
        if (preloader) {
            preloader.classList.add('hidden');
            setTimeout(() => {
                preloader.style.display = 'none';
            }, 500);
        }
    });
    */

    console.log('CT Solar Website Initialized Successfully!');
});

// ===== Service Worker Registration (Optional for PWA) =====
/*
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js')
            .then(function(registration) {
                console.log('ServiceWorker registered: ', registration.scope);
            })
            .catch(function(error) {
                console.log('ServiceWorker registration failed: ', error);
            });
    });
}
*/
