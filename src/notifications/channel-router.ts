import type { Device, DeviceTrustLevel } from '../devices/device.js';
import type { DeviceId } from '../kernel/ids.js';
import type { PresenceStateName } from '../presence/presence-state.js';
import type { DeliveryChannel } from './delivery-channel.js';
import type { NotificationCandidate } from './notification-candidate.js';

export type AttentionState = 'AVAILABLE' | 'BUSY' | 'DO_NOT_DISTURB' | 'SLEEPING' | 'UNKNOWN';

export interface NotificationRoute {
  readonly channel: DeliveryChannel;
  readonly deviceId?: DeviceId;
}

export type NotificationRouteResult = NotificationRoute | 'NO_ROUTE';

export interface RouteNotificationInput {
  readonly candidate: NotificationCandidate;
  readonly targetPresence: PresenceStateName;
  readonly attention: AttentionState;
  readonly reachableDevices: readonly Device[];
}

const TRUST_RANK: Readonly<Record<DeviceTrustLevel, number>> = Object.freeze({
  HIGH_TRUST: 0,
  TRUSTED: 1,
  LIMITED: 2,
  UNTRUSTED: 3,
});

const PRESENT_CHANNEL_ORDER: readonly DeliveryChannel[] = [
  'CRITICAL_ALARM',
  'VOICE_HOME',
  'TABLET_ALERT',
  'IN_APP',
  'MOBILE_PUSH',
  'VOICE_PERSONAL_DEVICE',
  'TV_BANNER',
];

const AWAY_CHANNEL_ORDER: readonly DeliveryChannel[] = [
  'CRITICAL_ALARM',
  'MOBILE_PUSH',
  'VOICE_PERSONAL_DEVICE',
  'IN_APP',
  'TABLET_ALERT',
  'TV_BANNER',
  'VOICE_HOME',
];

const UNKNOWN_CHANNEL_ORDER: readonly DeliveryChannel[] = [
  'CRITICAL_ALARM',
  'IN_APP',
  'MOBILE_PUSH',
  'VOICE_PERSONAL_DEVICE',
  'TABLET_ALERT',
  'TV_BANNER',
  'VOICE_HOME',
];

function isPersonalForCandidate(device: Device, candidate: NotificationCandidate): boolean {
  return device.ownerPersonId === candidate.targetPersonId;
}

function isReachable(device: Device): boolean {
  return device.connectionState === 'ONLINE' && device.revokedAt === undefined;
}

function supportsChannel(device: Device, channel: DeliveryChannel): boolean {
  return device.capabilities.includes(channel);
}

function isVoiceSuppressed(attention: AttentionState): boolean {
  return attention === 'DO_NOT_DISTURB' || attention === 'SLEEPING';
}

function channelOrder(presence: PresenceStateName): readonly DeliveryChannel[] {
  if (presence === 'PRESENT' || presence === 'ARRIVING') return PRESENT_CHANNEL_ORDER;
  if (presence === 'AWAY' || presence === 'LEAVING') return AWAY_CHANNEL_ORDER;
  return UNKNOWN_CHANNEL_ORDER;
}

function eligibleDevices(
  devices: readonly Device[],
  candidate: NotificationCandidate,
  channel: DeliveryChannel,
  attention: AttentionState,
): Device[] {
  if ((channel === 'VOICE_HOME' || channel === 'VOICE_PERSONAL_DEVICE') && isVoiceSuppressed(attention)) {
    return [];
  }

  return devices
    .filter(isReachable)
    .filter((device) => supportsChannel(device, channel))
    .filter((device) => candidate.privacy !== 'PRIVATE' || isPersonalForCandidate(device, candidate))
    .filter((device) => channel !== 'VOICE_HOME' || device.ownerPersonId === undefined)
    .sort((left, right) => {
      const personalDifference =
        Number(!isPersonalForCandidate(left, candidate)) -
        Number(!isPersonalForCandidate(right, candidate));
      if (personalDifference !== 0) return personalDifference;

      const trustDifference = TRUST_RANK[left.trustLevel] - TRUST_RANK[right.trustLevel];
      if (trustDifference !== 0) return trustDifference;

      return left.id.localeCompare(right.id);
    });
}

export function routeNotification(input: RouteNotificationInput): NotificationRouteResult {
  const allowedChannels = new Set(input.candidate.allowedChannels);

  for (const channel of channelOrder(input.targetPresence)) {
    if (!allowedChannels.has(channel)) continue;

    const devices = eligibleDevices(
      input.reachableDevices,
      input.candidate,
      channel,
      input.attention,
    );
    const selected = devices[0];
    if (selected !== undefined) {
      return { channel, deviceId: selected.id };
    }
  }

  if (allowedChannels.has('SILENT_FEED')) {
    return { channel: 'SILENT_FEED' };
  }

  return 'NO_ROUTE';
}
