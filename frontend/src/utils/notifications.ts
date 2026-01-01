/**
 * Notification Service
 * Handles browser notifications and in-app notifications
 */

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
}

class NotificationService {
  private permission: NotificationPermission = 'default';
  private notificationQueue: NotificationOptions[] = [];

  constructor() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    if (this.permission === 'granted') {
      return true;
    }

    if (this.permission === 'denied') {
      console.warn('Notification permission denied');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  async show(options: NotificationOptions): Promise<void> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn('Notifications not supported in this browser');
      return;
    }

    if (this.permission !== 'granted') {
      // Queue notification if permission not granted yet
      this.notificationQueue.push(options);
      // Try to request permission
      const granted = await this.requestPermission();
      if (!granted) {
        console.warn('Cannot show notification: permission not granted');
        return;
      }
    }

    // Show queued notifications first
    while (this.notificationQueue.length > 0) {
      const queued = this.notificationQueue.shift();
      if (queued) {
        this.createNotification(queued);
      }
    }

    // Show current notification
    this.createNotification(options);
  }

  private createNotification(options: NotificationOptions): void {
    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/favicon.ico',
        badge: options.badge || '/favicon.ico',
        tag: options.tag,
        requireInteraction: options.requireInteraction || false,
        silent: options.silent || false,
      });

      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      // Handle click
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }

  // Convenience methods
  async showLowStock(productName: string, quantity: number): Promise<void> {
    await this.show({
      title: 'Low Stock Alert',
      body: `${productName} is running low (${quantity} units remaining)`,
      tag: `low-stock-${productName}`,
      requireInteraction: true,
    });
  }

  async showOutOfStock(productName: string): Promise<void> {
    await this.show({
      title: 'Out of Stock',
      body: `${productName} is out of stock`,
      tag: `out-of-stock-${productName}`,
      requireInteraction: true,
    });
  }

  async showSaleRecorded(amount: number, currency: string = 'USD'): Promise<void> {
    const symbol = currency === 'USD' ? '$' : currency;
    await this.show({
      title: 'Sale Recorded',
      body: `New sale: ${symbol}${amount.toFixed(2)}`,
      tag: 'sale-recorded',
    });
  }

  async showRefundProcessed(amount: number, currency: string = 'USD'): Promise<void> {
    const symbol = currency === 'USD' ? '$' : currency;
    await this.show({
      title: 'Refund Processed',
      body: `Refund processed: ${symbol}${amount.toFixed(2)}`,
      tag: 'refund-processed',
    });
  }

  async showDailySummary(revenue: number, sales: number, currency: string = 'USD'): Promise<void> {
    const symbol = currency === 'USD' ? '$' : currency;
    await this.show({
      title: 'Daily Summary',
      body: `${sales} sales, ${symbol}${revenue.toFixed(2)} revenue`,
      tag: 'daily-summary',
      requireInteraction: false,
    });
  }
}

export const notificationService = new NotificationService();

