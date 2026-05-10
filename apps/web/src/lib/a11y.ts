export function initAccessibility(): void {
  if (typeof document === 'undefined') return;

  // Skip to main content link
  injectSkipLink();

  // Focus management
  initFocusManagement();

  // Keyboard navigation
  initKeyboardNavigation();
}

export function injectSkipLink(): void {
  const skipLink = document.createElement('a');
  skipLink.href = '#main-content';
  skipLink.textContent = 'Skip to main content';
  skipLink.style.cssText = `
    position: absolute;
    top: -40px;
    left: 0;
    background: var(--brand);
    color: white;
    padding: 8px;
    border-radius: 0 0 4px 0;
    z-index: 100;
  `;

  skipLink.addEventListener('focus', () => {
    skipLink.style.top = '0';
  });

  skipLink.addEventListener('blur', () => {
    skipLink.style.top = '-40px';
  });

  document.body.insertBefore(skipLink, document.body.firstChild);
}

export function initFocusManagement(): void {
  if (typeof document === 'undefined') return;

  let mode: 'mouse' | 'keyboard' = 'mouse';

  document.addEventListener('mousedown', () => {
    mode = 'mouse';
    document.documentElement.classList.remove('keyboard-nav');
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      mode = 'keyboard';
      document.documentElement.classList.add('keyboard-nav');
    }
  });
}

export function initKeyboardNavigation(): void {
  if (typeof document === 'undefined') return;

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modals = document.querySelectorAll('[role="dialog"]');
      if (modals.length > 0) {
        const lastModal = modals[modals.length - 1] as HTMLElement;
        lastModal.dispatchEvent(new CustomEvent('close'));
      }
    }

    if (e.key === 'Enter' && (e.target as HTMLElement).matches('[role="button"]')) {
      (e.target as HTMLElement).click();
    }
  });
}

export function setAriaLabel(element: HTMLElement, label: string): void {
  element.setAttribute('aria-label', label);
}

export function setAriaLive(element: HTMLElement, polite = true): void {
  element.setAttribute('aria-live', polite ? 'polite' : 'assertive');
  element.setAttribute('aria-atomic', 'true');
}

export function announceToScreenReader(message: string): void {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.style.position = 'absolute';
  announcement.style.left = '-10000px';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

export function makeKeyboardAccessible(element: HTMLElement): void {
  if (
    !element.hasAttribute('role') &&
    !['A', 'BUTTON', 'INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName)
  ) {
    element.setAttribute('role', 'button');
  }

  if (!element.hasAttribute('tabindex')) {
    element.setAttribute('tabindex', '0');
  }

  element.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && element.onclick) {
      e.preventDefault();
      element.click();
    }
  });
}

export function ensureButtonAccessibility(button: HTMLElement): void {
  if (!button.hasAttribute('aria-label') && !button.textContent?.trim()) {
    button.setAttribute('aria-label', 'Button');
  }

  button.setAttribute('type', 'button');
}

export function ensureFormAccessibility(form: HTMLElement): void {
  const inputs = form.querySelectorAll('input, textarea, select');
  inputs.forEach((input) => {
    const inputElement = input as HTMLInputElement;
    const id = inputElement.id || `input-${Math.random().toString(36).substr(2, 9)}`;
    inputElement.id = id;

    const label = form.querySelector(`label[for="${id}"]`);
    if (!label && inputElement.placeholder) {
      inputElement.setAttribute('aria-label', inputElement.placeholder);
    }
  });
}

export function ensureImageAccessibility(img: HTMLImageElement): void {
  if (!img.hasAttribute('alt')) {
    img.setAttribute('alt', 'Image');
  }

  if (img.getAttribute('alt') === '') {
    img.setAttribute('role', 'presentation');
  }
}

export function setAriaDisabled(element: HTMLElement, disabled: boolean): void {
  element.setAttribute('aria-disabled', String(disabled));
  if (disabled) {
    element.setAttribute('tabindex', '-1');
  } else {
    element.removeAttribute('tabindex');
  }
}

export function setAriaExpanded(element: HTMLElement, expanded: boolean): void {
  element.setAttribute('aria-expanded', String(expanded));
}

export function createAriaAlert(
  message: string,
  type: 'error' | 'warning' | 'info' = 'info',
): HTMLElement {
  const alert = document.createElement('div');
  alert.setAttribute('role', 'alert');
  alert.setAttribute('aria-live', 'assertive');
  alert.className = `aria-alert aria-alert-${type}`;
  alert.textContent = message;

  return alert;
}

export function getRoleDescription(role: string): string {
  const descriptions: Record<string, string> = {
    button: 'button',
    link: 'link',
    navigation: 'navigation',
    main: 'main content',
    complementary: 'complementary content',
    contentinfo: 'footer',
    region: 'region',
    search: 'search',
    tab: 'tab',
    tabpanel: 'tab panel',
    dialog: 'dialog',
    alertdialog: 'alert dialog',
    menuitem: 'menu item',
    checkbox: 'checkbox',
    radio: 'radio button',
    slider: 'slider',
    progressbar: 'progress bar',
  };

  return descriptions[role] || role;
}

export function validateWCAG(): { passes: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check for images without alt text
  const images = document.querySelectorAll('img:not([alt])');
  if (images.length > 0) {
    issues.push(`Found ${images.length} images without alt text`);
  }

  // Check for buttons without text or aria-label
  const buttons = document.querySelectorAll('button');
  buttons.forEach((btn) => {
    if (!btn.textContent?.trim() && !btn.getAttribute('aria-label')) {
      issues.push('Found button without text or aria-label');
    }
  });

  // Check for form inputs without labels
  const inputs = document.querySelectorAll('input, textarea, select');
  inputs.forEach((input) => {
    const id = input.id;
    if (id && !document.querySelector(`label[for="${id}"]`) && !input.getAttribute('aria-label')) {
      issues.push(`Form input with id "${id}" has no associated label`);
    }
  });

  return {
    passes: issues.length === 0,
    issues,
  };
}
