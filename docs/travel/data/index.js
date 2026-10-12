import { EUROPE_DESTINATIONS } from './destinations/europe.js';
import { ASIA_DESTINATIONS } from './destinations/asia.js';
import { AFRICA_DESTINATIONS } from './destinations/africa.js';
import { NORTH_AMERICA_DESTINATIONS } from './destinations/north-america.js';
import { SOUTH_AMERICA_DESTINATIONS } from './destinations/south-america.js';
import { OCEANIA_DESTINATIONS } from './destinations/oceania.js';
import { GREECE_JOURNEYS } from './journeys/greece.js';
import { EUROPE_JOURNEYS } from './journeys/europe.js';
import { ASIA_JOURNEYS } from './journeys/asia.js';
import { AFRICA_JOURNEYS } from './journeys/africa.js';
import { NORTH_AMERICA_JOURNEYS } from './journeys/north-america.js';
import { SOUTH_AMERICA_JOURNEYS } from './journeys/south-america.js';
import { OCEANIA_JOURNEYS } from './journeys/oceania.js';
import { AIRPORT_ORIGINS } from './origins/airports.js';
import { PORT_ORIGINS } from './origins/ports.js';
import { STATION_ORIGINS } from './origins/stations.js';
import { ROAD_ORIGINS } from './origins/road-origins.js';
import { OPERATOR_REFERENCES } from './providers/operators.js';

const uniqueById = (items) => [...new Map(items.map((item) => [item.id, item])).values()];

export const DESTINATIONS = uniqueById([
  ...EUROPE_DESTINATIONS,
  ...ASIA_DESTINATIONS,
  ...AFRICA_DESTINATIONS,
  ...NORTH_AMERICA_DESTINATIONS,
  ...SOUTH_AMERICA_DESTINATIONS,
  ...OCEANIA_DESTINATIONS,
]);

export const ORIGINS = uniqueById([
  ...AIRPORT_ORIGINS,
  ...PORT_ORIGINS,
  ...STATION_ORIGINS,
  ...ROAD_ORIGINS,
]);

export const JOURNEYS = uniqueById([
  ...GREECE_JOURNEYS,
  ...EUROPE_JOURNEYS,
  ...ASIA_JOURNEYS,
  ...AFRICA_JOURNEYS,
  ...NORTH_AMERICA_JOURNEYS,
  ...SOUTH_AMERICA_JOURNEYS,
  ...OCEANIA_JOURNEYS,
]);

export const OPERATORS = OPERATOR_REFERENCES;
