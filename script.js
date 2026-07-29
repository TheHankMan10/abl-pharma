// ABL Pharma - interactive behaviors: nav toggle, cart, contact form, reveal on scroll
console.log('ABL Pharma site initialized');

// Update the product prices in this catalog when official pricing is available.
const PRODUCT_CATALOG = [
  {
    id: 'shred-rx',
    name: 'ShredRX',
    price: 44,
    image: 'Images/new-ShredRX-bottle.png',
    pageUrl: 'shred-rx.html'
  },
  {
    id: 'pct',
    name: 'Post Cycle Therapy',
    price: 54,
    image: 'Images/new-pct-bottle.png',
    pageUrl: 'pct.html'
  },
  {
    id: 'trt',
    name: 'TRT Support',
    price: 49,
    image: 'Images/new-trt-bottle-transparent.png',
    pageUrl: 'trt.html'
  },
  {
    id: 'tudca',
    name: 'TUDCA',
    price: 0,
    image: 'Images/new-tudca-bottle-transparent.png',
    pageUrl: 'tudca.html'
  },
  {
    id: 'cycle-support',
    name: 'Cycle Support',
    price: 0,
    image: 'Images/new-cycle-support-bottle.png',
    pageUrl: 'cycle-support.html'
  }
];

const STORAGE_KEY = 'abl-pharma-cart';

let cart = loadCart();
let cartOpen = false;
let pendingNewCartItemId = null;
let toastTimer = null;

function loadCart() {
  try {
    const savedCart = localStorage.getItem(STORAGE_KEY);
    return savedCart ? JSON.parse(savedCart) : [];
  } catch (error) {
    console.warn('Cart could not be loaded from localStorage', error);
    return [];
  }
}

function saveCart() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
}

function formatPrice(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function isValidEmail(email) {
  // Basic, resilient email validation suitable for client-side checks
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getCartCount() {
  return cart.reduce((total, item) => total + item.quantity, 0);
}

function openCart() {
  const overlay = document.getElementById('cartOverlay');
  const drawer = document.getElementById('cartDrawer');
  if (!overlay || !drawer) return;

  overlay.classList.add('is-open');
  drawer.classList.add('is-open');
  overlay.setAttribute('aria-hidden', 'false');
  drawer.setAttribute('aria-hidden', 'false');
  document.body.classList.add('cart-open');
  cartOpen = true;

  // Accessibility: move focus into the cart drawer for keyboard users
  const closeBtn = document.getElementById('cartCloseBtn');
  if (closeBtn) {
    closeBtn.focus();
  }
}

function closeCart() {
  const overlay = document.getElementById('cartOverlay');
  const drawer = document.getElementById('cartDrawer');
  if (!overlay || !drawer) return;

  overlay.classList.remove('is-open');
  drawer.classList.remove('is-open');
  overlay.setAttribute('aria-hidden', 'true');
  drawer.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('cart-open');
  cartOpen = false;

  // Accessibility: return focus to the cart button when closing
  const cartBtn = document.getElementById('cartBtn');
  if (cartBtn) {
    cartBtn.focus();
  }
}

function updateCartBadge() {
  const cartBadge = document.querySelector('.cart-badge');
  const cartBtn = document.getElementById('cartBtn');
  if (!cartBadge) return;

  const count = getCartCount();
  cartBadge.textContent = count;
  cartBadge.setAttribute('aria-live', 'polite');
  // also update the cart button label for screen reader users
  if (cartBtn) {
    cartBtn.setAttribute('aria-label', `Shopping cart with ${count} item${count === 1 ? '' : 's'}`);
  }

  cartBadge.classList.remove('is-pop');
  void cartBadge.offsetWidth;
  cartBadge.classList.add('is-pop');
}

function setCartButtonLabel() {
  const cartBtn = document.getElementById('cartBtn');
  if (!cartBtn) return;

  const iconMarkup = `
    <span class="cart-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <circle cx="8" cy="19" r="1.5"></circle>
        <circle cx="17" cy="19" r="1.5"></circle>
        <path d="M3 4h2l2.6 10.4a1 1 0 0 0 1 .8h8.4a1 1 0 0 0 1-.8L17 7H7"></path>
      </svg>
    </span>
    <span class="cart-badge">0</span>
  `;

  cartBtn.innerHTML = iconMarkup;
  cartBtn.setAttribute('aria-label', 'Shopping cart');
  cartBtn.classList.add('cart-toggle');
}

function showToast(message, duration = 1800) {
  let toast = document.getElementById('cartToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'cartToast';
    toast.className = 'cart-toast';
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add('is-visible');

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('is-visible');
  }, duration);
}

function showAddedToast(productName) {
  showToast(`Added to cart: ${productName}`);
}

function animateCartFlight(sourceButton, product) {
  const cartBtn = document.getElementById('cartBtn');
  if (!cartBtn || !product) return;

  const sourceRect = sourceButton.getBoundingClientRect();
  const targetRect = cartBtn.getBoundingClientRect();

  const flight = document.createElement('div');
  flight.className = 'cart-flight';
  const image = document.createElement('img');
  image.src = product.image;
  image.alt = product.name;
  flight.appendChild(image);

  const startX = sourceRect.left + sourceRect.width / 2;
  const startY = sourceRect.top + sourceRect.height / 2;
  const targetX = targetRect.left + targetRect.width / 2 - startX;
  const targetY = targetRect.top + targetRect.height / 2 - startY;

  flight.style.left = `${startX}px`;
  flight.style.top = `${startY}px`;
  flight.style.setProperty('--target-x', `${targetX}px`);
  flight.style.setProperty('--target-y', `${targetY}px`);
  document.body.appendChild(flight);

  requestAnimationFrame(() => {
    flight.classList.add('is-flying');
  });

  flight.addEventListener('animationend', () => {
    flight.remove();
  });
}

function animateCartBounce() {
  const cartBtn = document.getElementById('cartBtn');
  if (!cartBtn) return;

  cartBtn.classList.remove('cart-bounce');
  void cartBtn.offsetWidth;
  cartBtn.classList.add('cart-bounce');
}

function addProductToCart(productId, sourceButton) {
  const product = PRODUCT_CATALOG.find((entry) => entry.id === productId);
  if (!product) return;

  // Prevent adding items that do not yet have official pricing
  if (!product.price || product.price <= 0) {
    showToast('Pricing is not yet available for this product. Please check back or contact the team for information.');
    return;
  }

  const existingItem = cart.find((entry) => entry.id === product.id);
  const isNewItem = !existingItem;

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({ ...product, quantity: 1 });
  }

  pendingNewCartItemId = isNewItem ? product.id : null;
  saveCart();
  updateCartBadge();
  renderCart();
  openCart();
  showAddedToast(product.name);
  animateCartBounce();
  animateCartFlight(sourceButton, product);
}

function updateQuantity(productId, change) {
  const item = cart.find((entry) => entry.id === productId);
  if (!item) return;

  if (change < 0 && item.quantity <= 1) {
    removeItem(productId);
    return;
  }

  item.quantity += change;
  saveCart();
  renderCart();
}

function removeItem(productId) {
  const itemElement = document.querySelector(`[data-item-id="${productId}"]`);
  if (itemElement) {
    itemElement.classList.add('is-removing');
  }

  window.setTimeout(() => {
    cart = cart.filter((entry) => entry.id !== productId);
    saveCart();
    renderCart();
  }, 220);
}

function renderCart() {
  const cartBody = document.getElementById('cartBody');
  const subtotalElement = document.getElementById('cartSubtotal');
  const checkoutButton = document.getElementById('checkoutBtn');

  if (!cartBody || !subtotalElement || !checkoutButton) return;

  if (cart.length === 0) {
    cartBody.innerHTML = `
      <div class="cart-empty">
        <p>Your cart is empty.</p>
        <p>Add a product to start building your order.</p>
        <button type="button" class="btn btn-primary" id="emptyCartContinue">Continue shopping</button>
      </div>
    `;
    subtotalElement.innerHTML = '<span class="placeholder-label">—</span>';
    checkoutButton.disabled = true;
    return;
  }

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  subtotalElement.textContent = formatPrice(subtotal);
  checkoutButton.disabled = false;

  cartBody.innerHTML = cart.map((item) => {
    const isNewItem = item.id === pendingNewCartItemId;
    const itemClass = isNewItem ? 'cart-item is-entering' : 'cart-item';
    return `
      <article class="${itemClass}" data-item-id="${item.id}">
        <img src="${item.image}" alt="${item.name} bottle">
        <div class="cart-item__info">
          <div class="cart-item__name">${item.name}</div>
          <div class="cart-item__price">${formatPrice(item.price)}</div>
          <div class="cart-item__controls">
            <button type="button" class="cart-qty-btn cart-qty-btn--minus" data-id="${item.id}" aria-label="Decrease quantity">−</button>
            <div class="cart-qty-value">${item.quantity}</div>
            <button type="button" class="cart-qty-btn cart-qty-btn--plus" data-id="${item.id}" aria-label="Increase quantity">+</button>
          </div>
          <button type="button" class="cart-remove" data-id="${item.id}">Remove</button>
        </div>
        <div class="cart-item__price">${formatPrice(item.price * item.quantity)}</div>
      </article>
    `;
  }).join('');

  pendingNewCartItemId = null;
}

function syncProductCardPrices() {
  // Update product cards in grids/collections
  document.querySelectorAll('.product-card').forEach((card) => {
    const addBtn = card.querySelector('.add-to-cart');
    const priceEl = card.querySelector('.price');
    let productId = null;
    if (addBtn && addBtn.dataset && addBtn.dataset.productId) {
      productId = addBtn.dataset.productId;
    } else if (card.dataset && card.dataset.productId) {
      productId = card.dataset.productId;
    }
    if (!productId) return;
    const product = PRODUCT_CATALOG.find(p => p.id === productId);
    if (!product) return;

    if (priceEl) {
      if (product.price && product.price > 0) {
        priceEl.textContent = formatPrice(product.price);
      } else {
        priceEl.innerHTML = '<span class="placeholder-label">Price coming soon</span>';
      }
    }

    if (addBtn) {
      if (!product.price || product.price <= 0) {
        addBtn.disabled = true;
        addBtn.classList.add('btn-disabled');
        addBtn.setAttribute('aria-disabled', 'true');
        addBtn.title = 'Pricing not yet available';
        // keep icon if present, otherwise update button text
        if (!addBtn.querySelector('svg')) {
          addBtn.textContent = 'Price coming soon';
        }
      } else {
        addBtn.disabled = false;
        addBtn.classList.remove('btn-disabled');
        addBtn.removeAttribute('aria-disabled');
        addBtn.title = '';
        if (!addBtn.querySelector('svg')) {
          addBtn.textContent = 'Add to cart';
        }
      }
    }
  });

  // Update single product detail pages (if present)
  const detailPriceEl = document.querySelector('.product-detail-price');
  const detailAddBtn = document.querySelector('.hero-cta .add-to-cart, .add-to-cart');
  if (detailAddBtn && detailAddBtn.dataset && detailAddBtn.dataset.productId) {
    const pid = detailAddBtn.dataset.productId;
    const prod = PRODUCT_CATALOG.find(p => p.id === pid);
    if (detailPriceEl) {
      if (prod && prod.price && prod.price > 0) {
        detailPriceEl.textContent = prod.price ? `Price: ${formatPrice(prod.price)}` : '';
      } else {
        detailPriceEl.innerHTML = '<span class="placeholder-label">Price coming soon</span>';
      }
    }

    if (prod && (!prod.price || prod.price <= 0)) {
      detailAddBtn.disabled = true;
      detailAddBtn.classList.add('btn-disabled');
      detailAddBtn.setAttribute('aria-disabled', 'true');
      detailAddBtn.title = 'Pricing not yet available';
    } else if (detailAddBtn) {
      detailAddBtn.disabled = false;
      detailAddBtn.classList.remove('btn-disabled');
      detailAddBtn.removeAttribute('aria-disabled');
      detailAddBtn.title = '';
    }
  }
}

function bindCartInteractions() {
  const cartBtn = document.getElementById('cartBtn');
  const overlay = document.getElementById('cartOverlay');
  const closeBtn = document.getElementById('cartCloseBtn');
  const continueBtn = document.getElementById('continueShoppingBtn');
  const checkoutButton = document.getElementById('checkoutBtn');
  const cartBody = document.getElementById('cartBody');

  if (cartBtn) {
    cartBtn.addEventListener('click', () => {
      if (cartOpen) {
        closeCart();
      } else {
        openCart();
      }
    });
  }

  if (overlay) {
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        closeCart();
      }
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', closeCart);
  }

  if (continueBtn) {
    continueBtn.addEventListener('click', closeCart);
  }

  if (checkoutButton) {
    checkoutButton.addEventListener('click', () => {
      if (cart.length === 0) return;
      window.alert('Online checkout is being prepared. Please contact ABL Pharma to place an order.');
    });
  }

  if (cartBody) {
    cartBody.addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (!button) return;

      const productId = button.dataset.id;
      if (!productId) return;

      if (button.classList.contains('cart-qty-btn--plus')) {
        updateQuantity(productId, 1);
      } else if (button.classList.contains('cart-qty-btn--minus')) {
        updateQuantity(productId, -1);
      } else if (button.classList.contains('cart-remove')) {
        removeItem(productId);
      } else if (button.id === 'emptyCartContinue') {
        closeCart();
      }
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && cartOpen) {
      closeCart();
    }
  });
}

function initializeCartUI() {
  setCartButtonLabel();
  updateCartBadge();

  if (!document.getElementById('cartOverlay')) {
    document.body.insertAdjacentHTML('beforeend', `
      <div class="cart-overlay" id="cartOverlay" aria-hidden="true"></div>
      <aside class="cart-drawer" id="cartDrawer" role="dialog" aria-label="Shopping cart" aria-hidden="true">
        <div class="cart-drawer__header">
          <div>
            <p class="cart-drawer__eyebrow">Your order</p>
            <h3>Your Cart</h3>
          </div>
          <button type="button" class="cart-close" id="cartCloseBtn" aria-label="Close cart">×</button>
        </div>
        <div class="cart-body" id="cartBody"></div>
        <div class="cart-footer">
          <div class="cart-subtotal">Subtotal <span id="cartSubtotal"><span class="placeholder-label">—</span></span></div>
          <button type="button" class="btn btn-outline" id="continueShoppingBtn">Continue Shopping</button>
          <button type="button" class="btn btn-primary" id="checkoutBtn" disabled>Checkout</button>
        </div>
      </aside>
    `);
  }

  bindCartInteractions();
  renderCart();
}

function initializeAddToCartButtons() {
  document.querySelectorAll('.add-to-cart').forEach((button) => {
    button.addEventListener('click', (event) => {
      const productId = button.dataset.productId;
      if (!productId) return;
      addProductToCart(productId, button);
      event.preventDefault();
    });
  });
}

function initializeProductCatalog() {
  const productGrid = document.querySelector('[data-product-grid]');
  const searchInput = document.getElementById('productSearch');
  const filterChips = document.querySelectorAll('.filter-chip');
  const sortSelect = document.getElementById('sortSelect');
  const resultsSummary = document.getElementById('productResults');
  const loadingEl = document.getElementById('productsLoading');

  // Accessibility: tie the search input to the product grid for assistive tech
  if (searchInput && productGrid && !searchInput.hasAttribute('aria-controls')) {
    searchInput.setAttribute('aria-controls', productGrid.id || 'productGrid');
    searchInput.setAttribute('aria-label', 'Search products by name or keyword');
  }

  if (!productGrid || !searchInput || !sortSelect || !resultsSummary) return;

  const cards = Array.from(productGrid.querySelectorAll('.product-card'));
  let activeFilter = 'all';

  function applyFilters() {
    const term = searchInput.value.trim().toLowerCase();
    const visibleCards = cards.filter((card) => {
      const matchesFilter = activeFilter === 'all' || card.dataset.category === activeFilter;
      const matchesSearch = !term || card.dataset.search.includes(term) || card.dataset.name.toLowerCase().includes(term);
      return matchesFilter && matchesSearch;
    });

    const sortedCards = [...visibleCards].sort((a, b) => {
      if (sortSelect.value === 'price-low') {
        return Number(a.dataset.price) - Number(b.dataset.price);
      }
      if (sortSelect.value === 'price-high') {
        return Number(b.dataset.price) - Number(a.dataset.price);
      }
      if (sortSelect.value === 'name') {
        return a.dataset.name.localeCompare(b.dataset.name);
      }
      return 0;
    });

    cards.forEach((card) => {
      card.style.display = 'none';
    });

    sortedCards.forEach((card) => {
      card.style.display = 'block';
    });

    resultsSummary.textContent = `Showing ${sortedCards.length} product${sortedCards.length === 1 ? '' : 's'}`;
  }

  searchInput.addEventListener('input', applyFilters);
  sortSelect.addEventListener('change', applyFilters);
  filterChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      filterChips.forEach((item) => item.classList.remove('is-active'));
      chip.classList.add('is-active');
      activeFilter = chip.dataset.filter || 'all';
      applyFilters();
    });
  });

  if (loadingEl) {
    loadingEl.classList.add('is-active');
    window.setTimeout(() => {
      loadingEl.classList.remove('is-active');
      applyFilters();
    }, 650);
  } else {
    applyFilters();
  }
}

function initializeNavigation() {
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.querySelector('.nav-links');
  const scrollTopBtn = document.getElementById('scrollTop');

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('show');
      navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    navLinks.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        if (navLinks.classList.contains('show')) {
          navLinks.classList.remove('show');
          navToggle.setAttribute('aria-expanded', 'false');
        }
      });
    });
  }

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const targetId = link.getAttribute('href').slice(1);
      const target = document.getElementById(targetId);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
    });
  });

  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const activePage = ['products.html', 'about-us.html', 'faq.html', 'contact.html', 'privacy-policy.html', 'terms-conditions.html', 'shipping-returns.html'].includes(currentPath)
    ? currentPath
    : 'index.html';

  document.querySelectorAll('.nav-links a').forEach((link) => {
    const href = link.getAttribute('href');
    if (href === 'products.html' && ['products.html', 'pct.html', 'shred-rx.html', 'trt.html', 'tudca.html', 'cycle-support.html'].includes(currentPath)) {
      link.classList.add('active');
    } else if (href === activePage) {
      link.classList.add('active');
    } else if (href === 'index.html' && currentPath === 'index.html') {
      link.classList.add('active');
    }
  });

  if (scrollTopBtn) {
    window.addEventListener('scroll', () => {
      scrollTopBtn.classList.toggle('visible', window.scrollY > 450);
    });

    scrollTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}

document.addEventListener('DOMContentLoaded', function(){
  const shopNow = document.getElementById('shopNow');
  const products = document.getElementById('products');
  const contactForm = document.getElementById('contactForm');
  const contactMsg = document.getElementById('contactMsg');
  const contactPageForm = document.getElementById('contactPageForm');
  const contactPageMsg = contactPageForm ? contactPageForm.querySelector('.form-msg') : null;

  if(shopNow && products){
    shopNow.addEventListener('click', () => {
      products.scrollIntoView({behavior:'smooth'});
    });
  }

  initializeCartUI();
  initializeAddToCartButtons();
  initializeProductCatalog();
  // sync visible product card prices and disable purchasing for unpriced items
  syncProductCardPrices();
  initializeNavigation();

  if(contactForm){
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = contactForm.name.value.trim();
      const email = contactForm.email.value.trim();
      const message = contactForm.message.value.trim();

      if(!name || !email || !message){
        contactMsg.textContent = 'Please fill out all fields.';
        return;
      }

      if(!isValidEmail(email)){
        contactMsg.textContent = 'Please enter a valid email address.';
        return;
      }

      contactMsg.textContent = 'Sending...';
      setTimeout(() => {
        contactMsg.textContent = 'Thanks — your message has been sent. We will reply within 1-2 business days.';
        contactForm.reset();
      }, 900);
    });
  }

  if(contactPageForm && contactPageMsg){
    contactPageForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = contactPageForm.name.value.trim();
      const email = contactPageForm.email.value.trim();
      const message = contactPageForm.message.value.trim();

      if(!name || !email || !message){
        contactPageMsg.textContent = 'Please fill out all fields.';
        return;
      }

      if(!isValidEmail(email)){
        contactPageMsg.textContent = 'Please enter a valid email address.';
        return;
      }

      contactPageMsg.textContent = 'Sending...';
      setTimeout(() => {
        contactPageMsg.textContent = 'Thanks — your message has been sent. We will reply within 1-2 business days.';
        contactPageForm.reset();
      }, 900);
    });
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, {threshold:0.12});

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

  const nav = document.querySelector('.nav');
  window.addEventListener('scroll', () => {
    const sc = window.scrollY;
    if(sc > 50){
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  });

  document.body.classList.add('page-ready');
});
