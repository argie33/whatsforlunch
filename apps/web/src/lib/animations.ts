export function pageTransitionIn(element: HTMLElement, duration = 300) {
  element.style.animation = `fadeInUp ${duration}ms ease-out`;
}

export function pageTransitionOut(element: HTMLElement, duration = 300): Promise<void> {
  return new Promise((resolve) => {
    element.style.animation = `fadeOutDown ${duration}ms ease-in`;
    setTimeout(resolve, duration);
  });
}

export function slideIn(
  element: HTMLElement,
  direction: 'left' | 'right' | 'up' | 'down' = 'up',
  duration = 300,
) {
  const animations = {
    left: `slideInFromLeft ${duration}ms ease-out`,
    right: `slideInFromRight ${duration}ms ease-out`,
    up: `slideInFromUp ${duration}ms ease-out`,
    down: `slideInFromDown ${duration}ms ease-out`,
  };
  element.style.animation = animations[direction];
}

export function slideOut(
  element: HTMLElement,
  direction: 'left' | 'right' | 'up' | 'down' = 'up',
  duration = 300,
): Promise<void> {
  return new Promise((resolve) => {
    const animations = {
      left: `slideOutToLeft ${duration}ms ease-in`,
      right: `slideOutToRight ${duration}ms ease-in`,
      up: `slideOutToUp ${duration}ms ease-in`,
      down: `slideOutToDown ${duration}ms ease-in`,
    };
    element.style.animation = animations[direction];
    setTimeout(resolve, duration);
  });
}

export function bounce(element: HTMLElement, duration = 500) {
  element.style.animation = `bounce ${duration}ms ease-in-out`;
}

export function pulse(element: HTMLElement, duration = 2000) {
  element.style.animation = `pulse ${duration}ms ease-in-out infinite`;
}

export function shake(element: HTMLElement, duration = 400) {
  element.style.animation = `shake ${duration}ms ease-in-out`;
}

export function scaleIn(element: HTMLElement, duration = 300) {
  element.style.animation = `scaleIn ${duration}ms ease-out`;
}

export function scaleOut(element: HTMLElement, duration = 300): Promise<void> {
  return new Promise((resolve) => {
    element.style.animation = `scaleOut ${duration}ms ease-in`;
    setTimeout(resolve, duration);
  });
}

export function toggleClass(
  element: HTMLElement,
  className: string,
  duration = 300,
): Promise<void> {
  return new Promise((resolve) => {
    element.classList.add(className);
    setTimeout(() => {
      element.classList.remove(className);
      resolve();
    }, duration);
  });
}

export function staggerChildren(parent: HTMLElement, duration = 100) {
  const children = parent.querySelectorAll('[data-stagger]');
  children.forEach((child, index) => {
    const element = child as HTMLElement;
    element.style.animationDelay = `${index * duration}ms`;
  });
}

export function smoothScroll(target: HTMLElement | string, offset = 0, duration = 300) {
  const element = typeof target === 'string' ? document.querySelector(target) : target;
  if (!element) return;

  const targetPosition = element.getBoundingClientRect().top + window.scrollY - offset;
  const startPosition = window.scrollY;
  const distance = targetPosition - startPosition;
  let start: number | null = null;

  function animation(currentTime: number) {
    if (start === null) start = currentTime;
    const elapsed = currentTime - start;
    const progress = Math.min(elapsed / duration, 1);

    window.scrollTo(0, startPosition + distance * easeInOutCubic(progress));

    if (elapsed < duration) {
      requestAnimationFrame(animation);
    }
  }

  requestAnimationFrame(animation);
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function detectReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function getAnimationDuration(defaultDuration: number): number {
  return detectReducedMotion() ? 0 : defaultDuration;
}
