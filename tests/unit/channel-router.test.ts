import { describe, expect, it } from 'vitest';
import { createDevice, type DeviceConnectionState, type DeviceTrustLevel } from '../../src/devices/device.js';
import { newDeviceId, newHouseholdId, newPersonId, type PersonId } from '../../src/kernel/ids.js';
import { routeNotification } from '../../src/notifications/channel-router.js';
import type { DeliveryChannel } from '../../src/notifications/delivery-channel.js';
import type { NotificationCandidate } from '../../src/notifications/notification-candidate.js';

const householdId = newHouseholdId();
const targetPersonId = newPersonId();

function candidate(input: {
  privacy?: 'HOUSEHOLD' | 'PRIVATE';
  channels: readonly DeliveryChannel[];
}): NotificationCandidate {
  return {
    id: 'candidate-1',
    householdId,
    targetPersonId,
    privacy: input.privacy ?? 'HOUSEHOLD',
    allowedChannels: input.channels,
    title: 'AGNES',
    message: 'Time to leave',
  };
}

function device(input: {
  deviceType: 'PHONE' | 'TABLET' | 'TV' | 'SPEAKER';
  ownerPersonId?: PersonId;
  capabilities: readonly DeliveryChannel[];
  trustLevel?: DeviceTrustLevel;
  connectionState?: DeviceConnectionState;
  revoked?: boolean;
}) {
  return createDevice({
    id: newDeviceId(),
    householdId,
    ...(input.ownerPersonId === undefined ? {} : { ownerPersonId: input.ownerPersonId }),
    deviceType: input.deviceType,
    platform: 'TEST',
    capabilities: input.capabilities,
    trustLevel: input.trustLevel ?? 'TRUSTED',
    connectionState: input.connectionState ?? 'ONLINE',
    agentVersion: '2.0.0',
    publicKeyPem: 'test-public-key',
    lastSeenAt: new Date('2026-09-01T15:00:00Z'),
    registeredAt: new Date('2026-09-01T14:00:00Z'),
    ...(input.revoked ? { revokedAt: new Date('2026-09-01T14:59:00Z') } : {}),
  });
}

describe('Live v2 notification channel router', () => {
  it('routes an away target to mobile push on an online trusted personal phone', () => {
    const phone = device({
      deviceType: 'PHONE',
      ownerPersonId: targetPersonId,
      capabilities: ['MOBILE_PUSH', 'IN_APP'],
      trustLevel: 'HIGH_TRUST',
    });

    expect(
      routeNotification({
        candidate: candidate({ channels: ['MOBILE_PUSH', 'IN_APP'] }),
        targetPresence: 'AWAY',
        attention: 'AVAILABLE',
        reachableDevices: [phone],
      }),
    ).toEqual({ channel: 'MOBILE_PUSH', deviceId: phone.id });
  });

  it('routes a present target to a trusted home speaker when VOICE_HOME is allowed', () => {
    const phone = device({
      deviceType: 'PHONE',
      ownerPersonId: targetPersonId,
      capabilities: ['MOBILE_PUSH'],
    });
    const speaker = device({
      deviceType: 'SPEAKER',
      capabilities: ['VOICE_HOME'],
      trustLevel: 'TRUSTED',
    });

    expect(
      routeNotification({
        candidate: candidate({ channels: ['MOBILE_PUSH', 'VOICE_HOME'] }),
        targetPresence: 'PRESENT',
        attention: 'AVAILABLE',
        reachableDevices: [phone, speaker],
      }),
    ).toEqual({ channel: 'VOICE_HOME', deviceId: speaker.id });
  });

  it('never routes a PRIVATE candidate to shared TV or tablet surfaces', () => {
    const tv = device({ deviceType: 'TV', capabilities: ['TV_BANNER'] });
    const tablet = device({ deviceType: 'TABLET', capabilities: ['TABLET_ALERT'] });
    const phone = device({
      deviceType: 'PHONE',
      ownerPersonId: targetPersonId,
      capabilities: ['MOBILE_PUSH'],
      trustLevel: 'HIGH_TRUST',
    });

    expect(
      routeNotification({
        candidate: candidate({
          privacy: 'PRIVATE',
          channels: ['TV_BANNER', 'TABLET_ALERT', 'MOBILE_PUSH'],
        }),
        targetPresence: 'PRESENT',
        attention: 'AVAILABLE',
        reachableDevices: [tv, tablet, phone],
      }),
    ).toEqual({ channel: 'MOBILE_PUSH', deviceId: phone.id });
  });

  it('never routes through offline or revoked devices', () => {
    const offlinePhone = device({
      deviceType: 'PHONE',
      ownerPersonId: targetPersonId,
      capabilities: ['MOBILE_PUSH'],
      connectionState: 'OFFLINE',
    });
    const revokedPhone = device({
      deviceType: 'PHONE',
      ownerPersonId: targetPersonId,
      capabilities: ['MOBILE_PUSH'],
      revoked: true,
    });

    expect(
      routeNotification({
        candidate: candidate({ channels: ['MOBILE_PUSH'] }),
        targetPresence: 'AWAY',
        attention: 'AVAILABLE',
        reachableDevices: [offlinePhone, revokedPhone],
      }),
    ).toBe('NO_ROUTE');
  });

  it('falls back to SILENT_FEED only when it is explicitly allowed', () => {
    expect(
      routeNotification({
        candidate: candidate({ channels: ['MOBILE_PUSH', 'SILENT_FEED'] }),
        targetPresence: 'UNKNOWN',
        attention: 'UNKNOWN',
        reachableDevices: [],
      }),
    ).toEqual({ channel: 'SILENT_FEED' });

    expect(
      routeNotification({
        candidate: candidate({ channels: ['MOBILE_PUSH'] }),
        targetPresence: 'UNKNOWN',
        attention: 'UNKNOWN',
        reachableDevices: [],
      }),
    ).toBe('NO_ROUTE');
  });
});
