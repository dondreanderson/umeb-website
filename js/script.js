// ========================================
// UMEB - United Men Empowering Brotherhood
// Interactive JavaScript
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    
    // ========================================
    // Navigation
    // ========================================
    const navbar = document.getElementById('navbar');
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');
    const navLinks = document.querySelectorAll('.nav-link');
    
    // Mobile menu toggle
    navToggle.addEventListener('click', function() {
        navMenu.classList.toggle('active');
        
        // Animate hamburger
        const spans = navToggle.querySelectorAll('span');
        if (navMenu.classList.contains('active')) {
            spans[0].style.transform = 'rotate(45deg) translateY(8px)';
            spans[1].style.opacity = '0';
            spans[2].style.transform = 'rotate(-45deg) translateY(-8px)';
        } else {
            spans[0].style.transform = 'none';
            spans[1].style.opacity = '1';
            spans[2].style.transform = 'none';
        }
    });
    
    // Close mobile menu when clicking a link
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            navMenu.classList.remove('active');
            const spans = navToggle.querySelectorAll('span');
            spans[0].style.transform = 'none';
            spans[1].style.opacity = '1';
            spans[2].style.transform = 'none';
        });
    });
    
    // Navbar scroll effect
    window.addEventListener('scroll', function() {
        if (window.scrollY > 100) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
    
    // Smooth scroll for navigation links
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId.startsWith('#')) {
                const targetSection = document.querySelector(targetId);
                if (targetSection) {
                    const offsetTop = targetSection.offsetTop - 80;
                    window.scrollTo({
                        top: offsetTop,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });
    
    // ========================================
    // Animated Counter for Stats
    // ========================================
    const statNumbers = document.querySelectorAll('.stat-number');
    let countersAnimated = false;
    
    function animateCounters() {
        if (countersAnimated) return;
        
        statNumbers.forEach(stat => {
            const target = parseInt(stat.getAttribute('data-target'));
            const increment = target / 100;
            let current = 0;
            
            const updateCounter = setInterval(() => {
                current += increment;
                if (current >= target) {
                    stat.textContent = target + '+';
                    clearInterval(updateCounter);
                } else {
                    stat.textContent = Math.floor(current);
                }
            }, 20);
        });
        
        countersAnimated = true;
    }
    
    // ========================================
    // Scroll Animations
    // ========================================
    const animateElements = document.querySelectorAll('.animate-on-scroll');
    
    function checkScroll() {
        const triggerBottom = window.innerHeight * 0.85;
        
        animateElements.forEach(element => {
            const elementTop = element.getBoundingClientRect().top;
            
            if (elementTop < triggerBottom) {
                element.classList.add('visible');
            }
        });
        
        // Trigger counter animation when stats section is visible
        const statsSection = document.querySelector('.stats');
        if (statsSection) {
            const statsTop = statsSection.getBoundingClientRect().top;
            if (statsTop < triggerBottom && !countersAnimated) {
                animateCounters();
            }
        }
    }
    
    window.addEventListener('scroll', checkScroll);
    checkScroll(); // Check on page load
    
    // ========================================
    // Dynamic Gallery & Lightbox
    // ========================================
    const SUPABASE_URL = 'https://fkhmwddkosjzatwuxmnh.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZraG13ZGRrb3NqemF0d3V4bW5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNDEwOTksImV4cCI6MjA5NTgxNzA5OX0.ogtAR9ibm8jeyL-EBqlKUBUI7pUGL_UXzseA8RsmDcA';
    let supabase = null;
    let galleryImages = [];
    
    // Lightbox elements
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxClose = document.querySelector('.lightbox-close');
    const lightboxPrev = document.querySelector('.lightbox-prev');
    const lightboxNext = document.querySelector('.lightbox-next');
    let currentImageIndex = 0;

    if (window.supabase) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        loadPublicGallery();
    }

    async function loadPublicGallery() {
        const grid = document.getElementById('dynamic-gallery-grid');
        if (!grid) return;
        
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Loading photos...</p>';
        
        try {
            const { data: photos, error } = await supabase
                .from('photos')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            
            if (photos.length === 0) {
                grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Gallery coming soon!</p>';
                return;
            }

            galleryImages = photos.map(p => p.url);

            grid.innerHTML = photos.map((photo, index) => `
                <div class="gallery-item animate-on-scroll visible" onclick="openLightbox(${index})">
                    <img src="${photo.url}" alt="${photo.alt_text || 'UMEB Event Photo'}" loading="lazy">
                    <div class="gallery-overlay">
                        <i class="fas fa-search-plus"></i>
                    </div>
                </div>
            `).join('');

        } catch (error) {
            console.error('Error loading gallery:', error);
            grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Failed to load photos. Please try again later.</p>';
        }
    }

    // Lightbox Functions
    window.openLightbox = function(index) {
        currentImageIndex = index;
        lightboxImg.src = galleryImages[currentImageIndex];
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
    };
    
    function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
    
    if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
    if (lightbox) {
        lightbox.addEventListener('click', function(e) {
            if (e.target === lightbox) closeLightbox();
        });
    }
    
    if (lightboxPrev) {
        lightboxPrev.addEventListener('click', function(e) {
            e.stopPropagation();
            if (galleryImages.length > 0) {
                currentImageIndex = (currentImageIndex - 1 + galleryImages.length) % galleryImages.length;
                lightboxImg.src = galleryImages[currentImageIndex];
            }
        });
    }
    
    if (lightboxNext) {
        lightboxNext.addEventListener('click', function(e) {
            e.stopPropagation();
            if (galleryImages.length > 0) {
                currentImageIndex = (currentImageIndex + 1) % galleryImages.length;
                lightboxImg.src = galleryImages[currentImageIndex];
            }
        });
    }
    
    document.addEventListener('keydown', function(e) {
        if (lightbox && lightbox.classList.contains('active')) {
            if (e.key === 'Escape') closeLightbox();
            else if (e.key === 'ArrowLeft' && lightboxPrev) lightboxPrev.click();
            else if (e.key === 'ArrowRight' && lightboxNext) lightboxNext.click();
        }
    });

    // ========================================
    // Contact Form
    // ========================================
    const contactForm = document.getElementById('contactForm');
    
    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get form values
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const subject = document.getElementById('subject').value;
        const message = document.getElementById('message').value;
        
        // Create mailto link (since this is a static site)
        const mailtoLink = `mailto:umeb2020@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`)}`;
        
        // Show success message
        alert('Thank you for your message! Your default email client will open to send your message to UMEB.');
        
        // Open mailto link
        window.location.href = mailtoLink;
        
        // Reset form
        contactForm.reset();
    });
    
    // ========================================
    // Back to Top Button
    // ========================================
    const backToTopBtn = document.getElementById('backToTop');
    
    window.addEventListener('scroll', function() {
        if (window.scrollY > 500) {
            backToTopBtn.classList.add('visible');
        } else {
            backToTopBtn.classList.remove('visible');
        }
    });
    
    backToTopBtn.addEventListener('click', function() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
    
    // ========================================
    // Parallax Effect for Hero
    // ========================================
    const hero = document.querySelector('.hero');
    
    window.addEventListener('scroll', function() {
        const scrolled = window.scrollY;
        const parallaxSpeed = 0.5;
        
        if (hero && scrolled < window.innerHeight) {
            hero.style.transform = `translateY(${scrolled * parallaxSpeed}px)`;
        }
    });
    
    // ========================================
    // Initialize on page load
    // ========================================
    console.log('UMEB Website Initialized');
    console.log('I Am My Brother\'s Keeper - Changing One Life at a Time');
    
});