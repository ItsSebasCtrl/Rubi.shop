/* ═══════════════════════════════════════════════════
   RUBI.SHOPS — Lógica de la Página Principal
   - Menú de navegación móvil accesible
   - Header y botón volver arriba al scroll
   - Scroll Spy
   - Diálogos nativos con light-dismiss y salida animada
   - Bolsa de pedido (sincronizada con localStorage)
   ═══════════════════════════════════════════════════ */

const WHATSAPP_NUMBER = '584246295209';
const BAG_STORAGE_KEY = 'rubishops_bag_v1';

const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('.nav-links');
const navBackdrop = document.getElementById('nav-backdrop');
const header = document.querySelector('.site-header');
const backToTopBtn = document.getElementById('back-to-top');

let supportsDisplayTransition;

function canTransitionDisplay() {
    if (supportsDisplayTransition !== undefined) return supportsDisplayTransition;
    if (!window.CSS?.supports?.('transition-behavior', 'allow-discrete') || !document.body) {
        return false;
    }
    const probe = document.createElement('div');
    probe.style.cssText = 'transition: display 1s allow-discrete !important; display: block;';
    document.body.appendChild(probe);
    getComputedStyle(probe).display;
    probe.style.display = 'none';
    supportsDisplayTransition = getComputedStyle(probe).display === 'block';
    probe.remove();
    return supportsDisplayTransition;
}

function supportsTopLayerExit() {
    return window.CSS?.supports?.('overlay', 'auto') && canTransitionDisplay();
}

async function closeTopLayer(dialog) {
    if (!dialog || !dialog.open) return;

    if (!supportsTopLayerExit()) {
        dialog.setAttribute('data-closing', '');
        const animations = dialog.getAnimations({ subtree: true });
        if (animations.length > 0) {
            await Promise.race([
                Promise.allSettled(animations.map((a) => a.finished)),
                new Promise((r) => setTimeout(r, 600)),
            ]);
        }
        if (!dialog.hasAttribute('data-closing')) return;
        dialog.removeAttribute('data-closing');
    }

    if (typeof dialog.close === 'function') {
        if (dialog.open) dialog.close();
    } else {
        dialog.removeAttribute('open');
    }
}

// ── Bolsa de pedido ──
function getBag() {
    try {
        const raw = localStorage.getItem(BAG_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

function saveBag(items) {
    try {
        localStorage.setItem(BAG_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {}
}

function formatPrice(amount) {
    return Number.isInteger(amount) ? `$${amount}` : `$${amount.toFixed(2)}`;
}

function renderBagUI() {
    const items = getBag();
    const countBadge = document.getElementById('bag-count');
    const bagBody = document.getElementById('bag-body');
    const bagFooter = document.getElementById('bag-footer');
    const bagTotal = document.getElementById('bag-total');
    const bagWaBtn = document.getElementById('bag-whatsapp-btn');

    if (countBadge) {
        countBadge.textContent = String(items.length);
        countBadge.hidden = items.length === 0;
    }

    if (!bagBody) return;

    if (items.length === 0) {
        bagBody.innerHTML = `
            <div class="bag-empty">
                <p>Aún no ha agregado prendas a su pedido.</p>
                <a href="catalogo.html" class="btn btn-ruby">Explorar catálogo</a>
            </div>
        `;
        if (bagFooter) bagFooter.hidden = true;
        return;
    }

    let total = 0;
    bagBody.innerHTML = '';
    const list = document.createElement('ul');
    list.className = 'bag-items-list';

    items.forEach((item, idx) => {
        total += Number(item.price) || 0;
        const li = document.createElement('li');
        li.className = 'bag-item';
        const webp480 = item.image ? item.image.replace(/\.jpg$/, '_480.webp') : '';
        li.innerHTML = `
            <picture>
                <source srcset="${webp480}" type="image/webp">
                <img src="${item.image}" alt="${item.name}" width="56" height="74" class="bag-item-img">
            </picture>
            <div class="bag-item-info">
                <p class="bag-item-name">${item.name}</p>
                <p class="bag-item-meta">Talla ${item.size || 'Por confirmar'} · ${formatPrice(item.price)}</p>
            </div>
            <button type="button" class="bag-item-remove" aria-label="Quitar ${item.name} del pedido">&times;</button>
        `;
        li.querySelector('.bag-item-remove').addEventListener('click', () => {
            const next = getBag();
            next.splice(idx, 1);
            saveBag(next);
            renderBagUI();
        });
        list.appendChild(li);
    });

    bagBody.appendChild(list);

    if (bagTotal) bagTotal.textContent = formatPrice(total);
    if (bagFooter) bagFooter.hidden = false;

    if (bagWaBtn) {
        const lines = items.map((it, i) => `${i + 1}. ${it.name} — Talla ${it.size || 'Por confirmar'} (${formatPrice(it.price)})`);
        const msg = encodeURIComponent(
            `Hola rubi.shops, deseo consultar disponibilidad y coordinar este pedido:\n\n${lines.join('\n')}\n\nTotal estimado: ${formatPrice(total)}`
        );
        bagWaBtn.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`;
    }
}

function initBagDialog() {
    const openBtn = document.getElementById('btn-open-bag');
    const dialog = document.getElementById('bag-dialog');
    const closeBtn = document.getElementById('btn-close-bag');
    const clearBtn = document.getElementById('btn-clear-bag');

    renderBagUI();
    window.addEventListener('storage', renderBagUI);

    if (!openBtn || !dialog) return;

    openBtn.addEventListener('click', () => {
        renderBagUI();
        dialog.removeAttribute('data-closing');
        if (typeof dialog.showModal === 'function') {
            try {
                if (!dialog.open) dialog.showModal();
            } catch (e) {
                dialog.setAttribute('open', '');
            }
        } else {
            dialog.setAttribute('open', '');
        }
    });

    if (closeBtn) closeBtn.addEventListener('click', () => closeTopLayer(dialog));
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            saveBag([]);
            renderBagUI();
        });
    }

    dialog.addEventListener('cancel', (event) => {
        if (!supportsTopLayerExit()) {
            event.preventDefault();
            closeTopLayer(dialog);
        }
    });

    if (!('closedBy' in HTMLDialogElement.prototype)) {
        dialog.addEventListener('click', (event) => {
            if (event.target !== dialog) return;
            const rect = dialog.getBoundingClientRect();
            const isContent = rect.top <= event.clientY && event.clientY <= rect.top + rect.height &&
                              rect.left <= event.clientX && event.clientX <= rect.left + rect.width;
            if (!isContent) closeTopLayer(dialog);
        });
    }
}

// ── Navegación móvil ──
function closeMobileMenu() {
    if (navLinks && navLinks.classList.contains('open')) {
        navLinks.classList.remove('open');
        if (navToggle) {
            navToggle.classList.remove('active');
            navToggle.setAttribute('aria-expanded', 'false');
        }
        if (navBackdrop) navBackdrop.classList.remove('active');
        document.body.classList.remove('no-scroll');
    }
}

if (navToggle && navLinks) {
    navToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = navLinks.classList.toggle('open');
        navToggle.classList.toggle('active', isOpen);
        navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        if (navBackdrop) navBackdrop.classList.toggle('active', isOpen);
        document.body.classList.toggle('no-scroll', isOpen);
    });

    if (navBackdrop) navBackdrop.addEventListener('click', closeMobileMenu);
    navLinks.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMobileMenu));

    document.addEventListener('click', (e) => {
        if (navLinks.classList.contains('open') && !navLinks.contains(e.target) && !navToggle.contains(e.target)) {
            closeMobileMenu();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && navLinks.classList.contains('open')) {
            closeMobileMenu();
            navToggle.focus();
        }
    });
}

// ── Scroll y volver arriba ──
function updateScrollState() {
    const scrollY = window.scrollY || window.pageYOffset;
    if (header) header.classList.toggle('scrolled', scrollY > 32);
    if (backToTopBtn) backToTopBtn.classList.toggle('visible', scrollY > 420);
}

window.addEventListener('scroll', updateScrollState, { passive: true });
if (backToTopBtn) {
    backToTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

function initScrollSpy() {
    const internalLinks = document.querySelectorAll('.nav-links a[href^="#"]');
    if (!internalLinks.length) return;
    const sections = Array.from(internalLinks)
        .map(link => document.querySelector(link.getAttribute('href')))
        .filter(Boolean);

    function updateActiveSection() {
        const scrollPosition = (window.scrollY || window.pageYOffset) + 120;
        let currentSectionId = '';
        for (const section of sections) {
            if (scrollPosition >= section.offsetTop && scrollPosition < section.offsetTop + section.offsetHeight) {
                currentSectionId = `#${section.id}`;
                break;
            }
        }
        internalLinks.forEach(link => {
            const isActive = link.getAttribute('href') === currentSectionId;
            link.classList.toggle('active', isActive);
            if (isActive) link.setAttribute('aria-current', 'page');
            else link.removeAttribute('aria-current');
        });
    }

    window.addEventListener('scroll', updateActiveSection, { passive: true });
    updateActiveSection();
}

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href');
        if (targetId === '#' || !targetId) return;
        const target = document.querySelector(targetId);
        if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth' });
            if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
            target.focus({ preventScroll: true });
        }
    });
});

function setupInfoDialog(btnId, modalId) {
    const btn = document.getElementById(btnId);
    const modal = document.getElementById(modalId);
    if (!btn || !modal) return;

    const closeBtn = modal.querySelector('.info-dialog-close');

    btn.addEventListener('click', () => {
        modal.removeAttribute('data-closing');
        if (typeof modal.showModal === 'function') {
            try {
                if (!modal.open) modal.showModal();
            } catch (e) {
                modal.setAttribute('open', '');
            }
        } else {
            modal.setAttribute('open', '');
        }
    });

    if (closeBtn) closeBtn.addEventListener('click', () => closeTopLayer(modal));

    modal.addEventListener('cancel', (event) => {
        if (!supportsTopLayerExit()) {
            event.preventDefault();
            closeTopLayer(modal);
        }
    });

    if (!('closedBy' in HTMLDialogElement.prototype)) {
        modal.addEventListener('click', (event) => {
            if (event.target !== modal) return;
            const rect = modal.getBoundingClientRect();
            const isDialogContent = rect.top <= event.clientY && event.clientY <= rect.top + rect.height &&
                                    rect.left <= event.clientX && event.clientX <= rect.left + rect.width;
            if (!isDialogContent) closeTopLayer(modal);
        });
    }
}

function init() {
    updateScrollState();
    initScrollSpy();
    setupInfoDialog('btn-open-policies', 'policies-modal');
    setupInfoDialog('btn-open-shipping', 'shipping-modal');
    initBagDialog();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
