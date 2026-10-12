const MODE_PHOTOS = {
  road: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1800&q=86',
  rail: 'https://images.unsplash.com/photo-1473445361085-b9a07f55608b?auto=format&fit=crop&w=1800&q=86',
  sea: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1800&q=86',
  air: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1800&q=86',
};

const JOURNEY_PHOTOS = {
  'zagori-metsovo-meteora': 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1800&q=86',
  'peloponnese-beyond-map': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1800&q=86',
  'dolomites-grand-drive': 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1800&q=86',
  'iceland-ring-road': 'https://images.unsplash.com/photo-1504829857797-ddff29c27927?auto=format&fit=crop&w=1800&q=86',
  'scotland-nc500': 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1800&q=86',
  'switzerland-grand-rail': 'https://images.unsplash.com/photo-1527668752968-14dc70a27c95?auto=format&fit=crop&w=1800&q=86',
  'italy-by-train': 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=1800&q=86',
  'japan-rail-escape': 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?auto=format&fit=crop&w=1800&q=86',
  'alpine-capitals-rail': 'https://images.unsplash.com/photo-1516550893923-42d28e5677af?auto=format&fit=crop&w=1800&q=86',
  'greek-islands-limassol': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1800&q=86',
  'greek-islands-piraeus': 'https://images.unsplash.com/photo-1504512485720-7d83a16ee930?auto=format&fit=crop&w=1800&q=86',
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
