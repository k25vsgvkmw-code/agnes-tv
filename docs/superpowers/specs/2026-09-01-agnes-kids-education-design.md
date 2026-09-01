# AGNES Kids Education — 3D Interactive Schoolbook Design

## Goal
Build the AGNES Kids Education subsystem as a highly interactive 3D open-book learning experience for the Cyprus primary-school curriculum, with Vasilis in Γ΄ Δημοτικού and Elenios in Α΄ Δημοτικού.

## Non-negotiable visual direction
The approved 3D open-book reference is the product baseline. Preserve the same overall visual language and composition: open book with visible depth, left-side subject navigation, right-side tools, page controls, mascot presence, playful pastel classroom styling, large touch targets, rewards/progress affordances, and child-friendly controls.

The UI must not degrade into a PDF viewer. Official curriculum pages/material are rendered inside this experience and enhanced by interaction layers.

## Learner profiles
- Vasilis: Γ΄ Δημοτικού.
- Elenios: Α΄ Δημοτικού.
- Each learner has independent progress, annotations, scores, rewards, completed activities, break history, and resume position.

## Curriculum scope
The subsystem must support the full school-material catalog required for each learner's grade, organized as:

`Grade → Subject → Book/Resource → Unit → Lesson → Page → Activity`

Authoritative Cyprus sources include:
- Mathematics Primary Education: https://mathd.schools.ac.cy/el/
- Natural Sciences Primary Education: https://fysed.schools.ac.cy/el/
- Cyprus Digital Activities for Primary Education: https://dde-erevnes.schools.ac.cy/
- Educational video resources: https://elearning.schools.ac.cy/

The catalog layer must store source attribution, source URL, resource version/date where available, and usage type. Original source assets are immutable; child work is stored separately.

## Core interaction model
Every learning page is composed from two layers:

1. **Base content layer** — official/source lesson page or AGNES-authored interactive content.
2. **Learner interaction layer** — user-created marks and answer state.

The learner interaction layer supports:
- handwriting with finger or stylus;
- typed text;
- eraser;
- undo/redo;
- highlighting;
- circling/freehand drawing;
- single-choice and multiple-choice selection;
- drag-and-drop;
- matching/connecting items;
- ordering/sequencing;
- numeric and short-text answers;
- image/object selection;
- reset current activity;
- clear learner layer without modifying base content.

All changes autosave.

## Activity behavior
Each activity declares its interaction type and validation mode.

Validation modes:
- `manual`: no automatic grading;
- `exact`: deterministic answer checking;
- `rule-based`: normalized/range/set-based checking;
- `guided`: learner receives hints but no forced reveal.

Feedback should be short and encouraging:
- correct;
- try again;
- hint;
- show how, only when explicitly requested.

The system must avoid excessive animation or interruption during focused work.

## 3D book behavior
The central experience is a two-page 3D spread.

Required behaviors:
- page-turn transition;
- visible paper depth and page edges;
- touch/click page navigation;
- zoom for detailed writing;
- responsive scaling for tablet and desktop;
- preserve writing coordinates across resize/zoom;
- active interactive regions remain aligned with page content;
- animation can be reduced for accessibility/performance.

## Navigation
Left navigation presents grade-appropriate subjects and resources.

Top/secondary navigation includes:
- learner identity;
- current subject/unit/page;
- progress;
- saved state indicator.

Right-side tools provide annotation and interaction tools without covering the exercise.

## Today / School Bag
Each learner has a simplified landing area showing:
- today's lessons;
- assigned/recent schoolwork;
- resume last activity;
- short review recommendation;
- pending tasks.

The child should be able to reach today's work with one primary action.

## Puppy break coach
The dog mascot is the study break coach.

Rules:
- never interrupts in the middle of an active answer or unfinished interaction;
- waits for an activity boundary when possible;
- considers uninterrupted study duration and recent activity count;
- suggests a short break with one simple option such as water, stretching, eye rest, movement, or breathing;
- displays a lightweight break timer;
- returns the learner directly to the same page/activity;
- supports per-child configurable thresholds later without changing the interaction contract.

Break prompts are guidance, not punishment or score deductions.

## Rewards
Rewards support engagement without replacing learning.

Supported reward signals:
- stars for completed activities;
- streak/progress indicators;
- small completion celebrations;
- subject/unit milestones.

No reward should encourage random tapping or repeated answer guessing.

## Progress and persistence
Persist per learner:
- current grade;
- current resource/unit/page/activity;
- annotation strokes;
- typed answers;
- selection state;
- drag/drop state;
- validation attempts/results;
- completion state;
- rewards;
- break state/history;
- timestamps for resume and sync.

A source page and its learner layer must have independent versioning so source updates do not silently destroy child work.

## Domain boundaries
Create an isolated `education` domain with focused units:

- `curriculum` — source catalog and hierarchy;
- `learner-profile` — grade and per-child education preferences;
- `lesson-session` — active page/activity state;
- `interaction` — answer and annotation models;
- `progress` — completion and rewards;
- `break-coach` — break policy and prompts;
- `education-repository` — persistence contract.

The domain must not depend on a specific 3D rendering library. The future UI consumes stable education-domain interfaces.

## Proposed core types

```ts
type Grade = 'A' | 'B' | 'C' | 'D' | 'E' | 'ST';

type ActivityKind =
  | 'handwriting'
  | 'typed-text'
  | 'single-choice'
  | 'multiple-choice'
  | 'drag-drop'
  | 'matching'
  | 'ordering'
  | 'numeric'
  | 'drawing'
  | 'read-aloud';

type ValidationMode = 'manual' | 'exact' | 'rule-based' | 'guided';
```

Learner mapping for the current family configuration:

```ts
const learnerGrades = {
  vasilis: 'C',
  elenios: 'A',
} as const;
```

## Initial backend API surface
The first backend slice should expose enough for a future 3D client:

- `GET /education/learners/:learnerId`
- `GET /education/learners/:learnerId/catalog`
- `GET /education/learners/:learnerId/resume`
- `GET /education/resources/:resourceId/pages/:pageId`
- `PUT /education/learners/:learnerId/pages/:pageId/state`
- `POST /education/learners/:learnerId/activities/:activityId/check`
- `POST /education/learners/:learnerId/breaks/evaluate`

Responses must be structured data; presentation/3D concerns remain client-side.

## Error handling
- Unknown learner/resource/page/activity: typed not-found result mapped to HTTP 404.
- Grade mismatch: reject access to grade-scoped material unless explicitly allowed by parent mode.
- Invalid interaction payload: schema validation error mapped to HTTP 400.
- Source asset unavailable: keep metadata and return a recoverable resource-unavailable state.
- Persistence conflict: use version checking and return conflict rather than overwriting newer learner work.

## Accessibility and child usability
- large touch targets;
- stylus and finger support;
- keyboard support for desktop;
- optional read-aloud hooks;
- reduced-motion mode;
- no important instruction conveyed only through color;
- simple Greek labels in the child-facing UI;
- minimal text density outside the lesson itself.

## Content and rights rule
Do not copy or modify official source material into bespoke derivatives unless reuse rights allow it. Store attribution and source metadata, keep originals immutable, and place AGNES interaction data in a separate overlay model. Where direct embedding/reuse is not appropriate, use AGNES-authored activities aligned to the official curriculum instead of reproducing protected pages.

## Testing requirements
The domain must be testable without a browser or 3D engine.

Minimum test coverage:
- learner grade mapping;
- catalog filtering by grade;
- interaction-state serialization;
- autosave/version conflict behavior;
- activity checking;
- reset/clear-layer behavior;
- resume state;
- reward issuance only on valid completion;
- break coach does not interrupt an in-progress activity;
- break coach triggers after configured study thresholds;
- API schema validation and error mapping.

## Acceptance criteria
1. Vasilis receives Γ΄ Δημοτικού content; Elenios receives Α΄ Δημοτικού content.
2. The education domain models official curriculum resources independently of learner annotations.
3. A page can persist handwriting, typed answers, selections, and drag/drop state.
4. A completed activity can be checked, reset, resumed, and rewarded.
5. The puppy break coach can evaluate a session and defer prompts until an activity boundary.
6. Backend APIs expose catalog, page, resume, interaction-state, validation, and break-evaluation data.
7. No domain object depends on a rendering library.
8. The future visual implementation must preserve the approved 3D open-book reference rather than replace it with a conventional document/PDF interface.

## Delivery sequence
1. Education domain model and learner grade mapping.
2. Curriculum catalog and source metadata model.
3. Interaction state and persistence contracts.
4. Progress/reward rules.
5. Puppy break-coach policy.
6. Backend education API.
7. Seed catalog for Vasilis Γ΄ and Elenios Α΄ using official source metadata.
8. 3D client implementation against the stable API.
9. Expand catalog until all required school material is represented.
