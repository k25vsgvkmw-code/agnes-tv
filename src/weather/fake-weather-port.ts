import type { WeatherPort, WeatherQuery } from './weather-port.js';
import { createWeatherSnapshot, type WeatherSnapshot } from './weather-snapshot.js';

export class FakeWeatherPort implements WeatherPort {
  constructor(private readonly snapshot: WeatherSnapshot) {}

  async getCurrent(_query: WeatherQuery): Promise<WeatherSnapshot> {
    return createWeatherSnapshot({
      ...this.snapshot,
      observedAt: new Date(this.snapshot.observedAt.getTime()),
      expiresAt: new Date(this.snapshot.expiresAt.getTime()),
    });
  }
}
