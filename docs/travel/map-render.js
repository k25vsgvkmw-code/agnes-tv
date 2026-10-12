const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

export function buildRouteModel(journey, options = {}) {
  const currentStopId = options.currentStopId ?? null;
  const stops = (journey?.route?.stops ?? []).map((stop, index) => ({
    id: stop.id ?? `stop-${index + 1}`,
    name: stop.name ?? `Stop ${index + 1}`,
    lat: Number.isFinite(stop.lat) ? stop.lat : null,
    lng: Number.isFinite(stop.lng) ? stop.lng : null,
    current: (stop.id ?? `stop-${index + 1}`) === currentStopId,
    index,
  }));

  return {
    id: journey?.id ?? 'journey',
    stops,
    hasCoordinates: stops.length > 1 && stops.every((stop) => stop.lat !== null && stop.lng !== null),
  };
}

function project(stops, width, height, padding) {
  const lats = stops.map((stop) => stop.lat);
  const lngs = stops.map((stop) => stop.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latSpan = maxLat - minLat || 1;
  const lngSpan = maxLng - minLng || 1;

  return stops.map((stop) => ({
    ...stop,
    x: padding + ((stop.lng - minLng) / lngSpan) * (width - padding * 2),
    y: height - padding - ((stop.lat - minLat) / latSpan) * (height - padding * 2),
  }));
}

function renderTextRoute(model) {
  return `<nav class="journey-map journey-map-fallback" aria-label="Journey route"><ol>${model.stops
    .map(
      (stop) =>
        `<li><button type="button" data-route-stop="${escapeHtml(stop.id)}"${stop.current ? ' aria-current="step"' : ''}><span>${stop.index + 1}</span><strong>${escapeHtml(stop.name)}</strong></button></li>`,
    )
    .join('')}</ol></nav>`;
}

export function renderJourneyMap(journey, options = {}) {
  const model = buildRouteModel(journey, options);
  if (!model.stops.length || !model.hasCoordinates) return renderTextRoute(model);

  const width = 900;
  const height = 420;
  const padding = 56;
  const points = project(model.stops, width, height, padding);
  const polyline = points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');

  return `<section class="journey-map" aria-label="Journey route"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Route map"><polyline class="journey-map-line" points="${polyline}" fill="none" vector-effect="non-scaling-stroke"></polyline>${points
    .map(
      (point) =>
        `<g data-route-stop="${escapeHtml(point.id)}"${point.current ? ' data-current="true"' : ''} transform="translate(${point.x.toFixed(1)} ${point.y.toFixed(1)})"><circle r="8"></circle><text x="14" y="5">${escapeHtml(point.name)}</text></g>`,
    )
    .join('')}</svg><div class="journey-map-stops">${points
    .map(
      (point) =>
        `<button type="button" data-route-stop="${escapeHtml(point.id)}"${point.current ? ' aria-current="step"' : ''}>${escapeHtml(point.name)}</button>`,
    )
    .join('')}</div></section>`;
}
