# AGNES Kids Education WordPress Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an installable `agnes.zip` WordPress plugin that reproduces the approved AGNES Kids Education 3D open-book screen and provides interactive learner state for Vasilis (Γ΄ Δημοτικού) and Elenios (Α΄ Δημοτικού).

**Architecture:** Add a standalone WordPress-native module under `wordpress/agnes/` with PHP bootstrap, custom REST routes, WordPress database persistence, and a vanilla JS/CSS browser application. The browser renders the approved 3D scene with CSS 3D/DOM/SVG/Canvas layers and keeps base curriculum content immutable while learner marks are stored separately. No Node server is required at runtime.

**Tech Stack:** WordPress PHP 8.1+, WordPress REST API, MySQL/MariaDB via `$wpdb`, vanilla ES modules, CSS 3D transforms, SVG/Canvas, PHPUnit-free PHP smoke tests, Node-based DOM-independent JS tests where useful.

**Spec:** `docs/superpowers/specs/2026-09-01-agnes-kids-wordpress-plugin-design.md`

## Global Constraints

- The installable plugin identity is **AGNES**; Education is a module, not a second plugin brand.
- Vasilis displays `Γ΄ Δημοτικού`; Elenios displays `Α΄ Δημοτικού`.
- The approved screenshot is the canonical visual fidelity target.
- The plugin activates and runs without a Node server.
- Learner annotations and answers never mutate base curriculum content.
- Autosave uses optimistic integer versions and returns HTTP 409 on stale writes.
- Break Coach never interrupts an active exercise.
- Initial package includes working interactive sample curriculum pages and a rights-safe curriculum catalog structure; it must not copy protected official pages without permission.

---

### Task 1: WordPress plugin bootstrap and activation schema

**Files:**
- Create: `wordpress/agnes/agnes.php`
- Create: `wordpress/agnes/includes/class-agnes-activator.php`
- Create: `wordpress/agnes/includes/class-agnes-plugin.php`
- Create: `wordpress/agnes/tests/php/smoke.php`

**Interfaces:**
- Produces: `AGNES_VERSION`, `AGNES_PATH`, `AGNES_URL`, `Agnes_Activator::activate()`, `Agnes_Plugin::boot()`.

- [ ] **Step 1: Write the failing smoke test**

```php
<?php
$root = dirname(__DIR__, 2);
$required = [
    "$root/agnes.php",
    "$root/includes/class-agnes-activator.php",
    "$root/includes/class-agnes-plugin.php",
];
foreach ($required as $file) {
    if (!is_file($file)) {
        fwrite(STDERR, "Missing: $file\n");
        exit(1);
    }
}
echo "bootstrap-ok\n";
```

- [ ] **Step 2: Run the test and verify RED**

Run: `php wordpress/agnes/tests/php/smoke.php`
Expected: FAIL because the plugin files do not exist.

- [ ] **Step 3: Implement minimal bootstrap and activation**

`agnes.php` must include a standard WordPress plugin header, define version/path/url constants, register `Agnes_Activator::activate` on activation, and boot `Agnes_Plugin` on `plugins_loaded`.

`Agnes_Activator::activate()` must create three tables using `dbDelta`:
- `{prefix}agnes_education_state(learner_id,page_id,state_json,version,updated_at)` unique `(learner_id,page_id)`;
- `{prefix}agnes_education_resume(learner_id,state_json,updated_at)` primary key learner;
- `{prefix}agnes_education_progress(learner_id,state_json,updated_at)` primary key learner.

- [ ] **Step 4: Run PHP syntax + smoke tests**

Run: `find wordpress/agnes -name '*.php' -print0 | xargs -0 -n1 php -l && php wordpress/agnes/tests/php/smoke.php`
Expected: all syntax checks PASS and `bootstrap-ok`.

---

### Task 2: Learners, rights-safe curriculum catalog, and REST read endpoints

**Files:**
- Create: `wordpress/agnes/includes/class-agnes-education-catalog.php`
- Create: `wordpress/agnes/includes/class-agnes-education-rest.php`
- Create: `wordpress/agnes/tests/php/catalog.php`

**Interfaces:**
- Produces: `Agnes_Education_Catalog::learner($id)`, `catalog($id)`, `page($learner,$resource,$page)`, REST prefix `agnes/v1/education`.

- [ ] **Step 1: Write a failing catalog test**

The test requires `vasilis.grade === 'C'`, display grade `Γ΄ Δημοτικού`, `elenios.grade === 'A'`, and ensures every returned resource matches the learner grade.

- [ ] **Step 2: Run test and verify RED**

Run: `php wordpress/agnes/tests/php/catalog.php`
Expected: FAIL before catalog implementation exists.

- [ ] **Step 3: Implement catalog**

Seed at least four rights-safe AGNES-authored resources with official-source metadata:
- Γ΄ Ελληνικά sample page;
- Γ΄ Μαθηματικά sample page;
- Α΄ Ελληνικά sample page;
- Α΄ Μαθηματικά sample page.

Each page exposes `pageId`, `pageNumber`, `title`, `subject`, `content`, `activities`, and source metadata. Activities include single-choice, numeric, and matching.

- [ ] **Step 4: Register read REST endpoints**

Required:
- `GET /learners/{learner}`
- `GET /learners/{learner}/catalog`
- `GET /learners/{learner}/resources/{resource}/pages/{page}`

Unknown learner/resource returns `WP_Error` with 404; grade mismatch returns 403.

- [ ] **Step 5: Run catalog test + PHP syntax checks**

Expected: PASS.

---

### Task 3: Persistence, autosave/resume, activity checking, rewards, Break Coach

**Files:**
- Create: `wordpress/agnes/includes/class-agnes-education-store.php`
- Extend: `wordpress/agnes/includes/class-agnes-education-rest.php`
- Create: `wordpress/agnes/tests/php/policies.php`

**Interfaces:**
- Produces: `get_state`, `save_state`, `get_resume`, `save_resume`, `get_progress`, `save_progress`, `check_activity`, `evaluate_break`.

- [ ] **Step 1: Write failing pure policy tests**

Tests must verify:
- exact numeric `34 + 27` answer `61` returns `correct`;
- wrong answer returns `incorrect`;
- first correct completion awards one star, repeat completion awards none;
- break is `defer` at 25 minutes while `activityInProgress=true`;
- break is `suggest` at the same threshold when false.

- [ ] **Step 2: Run policy test and verify RED**

Run: `php wordpress/agnes/tests/php/policies.php`
Expected: FAIL before methods exist.

- [ ] **Step 3: Implement store and policies**

`save_state` uses optimistic concurrency: insert with version 1 for a new state; update only where current version equals expected version; stale writes return a conflict object used as HTTP 409. A successful save also updates resume.

Progress state stores `stars`, `streak`, `level`, and `completedActivityIds`. Break default: 20 minutes or 3 completed activities, 5-minute suggested break; defer during active activity.

- [ ] **Step 4: Register state/check/break REST endpoints**

Required:
- `GET /learners/{learner}/pages/{page}/state`
- `PUT /learners/{learner}/pages/{page}/state`
- `GET /learners/{learner}/resume`
- `POST /learners/{learner}/activities/{activity}/check`
- `POST /learners/{learner}/break/evaluate`

All writes require logged-in user + `X-WP-Nonce` REST nonce permission callback.

- [ ] **Step 5: Run policy + syntax tests**

Expected: PASS.

---

### Task 4: Full-screen approved 3D Education shell

**Files:**
- Create: `wordpress/agnes/includes/class-agnes-education-page.php`
- Create: `wordpress/agnes/assets/css/education.css`
- Create: `wordpress/agnes/assets/js/education.js`
- Create: `wordpress/agnes/assets/js/education-state.js`
- Create: `wordpress/agnes/tests/js/state.test.mjs`

**Interfaces:**
- Produces shortcode `[agnes_kids_education]`, top-level AGNES Kids page shell, `EducationState` history/annotation model.

- [ ] **Step 1: Write failing JS state tests**

Test `createPageState`, `pushHistory`, `undo`, `redo`, and `clearLearnerLayer`; clearing must retain page identity/version but remove strokes/highlights/circles/typed answers/selections/matching.

- [ ] **Step 2: Run test and verify RED**

Run: `node --test wordpress/agnes/tests/js/state.test.mjs`
Expected: FAIL because module does not exist.

- [ ] **Step 3: Implement state module and make GREEN**

Use normalized 0..1 coordinates for strokes and store tool, width, opacity and points.

- [ ] **Step 4: Implement the screenshot-faithful shell**

Create semantic DOM for:
- purple AGNES Kids top-left brand block;
- two learner selectors with Vasilis showing Γ΄ and Elenios showing Α΄;
- stars/streak/level cards;
- left navigation rail;
- dimensional central open book with left/right pages, page stack, center gutter and realistic shadows;
- right tool rail;
- puppy lower-left Break Coach;
- robot upper-right;
- backpack/books/star lower-right;
- bottom voice/help/retry/next/page controls.

CSS must use responsive scaling while preserving the two-page composition rather than collapsing into generic cards.

- [ ] **Step 5: Render sample spread from catalog data**

Left page: Greek reading/choice activity. Right page: mathematics blocks/addition plus matching activity. All text is live DOM, not baked into an image.

- [ ] **Step 6: Run JS and PHP checks**

Expected: PASS.

---

### Task 5: Interactive tools, autosave, answer feedback, page-turn, and puppy timer

**Files:**
- Extend: `wordpress/agnes/assets/js/education.js`
- Create: `wordpress/agnes/assets/js/drawing-layer.js`
- Create: `wordpress/agnes/assets/js/api.js`
- Create: `wordpress/agnes/tests/js/drawing.test.mjs`

**Interfaces:**
- Produces operational select/write/pencil/highlight/circle/erase/undo/redo/clear tools and API client.

- [ ] **Step 1: Write failing drawing tests**

Test coordinate normalization and hit-distance erasing against pure helper functions.

- [ ] **Step 2: Run and verify RED**

Run: `node --test wordpress/agnes/tests/js/drawing.test.mjs`
Expected: FAIL before helper exists.

- [ ] **Step 3: Implement drawing helpers and verify GREEN**

- [ ] **Step 4: Wire pointer/touch/stylus interactions**

Use SVG overlay per page for strokes/highlights/circles; pointer capture; pressure when available; eraser removes learner SVG elements only.

- [ ] **Step 5: Wire activity interactions**

Single-choice buttons, numeric input, and matching endpoints/lines become interactive. Correct response displays green `Σωστά! Μπράβο!`; wrong response shows `Δοκίμασε ξανά`.

- [ ] **Step 6: Wire autosave/resume and conflict handling**

Debounce saves after 650ms idle; on 409 reload state and show a non-destructive sync notice. On page open, load saved state and resume.

- [ ] **Step 7: Wire Break Coach**

Track uninterrupted study minutes and completed activities; call break endpoint at safe boundaries; puppy bubble starts a 5-minute break timer and offers water/stretch/eyes/movement/breathing.

- [ ] **Step 8: Add page-turn animation**

Next/previous uses a CSS perspective page-flip animation without changing the overall layout.

- [ ] **Step 9: Run all tests**

Run: `php wordpress/agnes/tests/php/catalog.php && php wordpress/agnes/tests/php/policies.php && node --test wordpress/agnes/tests/js/*.test.mjs`
Expected: PASS.

---

### Task 6: Package and installation verification

**Files:**
- Create: `wordpress/agnes/readme.txt`
- Create output: `/mnt/data/agnes.zip`

**Interfaces:**
- Produces installable WordPress ZIP with a single top-level `agnes/` directory.

- [ ] **Step 1: Run complete quality gate**

Run:
```bash
find wordpress/agnes -name '*.php' -print0 | xargs -0 -n1 php -l
php wordpress/agnes/tests/php/smoke.php
php wordpress/agnes/tests/php/catalog.php
php wordpress/agnes/tests/php/policies.php
node --test wordpress/agnes/tests/js/*.test.mjs
```
Expected: all PASS.

- [ ] **Step 2: Verify plugin header and package structure**

Run: `grep -q 'Plugin Name: AGNES' wordpress/agnes/agnes.php` and ensure no `node_modules`, `.git`, tests, or development-only files are packaged.

- [ ] **Step 3: Build ZIP**

Copy production files to a staging `agnes/` folder and run `zip -qr /mnt/data/agnes.zip agnes`.

- [ ] **Step 4: Inspect ZIP**

Run: `unzip -l /mnt/data/agnes.zip` and confirm `agnes/agnes.php`, `agnes/includes/...`, `agnes/assets/...`, and `agnes/readme.txt` exist.

- [ ] **Step 5: Commit WordPress module to feature branch**

Commit `wordpress/agnes/` and retain existing Node backend work separately; do not merge to `main` without explicit user approval.
