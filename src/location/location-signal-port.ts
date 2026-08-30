import type { LocationSignal } from './location-signal.js';

export interface LocationSignalPort {
  ingest(signal: LocationSignal): Promise<void>;
}
