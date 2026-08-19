/**
 * BONECO WILSON — HIGH-CONVERSION & INTERACTIVE ENGINE
 * Pure Vanilla JavaScript (Zero Dependencies, Ultra Fast)
 */

document.addEventListener('DOMContentLoaded', () => {
    initScrollEffects();
    initCountdownTimer();
    initMobileNav();
    initSimulator();
    initFAQAccordion();
    initLiveSalesToasts();
    initScrollAnimations();
});

/* ==========================================================================
   01. SCROLL PROGRESS & NAVBAR EFFECTS
   ========================================================================== */
function initScrollEffects() {
    const progressBar = document.getElementById('scrollProgressBar');
    const navbar = document.getElementById('mainNavbar');
    const mobileStickyBar = document.getElementById('stickyMobileBar');
    const heroSection = document.querySelector('section'); // First section

    window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = (scrollTop / docHeight) * 100;
        
        if (progressBar) {
            progressBar.style.width = `${scrollPercent}%`;
        }

        // Navbar appearance on scroll
        if (navbar) {
            if (scrollTop > 50) {
                navbar.style.backgroundColor = 'rgba(5, 5, 5, 0.95)';
                navbar.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.8)';
                navbar.style.borderBottomColor = 'rgba(255, 255, 255, 0.1)';
            } else {
                navbar.style.backgroundColor = 'rgba(5, 5, 5, 0.8)';
                navbar.style.boxShadow = 'none';
                navbar.style.borderBottomColor = 'rgba(255, 255, 255, 0.05)';
            }
        }

        // Mobile bottom sticky CTA appearance
        if (mobileStickyBar && heroSection) {
            const heroBottom = heroSection.offsetTop + heroSection.offsetHeight - 200;
            if (scrollTop > heroBottom) {
                mobileStickyBar.classList.remove('translate-y-full');
            } else {
                mobileStickyBar.classList.add('translate-y-full');
            }
        }
    }, { passive: true });
}

/* ==========================================================================
   02. TOP BAR COUNTDOWN TIMER
   ========================================================================== */
function initCountdownTimer() {
    const timerElem = document.getElementById('topBarCountdown');
    if (!timerElem) return;

    let timeInSeconds = 14 * 60 + 59;

    setInterval(() => {
        if (timeInSeconds <= 0) {
            timeInSeconds = 15 * 60; // Reset loop
        }
        timeInSeconds--;
        const mins = Math.floor(timeInSeconds / 60);
        const secs = timeInSeconds % 60;
        timerElem.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }, 1000);
}

/* ==========================================================================
   03. MOBILE NAVIGATION DRAWER
   ========================================================================== */
function initMobileNav() {
    const menuBtn = document.getElementById('mobileMenuBtn');
    const drawer = document.getElementById('mobileDrawer');
    const menuIcon = document.getElementById('menuIcon');
    const closeIcon = document.getElementById('closeIcon');

    if (!menuBtn || !drawer) return;

    menuBtn.addEventListener('click', () => {
        const isHidden = drawer.classList.contains('hidden');
        if (isHidden) {
            drawer.classList.remove('hidden');
            menuIcon.classList.add('hidden');
            closeIcon.classList.remove('hidden');
        } else {
            closeMobileMenu();
        }
    });

    // Close on link click
    document.querySelectorAll('.mobile-nav-link').forEach(link => {
        link.addEventListener('click', closeMobileMenu);
    });
}

function closeMobileMenu() {
    const drawer = document.getElementById('mobileDrawer');
    const menuIcon = document.getElementById('menuIcon');
    const closeIcon = document.getElementById('closeIcon');
    if (drawer) drawer.classList.add('hidden');
    if (menuIcon) menuIcon.classList.remove('hidden');
    if (closeIcon) closeIcon.classList.add('hidden');
}

/* ==========================================================================
   04. PRODUCT MULTI-ANGLE SHOWCASE
   ========================================================================== */
const productImages = {
    passenger: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?q=80&w=1000&auto=format&fit=crop',
    night: 'https://images.unsplash.com/photo-1508974239320-0a029497e820?q=80&w=1000&auto=format&fit=crop',
    fold: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1000&auto=format&fit=crop'
};

function changeProductView(viewKey) {
    const imgElem = document.getElementById('productMainImage');
    if (imgElem && productImages[viewKey]) {
        imgElem.style.opacity = '0';
        setTimeout(() => {
            imgElem.src = productImages[viewKey];
            imgElem.style.opacity = '1';
        }, 200);
    }

    // Update active tab styles
    const buttons = document.querySelectorAll('.product-tab-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active', 'bg-white/10', 'text-white', 'border-white/20');
        btn.classList.add('bg-black/40', 'text-gray-400', 'border-transparent');
    });

    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active', 'bg-white/10', 'text-white', 'border-white/20');
        event.currentTarget.classList.remove('bg-black/40', 'text-gray-400', 'border-transparent');
    }
}

/* ==========================================================================
   05. INTERACTIVE INSULFILM & LIGHTING SIMULATOR
   ========================================================================== */
function initSimulator() {
    const slider = document.getElementById('tintSlider');
    const tintLayer = document.getElementById('simTintLayer');
    const percentLabel = document.getElementById('sliderPercentLabel');
    const tintText = document.getElementById('tintValueText');

    if (!slider || !tintLayer) return;

    slider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        const opacity = val / 100;
        tintLayer.style.opacity = opacity;
        percentLabel.textContent = `${val}%`;

        let grade = 'G50 (Transparência Média)';
        if (val < 15) grade = 'Cristal / 100% Transparente';
        else if (val <= 25) grade = 'G20 (Película Suave)';
        else if (val <= 45) grade = 'G35 (Película Intermediária)';
        else if (val <= 65) grade = 'G50 (Película Escura)';
        else grade = 'G5 (Película Alta Privacidade)';

        tintText.textContent = `${grade}`;
    });
}

function setSimLighting(mode) {
    const glareLayer = document.getElementById('simGlareLayer');
    const lightText = document.getElementById('lightValueText');
    const buttons = document.querySelectorAll('.sim-light-btn');

    buttons.forEach(btn => {
        btn.classList.remove('active', 'bg-[#FFE000]/20', 'text-[#FFE000]', 'border-[#FFE000]/40');
        btn.classList.add('bg-white/5', 'text-gray-300', 'border-white/10');
    });

    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active', 'bg-[#FFE000]/20', 'text-[#FFE000]', 'border-[#FFE000]/40');
        event.currentTarget.classList.remove('bg-white/5', 'text-gray-300', 'border-white/10');
    }

    if (mode === 'day') {
        glareLayer.style.opacity = '0.7';
        lightText.textContent = 'Modo: ☀️ Dia Claro';
    } else if (mode === 'sunset') {
        glareLayer.style.opacity = '0.4';
        lightText.textContent = 'Modo: 🌆 Entardecer';
    } else {
        glareLayer.style.opacity = '0.15';
        lightText.textContent = 'Modo: 🌙 Noite / Semáforo';
    }
}

/* ==========================================================================
   06. FAQ ACCORDION
   ========================================================================== */
function initFAQAccordion() {
    const items = document.querySelectorAll('.faq-item');

    items.forEach(item => {
        const questionBtn = item.querySelector('.faq-question');
        const answer = item.querySelector('.faq-answer');
        const icon = item.querySelector('.faq-icon');

        if (!questionBtn || !answer) return;

        questionBtn.addEventListener('click', () => {
            const isOpen = item.classList.contains('active');

            // Close all others
            items.forEach(other => {
                other.classList.remove('active');
                const otherAnswer = other.querySelector('.faq-answer');
                const otherIcon = other.querySelector('.faq-icon');
                if (otherAnswer) otherAnswer.classList.add('hidden');
                if (otherIcon) otherIcon.textContent = '+';
                const otherBtn = other.querySelector('.faq-question');
                if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
            });

            // Toggle current
            if (!isOpen) {
                item.classList.add('active');
                answer.classList.remove('hidden');
                if (icon) icon.textContent = '−';
                questionBtn.setAttribute('aria-expanded', 'true');
            }
        });
    });
}

/* ==========================================================================
   07. CEP DELIVERY ESTIMATOR
   ========================================================================== */
function calculateShipping() {
    const input = document.getElementById('cepInput');
    const result = document.getElementById('shippingResult');
    if (!input || !result) return;

    const cep = input.value.replace(/\D/g, '');
    if (cep.length < 8) {
        alert('Por favor, informe um CEP válido com 8 dígitos.');
        return;
    }

    result.classList.remove('hidden');
    result.textContent = 'Calculando prazo Correios / Sedex...';

    setTimeout(() => {
        result.innerHTML = '✓ <strong>Frete Grátis Sedex Expresso</strong> — Envio em 24h (Entrega estimada em 2 a 4 dias úteis)';
    }, 600);
}

// CEP Auto-mask
const cepInputs = document.querySelectorAll('#cepInput, #modalCep');
cepInputs.forEach(inp => {
    inp.addEventListener('input', (e) => {
        let val = e.target.value.replace(/\D/g, '');
        if (val.length > 5) {
            val = val.substring(0, 5) + '-' + val.substring(5, 8);
        }
        e.target.value = val;
    });
});

/* ==========================================================================
   08. VIDEO MODAL CONTROLS
   ========================================================================== */
function openVideoModal() {
    const modal = document.getElementById('videoModal');
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

function closeVideoModal() {
    const modal = document.getElementById('videoModal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }
}

/* ==========================================================================
   09. CHECKOUT & ORDER MODAL
   ========================================================================== */
let currentQuantity = 1;
let hasOrderBump = false;
let currentPaymentMethod = 'pix';
const basePricePix = 169.90;
const basePriceCard = 199.90;
const bumpPrice = 29.90;

function openCheckoutModal() {
    const modal = document.getElementById('checkoutModal');
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        updateCheckoutCalculations();
    }
}

function closeCheckoutModal() {
    const modal = document.getElementById('checkoutModal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }
}

function updateQuantity(change) {
    currentQuantity += change;
    if (currentQuantity < 1) currentQuantity = 1;
    if (currentQuantity > 10) currentQuantity = 10;
    
    const qtyElem = document.getElementById('checkoutQty');
    if (qtyElem) qtyElem.textContent = currentQuantity;
    updateCheckoutCalculations();
}

function toggleOrderBump() {
    const check = document.getElementById('orderBumpCheck');
    hasOrderBump = check ? check.checked : false;
    updateCheckoutCalculations();
}

function selectPaymentMethod(method) {
    currentPaymentMethod = method;
    const tabPix = document.getElementById('payTabPix');
    const tabCard = document.getElementById('payTabCard');
    const pixDetails = document.getElementById('pixDetails');
    const cardDetails = document.getElementById('cardDetails');

    if (method === 'pix') {
        tabPix.classList.add('active', 'bg-[#FFE000]/15', 'border-[#FFE000]', 'text-white');
        tabPix.classList.remove('bg-white/5', 'border-white/10', 'text-gray-400');
        
        tabCard.classList.remove('active', 'bg-[#FFE000]/15', 'border-[#FFE000]', 'text-white');
        tabCard.classList.add('bg-white/5', 'border-white/10', 'text-gray-400');

        if (pixDetails) pixDetails.classList.remove('hidden');
        if (cardDetails) cardDetails.classList.add('hidden');
    } else {
        tabCard.classList.add('active', 'bg-[#FFE000]/15', 'border-[#FFE000]', 'text-white');
        tabCard.classList.remove('bg-white/5', 'border-white/10', 'text-gray-400');
        
        tabPix.classList.remove('active', 'bg-[#FFE000]/15', 'border-[#FFE000]', 'text-white');
        tabPix.classList.add('bg-white/5', 'border-white/10', 'text-gray-400');

        if (cardDetails) cardDetails.classList.remove('hidden');
        if (pixDetails) pixDetails.classList.add('hidden');
    }
    updateCheckoutCalculations();
}

function updateCheckoutCalculations() {
    const base = currentPaymentMethod === 'pix' ? basePricePix : basePriceCard;
    let total = (base * currentQuantity) + (hasOrderBump ? bumpPrice : 0);

    const pixText = document.getElementById('pixTotalText');
    if (pixText) {
        pixText.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
    }
}

function handleCheckoutSubmit(e) {
    e.preventDefault();
    closeCheckoutModal();
    showToast('🎉 Pedido Processado com Sucesso!', 'Você receberá os dados de confirmação e rastreamento via WhatsApp.');
}

/* ==========================================================================
   10. LIVE SALES POPUP TOASTS
   ========================================================================== */
const mockSales = [
    { name: 'Juliana F.', city: 'Campinas, SP', time: 'há 2 minutos' },
    { name: 'Marcos V.', city: 'Belo Horizonte, MG', time: 'há 4 minutos' },
    { name: 'Camila R.', city: 'Rio de Janeiro, RJ', time: 'há 1 minuto' },
    { name: 'Bruno T.', city: 'Curitiba, PR', time: 'há 6 minutos' },
    { name: 'Patrícia A.', city: 'Brasília, DF', time: 'há 3 minutos' }
];

function initLiveSalesToasts() {
    let index = 0;
    setInterval(() => {
        const item = mockSales[index % mockSales.length];
        showToast('Novo pedido aprovado!', `${item.name} de ${item.city} comprou 1 Boneco Wilson (${item.time})`);
        index++;
    }, 18000);
}

function showToast(title, desc) {
    const toast = document.getElementById('toastNotification');
    const toastTitle = document.getElementById('toastTitle');
    const toastDesc = document.getElementById('toastDesc');

    if (!toast || !toastTitle || !toastDesc) return;

    toastTitle.textContent = title;
    toastDesc.textContent = desc;
    toast.classList.remove('hidden');

    setTimeout(() => {
        toast.classList.add('hidden');
    }, 5000);
}

/* ==========================================================================
   11. SCROLL REVEAL (INTERSECTION OBSERVER)
   ========================================================================== */
function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-fade-in-up');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('section, .benefit-card, .testimonial-card').forEach(el => {
        observer.observe(el);
    });
}
