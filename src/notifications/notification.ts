export type NotificationState =
  'pending' | 'delivering' | 'delivered' | 'failed' | 'acknowledged' | 'expired' | 'suppressed';

export interface NotificationCandidate {
  readonly id: string;
  readonly householdId: string;
  readonly type: string;
  readonly title: string;
  readonly body: string;
  readonly correlationId: string;
  readonly supportingFactors: Readonly<Record<string, string | number | boolean>>;
}

export interface Notification extends NotificationCandidate {
  readonly state: NotificationState;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly providerReceiptId: string | null;
  readonly deliveredAt: Date | null;
  readonly acknowledgedAt: Date | null;
  readonly failureReason: string | null;
}
