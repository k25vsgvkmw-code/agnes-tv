const MODE_PHOTOS = {
  road: 'assets/zagori/ioannina-autumn.jpg',
  rail: 'assets/zagori/meteora-morning.jpg',
  sea: 'assets/zagori/vikos-gorge.jpg',
  air: 'assets/zagori/meteora-sunset.jpg',
};

const JOURNEY_PHOTOS = {
  'zagori-metsovo-meteora': 'assets/zagori/papingo-autumn.jpg',
  'peloponnese-beyond-map': 'assets/zagori/ioannina-autumn.jpg',
  'dolomites-grand-drive': 'assets/zagori/metsovo-autumn.jpg',
  'iceland-ring-road': 'assets/zagori/vikos-gorge.jpg',
  'scotland-nc500': 'assets/zagori/ioannina-autumn.jpg',
  'switzerland-grand-rail': 'assets/zagori/meteora-morning.jpg',
  'italy-by-train': 'assets/zagori/meteora-sunset.jpg',
  'japan-rail-escape': 'assets/zagori/meteora-morning.jpg',
  'alpine-capitals-rail': 'assets/zagori/metsovo-autumn.jpg',
  'greek-islands-limassol': 'assets/zagori/meteora-sunset.jpg',
  'greek-islands-piraeus': 'assets/zagori/ioannina-autumn.jpg',
};

const cloneWithPhoto = (journey) => {
  const photo = JOURNEY_PHOTOS[journey.id] || MODE_PHOTOS[journey.mode];
  if (!photo) return journey;
  return {
    ...journey,
    hero: { ...journey.hero, image: photo },
    media: { ...(journey.media || {}), hero: photo, gallery: [photo] },
    signatureMoments: (journey.signatureMoments || []).map((moment) => ({ ...moment, image: photo })),
    chapters: (journey.chapters || []).map((chapter) => ({ ...chapter, image: photo })),
  };
};

export const applyJourneyPhotography = (journeys) => journeys.map(cloneWithPhoto);
