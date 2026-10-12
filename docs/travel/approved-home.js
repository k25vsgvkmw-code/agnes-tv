const REFERENCE_CHUNKS = Array.from({ length: 8 }, (_, index) => `assets/reference/chunk${index}.txt`);

export const APPROVED_HOME_HOTSPOTS = [
  { label: 'Iceland autumn waterfalls', journeyId: 'iceland-ring-road', x: 38.6, y: 5.7, w: 59.1, h: 32.7 },
  { label: 'Tromsø northern lights', journeyId: 'norway-fjords-rail', x: 8.5, y: 28.0, w: 28.6, h: 41.2 },
  { label: 'Alps', journeyId: 'switzerland-grand-rail', x: 38.6, y: 39.8, w: 32.4, h: 29.5 },
  { label: 'Switzerland', journeyId: 'switzerland-grand-rail', x: 71.9, y: 39.8, w: 13.8, h: 29.5 },
  { label: 'Dolomites', journeyId: 'dolomites-grand-drive', x: 86.3, y: 39.8, w: 11.3, h: 29.5 },
  { label: 'Lake Como', journeyId: 'italy-by-train', x: 8.5, y: 70.2, w: 17.0, h: 24.2 },
  { label: 'Plitvice', journeyId: 'zagori-metsovo-meteora', x: 26.0, y: 70.2, w: 17.0, h: 24.2 },
  { label: 'Zermatt', journeyId: 'switzerland-grand-rail', x: 43.5, y: 70.2, w: 17.0, h: 24.2 },
  { label: 'Amalfi', journeyId: 'italy-by-train', x: 61.0, y: 70.2, w: 17.0, h: 24.2 },
  { label: 'Lofoten', journeyId: 'norway-fjords-rail', x: 78.5, y: 70.2, w: 19.0, h: 24.2 },
];

export function renderApprovedReferenceHome() {
  return `<main class="approved-reference-home" data-view="explore"><div class="approved-reference-stage"><img data-approved-reference-image alt="AGNES Travel autumn editorial homepage"><div class="approved-reference-hotspots-layer">${APPROVED_HOME_HOTSPOTS.map((spot) => `<button type="button" class="approved-reference-hotspot" data-journey-id="${spot.journeyId}" aria-label="${spot.label}" style="left:${spot.x}%;top:${spot.y}%;width:${spot.w}%;height:${spot.h}%"></button>`).join('')}</div></div></main>`;
}

export async function hydrateApprovedReferenceHome(root = document) {
  const image = root.querySelector('[data-approved-reference-image]');
  if (!image || image.dataset.loaded === 'true') return;
  try {
    const chunks = await Promise.all(
      REFERENCE_CHUNKS.map(async (url) => {
        const response = await fetch(url, { cache: 'force-cache' });
        if (!response.ok) throw new Error(`Reference asset ${url} failed: ${response.status}`);
        return (await response.text()).trim();
      }),
    );
    image.src = `data:image/webp;base64,${chunks.join('')}`;
    image.dataset.loaded = 'true';
  } catch {
    image.classList.add('is-missing');
  }
}
