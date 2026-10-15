export const agnesStyles = `
:root {
  color-scheme: dark;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --bg-0: #171326;
  --bg-1: #211a38;
  --bg-2: #2d2450;
  --panel: rgba(255, 255, 255, 0.08);
  --panel-strong: rgba(255, 255, 255, 0.13);
  --line: rgba(255, 255, 255, 0.12);
  --text: #f8f6ff;
  --muted: #bcb6d1;
  --violet: #b69cff;
  --sea: #7fd5dd;
  --earth: #e7b98e;
  --rose: #ef9fb8;
  --success: #9ed9b3;
  --shadow: 0 24px 70px rgba(7, 5, 15, 0.38);
}

* { box-sizing: border-box; }
html, body { margin: 0; min-height: 100%; background: var(--bg-0); color: var(--text); }
body {
  min-height: 100vh;
  overflow-x: hidden;
  background:
    radial-gradient(circle at 15% 15%, rgba(182, 156, 255, 0.22), transparent 34rem),
    radial-gradient(circle at 85% 20%, rgba(127, 213, 221, 0.16), transparent 30rem),
    linear-gradient(145deg, var(--bg-0), var(--bg-1) 45%, #1a1930 100%);
}
button { font: inherit; color: inherit; }
button:focus-visible { outline: 2px solid var(--sea); outline-offset: 3px; }

.agnes-app { min-height: 100vh; position: relative; isolation: isolate; }
.agnes-app::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: -1;
  background-image: linear-gradient(rgba(255,255,255,.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.015) 1px, transparent 1px);
  background-size: 42px 42px;
  mask-image: linear-gradient(to bottom, black, transparent 78%);
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 30;
  height: 64px;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 16px;
  padding: 0 28px 0 104px;
  background: rgba(23, 19, 38, 0.72);
  border-bottom: 1px solid rgba(255,255,255,.07);
  backdrop-filter: blur(24px) saturate(135%);
}
.brand { display: inline-flex; gap: 10px; align-items: center; font-weight: 800; letter-spacing: .18em; font-size: 13px; }
.brand-mark { width: 28px; height: 28px; border-radius: 10px; background: linear-gradient(135deg, var(--violet), var(--sea)); box-shadow: 0 8px 24px rgba(182,156,255,.28); }
.now-label { color: var(--muted); font-size: 13px; text-align: center; }
.weather-pill { justify-self: end; display: inline-flex; align-items: center; gap: 9px; padding: 8px 12px; border: 1px solid var(--line); border-radius: 999px; background: rgba(255,255,255,.05); font-size: 13px; }
.weather-temp { font-weight: 800; }
.weather-detail { color: var(--muted); }

.rail {
  position: fixed;
  z-index: 40;
  left: 18px;
  top: 82px;
  width: 62px;
  padding: 10px;
  display: grid;
  gap: 9px;
  border: 1px solid var(--line);
  border-radius: 24px;
  background: rgba(31, 25, 49, 0.72);
  box-shadow: var(--shadow);
  backdrop-filter: blur(24px);
}
.nav-button {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 15px;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  transition: transform .18s ease, background .18s ease, color .18s ease;
}
.nav-button:hover { transform: translateY(-1px); color: var(--text); background: rgba(255,255,255,.06); }
.nav-button[aria-selected="true"] { color: #151020; background: linear-gradient(135deg, var(--violet), #d6c8ff); box-shadow: 0 12px 30px rgba(182,156,255,.24); }
.nav-glyph { font-size: 17px; line-height: 1; }

.main { padding: 28px 30px 110px 104px; }
.view { display: none; animation: enter .32s ease both; }
.view[data-active="true"] { display: block; }
@keyframes enter { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }

.eyebrow { margin: 0 0 8px; color: var(--sea); font-size: 11px; font-weight: 800; letter-spacing: .18em; text-transform: uppercase; }
.display-title { margin: 0; max-width: 760px; font-size: clamp(38px, 5vw, 78px); line-height: .98; letter-spacing: -.055em; }
.section-title { margin: 0; font-size: clamp(28px, 3vw, 44px); letter-spacing: -.035em; }
.section-copy { margin: 10px 0 0; max-width: 720px; color: var(--muted); line-height: 1.55; }

.home-grid { display: grid; grid-template-columns: minmax(0, 1.65fr) minmax(300px, .7fr); gap: 22px; min-height: calc(100vh - 126px); }
.family-stage {
  position: relative;
  min-height: 620px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 38px;
  padding: clamp(28px, 5vw, 64px);
  background:
    radial-gradient(circle at 68% 30%, rgba(127,213,221,.20), transparent 25rem),
    radial-gradient(circle at 22% 75%, rgba(231,185,142,.15), transparent 28rem),
    linear-gradient(145deg, rgba(63,49,100,.74), rgba(30,25,49,.9));
  box-shadow: var(--shadow);
}
.family-stage::after {
  content: "";
  position: absolute;
  inset: auto -10% -36% 24%;
  height: 70%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(182,156,255,.22), transparent 68%);
  filter: blur(4px);
}
.stage-copy { position: relative; z-index: 2; }
.stage-subtitle { margin: 18px 0 0; max-width: 560px; color: #d1cbe0; font-size: 17px; line-height: 1.6; }
.family-orbits { position: absolute; z-index: 2; inset: auto 36px 34px 36px; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.member-orb { min-width: 0; padding: 16px; border: 1px solid var(--line); border-radius: 22px; background: rgba(18,15,31,.38); backdrop-filter: blur(18px); }
.member-top { display: flex; gap: 10px; align-items: center; }
.member-dot { width: 12px; height: 12px; border-radius: 50%; box-shadow: 0 0 0 5px rgba(255,255,255,.05); }
.member-dot.violet { background: var(--violet); }
.member-dot.sea { background: var(--sea); }
.member-dot.earth { background: var(--earth); }
.member-dot.rose { background: var(--rose); }
.member-name { font-weight: 750; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.member-role { color: var(--muted); font-size: 12px; margin-top: 2px; }
.member-state { margin-top: 12px; font-size: 13px; }
.member-detail { margin-top: 4px; color: var(--muted); font-size: 12px; }

.context-stack { display: grid; align-content: start; gap: 16px; }
.glass-card { border: 1px solid var(--line); border-radius: 28px; background: var(--panel); box-shadow: 0 18px 50px rgba(7,5,15,.18); backdrop-filter: blur(24px); }
.attention-card { padding: 24px; }
.attention-card[data-urgency="now"] { border-color: rgba(239,159,184,.45); background: linear-gradient(145deg, rgba(239,159,184,.16), rgba(255,255,255,.06)); }
.attention-title { margin: 4px 0 8px; font-size: 24px; letter-spacing: -.025em; }
.attention-detail { margin: 0; color: var(--muted); line-height: 1.5; }
.quick-panel { padding: 22px; }
.quick-row { display: flex; justify-content: space-between; gap: 14px; padding: 13px 0; border-top: 1px solid rgba(255,255,255,.07); }
.quick-row:first-of-type { border-top: 0; }
.quick-label { color: var(--muted); }
.quick-value { font-weight: 700; text-align: right; }

.page-head { display: flex; justify-content: space-between; align-items: end; gap: 20px; margin: 6px 0 26px; }
.timeline { display: grid; gap: 12px; max-width: 980px; }
.timeline-item { display: grid; grid-template-columns: 86px 18px 1fr; gap: 15px; align-items: start; padding: 18px 20px; border: 1px solid var(--line); border-radius: 24px; background: rgba(255,255,255,.055); }
.timeline-time { color: var(--muted); font-variant-numeric: tabular-nums; font-weight: 700; }
.timeline-node { width: 12px; height: 12px; margin-top: 4px; border-radius: 50%; background: rgba(255,255,255,.2); box-shadow: 0 0 0 5px rgba(255,255,255,.035); }
.timeline-item[data-state="now"] .timeline-node { background: var(--sea); box-shadow: 0 0 0 6px rgba(127,213,221,.12), 0 0 30px rgba(127,213,221,.35); }
.timeline-item[data-state="done"] { opacity: .65; }
.timeline-title { margin: 0 0 4px; font-size: 17px; }
.timeline-detail { margin: 0; color: var(--muted); line-height: 1.45; }

.family-grid, .explore-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
.family-card, .module-card { position: relative; min-height: 180px; padding: 20px; border: 1px solid var(--line); border-radius: 26px; background: rgba(255,255,255,.055); overflow: hidden; }
.family-card::before, .module-card::before { content: ""; position: absolute; width: 120px; height: 120px; right: -42px; top: -46px; border-radius: 50%; background: radial-gradient(circle, rgba(182,156,255,.18), transparent 70%); }
.family-card-name { margin: 18px 0 4px; font-size: 23px; }
.family-card-meta, .module-subtitle { color: var(--muted); font-size: 13px; }
.family-card-status { margin-top: 18px; font-size: 14px; }

.module-card { min-height: 210px; text-align: left; cursor: pointer; color: inherit; transition: transform .18s ease, border-color .18s ease, background .18s ease; }
.module-card:hover { transform: translateY(-3px); border-color: rgba(182,156,255,.3); background: rgba(255,255,255,.075); }
.module-icon { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 15px; color: #191326; background: linear-gradient(135deg, var(--violet), var(--sea)); font-weight: 900; }
.module-title { margin: 22px 0 4px; font-size: 20px; letter-spacing: -.02em; }
.module-summary { margin: 14px 0 0; color: var(--muted); font-size: 13px; line-height: 1.5; }

.detail-layer, .assistant-layer { position: fixed; z-index: 70; inset: 0; display: none; padding: 24px; background: rgba(10,8,17,.62); backdrop-filter: blur(22px); }
.detail-layer[data-open="true"], .assistant-layer[data-open="true"] { display: grid; place-items: center; }
.detail-panel, .assistant-panel { width: min(920px, 100%); max-height: min(760px, calc(100vh - 48px)); overflow: auto; border: 1px solid var(--line); border-radius: 34px; padding: clamp(26px, 5vw, 54px); background: linear-gradient(155deg, rgba(55,43,88,.98), rgba(23,19,38,.98)); box-shadow: 0 34px 110px rgba(0,0,0,.5); }
.detail-hero { min-height: 310px; display: flex; flex-direction: column; justify-content: end; padding: 32px; border: 1px solid var(--line); border-radius: 28px; background: radial-gradient(circle at 80% 20%, rgba(127,213,221,.23), transparent 18rem), radial-gradient(circle at 15% 80%, rgba(231,185,142,.18), transparent 22rem), rgba(255,255,255,.055); }
.detail-title { margin: 8px 0 8px; font-size: clamp(34px, 5vw, 62px); letter-spacing: -.045em; }
.detail-copy { max-width: 680px; color: var(--muted); line-height: 1.6; }
.detail-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 24px; }
.action-button { min-height: 44px; border: 1px solid var(--line); border-radius: 999px; padding: 0 17px; background: rgba(255,255,255,.07); cursor: pointer; }
.action-button.primary { color: #171326; border: 0; background: linear-gradient(135deg, var(--violet), var(--sea)); font-weight: 800; }

.agnes-control { position: fixed; z-index: 55; right: 24px; bottom: 24px; width: 62px; height: 62px; border: 1px solid rgba(255,255,255,.2); border-radius: 50%; background: radial-gradient(circle at 35% 30%, #efeaff, var(--violet) 32%, #745ba9 75%); box-shadow: 0 16px 45px rgba(90,65,150,.46); cursor: pointer; }
.agnes-control::after { content: ""; position: absolute; inset: 19px; border: 2px solid rgba(25,19,38,.65); border-top-color: transparent; border-radius: 50%; }
.assistant-panel { width: min(680px, 100%); }
.assistant-heading { font-size: 34px; margin: 4px 0 8px; letter-spacing: -.035em; }
.prompt-row { display: flex; flex-wrap: wrap; gap: 9px; margin-top: 22px; }
.prompt-chip { border: 1px solid var(--line); border-radius: 999px; padding: 11px 14px; background: rgba(255,255,255,.055); color: var(--muted); }

.mobile-nav { display: none; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }

@media (max-width: 1180px) {
  .home-grid { grid-template-columns: 1fr; }
  .family-stage { min-height: 570px; }
  .context-stack { grid-template-columns: 1fr 1fr; }
  .family-grid, .explore-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 760px) {
  .topbar { height: 58px; grid-template-columns: 1fr auto; padding: 0 16px; }
  .now-label { display: none; }
  .brand { font-size: 12px; }
  .weather-detail { display: none; }
  .rail { display: none; }
  .main { padding: 18px 14px 104px; }
  .family-stage { min-height: 600px; border-radius: 28px; padding: 28px 22px; }
  .family-orbits { inset: auto 18px 18px; grid-template-columns: 1fr 1fr; }
  .member-orb { padding: 13px; border-radius: 18px; }
  .context-stack { grid-template-columns: 1fr; }
  .family-grid, .explore-grid { grid-template-columns: 1fr; }
  .page-head { align-items: start; flex-direction: column; }
  .timeline-item { grid-template-columns: 60px 14px 1fr; padding: 16px; }
  .mobile-nav { position: fixed; z-index: 50; left: 12px; right: 12px; bottom: 12px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; padding: 7px; border: 1px solid var(--line); border-radius: 22px; background: rgba(24,19,39,.9); box-shadow: var(--shadow); backdrop-filter: blur(22px); }
  .mobile-nav .nav-button { width: 100%; height: 48px; }
  .agnes-control { right: 18px; bottom: 82px; width: 56px; height: 56px; }
  .detail-layer, .assistant-layer { padding: 10px; }
  .detail-panel, .assistant-panel { border-radius: 28px; padding: 24px; }
  .detail-hero { min-height: 280px; padding: 24px; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { scroll-behavior: auto !important; animation-duration: .001ms !important; transition-duration: .001ms !important; }
}
`;
