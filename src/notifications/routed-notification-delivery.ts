import { AgnesError } from '../kernel/errors.js';
import type { Device } from '../devices/device.js';
import type { PresenceStateName } from '../presence/presence-state.js';
import {
  routeNotification,
  type AttentionState,
  type NotificationRoute,
} from './channel-router.js';
import type { DeliveryChannel } from './delivery-channel.js';
import type {
  NotificationDelivery,
  NotificationDeliveryReceipt,
} from './notification-delivery.js';
import type { NotificationCandidate } from './notification-candidate.js';
import type { Notification } from './notification.js';

export type ChannelDeliveryMap = Readonly<Partial<Record<DeliveryChannel, NotificationDelivery>>>;

export interface RoutedNotificationInput {
  readonly notification: Notification;
  readonly candidate: NotificationCandidate;
  readonly targetPresence: PresenceStateName;
  readonly attention: AttentionState;
  readonly reachableDevices: readonly Device[];
}

export interface RoutedNotificationReceipt {
  readonly route: NotificationRoute;
  readonly receipt: NotificationDeliveryReceipt;
}

export class RoutedNotificationDelivery {
  constructor(private readonly deliveries: ChannelDeliveryMap) {}

  async send(input: RoutedNotificationInput): Promise<RoutedNotificationReceipt> {
    const route = routeNotification({
      candidate: input.candidate,
      targetPresence: input.targetPresence,
      attention: input.attention,
      reachableDevices: input.reachableDevices,
    });

    if (route === 'NO_ROUTE') {
      throw new AgnesError('NO_NOTIFICATION_ROUTE', 'No eligible notification route is available');
    }

    const delivery = this.deliveries[route.channel];
    if (delivery === undefined) {
      throw new AgnesError(
        'NOTIFICATION_CHANNEL_UNAVAILABLE',
        `Notification channel ${route.channel} has no configured delivery adapter`,
        { channel: route.channel },
      );
    }

    const receipt = await delivery.send(input.notification);
    return { route, receipt };
  }
}
