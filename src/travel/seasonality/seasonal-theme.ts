export type TravelSeason = 'spring' | 'summer' | 'autumn' | 'winter';

export interface SeasonalTheme {
  readonly season: TravelSeason;
  readonly paletteKey: string;
  readonly mood: string;
}

const THEMES: Readonly<Record<TravelSeason, SeasonalTheme>> = {
  spring: {
    season: 'spring',
    paletteKey: 'fresh-garden',
    mood: 'fresh greens, soft blossom accents and bright neutral surfaces',
  },
  summer: {
    season: 'summer',
    paletteKey: 'sea-sky-sand',
    mood: 'sea, sky, sun and warm sand tones',
  },
  autumn: {
    season: 'autumn',
    paletteKey: 'amber-olive-earth',
    mood: 'amber, ochre, olive and warm earthy tones',
  },
  winter: {
    season: 'winter',
    paletteKey: 'cool-slate-winter',
    mood: 'cool blue, slate, soft white and restrained festive warmth',
  },
};

function localMonth(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    month: 'numeric',
  }).formatToParts(date);
  const monthPart = parts.find((part) => part.type === 'month');
  const month = Number(monthPart?.value);
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new RangeError(`unable to determine month in timezone ${timeZone}`);
  }
  return month;
}

export function getSeasonalTheme(
  date: Date,
  timeZone = 'Asia/Nicosia',
): SeasonalTheme {
  const month = localMonth(date, timeZone);
  if (month >= 3 && month <= 5) return THEMES.spring;
  if (month >= 6 && month <= 8) return THEMES.summer;
  if (month >= 9 && month <= 11) return THEMES.autumn;
  return THEMES.winter;
}
