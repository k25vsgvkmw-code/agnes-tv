# AGNES Kids Education WordPress Plugin — Design Spec

## Goal

Build an installable WordPress module inside the single AGNES plugin identity that reproduces the user-approved AGNES Kids Education screen with extremely high visual fidelity and makes the schoolbook genuinely interactive for Vasilis and Elenios.

## Approved Visual Reference

The screenshot supplied by the user on 2026-09-01 is the canonical visual reference. The implementation must follow its composition, proportions, hierarchy, 3D depth, controls, mascots, navigation, and overall look rather than merely borrowing its theme.

One content correction is mandatory: **Vasilis is Γ΄ Δημοτικού**, not Β΄ Δημοτικού. **Elenios remains Α΄ Δημοτικού.** This grade correction must not alter the visual composition.

## Visual Fidelity Rules

- Full-screen AGNES Kids scene with deep navy/purple background and warm desk surface.
- Large central 3D open book with realistic page thickness, center gutter, edge shadows, subtle page curvature, and warm paper texture.
- Left page and right page behave as real workbook pages rather than flat cards.
- Top bar contains AGNES Kids branding, child selectors, stars, streak, and level.
- Left navigation remains a vertical rounded glass/3D rail with: Αρχική, Σήμερα, Μαθήματα, Εργασίες, Εξάσκηση, Πρόοδος, Βιβλιοθήκη, Παιχνίδια, Δημιουργώ, Ρυθμίσεις.
- Right floating tool rail remains visible with: Επιλέγω, Γράφω, Μολύβι, Υπογράμμιση, Κυκλώνω, Σβήνω, Undo, Redo, Καθαρισμός.
- Bottom bar remains visible with voice input, Βοήθεια, Δείξε μου πώς, Ξανά, Επόμενη, and page navigation.
- Puppy mascot sits at lower left and is the Break Coach.
- Small robot remains upper right as AGNES helper/assistant presence.
- Backpack/books/star decorative scene remains lower right.
- Controls use tactile 3D buttons, rounded corners, soft shadows, restrained purple/blue accents, and readable Greek labels.
- The interface must feel premium and child-friendly, not preschool-like or cartoonishly flat.

## Learners

### Vasilis
- `learner_id`: `vasilis`
- Display name: `Βασίλης`
- Grade: `Γ΄ Δημοτικού`

### Elenios
- `learner_id`: `elenios`
- Display name: `Ελένιος`
- Grade: `Α΄ Δημοτικού`

Changing active child updates grade, curriculum, saved work, stars, streak, current page, and resume state without changing the UI layout.

## WordPress Packaging

The installable module lives under:

`wordpress/agnes/`

and is packaged as:

`agnes.zip`

It uses the single plugin identity **AGNES**. Education is a module/page inside AGNES, not a second separately branded plugin.

The plugin must install through WordPress Admin → Plugins → Add New → Upload Plugin and activate without requiring a Node server.

## Architecture

### PHP / WordPress layer

Responsibilities:
- plugin bootstrap and activation hooks;
- creation/upgrades of custom database tables;
- WordPress REST routes under `/wp-json/agnes/v1/education/...`;
- permission and nonce validation;
- curriculum metadata and learner state persistence;
- enqueueing versioned JS/CSS assets;
- providing the AGNES Kids Education shell page.

### Browser application

Responsibilities:
- render the approved full-screen 3D book interface;
- child switching;
- curriculum/page loading;
- pointer/touch/stylus interaction;
- handwriting/drawing/highlighting/circling;
- selectable answers, matching, drag/drop, ordering, numeric/text answers;
- undo/redo and clear;
- autosave/resume;
- checking answers and displaying feedback;
- rewards/streak display;
- Break Coach UI;
- page-turn interaction and animation.

The first implementation should avoid a heavy framework unless required. Use modular ES modules, SVG/Canvas/DOM layers, CSS 3D transforms, and WordPress-native REST calls. Rendering dependencies may be added only when they clearly improve pen/stylus or page interaction quality.

## Book Rendering Model

The open book has three layers per visible page:

1. **Base content layer** — immutable school/AGNES-authored content.
2. **Interactive activity layer** — answer zones, drag/drop targets, selectable items, matching points, etc.
3. **Learner annotation layer** — pen strokes, highlights, circles, typed content and other user-created marks.

Learner marks must never modify the base content.

The two-page spread is responsive but preserves the visual hierarchy of the approved screenshot. On narrow screens, it may scale as a single scene with pan/zoom rather than redesign into generic mobile cards.

## Interaction Tools

### Select
- choose answer options;
- manipulate movable objects;
- activate drag/drop;
- focus text/numeric input areas.

### Write / Pencil
- pointer, touch and stylus drawing;
- normalized page coordinates;
- stroke smoothing;
- stylus pressure when supported;
- autosave after interaction settles.

### Highlight
- translucent marker strokes.

### Circle
- ellipse/circle annotations around an answer or content region.

### Erase
- erase learner marks only;
- must not erase base curriculum content.

### Undo / Redo
- per-page history stack for all learner-created interactions.

### Clear
- explicit confirmation;
- resets only the learner layer for the current page.

## Exercises

Supported activity types:
- single choice;
- multiple choice;
- text answer;
- numeric answer;
- drag/drop;
- matching with lines;
- ordering;
- drawing/handwriting;
- guided/manual activity.

Feedback style is short and child-facing, such as `Σωστά! Μπράβο!`, `Δοκίμασε ξανά`, and `Θες μια μικρή βοήθεια;`.

## Voice and Read-Aloud

The bottom-left `Πες κάτι...` control is part of the permanent UI. Initial plugin scope exposes a voice-control hook and browser speech/read-aloud support where available. A later AGNES voice service can replace or enhance this hook without redesigning the screen.

Book text and exercise prompts may expose a speaker button matching the screenshot.

## Puppy Break Coach

The puppy is not decorative only. It evaluates study duration and completed activity count.

Default policy:
- suggest a break after 20 uninterrupted minutes or 3 completed activities;
- never interrupt while an exercise is actively in progress;
- when a break is due during an exercise, wait until the child reaches a safe boundary;
- suggested break duration: 5 minutes.

Suggestions include water, stretching, resting the eyes, movement, or a short breathing game.

## Persistence

Use WordPress database tables with a separate row per learner/page for interaction state. Store JSON state plus integer version for optimistic concurrency.

Required persisted state:
- current book/resource/page/activity;
- annotation strokes;
- answers and selections;
- drag/drop/matching/ordering state;
- completed activities;
- stars/progress;
- resume location;
- version and updated timestamp.

A stale autosave must return a conflict rather than silently overwrite newer work.

## Curriculum Content

The plugin must support real school curriculum for Cyprus, organized by:

`Child → Grade → Subject → Resource → Unit → Page → Activity`

Initial learner grades are only Γ΄ and Α΄. The data model may support additional grades but the UI must not expose irrelevant grades to these two children.

Official/source assets remain immutable and include attribution/source metadata. Where rights do not permit copying protected pages directly, AGNES-authored interactive pages aligned to the official curriculum are used while retaining source references.

## Initial Subjects

- Ελληνικά
- Μαθηματικά
- Γνωρίζω τον Κόσμο / Γεωγραφία where applicable
- Φυσικές Επιστήμες
- Θρησκευτικά where applicable
- school assignments / teacher-uploaded material in a later content-ingestion slice

The approved screenshot may show different subjects on each side of the open spread as a visual/dashboard concept; real study mode may use two consecutive pages of the selected resource while preserving the same visual composition.

## REST API

Prefix:

`/wp-json/agnes/v1/education`

Required endpoints:
- `GET /learners/{learner}`
- `GET /learners/{learner}/catalog`
- `GET /learners/{learner}/resources/{resource}/pages/{page}`
- `GET /learners/{learner}/pages/{page}/state`
- `PUT /learners/{learner}/pages/{page}/state`
- `GET /learners/{learner}/resume`
- `POST /learners/{learner}/activities/{activity}/check`
- `POST /learners/{learner}/break/evaluate`

Error behavior:
- 400 invalid payload;
- 403 grade mismatch/permission;
- 404 unknown resource;
- 409 stale state version.

## Security

- All writes require WordPress nonce validation and an authenticated authorized AGNES user.
- REST input is sanitized and validated.
- No executable HTML from curriculum data.
- Child state is isolated by learner ID.
- Public source URLs are treated as metadata, not trusted HTML.

## Performance

- Load only the current spread and small adjacent-page buffer.
- Avoid re-rendering the whole scene on pen movement.
- Persist stroke data after short debounce rather than every pointer event.
- Assets are cache-versioned by plugin version.
- Keep the visual shell fast enough for tablets and desktop touch displays.

## Accessibility

- Touch targets remain large.
- Keyboard focus exists for non-drawing controls.
- Buttons expose accessible labels even when icon-first.
- Audio feedback is optional, never the only way to understand correctness.
- Text remains selectable/readable where this does not conflict with an exercise.

## Acceptance Criteria

1. Uploading `agnes.zip` to WordPress installs and activates successfully without Node.
2. AGNES Kids Education opens as a full-screen scene matching the approved screenshot composition.
3. Vasilis displays Γ΄ Δημοτικού and only Γ΄ curriculum; Elenios displays Α΄ and only Α΄ curriculum.
4. The 3D open book is visibly dimensional with gutter, page depth, curvature/shadows, and page-turn behavior.
5. Pen, pencil, highlight, circle, erase, selection, undo, redo, and clear are operational.
6. At least single-choice, numeric, drag/drop or matching interactions work end-to-end.
7. Learner page state autosaves and restores after refresh; resume returns to the last activity.
8. Correct answers can award progress/stars; repeat attempts do not create duplicate rewards.
9. Puppy Break Coach defers breaks during an active exercise and prompts at the next safe boundary.
10. Base curriculum content remains unchanged when learner marks are cleared.
11. The plugin uses AGNES branding and does not create a separate public plugin identity.
12. The visual implementation treats the supplied screenshot as a fidelity target, with the only mandatory content correction being Vasilis → Γ΄ Δημοτικού.
