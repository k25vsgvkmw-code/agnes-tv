export type ExploreModuleId =
  | 'kids'
  | 'cooking'
  | 'travel'
  | 'tonight'
  | 'health'
  | 'calendar'
  | 'never-miss'
  | 'shop'
  | 'finance'
  | 'car'
  | 'smart-home'
  | 'pets'
  | 'music'
  | 'learning'
  | 'services'
  | 'translator'
  | 'memories';

export interface WeatherSummary {
  readonly locationLabel: string;
  readonly temperatureC: number;
  readonly condition: string;
  readonly detail: string;
}

export interface FamilyMemberStatus {
  readonly id: string;
  readonly displayName: string;
  readonly role: string;
  readonly status: string;
  readonly detail: string;
  readonly accent: 'violet' | 'sea' | 'earth' | 'rose';
}

export interface AttentionItem {
  readonly eyebrow: string;
  readonly title: string;
  readonly detail: string;
  readonly urgency: 'info' | 'important' | 'now';
}

export interface TimelineItem {
  readonly time: string;
  readonly title: string;
  readonly detail: string;
  readonly memberIds: readonly string[];
  readonly state: 'done' | 'now' | 'upcoming';
}

export interface ExploreModule {
  readonly id: ExploreModuleId;
  readonly title: string;
  readonly subtitle: string;
  readonly icon: string;
  readonly summary: string;
  readonly prompt: string;
}

export interface FamilyOsSnapshot {
  readonly householdName: string;
  readonly locale: string;
  readonly timezone: string;
  readonly nowLabel: string;
  readonly weather: WeatherSummary;
  readonly members: readonly FamilyMemberStatus[];
  readonly attention: AttentionItem;
  readonly timeline: readonly TimelineItem[];
  readonly exploreModules: readonly ExploreModule[];
}

const exploreModules: readonly ExploreModule[] = [
  {
    id: 'kids',
    title: 'Kids World',
    subtitle: 'Learn · Play · Rewards',
    icon: '★',
    summary: 'A focused world for school, activities, rewards, calm moments and bedtime.',
    prompt: 'What do the kids need next?',
  },
  {
    id: 'cooking',
    title: 'Cooking',
    subtitle: 'Today · Fridge · Cook mode',
    icon: '◒',
    summary: 'Meals, fridge-to-recipe ideas, timers and step-by-step cooking in one flow.',
    prompt: 'What should we cook today?',
  },
  {
    id: 'travel',
    title: 'Travel',
    subtitle: 'Escape · Compare · Go',
    icon: '✈',
    summary: 'Trip inspiration with suitability, travel time, weather and total-trip context.',
    prompt: 'Find a short trip that fits us.',
  },
  {
    id: 'tonight',
    title: 'Tonight',
    subtitle: 'Sports · TV · Cinema',
    icon: '▶',
    summary: 'A single answer to what is worth watching, attending or doing tonight.',
    prompt: 'What is on tonight?',
  },
  {
    id: 'health',
    title: 'Health',
    subtitle: 'Move · Water · Progress',
    icon: '♥',
    summary: 'A calm daily wellness view focused on useful trends rather than noisy metrics.',
    prompt: 'How are we doing this week?',
  },
  {
    id: 'calendar',
    title: 'Calendar',
    subtitle: 'Family week · Free time',
    icon: '▦',
    summary: 'One family week showing availability, conflicts and shared free windows.',
    prompt: 'When are we all free?',
  },
  {
    id: 'never-miss',
    title: 'Never-Miss',
    subtitle: 'Urgent · Waiting · This week',
    icon: '!',
    summary: 'The small set of obligations, replies and opportunities that need attention.',
    prompt: 'What must not be missed?',
  },
  {
    id: 'shop',
    title: 'Shop',
    subtitle: 'Market · Home · Lists',
    icon: '＋',
    summary: 'Shared shopping lists that connect naturally to meals, home and family needs.',
    prompt: 'What do we need to buy?',
  },
  {
    id: 'finance',
    title: 'Finance',
    subtitle: 'Month · Commitments · Forecast',
    icon: '€',
    summary: 'A practical month view of commitments, surprises and what remains available.',
    prompt: 'Where do we stand this month?',
  },
  {
    id: 'car',
    title: 'Car',
    subtitle: 'Status · Service · Costs',
    icon: '◇',
    summary: 'Vehicle status, maintenance history, issues, reminders and ownership costs.',
    prompt: 'What does the car need next?',
  },
  {
    id: 'smart-home',
    title: 'Smart Home',
    subtitle: 'Door · Scenes · Devices',
    icon: '⌂',
    summary: 'A restrained home-control surface for the devices and scenes that matter.',
    prompt: 'Set the house for tonight.',
  },
  {
    id: 'pets',
    title: 'Pets',
    subtitle: 'Care · Vet · Notes',
    icon: '•',
    summary: 'Food, care, appointments, medication notes and memories for household pets.',
    prompt: 'Anything due for the pets?',
  },
  {
    id: 'music',
    title: 'Music',
    subtitle: 'Morning · Relax · Bedtime',
    icon: '♫',
    summary: 'Music follows family routines and mood instead of becoming another player app.',
    prompt: 'Play something for this moment.',
  },
  {
    id: 'learning',
    title: 'Learning',
    subtitle: 'Courses · Books · Goals',
    icon: '△',
    summary: 'A lightweight place to continue courses, reading and personal learning goals.',
    prompt: 'Continue where I stopped.',
  },
  {
    id: 'services',
    title: 'Services',
    subtitle: 'Documents · Expiry · Tasks',
    icon: '▤',
    summary: 'Important household documents, expiry dates and actions without file-system clutter.',
    prompt: 'What documents need action?',
  },
  {
    id: 'translator',
    title: 'Translator',
    subtitle: 'Speak · Travel mode',
    icon: '文',
    summary: 'Large, voice-first translation controls designed for use while travelling.',
    prompt: 'Translate what I am about to say.',
  },
  {
    id: 'memories',
    title: 'Memories',
    subtitle: 'Today · Trips · Timeline',
    icon: '✦',
    summary: 'Family moments organised as a living timeline rather than a plain photo gallery.',
    prompt: 'Show a memory from this time of year.',
  },
];

export function createFallbackFamilyOsSnapshot(now: Date = new Date()): FamilyOsSnapshot {
  const locale = 'en-GB';
  const timezone = 'Europe/Nicosia';
  const nowLabel = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone,
  }).format(now);

  return {
    householdName: 'Family',
    locale,
    timezone,
    nowLabel,
    weather: {
      locationLabel: 'Home',
      temperatureC: 28,
      condition: 'Clear',
      detail: 'Warm morning · light breeze',
    },
    members: [
      {
        id: 'parent-1',
        displayName: 'Parent 1',
        role: 'Parent',
        status: 'Home',
        detail: 'Available now',
        accent: 'violet',
      },
      {
        id: 'parent-2',
        displayName: 'Parent 2',
        role: 'Parent',
        status: 'Work',
        detail: 'Back later today',
        accent: 'sea',
      },
      {
        id: 'child-1',
        displayName: 'Child 1',
        role: 'Child',
        status: 'Home',
        detail: 'Next activity later',
        accent: 'earth',
      },
      {
        id: 'child-2',
        displayName: 'Child 2',
        role: 'Child',
        status: 'Home',
        detail: 'Free morning',
        accent: 'rose',
      },
    ],
    attention: {
      eyebrow: 'NEXT',
      title: 'The day is clear for now',
      detail: 'AGNES will surface the next family action here when it becomes relevant.',
      urgency: 'info',
    },
    timeline: [
      {
        time: '07:00',
        title: 'Morning',
        detail: 'Weather, bags and the first things that matter.',
        memberIds: ['parent-1', 'parent-2', 'child-1', 'child-2'],
        state: 'done',
      },
      {
        time: '13:00',
        title: 'Midday',
        detail: 'Household context refresh and activity hand-off.',
        memberIds: ['parent-1', 'child-1', 'child-2'],
        state: 'now',
      },
      {
        time: '18:30',
        title: 'Return home',
        detail: 'Activities, pickup and evening transition.',
        memberIds: ['parent-1', 'parent-2', 'child-1', 'child-2'],
        state: 'upcoming',
      },
      {
        time: '21:00',
        title: 'Tonight',
        detail: 'Sports, TV, tomorrow and bedtime preparation.',
        memberIds: ['parent-1', 'parent-2'],
        state: 'upcoming',
      },
    ],
    exploreModules,
  };
}
