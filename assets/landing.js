
window.CflLanding = true;

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/* ------------------------------------------------------------------ Reveal */

const revealObserver =
  'IntersectionObserver' in window
    ? new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            entry.target.classList.add('is-in');
            revealObserver.unobserve(entry.target);
          }
        },
        { rootMargin: '0px 0px -8% 0px', threshold: 0.05 }
      )
    : null;

function initReveal(scope) {
  for (const element of scope.querySelectorAll('[data-cfl-reveal]:not(.is-in)')) {
    if (!revealObserver) {
      element.classList.add('is-in');
      continue;
    }
    const siblings = [...element.parentElement.children].filter((child) => child.hasAttribute('data-cfl-reveal'));
    element.style.setProperty('--cfl-delay', `${Math.min(siblings.indexOf(element), 5) * 0.09}s`);
    revealObserver.observe(element);
  }
}

/* ------------------------------------------------------------------ Hero */

class Hero {
  constructor(element) {
    this.element = element;
    this.sticky = element.querySelector('.cfl-hero__sticky');
    this.framesBox = element.querySelector('.cfl-hero__frames');
    this.frames = [...element.querySelectorAll('[data-cfl-frame]')];
    this.steps = [...element.querySelectorAll('[data-cfl-step]')];
    this.svg = element.querySelector('.cfl-hero__thread');
    this.path = element.querySelector('[data-cfl-thread]');
    this.bead = element.querySelector('[data-cfl-bead]');
    this.cue = element.querySelector('.cfl-hero__cue');
    this.ticking = false;

    this.onScroll = () => {
      if (this.ticking) return;
      this.ticking = true;
      requestAnimationFrame(() => {
        this.ticking = false;
        this.update();
      });
    };

    this.resizeObserver = new ResizeObserver(() => {
      this.layoutThread();
      this.update();
    });
    this.resizeObserver.observe(this.sticky);
    window.addEventListener('scroll', this.onScroll, { passive: true });
  }

  destroy() {
    this.resizeObserver.disconnect();
    window.removeEventListener('scroll', this.onScroll);
  }

  /** Draws the thread in pixels from the left edge into the subject at the centre of the frames. */
  layoutThread() {
    if (!this.path || !this.framesBox) return;
    const box = this.sticky.getBoundingClientRect();
    const frames = this.framesBox.getBoundingClientRect();
    const w = box.width;
    const h = box.height;
    const fx = frames.left - box.left;
    const fy = frames.top - box.top;
    const fw = frames.width;
    const fh = frames.height;
    const tx = fx + fw * 0.47;
    const ty = fy + fh * 0.42;
    // Rises from the bottom edge under the stage, loops once and lands on the subject; it never crosses the copy column.
    const startX = fx + fw * 0.12;

    this.svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    this.svg.setAttribute('preserveAspectRatio', 'none');
    this.path.removeAttribute('vector-effect');
    this.path.setAttribute(
      'd',
      [
        `M ${startX} ${h + 12}`,
        `C ${startX - fw * 0.06} ${ty + fh * 0.42}, ${tx - fw * 0.46} ${ty + fh * 0.02}, ${tx - fw * 0.26} ${ty - fh * 0.16}`,
        `S ${tx + fw * 0.12} ${ty - fh * 0.2}, ${tx + fw * 0.02} ${ty - fh * 0.04}`,
        `S ${tx - fw * 0.02} ${ty + fh * 0.02}, ${tx} ${ty}`,
      ].join(' ')
    );
    this.length = this.path.getTotalLength();
    this.path.style.strokeDasharray = `${this.length}`;
  }

  update() {
    const rect = this.element.getBoundingClientRect();
    const travel = rect.height - window.innerHeight;
    const progress = travel > 0 ? clamp(-rect.top / travel, 0, 1) : 0;
    const position = progress * (this.frames.length - 1);
    const active = Math.round(position);

    this.frames.forEach((frame, index) => {
      const distance = Math.abs(position - index);
      frame.style.opacity = String(clamp(1 - distance * 1.15, 0, 1));
      frame.style.transform = `scale(${1 + Math.min(distance, 1) * 0.05})`;
      frame.classList.toggle('is-active', index === active);
    });

    this.steps.forEach((step, index) => {
      step.classList.toggle('is-active', index === active);
      if (index === active) step.setAttribute('aria-current', 'step');
      else step.removeAttribute('aria-current');
    });

    if (this.path && this.length) {
      this.path.style.strokeDashoffset = `${this.length * (1 - progress)}`;
      const point = this.path.getPointAtLength(this.length * progress);
      this.bead.style.transform = `translate(${point.x}px, ${point.y}px)`;
      this.bead.style.opacity = progress > 0.005 && progress < 0.985 ? '1' : '0';
    }

    if (this.cue) this.cue.style.opacity = String(clamp(0.6 - progress * 6, 0, 0.6));
  }
}

const heroes = new WeakMap();

function initHero(scope) {
  for (const element of scope.querySelectorAll('[data-cfl-hero]')) {
    if (heroes.has(element) || reducedMotion.matches) continue;
    const hero = new Hero(element);
    heroes.set(element, hero);
    hero.layoutThread();
    hero.update();
  }
}

/* ------------------------------------------------------------------ Chapter rail */

function initRail(scope) {
  for (const section of scope.querySelectorAll('.cfl-chapters')) {
    const links = new Map(
      [...section.querySelectorAll('[data-cfl-rail-link]')].map((link) => [link.getAttribute('href').slice(1), link])
    );
    if (!links.size || !('IntersectionObserver' in window)) continue;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          for (const [id, link] of links) {
            const current = id === entry.target.id;
            link.classList.toggle('is-current', current);
            if (current) link.setAttribute('aria-current', 'true');
            else link.removeAttribute('aria-current');
          }
        }
      },
      { rootMargin: '-45% 0px -50% 0px' }
    );
    section.querySelectorAll('[data-cfl-chapter]').forEach((chapter) => observer.observe(chapter));
  }
}

/* ------------------------------------------------------------------ Marquee */

function initMarquee(scope) {
  for (const marquee of scope.querySelectorAll('.cfl-marquee')) {
    if (marquee.querySelector('.cfl-marquee__toggle')) continue;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cfl-marquee__toggle';
    button.setAttribute('aria-pressed', 'false');
    button.textContent = 'Pause';
    button.addEventListener('click', () => {
      const paused = marquee.classList.toggle('is-paused');
      button.setAttribute('aria-pressed', String(paused));
      button.textContent = paused ? 'Play' : 'Pause';
    });
    marquee.append(button);
  }
}

/* ------------------------------------------------------------------ Order dialog */

let formatMoney = (cents, format) =>
  format.replace(/{{\s*\w+\s*}}/, (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 }));

import('@theme/money-formatting')
  .then((module) => {
    formatMoney = module.formatMoney;
  })
  .catch(() => {});

class OrderDialog {
  /** @param {HTMLDialogElement} dialog */
  constructor(dialog) {
    this.dialog = dialog;
    this.form = dialog.querySelector('[data-cfl-form]');
    this.title = dialog.querySelector('[data-cfl-modal-title]');
    this.notes = dialog.querySelector('[data-cfl-modal-notes]');
    this.visual = dialog.querySelector('[data-cfl-modal-visual]');
    this.image = dialog.querySelector('[data-cfl-modal-image]');
    this.roastChoices = dialog.querySelector('[data-cfl-roast-choices]');
    this.optionsBox = dialog.querySelector('[data-cfl-options]');
    this.variantInput = dialog.querySelector('[data-cfl-variant-id]');
    this.quantityInput = dialog.querySelector('[data-cfl-qty-input]');
    this.submit = dialog.querySelector('[data-cfl-submit]');
    this.submitLabel = dialog.querySelector('[data-cfl-submit-label]');
    this.price = dialog.querySelector('[data-cfl-price]');
    this.status = dialog.querySelector('[data-cfl-status]');
    this.done = dialog.querySelector('[data-cfl-done]');
    this.addLabel = this.submitLabel.textContent.trim();
    this.moneyFormat = dialog.dataset.moneyFormat || '{{amount}}';
    this.currency = dialog.dataset.currency || 'USD';
    this.cartUrl = dialog.dataset.cartUrl || '/cart';
    this.cartAddUrl = dialog.dataset.cartAddUrl || '/cart/add';
    this.products = new Map();
    this.selected = {};

    for (const script of document.querySelectorAll('script[data-cfl-product]')) {
      try {
        const data = JSON.parse(script.textContent);
        this.products.set(data.product.handle, data);
      } catch (error) {
        console.error('[coffee-landing] Bad product data', error);
      }
    }

    this.renderRoastChoices();

    dialog.addEventListener('click', (event) => {
      if (event.target === dialog || event.target.closest('[data-cfl-close]')) this.close();
    });
    dialog.addEventListener('close', () => {
      // Another landing dialog (e.g. a cart) may have opened in the meantime; keep the scroll lock for it.
      if (!document.querySelector('dialog.cfl[open]')) document.documentElement.classList.remove('cfl-modal-open');
    });
    dialog.addEventListener('change', (event) => this.onChange(event));
    dialog.querySelectorAll('[data-cfl-qty]').forEach((button) =>
      button.addEventListener('click', () => {
        this.quantityInput.value = String(clamp((Number(this.quantityInput.value) || 1) + Number(button.dataset.cflQty), 1, 99));
        this.updatePrice();
      })
    );
    this.quantityInput.addEventListener('input', () => this.updatePrice());
    this.form.addEventListener('submit', (event) => this.onSubmit(event));
  }

  get hasProducts() {
    return this.products.size > 0;
  }

  open(handle) {
    const target = this.products.get(handle) || this.products.values().next().value;
    if (!target) return false;
    this.done.hidden = true;
    this.setStatus('');
    this.quantityInput.value = '1';
    this.selectProduct(target.product.handle);
    if (!this.dialog.open) this.dialog.showModal();
    document.documentElement.classList.add('cfl-modal-open');
    return true;
  }

  close() {
    if (this.dialog.open) this.dialog.close();
  }

  renderRoastChoices() {
    const name = `${this.dialog.id || 'cfl'}-roast`;
    this.roastChoices.replaceChildren(
      ...[...this.products.values()].map((data) => {
        const label = document.createElement('label');
        label.className = 'cfl-choice';
        label.innerHTML = `<input type="radio" name="${name}" value=""><span><i class="cfl-choice__dot"></i></span>`;
        const input = label.querySelector('input');
        input.value = data.product.handle;
        input.dataset.cflRoast = '';
        const span = label.querySelector('span');
        span.querySelector('i').style.setProperty('--cfl-dot', data.swatch || '#ccc');
        span.append(document.createTextNode(data.name));
        return label;
      })
    );
  }

  selectProduct(handle) {
    const data = this.products.get(handle);
    if (!data) return;
    this.current = data;
    const { product } = data;

    for (const input of this.roastChoices.querySelectorAll('input')) input.checked = input.value === handle;

    this.title.textContent = data.name;
    this.notes.textContent = [data.roast, data.notes].filter(Boolean).join(' — ');
    this.visual.style.setProperty('--cfl-modal-swatch', data.swatch || '');
    this.visual.style.setProperty('--cfl-modal-swatch-ink', data.swatchInk || '');
    if (data.image) {
      this.image.src = data.image;
      this.image.alt = product.imageAlt || data.name;
      this.image.hidden = false;
    } else {
      this.image.hidden = true;
    }

    const firstAvailable = product.variants.find((variant) => variant.available) || product.variants[0];
    this.selected = Object.fromEntries(product.options.map((option, index) => [index, firstAvailable.options[index]]));
    this.renderOptions();
    this.updateVariant();
  }

  renderOptions() {
    const { product } = this.current;
    const hideDefault = product.options.length === 1 && product.variants.length === 1;
    this.optionsBox.replaceChildren(
      ...(hideDefault ? [] : product.options).map((optionName, index) => {
        const values = [...new Set(product.variants.map((variant) => variant.options[index]))];
        const fieldset = document.createElement('fieldset');
        fieldset.className = 'cfl-field';
        const legend = document.createElement('legend');
        legend.className = 'cfl-field__legend';
        legend.textContent = optionName;
        const pills = document.createElement('div');
        pills.className = 'cfl-pills';
        for (const value of values) {
          const label = document.createElement('label');
          label.className = 'cfl-choice';
          const input = document.createElement('input');
          input.type = 'radio';
          input.name = `cfl-option-${index}`;
          input.value = value;
          input.dataset.cflOption = String(index);
          input.checked = this.selected[index] === value;
          const span = document.createElement('span');
          span.textContent = value;
          label.append(input, span);
          pills.append(label);
        }
        fieldset.append(legend, pills);
        return fieldset;
      })
    );
  }

  onChange(event) {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    if (input.dataset.cflRoast !== undefined && input.checked) {
      this.selectProduct(input.value);
      return;
    }
    if (input.dataset.cflOption !== undefined) {
      this.selected[Number(input.dataset.cflOption)] = input.value;
      this.updateVariant();
    }
  }

  findVariant() {
    return this.current.product.variants.find((variant) =>
      variant.options.every((value, index) => this.selected[index] === value)
    );
  }

  updateVariant() {
    const variant = this.findVariant();
    this.variant = variant;
    this.variantInput.value = variant ? String(variant.id) : '';

    // Disable option values that cannot make an available variant with the other current choices.
    for (const input of this.optionsBox.querySelectorAll('input[data-cfl-option]')) {
      const index = Number(input.dataset.cflOption);
      const possible = this.current.product.variants.some(
        (candidate) =>
          candidate.available &&
          candidate.options.every((value, i) => (i === index ? value === input.value : value === this.selected[i]))
      );
      input.disabled = !possible && !input.checked;
    }

    const available = Boolean(variant?.available);
    this.submit.disabled = !available;
    this.submitLabel.textContent = variant ? (available ? this.addLabel : 'Sold out') : 'Unavailable';
    this.updatePrice();
  }

  updatePrice() {
    const quantity = clamp(Number(this.quantityInput.value) || 1, 1, 99);
    this.price.textContent = this.variant ? formatMoney(this.variant.price * quantity, this.moneyFormat, this.currency) : '';
  }

  setStatus(message, isError = false) {
    this.status.textContent = message;
    this.status.classList.toggle('is-error', isError);
  }

  async onSubmit(event) {
    event.preventDefault();
    if (!this.variant?.available || this.busy) return;
    this.busy = true;
    this.submit.disabled = true;
    this.submitLabel.textContent = 'Adding…';
    this.setStatus('');

    const quantity = clamp(Number(this.quantityInput.value) || 1, 1, 99);
    try {
      const response = await fetch(`${this.cartAddUrl}.js`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ items: [{ id: this.variant.id, quantity }] }),
      });
      const result = await response.json();
      if (!response.ok || result.status) {
        throw new Error(result.description || result.message || 'Could not add to cart.');
      }

      const cart = await fetch(`${this.cartUrl}.js`, { headers: { Accept: 'application/json' } }).then((r) => r.json());
      await this.announceCartChange(cart);
      this.afterAdd();
    } catch (error) {
      this.setStatus(error.message, true);
    } finally {
      this.busy = false;
      this.submitLabel.textContent = this.addLabel;
      this.submit.disabled = !this.variant?.available;
    }
  }

  /** Tells the theme the cart changed, so the header count and the cart drawer re-render. */
  async announceCartChange(cart) {
    try {
      const { CartAddEvent } = await import('@theme/events');
      document.dispatchEvent(
        new CartAddEvent({}, 'coffee-landing', {
          source: 'coffee-landing',
          itemCount: cart.item_count,
          variantId: String(this.variant.id),
          productId: String(this.current.product.id),
        })
      );
    } catch (error) {
      console.warn('[coffee-landing] Theme cart events unavailable', error);
    }
  }

  afterAdd() {
    const drawer = document.querySelector('cart-drawer-component');
    if (drawer && typeof drawer.open === 'function') {
      this.close();
      if (!drawer.hasAttribute('auto-open')) drawer.open();
      return;
    }
    this.setStatus('');
    this.done.hidden = false;
    this.done.querySelector('a')?.focus();
  }
}

let orderDialog = null;

function initDialog() {
  const dialog = document.querySelector('dialog[data-cfl-modal]');
  orderDialog = dialog && typeof dialog.showModal === 'function' ? new OrderDialog(dialog) : null;
}

document.addEventListener('click', (event) => {
  const trigger = event.target instanceof Element ? event.target.closest('[data-cfl-open]') : null;
  if (!trigger || !orderDialog?.hasProducts) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey) return;
  event.preventDefault();
  orderDialog.open(trigger.getAttribute('data-cfl-open'));
});

/* ------------------------------------------------------------------ Boot */

function init(scope = document) {
  initReveal(scope);
  initHero(scope);
  initRail(scope);
  initMarquee(scope);
}

init();
initDialog();


/* ------------------------------------------------------------------ Preview cart */
// Preview build: checkout is not open yet, so the order dialog adds to a cart kept in this browser.

const CART_KEY = 'cfl-preview-cart';
const previewCart = {
  read() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY)) || [];
    } catch {
      return [];
    }
  },
  write(lines) {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(lines));
    } catch {
      // Private mode: the cart still works for this page view.
    }
    previewCart.memory = lines;
  },
};
const cartDialog = document.querySelector('dialog[data-cfl-cart]');
const orderDialogElement = document.querySelector('dialog[data-cfl-modal]');
const cartMoney = (cents) =>
  formatMoney(cents, orderDialogElement?.dataset.moneyFormat || '{{amount}}', orderDialogElement?.dataset.currency || 'USD');
const readLines = () => previewCart.memory || previewCart.read();

function renderCart() {
  const lines = readLines();
  const count = lines.reduce((total, line) => total + line.quantity, 0);
  document.querySelectorAll('[data-cfl-cart-count]').forEach((element) => (element.textContent = String(count)));
  if (!cartDialog) return;

  cartDialog.querySelector('[data-cfl-cart-lines]').replaceChildren(
    ...lines.map((line, index) => {
      const item = document.createElement('li');
      item.className = 'cfl-cart__line';
      item.innerHTML = `
        <img alt="" width="64" height="80">
        <div class="cfl-cart__info">
          <p class="cfl-cart__name"></p>
          <p class="cfl-cart__variant cfl-mono"></p>
          <div class="cfl-qty cfl-qty--small">
            <button type="button" class="cfl-qty__btn" data-step="-1"><span class="visually-hidden">Decrease quantity</span>−</button>
            <span class="cfl-qty__value"></span>
            <button type="button" class="cfl-qty__btn" data-step="1"><span class="visually-hidden">Increase quantity</span>+</button>
          </div>
        </div>
        <p class="cfl-cart__price"></p>`;
      item.querySelector('img').src = line.image || '';
      item.querySelector('.cfl-cart__name').textContent = line.name;
      item.querySelector('.cfl-cart__variant').textContent = line.variant;
      item.querySelector('.cfl-qty__value').textContent = String(line.quantity);
      item.querySelector('.cfl-cart__price').textContent = cartMoney(line.price * line.quantity);
      item.querySelectorAll('[data-step]').forEach((button) =>
        button.addEventListener('click', () => {
          const next = readLines().map((entry) => ({ ...entry }));
          next[index].quantity += Number(button.dataset.step);
          if (next[index].quantity <= 0) next.splice(index, 1);
          previewCart.write(next);
          renderCart();
        })
      );
      return item;
    })
  );
  cartDialog.querySelector('[data-cfl-cart-empty]').hidden = lines.length > 0;
  cartDialog.querySelector('[data-cfl-cart-subtotal]').textContent = cartMoney(
    lines.reduce((total, line) => total + line.price * line.quantity, 0)
  );
}

function openCart() {
  renderCart();
  if (cartDialog && !cartDialog.open) cartDialog.showModal();
  document.documentElement.classList.add('cfl-modal-open');
}

cartDialog?.addEventListener('close', () => {
  if (!document.querySelector('dialog.cfl[open]')) document.documentElement.classList.remove('cfl-modal-open');
});
cartDialog?.addEventListener('click', (event) => {
  if (event.target === cartDialog || event.target.closest('[data-cfl-cart-close]')) cartDialog.close();
});
document.querySelectorAll('[data-cfl-cart-open]').forEach((button) => button.addEventListener('click', openCart));

OrderDialog.prototype.onSubmit = function (event) {
  event.preventDefault();
  if (!this.variant?.available) return;
  const quantity = clamp(Number(this.quantityInput.value) || 1, 1, 99);
  const lines = readLines().map((entry) => ({ ...entry }));
  const existing = lines.find((line) => line.id === this.variant.id);
  if (existing) existing.quantity += quantity;
  else
    lines.push({
      id: this.variant.id,
      name: this.current.name,
      variant: this.variant.title.replaceAll(' / ', ' · '),
      price: this.variant.price,
      image: this.current.image,
      quantity,
    });
  previewCart.write(lines);
  this.close();
  openCart();
};

renderCart();
