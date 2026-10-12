const LOCAL_BY_MODE = {
  road: 'assets/zagori/ioannina-autumn.jpg',
  rail: 'assets/zagori/meteora-morning.jpg',
  sea: 'assets/zagori/vikos-gorge.jpg',
  air: 'assets/zagori/meteora-sunset.jpg',
};

const LOCAL_BY_KEYWORD = [
  ['zagori', 'assets/zagori/papingo-autumn.jpg'],
  ['meteora', 'assets/zagori/meteora-sunset.jpg'],
  ['greece', 'assets/zagori/ioannina-autumn.jpg'],
  ['dolomites', 'assets/zagori/metsovo-autumn.jpg'],
  ['switzerland', 'assets/zagori/meteora-morning.jpg'],
  ['iceland', 'assets/zagori/vikos-gorge.jpg'],
  ['norway', 'assets/zagori/vikos-gorge.jpg'],
  ['japan', 'assets/zagori/meteora-morning.jpg'],
  ['morocco', 'assets/zagori/metsovo-autumn.jpg'],
];

function modeFromPlaceholder(image = '') {
  const match = String(image).match(/assets\/world\/(air|sea|rail|road)\.svg$/);
  return match?.[1] ?? '';
}

export function resolveTravelImage(image, alt = '') {
  if (!image) return '';
  if (!String(image).endsWith('.svg')) return image;

  const normalizedAlt = String(alt).toLowerCase();
  const keywordPhoto = LOCAL_BY_KEYWORD.find(([keyword]) => normalizedAlt.includes(keyword));
  if (keywordPhoto) return keywordPhoto[1];

  const mode = modeFromPlaceholder(image);
  return LOCAL_BY_MODE[mode] ?? image;
}
