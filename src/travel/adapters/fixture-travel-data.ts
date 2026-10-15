import type { Destination } from '../domain/types.js';
import type { HolidayWindow } from '../ports/travel-ports.js';
import type { SuitabilityWindow } from '../seasonality/seasonality.js';

export interface FixtureTravelProfile {
  readonly destination: Destination;
  readonly baseFlightPerPerson: number;
  readonly flightValue: number;
  readonly accommodationPerNight: number;
  readonly accommodationValue: number;
  readonly outboundMinutes: number;
  readonly stops: number;
  readonly crowdScore: number;
  readonly experienceRelevance: number;
  readonly climate: Readonly<Record<number, readonly [number, number, number]>>;
  readonly suitability: readonly SuitabilityWindow[];
}

function destination(
  id: string,
  city: string,
  country: string,
  countryCode: string,
  airport: string,
  timezone: string,
  tags: readonly string[],
): Destination {
  return {
    id,
    city,
    country,
    countryCode,
    airportCodes: [airport],
    timezone,
    tags,
    heroImageReference: `fixture:${id}`,
  };
}

export const FIXTURE_TRAVEL_PROFILES: readonly FixtureTravelProfile[] = [
  {
    destination: destination('rome', 'Rome', 'Italy', 'IT', 'FCO', 'Europe/Rome', [
      'city-break',
      'history',
      'food',
    ]),
    baseFlightPerPerson: 96,
    flightValue: 94,
    accommodationPerNight: 96,
    accommodationValue: 91,
    outboundMinutes: 165,
    stops: 0,
    crowdScore: 84,
    experienceRelevance: 95,
    climate: {
      1: [4, 13, 70], 2: [5, 14, 74], 3: [7, 17, 84], 4: [9, 20, 92],
      5: [13, 24, 95], 6: [17, 29, 88], 7: [20, 32, 73], 8: [20, 32, 72],
      9: [17, 27, 94], 10: [13, 22, 96], 11: [9, 17, 83], 12: [5, 14, 76],
    },
    suitability: [
      {
        destinationId: 'rome', startMonthDay: '03-15', endMonthDay: '06-15', score: 96,
        tags: ['city-break', 'spring'], reason: 'Mild weather and long sightseeing days', expectedLowC: 11, expectedHighC: 25,
      },
      {
        destinationId: 'rome', startMonthDay: '09-01', endMonthDay: '11-10', score: 97,
        tags: ['city-break', 'autumn'], reason: 'Excellent city-break temperatures with softer crowds', expectedLowC: 12, expectedHighC: 27,
      },
      {
        destinationId: 'rome', startMonthDay: '11-11', endMonthDay: '03-14', score: 78,
        tags: ['city-break', 'winter'], reason: 'Cooler low-season city break with good museum access', expectedLowC: 5, expectedHighC: 15,
      },
    ],
  },
  {
    destination: destination('budapest', 'Budapest', 'Hungary', 'HU', 'BUD', 'Europe/Budapest', [
      'city-break', 'thermal-baths', 'christmas-market',
    ]),
    baseFlightPerPerson: 82,
    flightValue: 96,
    accommodationPerNight: 72,
    accommodationValue: 96,
    outboundMinutes: 170,
    stops: 0,
    crowdScore: 90,
    experienceRelevance: 94,
    climate: {
      1: [-2, 4, 65], 2: [0, 7, 70], 3: [4, 12, 82], 4: [8, 18, 92], 5: [12, 23, 94],
      6: [16, 27, 86], 7: [18, 29, 78], 8: [18, 29, 78], 9: [14, 24, 94], 10: [8, 17, 92],
      11: [3, 10, 82], 12: [-1, 5, 88],
    },
    suitability: [
      {
        destinationId: 'budapest', startMonthDay: '03-20', endMonthDay: '05-31', score: 94,
        tags: ['city-break', 'spring'], reason: 'Comfortable spring weather for walking and baths', expectedLowC: 7, expectedHighC: 23,
      },
      {
        destinationId: 'budapest', startMonthDay: '09-01', endMonthDay: '10-31', score: 97,
        tags: ['city-break', 'autumn'], reason: 'Warm autumn days, good value and manageable crowds', expectedLowC: 8, expectedHighC: 24,
      },
      {
        destinationId: 'budapest', startMonthDay: '11-20', endMonthDay: '12-28', score: 96,
        tags: ['christmas-market', 'winter'], reason: 'Christmas markets and thermal-bath season', expectedLowC: -1, expectedHighC: 7,
      },
    ],
  },
  {
    destination: destination('vienna', 'Vienna', 'Austria', 'AT', 'VIE', 'Europe/Vienna', [
      'city-break', 'culture', 'christmas-market',
    ]),
    baseFlightPerPerson: 128,
    flightValue: 86,
    accommodationPerNight: 108,
    accommodationValue: 85,
    outboundMinutes: 185,
    stops: 0,
    crowdScore: 86,
    experienceRelevance: 97,
    climate: {
      1: [-1, 4, 74], 2: [0, 7, 80], 3: [4, 12, 84], 4: [7, 17, 92], 5: [11, 22, 94],
      6: [15, 25, 88], 7: [17, 27, 80], 8: [17, 27, 81], 9: [13, 22, 94], 10: [8, 15, 91],
      11: [3, 9, 83], 12: [0, 5, 91],
    },
    suitability: [
      {
        destinationId: 'vienna', startMonthDay: '01-05', endMonthDay: '02-28', score: 88,
        tags: ['city-break', 'winter', 'culture'], reason: 'Strong winter culture season with indoor experiences', expectedLowC: -1, expectedHighC: 7,
      },
      {
        destinationId: 'vienna', startMonthDay: '04-01', endMonthDay: '05-31', score: 95,
        tags: ['city-break', 'spring'], reason: 'Gardens, café terraces and comfortable spring weather', expectedLowC: 7, expectedHighC: 22,
      },
      {
        destinationId: 'vienna', startMonthDay: '09-01', endMonthDay: '10-31', score: 94,
        tags: ['city-break', 'autumn'], reason: 'Comfortable autumn city-break weather', expectedLowC: 8, expectedHighC: 22,
      },
      {
        destinationId: 'vienna', startMonthDay: '11-20', endMonthDay: '12-26', score: 98,
        tags: ['christmas-market', 'winter'], reason: 'Christmas markets and festive atmosphere', expectedLowC: 0, expectedHighC: 7,
      },
    ],
  },
  {
    destination: destination('milan', 'Milan', 'Italy', 'IT', 'MXP', 'Europe/Rome', [
      'city-break', 'shopping', 'food',
    ]),
    baseFlightPerPerson: 88,
    flightValue: 95,
    accommodationPerNight: 112,
    accommodationValue: 84,
    outboundMinutes: 190,
    stops: 0,
    crowdScore: 84,
    experienceRelevance: 91,
    climate: {
      1: [0, 7, 66], 2: [2, 10, 72], 3: [6, 15, 84], 4: [9, 19, 91], 5: [13, 23, 94],
      6: [17, 28, 83], 7: [20, 31, 72], 8: [19, 30, 72], 9: [15, 25, 94], 10: [10, 18, 92],
      11: [5, 12, 80], 12: [1, 8, 68],
    },
    suitability: [
      {
        destinationId: 'milan', startMonthDay: '03-15', endMonthDay: '05-31', score: 94,
        tags: ['city-break', 'spring'], reason: 'Comfortable spring days for city exploration', expectedLowC: 7, expectedHighC: 23,
      },
      {
        destinationId: 'milan', startMonthDay: '09-01', endMonthDay: '10-31', score: 95,
        tags: ['city-break', 'autumn'], reason: 'Excellent autumn temperatures and strong city events', expectedLowC: 10, expectedHighC: 25,
      },
    ],
  },
  {
    destination: destination('barcelona', 'Barcelona', 'Spain', 'ES', 'BCN', 'Europe/Madrid', [
      'city-break', 'food', 'coast',
    ]),
    baseFlightPerPerson: 116,
    flightValue: 89,
    accommodationPerNight: 104,
    accommodationValue: 87,
    outboundMinutes: 245,
    stops: 0,
    crowdScore: 82,
    experienceRelevance: 95,
    climate: {
      1: [8, 15, 76], 2: [9, 16, 78], 3: [11, 18, 85], 4: [13, 20, 93], 5: [16, 23, 96],
      6: [20, 27, 88], 7: [23, 30, 76], 8: [23, 30, 75], 9: [20, 27, 94], 10: [16, 23, 96],
      11: [12, 18, 87], 12: [9, 15, 78],
    },
    suitability: [
      {
        destinationId: 'barcelona', startMonthDay: '03-20', endMonthDay: '06-10', score: 96,
        tags: ['city-break', 'spring'], reason: 'Warm but comfortable days before peak summer crowds', expectedLowC: 12, expectedHighC: 25,
      },
      {
        destinationId: 'barcelona', startMonthDay: '09-01', endMonthDay: '11-10', score: 97,
        tags: ['city-break', 'autumn'], reason: 'Warm sea-air weather with improved city value', expectedLowC: 15, expectedHighC: 27,
      },
    ],
  },
  {
    destination: destination('santorini', 'Santorini', 'Greece', 'GR', 'JTR', 'Europe/Athens', [
      'island', 'beach', 'romantic',
    ]),
    baseFlightPerPerson: 42,
    flightValue: 100,
    accommodationPerNight: 74,
    accommodationValue: 96,
    outboundMinutes: 75,
    stops: 0,
    crowdScore: 88,
    experienceRelevance: 88,
    climate: {
      1: [9, 14, 45], 2: [9, 14, 42], 3: [10, 16, 58], 4: [13, 19, 78], 5: [17, 24, 96],
      6: [21, 28, 95], 7: [23, 30, 84], 8: [23, 30, 82], 9: [21, 27, 96], 10: [17, 23, 92],
      11: [14, 19, 62], 12: [10, 15, 48],
    },
    suitability: [
      {
        destinationId: 'santorini', startMonthDay: '05-01', endMonthDay: '06-25', score: 98,
        tags: ['island', 'beach', 'spring'], reason: 'Warm island weather before the strongest summer crowds', expectedLowC: 17, expectedHighC: 28,
      },
      {
        destinationId: 'santorini', startMonthDay: '09-01', endMonthDay: '10-15', score: 98,
        tags: ['island', 'beach', 'autumn'], reason: 'Warm sea temperatures and excellent shoulder-season value', expectedLowC: 18, expectedHighC: 27,
      },
      {
        destinationId: 'santorini', startMonthDay: '10-16', endMonthDay: '04-30', score: 22,
        tags: ['island', 'off-season'], reason: 'Many seasonal experiences are limited outside the island season', expectedLowC: 9, expectedHighC: 18,
      },
    ],
  },
  {
    destination: destination('phuket', 'Phuket', 'Thailand', 'TH', 'HKT', 'Asia/Bangkok', [
      'beach', 'long-haul', 'winter-sun',
    ]),
    baseFlightPerPerson: 410,
    flightValue: 72,
    accommodationPerNight: 68,
    accommodationValue: 94,
    outboundMinutes: 780,
    stops: 1,
    crowdScore: 78,
    experienceRelevance: 96,
    climate: {
      1: [24, 31, 98], 2: [24, 32, 97], 3: [25, 33, 88], 4: [26, 33, 74], 5: [25, 32, 58],
      6: [25, 31, 52], 7: [25, 31, 50], 8: [25, 31, 51], 9: [24, 30, 48], 10: [24, 31, 60],
      11: [24, 31, 88], 12: [24, 31, 98],
    },
    suitability: [
      {
        destinationId: 'phuket', startMonthDay: '11-01', endMonthDay: '02-28', score: 98,
        tags: ['beach', 'winter-sun'], reason: 'Dry season and comfortable beach weather', expectedLowC: 24, expectedHighC: 31,
      },
    ],
  },
];

export const FIXTURE_HOLIDAYS: readonly HolidayWindow[] = [
  {
    id: 'christmas-2026',
    label: 'Christmas 2026',
    startsOn: '2026-12-20',
    endsOn: '2026-12-29',
    tags: ['christmas', 'family'],
  },
  {
    id: 'easter-2027',
    label: 'Easter 2027',
    startsOn: '2027-04-28',
    endsOn: '2027-05-05',
    tags: ['easter', 'family'],
  },
];
