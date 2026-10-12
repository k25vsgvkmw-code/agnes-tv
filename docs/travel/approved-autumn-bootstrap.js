import { JOURNEYS } from './journeys-data.js';

const img = {
  iceland: 'assets/zagori/vikos-gorge.jpg',
  tromso: 'assets/zagori/meteora-sunset.jpg',
  alps: 'assets/zagori/metsovo-autumn.jpg',
  swiss: 'assets/zagori/meteora-morning.jpg',
  dolomites: 'assets/zagori/papingo-autumn.jpg',
  como: 'assets/zagori/ioannina-autumn.jpg',
  plitvice: 'assets/zagori/vikos-gorge.jpg',
  zermatt: 'assets/zagori/meteora-morning.jpg',
  amalfi: 'assets/zagori/meteora-sunset.jpg',
  lofoten: 'assets/zagori/metsovo-autumn.jpg',
};

const make = ({ id, mode, title, subtitle, country, image, priority, duration = '' }) => ({
  id,
  type: 'journey',
  mode,
  title,
  subtitle,
  country,
  region: 'Europe',
  duration,
  feelings: ['seasonal'],
  editorialPriority: priority,
  bestMonths: [10],
  shoulderMonths: [],
  availableMonths: [10],
  yearRound: false,
  hero: { eyebrow: country, title, story: subtitle, image, cta: 'EXPLORE →' },
  signatureMoments: [],
  route: { stops: [{ id: `${id}-1`, name: country, short: '' }] },
  chapters: [],
  operationalDays: [],
  stays: [],
  transport: { mode, label: mode },
  pricing: { indicative: true, label: 'Plan with AGNES', disclaimer: 'Editorial journey. Pricing and availability are not live.' },
  agnesRules: { quickActions: ['Plan this journey'] },
  media: { hero: image, gallery: [image] },
});

const APPROVED_AUTUMN = [
  make({ id: 'autumn-iceland-waterfalls', mode: 'road', title: 'Καταρράκτες του Φθινοπώρου', subtitle: 'Εκεί όπου η φύση βάφεται με χρώματα και το νερό αφηγείται ιστορίες.', country: 'Ισλανδία', image: img.iceland, priority: 2000, duration: '7 ημέρες' }),
  make({ id: 'autumn-tromso', mode: 'air', title: 'Τρόμσο', subtitle: 'Το Βόρειο Σέλας σε καλεί.', country: 'Νορβηγία', image: img.tromso, priority: 1999, duration: '5 ημέρες' }),
  make({ id: 'autumn-alps', mode: 'rail', title: 'Άλπεις', subtitle: 'Γραφικά χωριά, λίμνες και χρυσά δάση.', country: 'Αυστρία / Ελβετία', image: img.alps, priority: 1998, duration: '6 ημέρες' }),
  make({ id: 'autumn-switzerland', mode: 'rail', title: 'Ελβετία', subtitle: 'Στην καρδιά των Άλπεων.', country: 'Ελβετία', image: img.swiss, priority: 1997, duration: '5 ημέρες' }),
  make({ id: 'autumn-dolomites', mode: 'road', title: 'Δολομίτες', subtitle: 'Δρόμοι που μαγεύουν.', country: 'Ιταλία', image: img.dolomites, priority: 1996, duration: '6 ημέρες' }),
  make({ id: 'autumn-lake-como', mode: 'road', title: 'Λίμνη Κόμο', subtitle: 'Κομψότητα σε κάθε εποχή.', country: 'Ιταλία', image: img.como, priority: 1995, duration: '4 ημέρες' }),
  make({ id: 'autumn-plitvice', mode: 'road', title: 'Πλίτβιτσε', subtitle: 'Ένα παραμύθι στη φύση.', country: 'Κροατία', image: img.plitvice, priority: 1994, duration: '4 ημέρες' }),
  make({ id: 'autumn-zermatt', mode: 'rail', title: 'Ζερμάτ', subtitle: 'Αλπική μαγεία όλο τον χρόνο.', country: 'Ελβετία', image: img.zermatt, priority: 1993, duration: '4 ημέρες' }),
  make({ id: 'autumn-amalfi', mode: 'road', title: 'Αμάλφι', subtitle: 'Χρώματα που μένουν για πάντα.', country: 'Ιταλία', image: img.amalfi, priority: 1992, duration: '5 ημέρες' }),
  make({ id: 'autumn-lofoten', mode: 'road', title: 'Λοφότεν', subtitle: 'Άγρια ομορφιά, αυθεντικές εμπειρίες.', country: 'Νορβηγία', image: img.lofoten, priority: 1991, duration: '6 ημέρες' }),
];

for (const journey of APPROVED_AUTUMN.reverse()) {
  if (!JOURNEYS.some((item) => item.id === journey.id)) JOURNEYS.unshift(journey);
}
