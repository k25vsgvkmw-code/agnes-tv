const PHOTO_BASE = 'https://images.unsplash.com/';

const PHOTO_BY_MODE = {
  road: 'photo-1667490750889-a3c241de59e4',
  rail: 'photo-1443926818681-717d074a57af',
  sea: 'photo-1778868001877-3b8e6391e5ea',
  air: 'photo-1666545530852-9c7ab6fcecfc',
};

const PHOTO_BY_KEYWORD = [
  ['iceland', 'photo-1638208561774-6e02a8e17cc1'],
  ['japan', 'photo-1774498449105-ca0bc5865a70'],
  ['morocco', 'photo-1489573280374-2e193c63726c'],
  ['sahara', 'photo-1489573280374-2e193c63726c'],
  ['norway', 'photo-1443926818681-717d074a57af'],
  ['fjords', 'photo-1443926818681-717d074a57af'],
  ['switzerland', 'photo-1443926818681-717d074a57af'],
  ['dolomites', 'photo-1667490750889-a3c241de59e4'],
  ['greek islands', 'photo-1778868001877-3b8e6391e5ea'],
  ['aegean', 'photo-1778868001877-3b8e6391e5ea'],
  ['limassol', 'photo-1778868001877-3b8e6391e5ea'],
  ['piraeus', 'photo-1778868001877-3b8e6391e5ea'],
];

const toPhotoUrl = (photoId) =>
  `${PHOTO_BASE}${photoId}?auto=format&fit=crop&fm=jpg&q=82&w=1800`;

function modeFromPlaceholder(image = '') {
  const match = String(image).match(/assets\/world\/(air|sea|rail|road)\.svg$/);
  return match?.[1] ?? '';
}

export function resolveTravelImage(image, alt = '') {
  if (!image) return '';
  if (!String(image).endsWith('.svg')) return image;

  const normalizedAlt = String(alt).toLowerCase();
  const keywordPhoto = PHOTO_BY_KEYWORD.find(([keyword]) =>
    normalizedAlt.includes(keyword),
  );
  if (keywordPhoto) return toPhotoUrl(keywordPhoto[1]);

  const mode = modeFromPlaceholder(image);
  const photoId = PHOTO_BY_MODE[mode];
  return photoId ? toPhotoUrl(photoId) : image;
}
