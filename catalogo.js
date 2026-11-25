/* ═══════════════════════════════════════════════════
   RUBI.SHOPS — Lógica del Catálogo y Bolsa de Pedido
   - Categoría única fija por prenda (según briefing)
   - Filtros por estado (Todas / En oferta / Novedades), categoría y talla
   - Bolsa de pedido (localStorage) con envío consolidado por WhatsApp
   ═══════════════════════════════════════════════════ */

const WHATSAPP_NUMBER = '584246295209';
const BAG_STORAGE_KEY = 'rubishops_bag_v1';

const CATEGORY_LABELS = {
    'fiesta': 'Fiesta y noche',
    'wedding': 'Bodas',
    'graduation': 'Graduación',
    'birthday': 'Cumpleaños',
    'ocasion-especial': 'Gala'
};

let allProducts = [];
let state = {
    category: 'all',
    size: 'all',
    status: 'all',
    search: '',
    sort: 'featured'
};

const productsContainer = document.getElementById('catalog-products-container');
const searchInput = document.getElementById('catalog-search-input');
const searchClearBtn = document.getElementById('search-clear-btn');
const occasionChips = document.querySelectorAll('.catalog-chip');
const sizeChips = document.querySelectorAll('.size-chip');
const statusButtons = document.querySelectorAll('.status-btn');
const sortSelect = document.getElementById('catalog-sort-select');
const resultsCountEl = document.getElementById('results-count');
const catalogPageTitle = document.getElementById('catalog-page-title');
const navStatusLinks = document.querySelectorAll('[data-nav-status]');
const activeTagsList = document.getElementById('active-tags-list');
const activeRowEl = document.getElementById('catalog-active-row');
const clearAllBtn = document.getElementById('clear-all-filters-btn');
const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('.nav-links');
const navBackdrop = document.getElementById('nav-backdrop');
const header = document.querySelector('.site-header');
const backToTopBtn = document.getElementById('back-to-top');

const productModal = document.getElementById('product-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalImg = document.getElementById('modal-product-img');
const modalWebp = document.getElementById('modal-product-webp');
const modalBadgesRow = document.getElementById('modal-badges-row');
const modalTitle = document.getElementById('modal-product-title');
const modalPriceBox = document.getElementById('modal-price-box');
const modalDesc = document.getElementById('modal-product-desc');
const modalSizePills = document.getElementById('modal-size-pills');
const modalAddBagBtn = document.getElementById('modal-add-bag-btn');
const modalWhatsappCta = document.getElementById('modal-whatsapp-cta');
const modalWhatsappBtnText = document.getElementById('modal-whatsapp-btn-text');
const modalToast = document.getElementById('modal-toast');

let activeModalProduct = null;
let activeModalSize = null;
let lastFocusedElement = null;

// ── Top-layer exit fallback (Firefox & Safari) ──
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

const FALLBACK_PRODUCTS = [
    {
        "id": 1,
        "name": "Vestido Sirena Magenta con Corset de Lentejuelas",
        "description": "Diseño corte sirena en tono magenta radiante con corset bordado en lentejuelas y espalda descubierta con ajuste lace-up entrecruzado.",
        "price": 180.0,
        "salePrice": null,
        "image": "fotos/01_rosa_larga.jpg",
        "category": "ocasion-especial",
        "sizes": ["S", "M", "L"],
        "occasion": ["gala", "fiesta", "cumpleaños", "graduación"],
        "isNew": true,
        "isSale": false
    },
    {
        "id": 2,
        "name": "Vestido Corto Jacquard Blanco",
        "description": "Elegancia fresca con escote cuadrado y textura jacquard grabada. Silueta acampanada ideal para bodas civiles, bautizos y celebraciones de día.",
        "price": 120.0,
        "salePrice": null,
        "image": "fotos/02_blanco_corto.jpg",
        "category": "wedding",
        "sizes": ["XS", "S", "M"],
        "occasion": ["boda civil", "graduación", "bautizo", "cóctel"],
        "isNew": true,
        "isSale": false
    },
    {
        "id": 3,
        "name": "Vestido de Gala Negro Cold Shoulder",
        "description": "Vestido largo con cuello halter, hombros descubiertos, mangas largas y abertura lateral para eventos formales de alta distinción.",
        "price": 195.0,
        "salePrice": 165.0,
        "image": "fotos/03_negro_hombros.jpg",
        "category": "ocasion-especial",
        "sizes": ["M", "L", "XL"],
        "occasion": ["gala", "graduación", "boda de noche"],
        "isNew": false,
        "isSale": true
    },
    {
        "id": 4,
        "name": "Vestido Midi Azul Rey con Drapeado",
        "description": "Corte midi sofisticado con escote bardot de hombros caídos y abertura frontal, confeccionado en tejido elástico que estiliza la silueta.",
        "price": 140.0,
        "salePrice": null,
        "image": "fotos/04_azul_ruffle.jpg",
        "category": "fiesta",
        "sizes": ["S", "M"],
        "occasion": ["cóctel", "aniversario", "boda invitada", "cena formal"],
        "isNew": true,
        "isSale": false
    },
    {
        "id": 5,
        "name": "Vestido Coquette Rosa con Corset y Lazo",
        "description": "Rosa empolvado con corset estructurado, espalda lace-up con lazo posterior decorativo y falda con volumen ideal para cumpleaños.",
        "price": 135.0,
        "salePrice": 110.0,
        "image": "fotos/05_rosa_corto.jpg",
        "category": "birthday",
        "sizes": ["XS", "S"],
        "occasion": ["cumpleaños", "quinceañera", "fiesta juvenil", "cóctel"],
        "isNew": false,
        "isSale": true
    },
    {
        "id": 6,
        "name": "Vestido Sirena Azul Noche con Lentejuelas",
        "description": "Cuello sweetheart, mangas cortas y brillo envolvente en lentejuelas azul noche en corte sirena para eventos de etiqueta.",
        "price": 220.0,
        "salePrice": null,
        "image": "fotos/06_azul_brillos.jpg",
        "category": "ocasion-especial",
        "sizes": ["S", "M", "L", "XL"],
        "occasion": ["gala", "graduación", "boda", "fiesta de gala"],
        "isNew": true,
        "isSale": false
    },
    {
        "id": 7,
        "name": "Vestido Cut-Out Negro de Lentejuelas",
        "description": "Mangas largas, cuello alto, detalle cut-out asimétrico en la cintura y abertura lateral sobre tejido brillante para recepciones nocturnas.",
        "price": 190.0,
        "salePrice": 155.0,
        "image": "fotos/07_negro_brillos.jpg",
        "category": "fiesta",
        "sizes": ["XS", "S", "M", "L"],
        "occasion": ["fiesta nocturna", "gala moderna", "cumpleaños"],
        "isNew": false,
        "isSale": true
    },
    {
        "id": 8,
        "name": "Vestido Líquido Metalizado Champagne",
        "description": "Efecto satinado líquido en tono champagne con escote V sutil y drapeado cruzado en la cintura de caída fluida hasta el suelo.",
        "price": 210.0,
        "salePrice": null,
        "image": "fotos/08_champagne.jpg",
        "category": "wedding",
        "sizes": ["M", "L", "XL", "XXL"],
        "occasion": ["damas de honor", "graduación", "boda de noche", "gala"],
        "isNew": true,
        "isSale": false
    },
    {
        "id": 9,
        "name": "Vestido Noche con Abertura Diagonal",
        "description": "Silueta estilizada con manga larga, transparencia diagonal en el escote y acabado en lentejuelas azabache con abertura frontal.",
        "price": 195.0,
        "salePrice": null,
        "image": "fotos/09_negro_abertura.jpg",
        "category": "fiesta",
        "sizes": ["S", "M", "XL"],
        "occasion": ["gala", "evento formal", "fiesta nocturna"],
        "isNew": false,
        "isSale": false
    },
    {
        "id": 10,
        "name": "Vestido Largo Esmeralda Hombros Caídos",
        "description": "Satén en tono verde esmeralda profundo, escote cruzado de hombros caídos y elegante abertura lateral.",
        "price": 185.0,
        "salePrice": null,
        "image": "fotos/10_verde_xs.jpg",
        "category": "graduation",
        "sizes": ["XS", "M", "L"],
        "occasion": ["graduación", "boda", "damas de honor", "gala"],
        "isNew": true,
        "isSale": false
    },
    {
        "id": 11,
        "name": "Vestido Azul Royal con Volante Cascada",
        "description": "Vestido drapeado con escote cruzado en V, hombros caídos y volante vertical en cascada que estiliza y aporta movimiento.",
        "price": 160.0,
        "salePrice": 130.0,
        "image": "fotos/11_azul_volantes.jpg",
        "category": "wedding",
        "sizes": ["L", "XL", "XXL", "XXXL"],
        "occasion": ["boda invitada", "cóctel", "aniversario", "fiesta formal"],
        "isNew": false,
        "isSale": true
    },
    {
        "id": 12,
        "name": "Vestido Bustier Negro con Abertura",
        "description": "Top bustier con pedrería fina, tirantes delgados, drapeado en la cadera y falda larga con abertura elegante.",
        "price": 175.0,
        "salePrice": 145.0,
        "image": "fotos/12_negro_lentejuelas.jpg",
        "category": "fiesta",
        "sizes": ["XL", "XXL"],
        "occasion": ["gala", "fiesta formal", "aniversario", "evento nocturno"],
        "isNew": false,
        "isSale": true
    },
    {
        "id": 13,
        "name": "Vestido Halter Verde Esmeralda Asimétrico",
        "description": "Satén esmeralda con cuello halter cruzado, silueta entallada y bajo asimétrico con volantes que aporta ligereza y porte.",
        "price": 155.0,
        "salePrice": null,
        "image": "fotos/13_verde_terciopelo.jpg",
        "category": "graduation",
        "sizes": ["XS", "S", "L"],
        "occasion": ["graduación", "cóctel", "boda de tarde", "cena de gala"],
        "isNew": true,
        "isSale": false
    },
    {
        "id": 14,
        "name": "Vestido Dorado Sirena con Corset",
        "description": "Top corset bordado en lentejuelas doradas con espalda acordonada y falda de satén dorado en silueta sirena.",
        "price": 230.0,
        "salePrice": null,
        "image": "fotos/14_amarillo.jpg",
        "category": "birthday",
        "sizes": ["S", "L"],
        "occasion": ["cumpleaños", "gala de fin de año", "graduación", "quinceañera"],
        "isNew": true,
        "isSale": false
    }
];

function getProductCategory(product) {
    if (product.category) return product.category;
    if (Array.isArray(product.categories) && product.categories.length > 0) return product.categories[0];
    return '';
}

function getEffectivePrice(product) {
    return product.isSale && product.salePrice ? product.salePrice : product.price;
}

// ── Bolsa de pedido (localStorage) ──
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

function addToBag(product, size) {
    const items = getBag();
    items.push({
        id: product.id,
        name: product.name,
        price: getEffectivePrice(product),
        size: size || 'Por confirmar',
        image: product.image
    });
    saveBag(items);
    renderBagUI();
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

async function initCatalog() {
    parseUrlParams();

    if (window.location.protocol === 'file:' || typeof fetch === 'undefined') {
        allProducts = FALLBACK_PRODUCTS;
    } else {
        try {
            const response = await fetch('products.json');
            allProducts = response.ok ? await response.json() : FALLBACK_PRODUCTS;
        } catch (e) {
            allProducts = FALLBACK_PRODUCTS;
        }
    }

    syncControlsWithState();
    applyFiltersAndRender(false);

    const params = new URLSearchParams(window.location.search);
    if (params.has('id')) {
        const requestedId = parseInt(params.get('id'), 10);
        const found = allProducts.find(p => p.id === requestedId);
        if (found) {
            openProductModal(found, state.size !== 'all' ? state.size : null, false);
        }
    }

    setupEventListeners();
    setupModalEvents();
    setupMobileNav();
    setupScrollEffects();
    initInfoDialogs();
    initBagDialog();
}

function normalizeText(str) {
    if (!str) return '';
    return str.toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

function formatPrice(amount) {
    return Number.isInteger(amount) ? `$${amount}` : `$${amount.toFixed(2)}`;
}

function parseUrlParams() {
    const params = new URLSearchParams(window.location.search);
    let rawCat = params.has('categoria') ? params.get('categoria').toLowerCase() : 'all';
    const rawStatus = params.has('estado') ? params.get('estado').toLowerCase() : 'all';

    if (rawCat === 'nueva-coleccion') {
        state.category = 'all';
        state.status = 'new';
    } else {
        state.category = rawCat;
        if (rawStatus === 'new' || rawStatus === 'novedades' || rawStatus === 'nuevos') {
            state.status = 'new';
        } else if (rawStatus === 'sale' || rawStatus === 'ofertas' || rawStatus === 'oferta') {
            state.status = 'sale';
        } else {
            state.status = 'all';
        }
    }

    state.size = params.has('talla') ? params.get('talla').toUpperCase() : 'all';
    state.search = params.has('q') ? params.get('q').trim() : '';
    state.sort = params.has('sort') ? params.get('sort') : 'featured';
}

function updateUrlParams(push = true) {
    if (window.location.protocol === 'file:') return;
    try {
        const params = new URLSearchParams();
        if (state.category !== 'all') params.set('categoria', state.category);
        if (state.size !== 'all') params.set('talla', state.size);
        if (state.status !== 'all') params.set('estado', state.status);
        if (state.search) params.set('q', state.search);
        if (state.sort !== 'featured') params.set('sort', state.sort);

        const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
        if (newUrl !== window.location.pathname + window.location.search) {
            if (push) window.history.pushState({ ...state }, '', newUrl);
            else window.history.replaceState({ ...state }, '', newUrl);
        }
    } catch (e) {}
}

function cleanUrlModalId() {
    if (window.location.protocol === 'file:') return;
    try {
        const url = new URL(window.location.href);
        if (url.searchParams.has('id')) {
            url.searchParams.delete('id');
            const cleanUrl = url.pathname + (url.search ? url.search : '');
            window.history.replaceState({ ...state }, '', cleanUrl);
        }
    } catch (e) {}
}

function syncControlsWithState() {
    if (searchInput) {
        searchInput.value = state.search;
        if (searchClearBtn) searchClearBtn.hidden = !state.search;
    }

    occasionChips.forEach(chip => {
        const isActive = chip.dataset.filter === state.category;
        chip.classList.toggle('active', isActive);
        chip.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    sizeChips.forEach(chip => {
        const isActive = chip.dataset.size === state.size;
        chip.classList.toggle('active', isActive);
        chip.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    statusButtons.forEach(btn => {
        const isActive = btn.dataset.status === state.status;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    navStatusLinks.forEach(link => {
        const isActive = link.dataset.navStatus === state.status;
        link.classList.toggle('active', isActive);
        if (isActive) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
    });

    if (catalogPageTitle) {
        if (state.status === 'new') {
            catalogPageTitle.textContent = 'Nueva Colección';
        } else if (state.status === 'sale') {
            catalogPageTitle.textContent = 'Ofertas Actuales';
        } else if (state.category !== 'all' && CATEGORY_LABELS[state.category]) {
            catalogPageTitle.textContent = CATEGORY_LABELS[state.category];
        } else {
            catalogPageTitle.textContent = 'Nuestra Colección';
        }
    }

    if (sortSelect) sortSelect.value = state.sort;
}

function getFilteredProducts() {
    return allProducts.filter(product => {
        const prodCat = getProductCategory(product);
        if (state.category !== 'all' && prodCat !== state.category) {
            return false;
        }
        if (state.size !== 'all') {
            if (!product.sizes || !product.sizes.includes(state.size)) return false;
        }
        if (state.status === 'new' && !product.isNew) return false;
        if (state.status === 'sale' && !product.isSale) return false;

        if (state.search) {
            const searchTokens = normalizeText(state.search).split(/\s+/).filter(Boolean);
            if (searchTokens.length > 0) {
                const searchableText = normalizeText([
                    product.name,
                    product.description,
                    prodCat,
                    CATEGORY_LABELS[prodCat] || '',
                    ...(product.occasion || []),
                    ...(product.sizes || []).map(s => `talla ${s} ${s}`),
                    (product.sizes && product.sizes.some(s => ['XL', 'XXL', 'XXXL'].includes(s))) ? 'talla plus plus size curvy grande' : '',
                    product.isNew ? 'nuevo nueva coleccion novedades' : '',
                    product.isSale ? 'oferta ofertas rebaja descuento sale' : ''
                ].join(' '));
                if (!searchTokens.every(token => searchableText.includes(token))) return false;
            }
        }
        return true;
    }).sort((a, b) => {
        const priceA = getEffectivePrice(a);
        const priceB = getEffectivePrice(b);
        if (state.sort === 'price-asc') return priceA - priceB;
        if (state.sort === 'price-desc') return priceB - priceA;
        if (state.sort === 'name-asc') return a.name.localeCompare(b.name, 'es');
        return a.id - b.id;
    });
}

function applyFiltersAndRender(pushHistory = true) {
    const filtered = getFilteredProducts();
    updateUrlParams(pushHistory);
    updateMetaBar(filtered.length);

    if (filtered.length === 0) {
        renderEmptyState();
        return;
    }

    productsContainer.innerHTML = '';
    const fragment = document.createDocumentFragment();
    filtered.forEach((product, index) => {
        fragment.appendChild(createCatalogCard(product, index));
    });
    productsContainer.appendChild(fragment);
}

function createCatalogCard(product, index) {
    const card = document.createElement('article');
    card.className = 'product-card';
    card.dataset.id = product.id;

    let badgeHTML = '';
    if (product.isSale && product.salePrice) {
        const pct = Math.round((1 - product.salePrice / product.price) * 100);
        badgeHTML = `<span class="product-badge badge-sale">-${pct}%</span>`;
    } else if (product.isNew) {
        badgeHTML = '<span class="product-badge badge-new">Nuevo</span>';
    }

    let priceHTML = `<span class="product-price">${formatPrice(product.price)}</span>`;
    if (product.isSale && product.salePrice) {
        priceHTML = `
            <span class="product-price-group">
                <span class="product-price product-price-sale">${formatPrice(product.salePrice)}</span>
                <span class="product-price-original">${formatPrice(product.price)}</span>
            </span>
        `;
    }

    let sizesHTML = '';
    if (product.sizes && product.sizes.length > 0) {
        sizesHTML = `
            <div class="product-card-sizes" role="group" aria-label="Tallas disponibles">
                ${product.sizes.map(size => {
                    const isSelected = (state.size !== 'all' && size === state.size);
                    return `<button type="button" class="size-tag ${isSelected ? 'size-tag-selected' : ''}" data-size="${size}" title="Ver talla ${size}">${size}</button>`;
                }).join('')}
            </div>
        `;
    }

    const webpImage = product.image ? product.image.replace(/\.jpg$/, '.webp') : '';
    const webp480 = product.image ? product.image.replace(/\.jpg$/, '_480.webp') : '';
    const imgAttrs = index === 0
        ? 'fetchpriority="high" decoding="async"'
        : index < 4
            ? 'decoding="async"'
            : 'loading="lazy" decoding="async"';

    card.innerHTML = `
        <button type="button" class="product-card-image" aria-label="Ver detalles de ${product.name}">
            <picture>
                <source srcset="${webp480} 480w, ${webpImage} 1080w" sizes="(max-width: 768px) 46vw, (max-width: 1024px) 31vw, 24vw" type="image/webp">
                <img src="${product.image}" alt="${product.name}" width="1080" height="1420" ${imgAttrs}>
            </picture>
            ${badgeHTML}
            <span class="product-quick-hint" aria-hidden="true">Ver detalles</span>
        </button>
        <div class="product-card-body">
            <h3 class="product-card-name"><button type="button" class="product-card-name-btn">${product.name}</button></h3>
            <div class="product-card-price-row">
                ${priceHTML}
            </div>
            ${sizesHTML}
        </div>
    `;

    const imgBtn = card.querySelector('.product-card-image');
    const nameBtn = card.querySelector('.product-card-name-btn');

    const openModalHandler = (preselectedSize = null, triggerEl = imgBtn) => {
        lastFocusedElement = triggerEl;
        openProductModal(product, preselectedSize);
    };

    imgBtn.addEventListener('click', () => openModalHandler(null, imgBtn));
    nameBtn.addEventListener('click', () => openModalHandler(null, nameBtn));

    card.querySelectorAll('.size-tag').forEach(tag => {
        tag.addEventListener('click', (e) => {
            e.stopPropagation();
            openModalHandler(tag.dataset.size, tag);
        });
    });

    return card;
}

function renderEmptyState() {
    productsContainer.innerHTML = `
        <div class="catalog-empty-card">
            <h3>No encontramos prendas con estos filtros</h3>
            <p>Le invitamos a restablecer los filtros o escribirnos por WhatsApp para verificar ingresos recientes en nuestra boutique.</p>
            <div class="empty-actions">
                <button type="button" id="empty-clear-btn" class="btn btn-ruby">Ver toda la colección</button>
                <a href="https://wa.me/${WHATSAPP_NUMBER}?text=Hola%20rubi.shops,%20busco%20un%20vestido%20para%20un%20evento%20especial" target="_blank" rel="noopener noreferrer" class="btn btn-outline">Consultar a una asesora</a>
            </div>
            <div class="empty-suggestions">
                <span class="empty-suggestions-label">Explore nuestras categorías:</span>
                <div class="empty-suggestions-chips">
                    <button type="button" class="empty-suggestion-chip" data-quick-status="sale">Ofertas actuales</button>
                    <button type="button" class="empty-suggestion-chip" data-quick-cat="fiesta">Fiesta y noche</button>
                    <button type="button" class="empty-suggestion-chip" data-quick-cat="wedding">Bodas</button>
                    <button type="button" class="empty-suggestion-chip" data-quick-cat="ocasion-especial">Gala</button>
                </div>
            </div>
        </div>
    `;

    const clearBtn = document.getElementById('empty-clear-btn');
    if (clearBtn) clearBtn.addEventListener('click', window.clearAllFilters);

    productsContainer.querySelectorAll('[data-quick-cat]').forEach(btn => {
        btn.addEventListener('click', () => quickFilter(btn.dataset.quickCat));
    });
    productsContainer.querySelectorAll('[data-quick-status]').forEach(btn => {
        btn.addEventListener('click', () => quickStatus(btn.dataset.quickStatus));
    });
}

window.quickFilter = function(category) {
    state.category = category;
    state.search = '';
    state.size = 'all';
    state.status = 'all';
    syncControlsWithState();
    applyFiltersAndRender(true);
};

window.quickStatus = function(status) {
    state.status = status;
    state.search = '';
    state.category = 'all';
    state.size = 'all';
    syncControlsWithState();
    applyFiltersAndRender(true);
};

function updateMetaBar(count) {
    resultsCountEl.textContent = count === 1 ? '1 prenda' : `${count} prendas`;

    activeTagsList.innerHTML = '';
    let hasActiveFilters = false;

    if (state.category !== 'all') {
        hasActiveFilters = true;
        const catName = CATEGORY_LABELS[state.category] || state.category;
        addActiveTag(catName, () => {
            state.category = 'all';
            syncControlsWithState();
            applyFiltersAndRender(true);
        });
    }

    if (state.size !== 'all') {
        hasActiveFilters = true;
        addActiveTag(`Talla ${state.size}`, () => {
            state.size = 'all';
            syncControlsWithState();
            applyFiltersAndRender(true);
        });
    }

    if (state.status !== 'all') {
        hasActiveFilters = true;
        addActiveTag(state.status === 'new' ? 'Novedades' : 'En oferta', () => {
            state.status = 'all';
            syncControlsWithState();
            applyFiltersAndRender(true);
        });
    }

    if (state.search) {
        hasActiveFilters = true;
        addActiveTag(`"${state.search}"`, () => {
            state.search = '';
            syncControlsWithState();
            applyFiltersAndRender(true);
        });
    }

    if (activeRowEl) activeRowEl.hidden = !hasActiveFilters;
    if (clearAllBtn) clearAllBtn.hidden = !hasActiveFilters;
}

function addActiveTag(label, onRemove) {
    const tag = document.createElement('span');
    tag.className = 'active-filter-tag';
    tag.appendChild(document.createTextNode(label + ' '));

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('aria-label', `Eliminar filtro ${label}`);
    btn.innerHTML = '&times;';
    btn.addEventListener('click', onRemove);

    tag.appendChild(btn);
    activeTagsList.appendChild(tag);
}

window.clearAllFilters = function() {
    state.category = 'all';
    state.size = 'all';
    state.status = 'all';
    state.search = '';
    state.sort = 'featured';
    syncControlsWithState();
    applyFiltersAndRender(true);
};

// ── Modal de detalle ──
function openProductModal(product, preselectedSize = null, updateHistory = true) {
    if (!productModal) return;

    activeModalProduct = product;
    activeModalSize = preselectedSize || (product.sizes && product.sizes.length > 0 ? product.sizes[0] : null);

    const webpImage = product.image ? product.image.replace(/\.jpg$/, '.webp') : '';
    const webp480 = product.image ? product.image.replace(/\.jpg$/, '_480.webp') : '';
    if (modalWebp) modalWebp.srcset = `${webp480} 480w, ${webpImage} 1080w`;
    if (modalImg) {
        modalImg.src = product.image;
        modalImg.alt = product.name;
    }
    modalTitle.textContent = product.name;

    modalBadgesRow.innerHTML = '';
    const prodCat = getProductCategory(product);
    if (prodCat && CATEGORY_LABELS[prodCat]) {
        const catBadge = document.createElement('span');
        catBadge.className = 'modal-badge-chip modal-badge-neutral';
        catBadge.textContent = CATEGORY_LABELS[prodCat];
        modalBadgesRow.appendChild(catBadge);
    }
    if (product.isSale) {
        const badge = document.createElement('span');
        badge.className = 'modal-badge-chip badge-sale';
        badge.textContent = 'En oferta';
        modalBadgesRow.appendChild(badge);
    }
    if (product.isNew) {
        const badge = document.createElement('span');
        badge.className = 'modal-badge-chip';
        badge.textContent = 'Nueva colección';
        modalBadgesRow.appendChild(badge);
    }

    if (product.isSale && product.salePrice) {
        modalPriceBox.innerHTML = `
            <span class="product-price product-price-sale modal-price-value">${formatPrice(product.salePrice)}</span>
            <span class="product-price-original modal-price-old">${formatPrice(product.price)}</span>
        `;
    } else {
        modalPriceBox.innerHTML = `<span class="product-price modal-price-value">${formatPrice(product.price)}</span>`;
    }

    modalDesc.textContent = product.description;
    renderModalSizePills(product.sizes);
    updateModalWhatsappCta();

    productModal.removeAttribute('data-closing');
    if (typeof productModal.showModal === 'function') {
        try {
            if (!productModal.open) productModal.showModal();
        } catch (e) {
            productModal.setAttribute('open', '');
        }
    } else {
        productModal.setAttribute('open', '');
    }

    if (modalToast) modalToast.hidden = true;

    if (updateHistory && window.location.protocol !== 'file:') {
        try {
            const url = new URL(window.location.href);
            url.searchParams.set('id', product.id);
            window.history.pushState({ ...state, modalOpen: true, modalId: product.id }, '', url.toString());
        } catch (e) {}
    }
}

function renderModalSizePills(sizes) {
    modalSizePills.innerHTML = '';
    if (!sizes || sizes.length === 0) {
        modalSizePills.innerHTML = '<span class="modal-size-empty">Talla única</span>';
        return;
    }

    sizes.forEach(size => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `modal-size-pill ${size === activeModalSize ? 'selected' : ''}`;
        btn.textContent = size;
        btn.setAttribute('role', 'radio');
        btn.setAttribute('aria-checked', size === activeModalSize ? 'true' : 'false');
        btn.setAttribute('aria-label', `Talla ${size}`);

        btn.addEventListener('click', () => {
            activeModalSize = size;
            modalSizePills.querySelectorAll('.modal-size-pill').forEach(b => {
                const isSel = b.textContent === size;
                b.classList.toggle('selected', isSel);
                b.setAttribute('aria-checked', isSel ? 'true' : 'false');
            });
            updateModalWhatsappCta();
        });

        modalSizePills.appendChild(btn);
    });
}

function updateModalWhatsappCta() {
    if (!activeModalProduct) return;
    const sizeText = activeModalSize ? ` en talla ${activeModalSize}` : '';
    const message = encodeURIComponent(
        `Hola rubi.shops, deseo consultar disponibilidad y medidas del modelo "${activeModalProduct.name}"${sizeText}.`
    );
    modalWhatsappCta.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;
    if (modalWhatsappBtnText) {
        modalWhatsappBtnText.textContent = 'Consultar por WhatsApp';
    }
}

let suppressHistoryCleanOnClose = false;

async function closeProductModal(updateHistory = true) {
    if (!productModal) return;
    suppressHistoryCleanOnClose = !updateHistory;
    await closeTopLayer(productModal);
}

function showModalFeedback(message) {
    if (!modalToast) return;
    modalToast.textContent = message;
    modalToast.hidden = false;
    setTimeout(() => { modalToast.hidden = true; }, 2400);
}

function setupModalEvents() {
    if (!productModal) return;

    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', () => closeProductModal(true));
    }

    if (modalAddBagBtn) {
        modalAddBagBtn.addEventListener('click', () => {
            if (!activeModalProduct) return;
            addToBag(activeModalProduct, activeModalSize);
            showModalFeedback(`Agregado a su pedido (Talla ${activeModalSize || 'Única'})`);
        });
    }

    productModal.addEventListener('cancel', (event) => {
        if (!supportsTopLayerExit()) {
            event.preventDefault();
            closeProductModal(true);
        }
    });

    productModal.addEventListener('close', () => {
        if (lastFocusedElement) {
            lastFocusedElement.focus();
            lastFocusedElement = null;
        }
        if (!suppressHistoryCleanOnClose) {
            cleanUrlModalId();
        }
        suppressHistoryCleanOnClose = false;
    });

    if (!('closedBy' in HTMLDialogElement.prototype)) {
        productModal.addEventListener('click', (event) => {
            if (event.target !== productModal) return;
            const rect = productModal.getBoundingClientRect();
            const isDialogContent = rect.top <= event.clientY && event.clientY <= rect.top + rect.height &&
                                    rect.left <= event.clientX && event.clientX <= rect.left + rect.width;
            if (!isDialogContent) closeProductModal(true);
        });
    }
}

function setupEventListeners() {
    let searchTimeout = null;
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const val = e.target.value;
            if (searchClearBtn) searchClearBtn.hidden = !val.trim();
            searchTimeout = setTimeout(() => {
                state.search = val.trim();
                applyFiltersAndRender(false);
            }, 220);
        });

        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                clearTimeout(searchTimeout);
                state.search = searchInput.value.trim();
                applyFiltersAndRender(true);
            }
        });
    }

    if (searchClearBtn) {
        searchClearBtn.addEventListener('click', () => {
            searchInput.value = '';
            searchClearBtn.hidden = true;
            state.search = '';
            applyFiltersAndRender(true);
            searchInput.focus();
        });
    }

    occasionChips.forEach(chip => {
        chip.addEventListener('click', () => {
            state.category = chip.dataset.filter;
            syncControlsWithState();
            applyFiltersAndRender(true);
        });
    });

    sizeChips.forEach(chip => {
        chip.addEventListener('click', () => {
            state.size = chip.dataset.size;
            syncControlsWithState();
            applyFiltersAndRender(true);
        });
    });

    statusButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            state.status = btn.dataset.status;
            syncControlsWithState();
            applyFiltersAndRender(true);
        });
    });

    navStatusLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            state.status = link.dataset.navStatus;
            state.category = 'all';
            state.size = 'all';
            state.search = '';
            syncControlsWithState();
            applyFiltersAndRender(true);
            closeMobileNav();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });

    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            state.sort = e.target.value;
            applyFiltersAndRender(true);
        });
    }

    if (clearAllBtn) clearAllBtn.addEventListener('click', window.clearAllFilters);

    window.addEventListener('popstate', () => {
        parseUrlParams();
        syncControlsWithState();
        applyFiltersAndRender(false);

        const params = new URLSearchParams(window.location.search);
        if (params.has('id')) {
            const requestedId = parseInt(params.get('id'), 10);
            const found = allProducts.find(p => p.id === requestedId);
            if (found) openProductModal(found, state.size !== 'all' ? state.size : null, false);
        } else if (productModal && (productModal.open || productModal.hasAttribute('open'))) {
            closeProductModal(false);
        }
    });

    if (backToTopBtn) {
        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
}

function closeMobileNav() {
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

function setupMobileNav() {
    if (!navToggle || !navLinks) return;

    navToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = navLinks.classList.toggle('open');
        navToggle.classList.toggle('active', isOpen);
        navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        if (navBackdrop) navBackdrop.classList.toggle('active', isOpen);
        document.body.classList.toggle('no-scroll', isOpen);
    });

    if (navBackdrop) navBackdrop.addEventListener('click', closeMobileNav);
    navLinks.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMobileNav));

    document.addEventListener('click', (e) => {
        if (navLinks.classList.contains('open') && !navLinks.contains(e.target) && !navToggle.contains(e.target)) {
            closeMobileNav();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && navLinks.classList.contains('open')) {
            closeMobileNav();
            navToggle.focus();
        }
    });
}

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

function initInfoDialogs() {
    setupInfoDialog('btn-open-policies', 'policies-modal');
    setupInfoDialog('btn-open-shipping', 'shipping-modal');
}

function setupScrollEffects() {
    function updateScrollState() {
        const scrollY = window.scrollY || window.pageYOffset;
        if (header) header.classList.toggle('scrolled', scrollY > 36);
        if (backToTopBtn) backToTopBtn.classList.toggle('visible', scrollY > 420);
    }

    window.addEventListener('scroll', updateScrollState, { passive: true });
    updateScrollState();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCatalog);
} else {
    initCatalog();
}
