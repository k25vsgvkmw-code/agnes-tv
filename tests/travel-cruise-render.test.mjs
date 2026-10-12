import { describe, expect, it } from 'vitest';
import { JOURNEYS, DEPARTURE_PORTS, getJourneyById } from '../docs/travel/journeys-data.js';
import { createJourneyState } from '../docs/travel/journey-state.js';
import { renderCruiseLanding, renderCruiseDetail } from '../docs/travel/cruise-render.js';

const state = {
  ...createJourneyState(new Date('2026-10-12T12:00:00Z')),
  view: 'cruises',
  mode: 'sea',
};

describe('cruise discovery and detail', () => {
  it('puts departure port first and groups by season', () => {
    const html = renderCruiseLanding(JOURNEYS, state, DEPARTURE_PORTS);
    expect(html.indexOf('data-cruise-filter="departure-port"')).toBeLessThan(
      html.indexOf('data-cruise-filter="month"'),
    );
    expect(html).toContain('data-departure-port="limassol"');
    expect(html).toContain('In Season Now');
    expect(html).toContain('Coming Next');
    expect(html).toContain('Year-Round');
  });

  it('shows a useful unmatched-port state', () => {
    expect(
      renderCruiseLanding(JOURNEYS, { ...state, departurePort: 'nowhere' }, DEPARTURE_PORTS),
    ).toContain('data-empty-cruise-state');
  });

  it('renders truthful cruise detail', () => {
    const html = renderCruiseDetail(getJourneyById('greek-islands-limassol'), state);
    expect(html).toContain('From limassol');
    expect(html).toContain('SHIP OVERVIEW');
    expect(html).toContain('Request availability');
    for (const unsupported of [
      'Pay now',
      'Best price guarantee',
      '24/7 support',
      'confirmed availability',
    ]) {
      expect(html).not.toContain(unsupported);
    }
  });
});
