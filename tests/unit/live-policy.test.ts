import { describe, expect, it } from 'vitest';
import { createStepUpChallenge } from '../../src/authentication/step-up-challenge.js';
import { createDevice } from '../../src/devices/device.js';
import { AgnesError } from '../../src/kernel/errors.js';
import { newDeviceId, newHouseholdId, newPersonId } from '../../src/kernel/ids.js';
import { evaluateLivePolicy } from '../../src/permissions/live-policy-engine.js';
import type { CapabilityGrant } from '../../src/permissions/capability.js';

const allowedGrant: CapabilityGrant = { view: true, suggest: true, act: 'allowed' };

function device(input: { trusted?: boolean; shared?: boolean } = {}) {
  const householdId = newHouseholdId();
  return createDevice({
    id: newDeviceId(),
    householdId,
    ...(input.shared ? {} : { ownerPersonId: newPersonId() }),
    deviceType: input.shared ? 'HOME_PANEL' : 'PHONE',
    platform: input.shared ? 'ANDROID' : 'IOS',
    capabilities: [],
    trustLevel: input.trusted === false ? 'UNTRUSTED' : 'TRUSTED',
    connectionState: 'ONLINE',
    agentVersion: '2.0.0',
    publicKeyPem: 'test-public-key',
    lastSeenAt: new Date('2026-09-01T15:00:00Z'),
    registeredAt: new Date('2026-09-01T14:00:00Z'),
  });
}

describe('Live v2 policy engine', () => {
  it('allows a trusted personal phone to submit presence with device-trusted authentication', () => {
    expect(
      evaluateLivePolicy({
        capability: 'live.presence.submit',
        requested: 'act',
        grant: allowedGrant,
        authenticationStrength: 'DEVICE_TRUSTED',
        device: device({ trusted: true }),
        sessionScope: 'PERSONAL',
        resourcePrivacy: 'HOUSEHOLD',
      }),
    ).toBe('ALLOW');
  });

  it('denies a protected capability from an untrusted shared device', () => {
    expect(
      evaluateLivePolicy({
        capability: 'door.unlock',
        requested: 'act',
        grant: allowedGrant,
        authenticationStrength: 'STRONG_AUTHENTICATED',
        device: device({ trusted: false, shared: true }),
        sessionScope: 'HOUSEHOLD_SHARED',
        resourcePrivacy: 'HOUSEHOLD',
      }),
    ).toBe('DENY');
  });

  it('requires strong authentication when a valid capability has insufficient auth', () => {
    expect(
      evaluateLivePolicy({
        capability: 'purchase.confirm',
        requested: 'act',
        grant: allowedGrant,
        authenticationStrength: 'USER_AUTHENTICATED',
        device: device({ trusted: true }),
        sessionScope: 'PERSONAL',
        resourcePrivacy: 'HOUSEHOLD',
      }),
    ).toBe('REQUIRE_STRONG_AUTH');
  });

  it('preserves the existing requires_confirmation grant semantics', () => {
    expect(
      evaluateLivePolicy({
        capability: 'smart_home.light.control',
        requested: 'act',
        grant: { ...allowedGrant, act: 'requires_confirmation' },
        authenticationStrength: 'USER_AUTHENTICATED',
        device: device({ trusted: true }),
        sessionScope: 'PERSONAL',
        resourcePrivacy: 'HOUSEHOLD',
      }),
    ).toBe('REQUIRE_CONFIRMATION');
  });

  it('denies a private resource on a shared household session', () => {
    expect(
      evaluateLivePolicy({
        capability: 'health.private.read',
        requested: 'view',
        grant: allowedGrant,
        authenticationStrength: 'STRONG_AUTHENTICATED',
        device: device({ trusted: true, shared: true }),
        sessionScope: 'HOUSEHOLD_SHARED',
        resourcePrivacy: 'PRIVATE',
      }),
    ).toBe('DENY');
  });
});

describe('step-up challenge', () => {
  it('can be consumed exactly once by the bound action, actor, and device', () => {
    const actorId = newPersonId();
    const deviceId = newDeviceId();
    const challenge = createStepUpChallenge({
      actionId: 'unlock-front-door',
      actorId,
      deviceId,
      expiresAt: new Date('2026-09-01T15:05:00Z'),
    });

    challenge.consume({
      actionId: 'unlock-front-door',
      actorId,
      deviceId,
      now: new Date('2026-09-01T15:00:00Z'),
    });

    expect(challenge.used).toBe(true);
    expect(() =>
      challenge.consume({
        actionId: 'unlock-front-door',
        actorId,
        deviceId,
        now: new Date('2026-09-01T15:01:00Z'),
      }),
    ).toThrowError(expect.objectContaining<Partial<AgnesError>>({ code: 'STEP_UP_REPLAYED' }));
  });

  it('rejects expired or mismatched consumption without marking the challenge used', () => {
    const actorId = newPersonId();
    const deviceId = newDeviceId();
    const challenge = createStepUpChallenge({
      actionId: 'confirm-purchase',
      actorId,
      deviceId,
      expiresAt: new Date('2026-09-01T15:05:00Z'),
    });

    expect(() =>
      challenge.consume({
        actionId: 'different-action',
        actorId,
        deviceId,
        now: new Date('2026-09-01T15:00:00Z'),
      }),
    ).toThrowError(expect.objectContaining<Partial<AgnesError>>({ code: 'STEP_UP_MISMATCH' }));
    expect(challenge.used).toBe(false);

    expect(() =>
      challenge.consume({
        actionId: 'confirm-purchase',
        actorId,
        deviceId,
        now: new Date('2026-09-01T15:05:00Z'),
      }),
    ).toThrowError(expect.objectContaining<Partial<AgnesError>>({ code: 'STEP_UP_EXPIRED' }));
    expect(challenge.used).toBe(false);
  });
});
