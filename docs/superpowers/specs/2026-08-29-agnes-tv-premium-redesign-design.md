# AGNES TV Premium Redesign — Design Specification

Date: 2026-08-29
Status: Proposed for user review
Target: Hisense Android TV, primary validation at 1920×1080

## 1. Why this redesign exists

AGNES TV v1.8.0 proved the basic Xtream/auth/player flows, category-scoped VOD loading, streaming JSON parsing, and emulator automation, but the delivered TV experience is not product-grade. The current app is still structurally close to a Compose prototype: a large `MainActivity.kt`, mobile Material 3 primitives, manual bitmap fetching/caching, screen state concentrated in one shell, and a UI that waits too visibly on network/content work.

The redesign keeps the verified backend/player lessons and replaces the presentation/runtime architecture with a TV-first product architecture.

## 2. Product goal

AGNES TV should feel like a premium television product, not an IPTV utility.

The first screen must appear immediately and make live television the fastest path. Sports/live content is the first priority; Movies and Kids follow in cinematic rails. The user should always know where remote focus is, and focus movement must feel immediate.

### Success criteria

1. The TV shell renders without waiting for Xtream network calls.
2. Live IPTV is visible before Movies/Kids network synchronization completes.
3. D-pad focus is visually unmistakable and never depends on color alone.
4. No screen loads the complete VOD catalogue into memory.
5. Poster/backdrop decoding is bounded to requested display size and cached.
6. Player launch and Back navigation are deterministic.
7. The app remains usable with stale cache when the provider is temporarily slow.
8. There are no dead navigation items: a section appears only when it is functional.
9. Greek subtitle indicators distinguish verified subtitle tracks from naming/category guesses.
10. TV validation runs on a 1080p Android TV emulator, not a phone profile.

## 3. Chosen design direction

### Recommended approach: TV-first Compose architecture

Use Jetpack Compose, but replace the current prototype-style shell with TV-specific primitives and clear state/data boundaries:

- Compose for TV / TV Material components for focusable navigation and controls.
- Dedicated screen/state classes instead of one large composable file.
- Repository layer for Xtream data.
- Persistent cache-first content index.
- A proper image loading pipeline with bounded decode, memory cache, and disk cache.
- Media3 ExoPlayer retained for playback.

### Alternatives considered

**A. Keep v1.8.0 structure and only restyle it.** Rejected. It would preserve the monolithic screen/state model and would likely reproduce the same latency and “demo” feeling.

**B. Rebuild with classic Leanback Views.** Technically viable and mature for TV navigation, but it would discard useful Compose work and complicate the cinematic visual system. Not preferred.

**C. TV-first Compose architecture.** Chosen. It keeps existing Kotlin/Compose investment while changing the architecture that currently causes visual and performance limitations.

## 4. Information architecture

The first release of the redesign exposes only fully implemented sections:

- ΑΡΧΙΚΗ
- ΖΩΝΤΑΝΑ
- ΑΓΩΝΕΣ
- ΤΑΙΝΙΕΣ
- KIDS
- ΠΡΟΣΦΑΤΑ
- ΡΥΘΜΙΣΕΙΣ

Series, Search and Favorites are not shown until their data and interaction flows are implemented and tested. No placeholder menu entries.

### Home hierarchy

The Home screen is sports/live-first:

1. **Hero: ΖΩΝΤΑΝΑ ΤΩΡΑ / featured event**
   - current live sports event when available;
   - otherwise a featured live channel/current programme;
   - one primary action: `▶ ΠΑΡΑΚΟΛΟΥΘΗΣΗ`.

2. **ΖΩΝΤΑΝΑ ΤΩΡΑ side panel**
   - compact current live events/programmes;
   - no giant EPG table on Home.

3. **LIVE ΚΑΝΑΛΙΑ rail**
   - first useful IPTV content on screen;
   - channel logo, current programme, live progress when EPG is known.

4. **ΤΑΙΝΙΕΣ — για απόψε**
   - cinematic poster rail loaded after live content.

5. **KIDS**
   - separate brighter visual treatment, still consistent with AGNES TV.

## 5. Visual system

### Overall tone

Premium dark navy/charcoal, not flat pure black. Cinematic imagery supplies most of the visual energy. Purple/blue is the AGNES accent; red is reserved for LIVE/watch urgency; green is reserved for verified connection state.

### Layout

- Left navigation rail, visually quiet when inactive.
- Main canvas uses one dominant hero and horizontal content rails.
- Minimal chrome; no excessive bordered rectangles.
- Typography is large enough for a 75-inch TV viewing distance.
- Layout scales cleanly from 1080p to 4K without becoming sparse.

### Focus contract

Every remote-focusable element uses the same contract:

- visible 3–4 dp high-contrast outline;
- 1.05–1.08 scale only;
- elevation/depth shadow;
- small positional lift where appropriate;
- persistent selected-section marker in the navigation rail;
- no focus state based only on a color change.

Focus animation must be short and transform-only. It must not trigger image reloads, network work, or expensive blur recomputation.

## 6. Runtime architecture

### Package structure

Proposed logical structure:

```text
mom.agnes.tv
  app/
    AgnesTvApp.kt
    TvNavGraph.kt
  data/
    xtream/XtreamClient.kt
    cache/ContentDatabase.kt
    repository/LiveRepository.kt
    repository/SportsRepository.kt
    repository/VodRepository.kt
  domain/
    model/
    usecase/
  ui/
    home/
    live/
    sports/
    movies/
    kids/
    player/
    components/
    theme/
  media/
    PlayerController.kt
    SubtitleInspector.kt
```

The exact number of files may change during implementation, but the boundaries must remain: network parsing, cache, domain state, TV UI, and playback are separate responsibilities.

### State model

Each top-level screen owns a small immutable UI state exposed by a ViewModel/state holder. Network requests run outside composables. Composables render state and emit user intents only.

The root shell owns only:

- selected section;
- connection status;
- global player navigation;
- lightweight cached Home summary.

It does not own full Movies/Kids/EPG lists.

## 7. Cache-first data flow

### Startup sequence

1. App process starts.
2. Render theme/navigation immediately.
3. Read cached Home snapshot from local storage.
4. Show cached live channels/current programmes immediately if present.
5. Start background refresh of live/EPG data.
6. Refresh sports matching.
7. Refresh Movies/Kids only after the live surface is usable.

A slow provider must never leave the entire screen blocked by a single spinner.

### Persistent cache

Use a small structured local database for channel metadata, category metadata, EPG snapshots, VOD summaries and subtitle verification status.

Recommended storage: Room for structured content cache. Credentials remain separate from content cache and must never be committed to the public repository.

Cache entries have timestamps and may be shown stale with a subtle status indicator while refresh occurs.

## 8. Xtream/network rules

1. Never fetch the complete VOD catalogue into a `String` or `JSONArray`.
2. Prefer `get_vod_streams&category_id=...` for selected categories.
3. Keep streaming parsing for large responses.
4. Apply strict per-screen/per-category caps.
5. Dedupe by stream ID before exposing UI state.
6. Perform all network and parsing work on IO dispatchers.
7. Timeouts/errors return cached state plus refresh status; they do not blank the UI.
8. Live channels and EPG requests are prioritized ahead of Movies/Kids on startup.

## 9. Image pipeline

Replace manual per-poster `HttpURLConnection + BitmapFactory.decodeStream` rendering with a production image loader appropriate for Compose/TV.

Required behavior:

- memory LRU cache;
- disk cache;
- requested-size decode for poster cards;
- separate bounded size for hero backdrops;
- cancellation when an item leaves composition;
- placeholder from local resources or cached dominant image;
- prefetch only the next small visible window, never hundreds of posters.

No network fetch is initiated merely because remote focus moved over an already rendered card.

## 10. Live IPTV experience

### ΖΩΝΤΑΝΑ screen

The Live screen opens with content immediately from cache and refreshes in place.

Layout:

- category rail/filter at top or left;
- large channel list/grid optimized for remote navigation;
- each item shows logo, channel name and current EPG programme when known;
- Enter launches player immediately;
- Back returns to the exact previous channel/focus position.

The screen must not wait for Movies, Kids, or sports matching.

### Player

Media3 ExoPlayer remains the playback engine.

Player contract:

- fullscreen;
- loading indicator only over player surface;
- Back returns to previous screen and focus position;
- overlay controls are TV-focusable;
- current title/channel visible briefly on launch;
- playback errors provide Retry and Back, not a dead screen.

## 11. Sports experience

Sports remains function-first rather than poster-first.

- `ΑΓΩΝΕΣ` shows today/upcoming relevant EPG matches in a dense readable list.
- Exact EPG event matches expose candidate channels.
- `▶ ΔΕΣ` launches the best matching channel.
- `ΚΑΝΑΛΙΑ` opens only exact/qualified candidate channels.
- No fabricated “real” fixture data; provider EPG is treated as provider evidence.

Home may feature a current sports event, but the detailed Sports screen remains a clean list rather than a cinematic poster wall.

## 12. Movies and Kids

Movies/Kids use cinematic horizontal rails but do not block startup.

### Movies

- featured hero after VOD data becomes available;
- `ΓΙΑ ΑΠΟΨΕ`;
- `ΚΑΛΥΤΕΡΗ ΒΑΘΜΟΛΟΓΙΑ`;
- `ΝΕΕΣ ΠΡΟΣΘΗΚΕΣ` when ordering evidence is available, otherwise omit rather than fabricate recency.

### Kids

- separate Kids hero;
- `ΓΙΑ ΠΑΙΔΙΑ`;
- `ΔΗΜΟΦΙΛΗ` only when there is a defensible ordering signal;
- family-friendly visual tone without changing the global navigation model.

## 13. Greek subtitles

Subtitle status has three states:

- **🇬🇷 Ελληνικοί υπότιτλοι** — Media3 has actually detected a Greek text track for that VOD and the result is cached.
- **🇬🇷 Πιθανόν Ελληνικά** — category/title naming suggests Greek subtitles but no track has been verified yet.
- **No badge** — unknown or no evidence.

A `Μόνο Ελληνικά` filter includes verified Greek subtitle items by default. A separate option may include “likely” items, but the UI must never present guessed metadata as verified.

Subtitle inspection occurs lazily for focused/played content and its result is persisted. It is not a bulk scan of the catalogue.

## 14. Performance budgets

These are product targets, not excuses to block the UI on network variance:

- shell/navigation visible without network dependency;
- cached Home content target: under 1 second after activity launch on target-class TV;
- D-pad focus visual response: no blocking work on UI thread and perceptually immediate;
- steady-state app memory target during ordinary browsing: comfortably below a 256 MB device growth limit, with a practical target below ~160 MB where device/runtime permits;
- stress test with thousands of synthetic VOD items must not require building a full in-memory JSON catalogue;
- scrolling/focus must not start a new full-size bitmap decode for every movement.

Network-delivered fresh content timing is measured separately because provider latency is external.

## 15. Error and offline behavior

- Provider slow: keep cached content on screen and show `ΕΝΗΜΕΡΩΣΗ…` unobtrusively.
- Provider auth lost: persistent connection-status warning and route to settings; do not fake `CONNECTED`.
- EPG unavailable: channels still usable; programme metadata becomes `Δεν υπάρχει EPG` rather than blocking playback.
- Poster failure: stable local placeholder; no layout jump.
- Playback failure: Retry / Back.

## 16. Testing strategy

### Unit tests

- streaming Xtream parsers;
- category-scoped request construction;
- repository cache-first behavior;
- sports/EPG channel matching;
- Greek subtitle status mapping.

### Android TV instrumentation

Run on Android TV 1080p profile and verify:

- startup shell and cached Home;
- D-pad navigation/focus contract;
- Live → Player → Back with focus restoration;
- Sports → Channels → Player → Back;
- Movies hero/rails → Player → Back;
- Kids hero/rails;
- stale-cache behavior during simulated network delay/error;
- password/auth regression flow.

### Performance/stress validation

- synthetic very-large VOD API response through a streaming source;
- repeated navigation across rails without unbounded heap growth;
- image loading cancellation/cache behavior;
- `dumpsys meminfo` snapshot during stress run;
- app startup measurement with network intentionally delayed to prove the shell does not depend on provider response.

No APK is called “ready” until the current full TV test suite is green.

## 17. Migration from v1.8.0

Keep:

- Xtream authentication rules;
- HTTP endpoint discovery behavior that is required by the provider;
- category-scoped VOD strategy;
- streaming JSON parsing;
- Media3 playback;
- verified-vs-likely Greek subtitle concept;
- 1080p Android TV CI validation.

Replace/refactor:

- monolithic `MainActivity.kt` UI architecture;
- mobile Material 3-first interaction controls;
- manual poster HTTP/bitmap pipeline;
- root-level loading behavior;
- flat prototype visual system;
- any hard-coded version/status strings.

## 18. Privacy and packaging

The public repository contains no private Xtream credentials.

The final personalized build may include private auto-login data only during a local/private packaging step. That private file is never committed to GitHub. The user receives one unified APK, not separate public/private app variants to manage manually.

## 19. Release gate

A redesign release is eligible for a TV APK only when all of the following are true:

1. visual direction matches the approved premium sports-first mockup;
2. Live IPTV appears independently of Movies/Kids refresh;
3. no known full-catalogue memory path remains;
4. TV D-pad focus is obvious everywhere;
5. 1080p TV instrumentation is fully green;
6. stress/memory checks pass without OOM;
7. build succeeds from the exact tested commit;
8. private auto-login packaging is performed only after validation.

The final real-provider TV test remains necessary for provider-specific stream playback and latency, because mock/emulator tests cannot prove external-provider behavior.
