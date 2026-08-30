import { describe, expect, it } from 'vitest';
import { newDeviceId } from '../../src/kernel/ids.js';
import { FakeLocationSignalPort } from '../../src/location/fake-location-signal-port.js';
import { createLocationSignal } from '../../src/location/location-signal.js';

function validLocationInput() {
  return {
    deviceId: newDeviceId(),
    semanticPlace: 'HOME' as const,
    latitude: 34.9,
    longitude: 33.6,
    observedAt: new Date('2026-09-01T15:00:00Z'),
    expiresAt: new Date('2026-09-01T15:10:00Z'),
    movementState: 'STATIONARY' as const,
    source: 'DEVICE_GEOFENCE' as const,
    privacyScope: 'HOUSEHOLD' as const,
  };
}

describe('canonical location signals', () => {
  it('requires latitude and longitude together', () => {
    const { longitude: _longitude, ...input } = validLocationInput();

    expect(() => createLocationSignal(input)).toThrow('longitude');
  });

  it('rejects coordinates outside geographic bounds', () => {
    expect(() => createLocationSignal({ ...validLocationInput(), latitude: 91 })).toThrow(
      'latitude',
    );
    expect(() => createLocationSignal({ ...validLocationInput(), longitude: -181 })).toThrow(
      'longitude',
    );
  });

  it('requires expiry after observation', () => {
    expect(() =>
      createLocationSignal({
        ...validLocationInput(),
        expiresAt: new Date('2026-09-01T15:00:00Z'),
      }),
    ).toThrow('expiresAt');
  });

  it('stores submitted device-authoritative signals in the fake ingress port', async () => {
    const port = new FakeLocationSignalPort();
    const signal = createLocationSignal(validLocationInput());

    await port.ingest(signal);

    expect(port.submitted).toHaveLength(1);
    expect(port.submitted[0]).toEqual(signal);
  });
});
