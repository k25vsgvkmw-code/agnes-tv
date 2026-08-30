import type { LocationSignalPort } from './location-signal-port.js';
import type { LocationSignal } from './location-signal.js';

export class FakeLocationSignalPort implements LocationSignalPort {
  readonly submitted: LocationSignal[] = [];

  async ingest(signal: LocationSignal): Promise<void> {
    this.submitted.push(signal);
  }
}
