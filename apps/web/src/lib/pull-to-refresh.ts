export interface PullToRefreshOptions {
  threshold?: number;
  onRefresh: () => Promise<void>;
  refreshIndicator?: HTMLElement;
}

export class PullToRefresh {
  private element: HTMLElement;
  private options: Required<PullToRefreshOptions>;
  private startY = 0;
  private currentY = 0;
  private isRefreshing = false;
  private pullDistance = 0;

  constructor(element: HTMLElement, options: PullToRefreshOptions) {
    this.element = element;
    this.options = {
      threshold: options.threshold || 80,
      onRefresh: options.onRefresh,
      refreshIndicator: options.refreshIndicator || element,
    };

    this.init();
  }

  private init() {
    this.element.addEventListener('touchstart', this.handleTouchStart);
    this.element.addEventListener('touchmove', this.handleTouchMove);
    this.element.addEventListener('touchend', this.handleTouchEnd);
  }

  private handleTouchStart = (event: TouchEvent) => {
    if (this.element.scrollTop === 0) {
      this.startY = event.touches[0].clientY;
    }
  };

  private handleTouchMove = (event: TouchEvent) => {
    if (this.element.scrollTop !== 0 || this.isRefreshing) {
      return;
    }

    this.currentY = event.touches[0].clientY;
    this.pullDistance = this.currentY - this.startY;

    if (this.pullDistance > 0) {
      event.preventDefault();
      this.updatePullIndicator();
    }
  };

  private handleTouchEnd = async () => {
    if (this.pullDistance > this.options.threshold && !this.isRefreshing) {
      this.isRefreshing = true;
      this.showRefreshing();

      try {
        await this.options.onRefresh();
      } finally {
        this.isRefreshing = false;
        this.resetPullIndicator();
      }
    } else {
      this.resetPullIndicator();
    }

    this.pullDistance = 0;
    this.startY = 0;
    this.currentY = 0;
  };

  private updatePullIndicator() {
    const progress = Math.min(this.pullDistance / this.options.threshold, 1);
    const indicator = this.options.refreshIndicator;

    indicator.style.transform = `translateY(${this.pullDistance}px)`;
    indicator.style.opacity = String(Math.min(progress, 1));

    if (this.pullDistance > this.options.threshold) {
      indicator.setAttribute('data-ready', 'true');
    } else {
      indicator.removeAttribute('data-ready');
    }
  }

  private showRefreshing() {
    const indicator = this.options.refreshIndicator;
    indicator.setAttribute('data-refreshing', 'true');
    indicator.style.transform = `translateY(${this.options.threshold}px)`;
  }

  private resetPullIndicator() {
    const indicator = this.options.refreshIndicator;
    indicator.style.transform = 'translateY(0)';
    indicator.style.opacity = '0';
    indicator.removeAttribute('data-ready');
    indicator.removeAttribute('data-refreshing');
  }

  public destroy() {
    this.element.removeEventListener('touchstart', this.handleTouchStart);
    this.element.removeEventListener('touchmove', this.handleTouchMove);
    this.element.removeEventListener('touchend', this.handleTouchEnd);
  }
}
