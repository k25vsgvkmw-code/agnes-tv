import { agnesClientScript } from './agnes-client.js';
import { agnesStyles } from './agnes-styles.js';
import { escapeHtml } from './escape-html.js';
import type {
  ExploreModule,
  FamilyMemberStatus,
  FamilyOsSnapshot,
  TimelineItem,
} from './family-os-snapshot.js';

function renderMemberOrb(member: FamilyMemberStatus): string {
  return `<article class="member-orb">
    <div class="member-top">
      <span class="member-dot ${member.accent}" aria-hidden="true"></span>
      <div>
        <div class="member-name">${escapeHtml(member.displayName)}</div>
        <div class="member-role">${escapeHtml(member.role)}</div>
      </div>
    </div>
    <div class="member-state">${escapeHtml(member.status)}</div>
    <div class="member-detail">${escapeHtml(member.detail)}</div>
  </article>`;
}

function renderFamilyCard(member: FamilyMemberStatus): string {
  return `<article class="family-card">
    <span class="member-dot ${member.accent}" aria-hidden="true"></span>
    <h3 class="family-card-name">${escapeHtml(member.displayName)}</h3>
    <div class="family-card-meta">${escapeHtml(member.role)}</div>
    <div class="family-card-status">${escapeHtml(member.status)} · ${escapeHtml(member.detail)}</div>
  </article>`;
}

function renderTimelineItem(item: TimelineItem): string {
  return `<article class="timeline-item" data-state="${item.state}">
    <div class="timeline-time">${escapeHtml(item.time)}</div>
    <span class="timeline-node" aria-hidden="true"></span>
    <div>
      <h3 class="timeline-title">${escapeHtml(item.title)}</h3>
      <p class="timeline-detail">${escapeHtml(item.detail)}</p>
    </div>
  </article>`;
}

function renderModule(module: ExploreModule): string {
  return `<button
    class="module-card"
    type="button"
    data-module="${module.id}"
    data-title="${escapeHtml(module.title)}"
    data-subtitle="${escapeHtml(module.subtitle)}"
    data-summary="${escapeHtml(module.summary)}"
    data-prompt="${escapeHtml(module.prompt)}"
  >
    <span class="module-icon" aria-hidden="true">${escapeHtml(module.icon)}</span>
    <h3 class="module-title">${escapeHtml(module.title)}</h3>
    <div class="module-subtitle">${escapeHtml(module.subtitle)}</div>
    <p class="module-summary">${escapeHtml(module.summary)}</p>
  </button>`;
}

function renderNavButton(
  id: 'home' | 'today' | 'family' | 'explore',
  glyph: string,
  label: string,
  selected: boolean,
): string {
  return `<button class="nav-button" type="button" role="tab" aria-label="${label}" aria-selected="${selected ? 'true' : 'false'}" data-nav="${id}">
    <span class="nav-glyph" aria-hidden="true">${glyph}</span>
  </button>`;
}

function renderNavigation(className: string): string {
  return `<nav class="${className}" aria-label="Primary">
    ${renderNavButton('home', '⌂', 'Home', true)}
    ${renderNavButton('today', '◷', 'Today', false)}
    ${renderNavButton('family', '◉', 'Family', false)}
    ${renderNavButton('explore', '✦', 'Explore', false)}
  </nav>`;
}

export function renderFamilyOs(snapshot: FamilyOsSnapshot): string {
  const members = snapshot.members.map(renderMemberOrb).join('');
  const familyCards = snapshot.members.map(renderFamilyCard).join('');
  const timeline = snapshot.timeline.map(renderTimelineItem).join('');
  const modules = snapshot.exploreModules.map(renderModule).join('');

  return `<!doctype html>
<html lang="${escapeHtml(snapshot.locale)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#171326">
  <title>AGNES · ${escapeHtml(snapshot.householdName)}</title>
  <style>${agnesStyles}</style>
</head>
<body>
  <div class="agnes-app">
    <header class="topbar">
      <div class="brand"><span class="brand-mark" aria-hidden="true"></span><span>AGNES</span></div>
      <div class="now-label" data-live-clock>${escapeHtml(snapshot.nowLabel)}</div>
      <div class="weather-pill" aria-label="Weather summary">
        <span aria-hidden="true">☀</span>
        <span class="weather-temp">${snapshot.weather.temperatureC}°</span>
        <span>${escapeHtml(snapshot.weather.locationLabel)}</span>
        <span class="weather-detail">${escapeHtml(snapshot.weather.condition)}</span>
      </div>
    </header>

    ${renderNavigation('rail')}

    <main class="main">
      <section class="view" data-view="home" data-active="true">
        <div class="home-grid">
          <section class="family-stage" aria-labelledby="home-heading">
            <div class="stage-copy">
              <p class="eyebrow">${escapeHtml(snapshot.householdName)} · LIVE</p>
              <h1 class="display-title" id="home-heading">Your family,<br>right now.</h1>
              <p class="stage-subtitle">One calm view of who is where, what matters next and what AGNES should surface before anybody has to search for it.</p>
            </div>
            <div class="family-orbits">${members}</div>
          </section>

          <aside class="context-stack" aria-label="Family context">
            <section class="glass-card attention-card" data-urgency="${snapshot.attention.urgency}">
              <p class="eyebrow">${escapeHtml(snapshot.attention.eyebrow)}</p>
              <h2 class="attention-title">${escapeHtml(snapshot.attention.title)}</h2>
              <p class="attention-detail">${escapeHtml(snapshot.attention.detail)}</p>
            </section>
            <section class="glass-card quick-panel">
              <p class="eyebrow">AT A GLANCE</p>
              <div class="quick-row"><span class="quick-label">Weather</span><span class="quick-value">${snapshot.weather.temperatureC}° · ${escapeHtml(snapshot.weather.condition)}</span></div>
              <div class="quick-row"><span class="quick-label">Next family block</span><span class="quick-value">${escapeHtml(snapshot.timeline[2]?.title ?? 'Later today')}</span></div>
              <div class="quick-row"><span class="quick-label">AGNES</span><span class="quick-value">Watching the day</span></div>
            </section>
          </aside>
        </div>
      </section>

      <section class="view" data-view="today" data-active="false" hidden>
        <header class="page-head">
          <div>
            <p class="eyebrow">TODAY</p>
            <h2 class="section-title">The family day in one flow.</h2>
            <p class="section-copy">Current context stays at the top; completed moments fade back and upcoming hand-offs remain visible without turning the page into a calendar grid.</p>
          </div>
        </header>
        <section class="glass-card attention-card" data-urgency="${snapshot.attention.urgency}" style="margin-bottom:16px;max-width:980px">
          <p class="eyebrow">${escapeHtml(snapshot.attention.eyebrow)}</p>
          <h3 class="attention-title">${escapeHtml(snapshot.attention.title)}</h3>
          <p class="attention-detail">${escapeHtml(snapshot.attention.detail)}</p>
        </section>
        <div class="timeline">${timeline}</div>
      </section>

      <section class="view" data-view="family" data-active="false" hidden>
        <header class="page-head">
          <div>
            <p class="eyebrow">FAMILY</p>
            <h2 class="section-title">People first, not apps.</h2>
            <p class="section-copy">Each person becomes a doorway into their schedule, routines, activities and relevant context while the underlying household graph remains shared.</p>
          </div>
        </header>
        <div class="family-grid">${familyCards}</div>
      </section>

      <section class="view" data-view="explore" data-active="false" hidden>
        <header class="page-head">
          <div>
            <p class="eyebrow">EXPLORE</p>
            <h2 class="section-title">Everything else, one language.</h2>
            <p class="section-copy">Lifestyle and household modules share the same visual system and open inside AGNES rather than becoming disconnected mini-apps.</p>
          </div>
        </header>
        <div class="explore-grid">${modules}</div>
      </section>
    </main>

    ${renderNavigation('mobile-nav')}

    <button class="agnes-control" type="button" aria-label="Open AGNES assistant" data-agnes-control><span class="sr-only">Open AGNES</span></button>

    <section class="detail-layer" data-module-detail data-open="false" aria-hidden="true" aria-label="Module detail">
      <div class="detail-panel">
        <div class="detail-hero">
          <p class="eyebrow" data-detail-subtitle>AGNES MODULE</p>
          <h2 class="detail-title" data-detail-title>Explore</h2>
          <p class="detail-copy" data-detail-summary>Select a module to see its focused AGNES surface.</p>
          <div class="detail-actions">
            <button class="action-button primary" type="button" data-detail-prompt>Ask AGNES</button>
            <button class="action-button" type="button" data-detail-close>Back to Explore</button>
          </div>
        </div>
      </div>
    </section>

    <section class="assistant-layer" data-assistant-layer data-open="false" aria-hidden="true" aria-label="AGNES assistant">
      <div class="assistant-panel">
        <p class="eyebrow">AGNES AI</p>
        <h2 class="assistant-heading">What do you need?</h2>
        <p class="section-copy">The assistant stays global and contextual. Provider execution remains behind the Core intelligence and permissions boundaries.</p>
        <div class="prompt-row">
          <span class="prompt-chip">What matters today?</span>
          <span class="prompt-chip">When are we all free?</span>
          <span class="prompt-chip">What is on tonight?</span>
          <span class="prompt-chip">Find a short trip.</span>
        </div>
        <div class="detail-actions"><button class="action-button" type="button" data-assistant-close>Close</button></div>
      </div>
    </section>
  </div>
  <script>${agnesClientScript}</script>
</body>
</html>`;
}
