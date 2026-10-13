# AGNES Travel Editorial Homepage — Approved Reference Design

Date: 2026-10-13
Status: Approved visual direction; implementation spec
Branch: `feature/editorial-homepage-reference-match`

## 1. Objective

Replace the current Explore homepage implementation with a real, responsive HTML/CSS/JS editorial travel homepage that matches the approved 1536×864 reference image as faithfully as practical while preserving the existing application routing, destination interactions, search, Saved, month state, journey pages, and AGNES planner.

The homepage must feel like a premium travel magazine spread, not an OTA, dashboard, SaaS interface, or generic card marketplace.

The uploaded reference image is authoritative for visual composition. When this spec and the reference differ in visual nuance, the reference wins unless doing so would break required functionality or accessibility.

## 2. Non-negotiable visual direction

- Background: warm ivory/cream, approximately `#F7F4EF`.
- Primary text: near-black, approximately `#171411`.
- Accent: rust/burnt orange, approximately `#AD4C27`.
- Titles: elegant editorial serif.
- UI/navigation/meta: restrained neutral sans-serif.
- Surfaces: light translucent white glass with subtle borders and blur.
- No dark/navy luxury theme.
- No navy/gold cliché styling.
- No ecommerce-style white card bodies under photography.
- No star ratings, fake reviews, discounts, fake scarcity, or fake live availability.
- Photography is dominant; interface chrome is quiet.

## 3. Desktop page geometry

Target visual baseline: approved 1536×864 reference.

### 3.1 Left month rail

A fixed light rail occupies approximately 7.5% of the viewport width at the 1536px reference size, visually matching the uploaded reference.

Top area:
- rust mountain icon
- two-line serif wordmark: `Agnes` / `Travel`

Middle:
- vertical Greek month list:
  - Ιαν
  - Φεβ
  - Μαρ
  - Απρ
  - Μάι
  - Ιουν
  - Ιουλ
  - Αυγ
  - Σεπ
  - Οκτ
  - Νοε
  - Δεκ
- current month rendered as rust rounded pill with white text and a small white dot.
- for the current approved autumn composition, October is visually active.

Bottom:
- small compass icon
- subtle two/three-line travel tagline matching the reference density and position.

The rail remains visually separate from the main content using only a very faint border/shadow.

### 3.2 Main content area

The content begins immediately to the right of the rail. At desktop reference width, the page is effectively a full-page editorial canvas with narrow gaps and minimal outer margins.

The layout is divided visually into:
1. intro block at upper left
2. large Iceland hero at upper right
3. Tromsø tall card below intro
4. Alps wide card below hero
5. Switzerland narrow card
6. Dolomites narrow card
7. five-card bottom row

The composition is fixed and curated. Automatic destination ranking must never reorder these positions.

## 4. Intro block

Placed in the upper-left content region exactly as in the reference.

Content:
- kicker: `Α Ν Α Κ Α Λ Υ Ψ Ε   Τ Ο Ν   Κ Ο Σ Μ Ο`
- dominant serif title: `Φθινόπωρο`
- thin rust rule
- subtitle: `Ζήσε την ομορφιά της εποχής.`

The title is oversized and editorial, not a conventional website H1. Its line height and spacing should visually track the reference.

## 5. Top navigation

A very light translucent navigation cluster sits across the upper-right area above the hero.

Contains:
- destination search field with placeholder `Αναζήτηση προορισμού...`
- `Προορισμοί`
- `Εμπειρίες`
- Saved heart icon
- menu icon

The search field is a soft glass capsule. The remaining controls are text/icon actions without a heavy navbar container.

Required behavior:
- search submits into the existing search flow/state
- Destinations opens the existing destinations view
- Experiences opens the existing experiences view
- heart opens existing Saved view
- menu may use the app's existing menu behavior or a minimal equivalent; it must not block the editorial design

## 6. Filter chips

Positioned beneath the intro, matching the reference spacing and size.

Exact labels:
- Όλα
- Καταρράκτες
- Άλπεις
- Τρόμσο
- Road Trips

Selected state:
- rust background
- white text/icon

Unselected:
- transparent/white glass
- subtle border
- muted dark text

The filter strip is editorial navigation, not a marketplace facet bar. Filtering may change visibility/emphasis, but it must not reorder the curated composition.

## 7. Curated editorial mosaic

### 7.1 Structural rule

Implement as real semantic HTML cards/buttons/links with CSS Grid, not as one screenshot image and not as coordinate hotspots on top of a screenshot.

Every card is primarily a photographic surface with text overlaid directly on the image. Use only the minimum dark scrim necessary for legibility.

Common card content:
- optional small top-left badge
- tiny location/category meta
- large serif destination title
- one short evocative line
- small circular arrow action at lower-right

No large white content section beneath a card.

### 7.2 Exact card hierarchy

#### A. Iceland hero — upper right

Destination/location: `Ισλανδία`

Title:
`Καταρράκτες`
`του Φθινοπώρου`

Copy:
`Εκεί όπου η φύση βάφεται με χρώματα`
`και το νερό αφηγείται ιστορίες.`

Visual:
- spectacular Iceland waterfall
- autumn gold/orange vegetation
- warm cinematic light
- image crop and composition should match the reference: waterfall dominant center-right, warm foreground leaves at right edge, broad cinematic width

Optional reference-matching affordances:
- `Βίντεο Hero` pill at upper-left of hero
- translucent circular play button near visual center

This is the primary visual scene and must remain the dominant area of the desktop page.

#### B. Tromsø tall card — left middle

Title: `Τρόμσο`
Subtitle: `Το Βόρειο Σέλας σε καλεί.`

Visual:
- aurora over snowy mountains/fjord/coastal town
- nighttime teal/green sky with warm town lights
- tall, immersive crop

Optional small top-left `Ζωντανό` badge for reference parity.

#### C. Alps wide card — center middle

Title: `Άλπεις`
Subtitle: `Γραφικά χωριά, λίμνες και χρυσά δάση.`

Visual:
- autumn alpine lake
- mountains
- European village/church
- gold trees

Optional small top-left `Motion` badge for reference parity.

#### D. Switzerland narrow card

Title: `Ελβετία`
Subtitle: `Στην καρδιά των Άλπεων.`

Visual:
- snowy mountains
- cable car/gondola
- cold high-alpine crop

Optional small `Ζωντανό` badge.

#### E. Dolomites narrow card

Title: `Δολομίτες`
Subtitle: `Δρόμοι που μαγεύουν.`

Visual:
- dramatic winding mountain road
- autumn conifers
- sharp Dolomite peaks

Optional small `Road Trip` badge.

## 8. Bottom editorial row

Five photographic cards spanning the bottom row, each large enough to remain inspirational rather than thumbnail-like.

Order is fixed left to right:

1. `Λίμνη Κόμο`
   - `Κομψότητα σε κάθε εποχή.`
   - unmistakable Lake Como waterside/villa image

2. `Πλίτβιτσε`
   - `Ένα παραμύθι στη φύση.`
   - unmistakable Plitvice lakes/waterfalls/wooden path image

3. `Ζερμάτ`
   - `Αλπική μαγεία όλο τον χρόνο.`
   - Matterhorn / Zermatt alpine village image

4. `Αμάλφι`
   - `Χρώματα που μένουν για πάντα.`
   - Amalfi Coast cliffside coastal town image

5. `Λοφότεν`
   - `Άγρια ομορφιά, αυθεντικές εμπειρίες.`
   - Lofoten mountains/sea/fishing village image

These five cards retain image-overlay text and circular arrow actions.

## 9. Image-source requirements

The current autumn bootstrap uses incorrect Zagori/Meteora imagery as stand-ins. That must be removed from the approved homepage path.

Each destination must have its own correct image.

Requirements:
- no placeholder SVGs
- no repeated generic image reused across unrelated destinations
- no Meteora image for Iceland, Switzerland, Tromsø, etc.
- realistic, cinematic, aspirational travel photography
- `object-fit: cover`
- per-card explicit `object-position` or equivalent crop configuration
- image selection is part of curated homepage data, not inferred from ranking

If suitable repository-owned images do not already exist, add destination-specific licensed/approved assets or use the project's established remote asset strategy. Production should not depend on random third-party image search at runtime.

## 10. Curated homepage configuration

Create a dedicated homepage configuration separate from the ranking/catalog logic.

Suggested responsibility:
- seasonal heading/kicker/subtitle
- active month
- filters
- exact card sequence
- card role (`hero`, `tall`, `wide`, `narrow`, `bottom`)
- journey destination ID
- title/subtitle/country label
- image asset
- crop position
- optional badge
- AGNES prompt/action metadata

The renderer reads this curated configuration directly.

Catalog/ranking may still power search, destination pages, recommendations, and future dynamic opportunities, but it must not alter the approved homepage geometry.

## 11. Existing app integration

Preserve the current application state/routing system and journey detail flow.

Required behaviors:
- clicking any editorial card opens the correct journey/destination flow using `data-journey-id` or the existing equivalent
- month navigation continues to update application month state
- search routes through existing global search state
- Saved remains functional
- back/forward browser history continues to work
- journey pages remain unchanged unless a compatibility change is strictly necessary

Remove the current Explore screenshot replacement behavior implemented by `approved-home-override.js` / `approved-home.js` from the production Explore path.

## 12. AGNES travel co-pilot

AGNES remains available without obscuring the page.

Desktop:
- small discreet light glass trigger near lower-right
- not a large fixed dark panel

Expanded state:
- light white/translucent panel
- label: `AGNES`
- subtitle: `Travel co-pilot`
- possible quick actions:
  - `Plan with AGNES`
  - `Find something for October`
  - `I want mountains`
  - `I want Northern Lights`
  - `I want a road trip`

Mobile:
- small floating circular trigger only until opened

The existing planner logic should be reused rather than reimplemented.

## 13. Pricing rule

Do not display invented prices.

If a trusted live provider/API price is available:
- allow a discreet `Από €XXX` / `From €XXX` line

If not:
- show `Σχεδίασέ το με AGNES`

No fake promotion or implied live inventory.

## 14. Mobile responsive behavior

Do not compress the desktop mosaic into tiny cards.

Mobile order:
1. season title
2. Iceland hero
3. Tromsø
4. Alps
5. Switzerland
6. Dolomites
7. Lake Como
8. Plitvice
9. Zermatt
10. Amalfi
11. Lofoten

Mobile rules:
- one large full-width cinematic card at a time
- images dominate the viewport
- month rail becomes horizontal scrollable month strip
- intro remains generous and editorial
- top navigation becomes compact but functional
- AGNES becomes a small floating trigger
- card text remains overlayed on imagery

## 15. Accessibility and interaction quality

- all interactive cards must be keyboard reachable
- meaningful `aria-label` values for icon-only buttons
- search uses a real form/input
- focus styles remain visible and refined
- text overlays must maintain readable contrast
- decorative media controls must not claim real video/live functionality unless a real source exists
- reduced-motion users should not receive unnecessary hover/zoom animation

## 16. Testing and acceptance criteria

### Visual acceptance

At a 1536×864 desktop viewport, the implemented Explore homepage should visibly match the approved reference in:
- rail width and placement
- intro position and scale
- hero dominance
- Tromsø/Alps/Switzerland/Dolomites proportions
- five-card bottom row
- cream background
- rust accents
- serif/sans hierarchy
- card corner radius
- narrow inter-card gutters
- overlay text placement
- top navigation placement

The implementation must not resemble Booking.com, Expedia, Airbnb, a dashboard, or a generic travel marketplace.

### Functional acceptance

Verify:
- Iceland card opens correct journey
- Tromsø card opens correct journey
- Alps card opens correct journey
- Switzerland card opens correct journey
- Dolomites card opens correct journey
- all five bottom cards open correct journeys
- month selection works
- global search works
- Destinations works
- Experiences works
- Saved works
- browser back/forward works
- AGNES opens, accepts prompts, and retains existing planner behavior
- mobile layout follows the required order

### Regression acceptance

Existing detail pages and non-Explore views must continue to render using current app infrastructure.

## 17. Explicit non-goals

This implementation does not:
- redesign destination detail pages
- replace the global catalog architecture
- add a booking engine to the homepage
- invent provider inventory
- introduce dynamic homepage ranking
- create fake live/video states
- convert the UI to a dark luxury theme

## 18. Implementation boundary

This is one implementation project focused on the Explore homepage and its immediate integration points. It is intentionally isolated from future provider booking integrations and future dynamic seasonal-opportunity logic.

The first implementation milestone is visual fidelity to the approved editorial reference with correct destination imagery and functioning existing interactions. Dynamic provider/catalog enrichment comes only after that baseline is correct.
