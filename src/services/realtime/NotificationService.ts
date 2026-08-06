export interface RealtimeNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
}

type NotificationListener = (notification: RealtimeNotification) => void;

export class NotificationService {
  private static instance: NotificationService;
  private listeners: Set<NotificationListener> = new Set();

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  public subscribe(listener: NotificationListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public notify(title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
    const notification: RealtimeNotification = {
      id: `notif-${Date.now()}`,
      title,
      message,
      type,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    this.listeners.forEach((listener) => listener(notification));
  }
}

export const notificationService = NotificationService.getInstance();
