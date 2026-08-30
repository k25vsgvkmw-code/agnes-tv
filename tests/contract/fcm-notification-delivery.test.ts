import { describe, expect, it } from 'vitest';
import { newHouseholdId } from '../../src/kernel/ids.js';
import {
  FcmNotificationDelivery,
  type FcmSender,
} from '../../src/notifications/fcm-notification-delivery.js';
import type { Notification } from '../../src/notifications/notification.js';

function notification(): Notification {
  const now = new Date('2026-09-01T15:00:00Z');
  return {
    id: 'notification-1',
    householdId: newHouseholdId(),
    outcome: 'suggest',
    title: 'AGNES',
    message: 'Ώρα να φύγετε.',
    situationType: 'DEPARTURE_PREPARATION',
    supportingFactors: [],
    state: 'delivering',
    createdAt: now,
    updatedAt: now,
    correlationId: 'correlation-1',
  };
}

describe('FCM notification delivery contract', () => {
  it('returns a verified FCM receipt only after the provider resolves with a message id', async () => {
    let resolveSend: ((value: string) => void) | undefined;
    const sentMessages: unknown[] = [];
    const sender: FcmSender = {
      send(message) {
        sentMessages.push(message);
        return new Promise<string>((resolve) => {
          resolveSend = resolve;
        });
      },
    };
    const delivery = new FcmNotificationDelivery({ sender, targetToken: 'push-token-1' });
    const pendingReceipt = delivery.send(notification());
    let settled = false;
    void pendingReceipt.finally(() => {
      settled = true;
    });

    await Promise.resolve();
    expect(settled).toBe(false);
    expect(sentMessages).toEqual([
      {
        token: 'push-token-1',
        notification: {
          title: 'AGNES',
          body: 'Ώρα να φύγετε.',
        },
        data: {
          notificationId: 'notification-1',
          situationType: 'DEPARTURE_PREPARATION',
          correlationId: 'correlation-1',
        },
      },
    ]);

    resolveSend?.('projects/agnes/messages/message-123');
    await expect(pendingReceipt).resolves.toEqual({
      provider: 'fcm',
      receiptId: 'projects/agnes/messages/message-123',
    });
  });

  it('propagates provider rejection without fabricating a delivery receipt', async () => {
    const providerError = new Error('firebase unavailable');
    const sender: FcmSender = {
      async send() {
        throw providerError;
      },
    };
    const delivery = new FcmNotificationDelivery({ sender, targetToken: 'push-token-1' });

    await expect(delivery.send(notification())).rejects.toBe(providerError);
  });
});
