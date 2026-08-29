# AGNES TV v2 Foundation + Instant Live IPTV Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild AGNES TV’s runtime foundation so the TV shell and cached Live IPTV appear immediately, D-pad focus is product-grade, and Live → Player → Back works without waiting for Movies/Kids or full-catalogue work.

**Architecture:** Replace the monolithic v1.8.0 screen/state flow with a TV-first Compose shell, repository-backed cache-first Live data, Room persistence, Coil image loading, and focused screen state holders. This phase deliberately exposes only functional v2 sections (Home, Live, Settings) and preserves the validated Xtream auth/player behavior needed by later Sports/Movies/Kids plans.

**Tech Stack:** Kotlin, Android SDK 35, Java 17, Jetpack Compose, androidx.tv Material3, AndroidX Lifecycle/ViewModel, Room, Coil Compose, Kotlin coroutines/Flow, Media3 ExoPlayer, MockWebServer, Compose UI tests, Android TV 1080p emulator.

**Spec:** `docs/superpowers/specs/2026-08-29-agnes-tv-premium-redesign-design.md`

## Global Constraints

- Target package remains `mom.agnes.tv`.
- `minSdk = 26`, `targetSdk = 35`, Java 17.
- Public repository must never contain private Xtream credentials.
- Provider endpoint discovery/auth rules proven in v1.8.0 must remain compatible.
- Never buffer the complete VOD catalogue into a `String` or `JSONArray`.
- Live IPTV startup has priority over Movies/Kids refresh.
- TV shell rendering must not depend on a network request completing.
- D-pad focus must use shape/outline/scale/depth; never color alone.
- TV instrumentation uses Android TV `tv_1080p`, 1920×1080.
- No APK is called ready until the current full TV test suite is green.
- This plan does not implement the final Sports, Movies, Kids, Search, Favorites, or Series experiences; those are separate plans built on this foundation.

---

## File Structure Locked by This Plan

Create focused files rather than adding new behavior to `MainActivity.kt`:

```text
app/src/main/java/mom/agnes/tv/
  MainActivity.kt                         # Activity only; mounts AgnesTvApp
  app/
    AgnesTvApp.kt                         # root composition + top-level route state
    TvSection.kt                          # HOME / LIVE / SETTINGS enum + labels
  data/
    xtream/
      XtreamConfig.kt                     # config model/load/save bridge
      XtreamClient.kt                     # HTTP + streaming live/category/EPG parsing
    cache/
      AgnesTvDatabase.kt                  # Room database
      LiveChannelEntity.kt                # cached channel metadata/current programme
      LiveChannelDao.kt                   # observable cached Live snapshot
    repository/
      LiveRepository.kt                   # cache-first Live contract and refresh
  ui/
    shell/
      TvShell.kt                          # persistent premium left nav + content host
      TvShellViewModel.kt                 # selected route + connection state only
    home/
      HomeScreen.kt                       # cached Live-first hero/rail
      HomeViewModel.kt                    # lightweight home summary
    live/
      LiveScreen.kt                       # channel browsing UI
      LiveViewModel.kt                    # cached channels + refresh state
    player/
      PlayerScreen.kt                     # fullscreen Media3 surface
      PlayerController.kt                 # player creation/release contract
    components/
      TvNavItem.kt                        # selected/focus contract
      TvChannelCard.kt                    # channel card with exact focus contract
      TvLoadingStatus.kt                  # unobtrusive refresh/offline status
    theme/
      AgnesTvTheme.kt                     # v2 color/type/focus tokens
  image/
    AgnesImageLoader.kt                   # Coil singleton/config
```

Tests:

```text
app/src/test/java/mom/agnes/tv/
  data/repository/LiveRepositoryTest.kt
  data/xtream/XtreamClientTest.kt

app/src/androidTest/java/mom/agnes/tv/
  V2StartupRegressionTest.kt
  V2TvFocusRegressionTest.kt
  V2LivePlayerFlowTest.kt
  V2StaleCacheRegressionTest.kt
```

Existing `LoginActivity.kt` / `PrefillConfig.kt` remain the credential entry/auto-login boundary. Existing v1.8.0 `MainActivity.kt` is reduced rather than retained as a second UI architecture.

---

### Task 1: Establish the v2 dependency and application shell boundary

**Files:**
- Modify: `app/build.gradle.kts`
- Modify: `app/src/main/java/mom/agnes/tv/MainActivity.kt`
- Create: `app/src/main/java/mom/agnes/tv/app/AgnesTvApp.kt`
- Create: `app/src/main/java/mom/agnes/tv/app/TvSection.kt`
- Create: `app/src/main/java/mom/agnes/tv/ui/theme/AgnesTvTheme.kt`
- Test: `app/src/androidTest/java/mom/agnes/tv/V2StartupRegressionTest.kt`

**Interfaces:**
- Consumes: existing authenticated launch into `MainActivity`.
- Produces: `@Composable fun AgnesTvApp()`, `enum class TvSection { HOME, LIVE, SETTINGS }`, `@Composable fun AgnesTvTheme(content: @Composable () -> Unit)`.

- [ ] **Step 1: Write the failing startup regression test**

Create `V2StartupRegressionTest.kt` with a test that launches `MainActivity` using already-verified preferences and asserts the v2 shell appears without any MockWebServer response being required:

```kotlin
@Test
fun shellRendersBeforeNetworkCompletes() {
    val server = MockWebServer()
    server.dispatcher = object : Dispatcher() {
        override fun dispatch(request: RecordedRequest): MockResponse =
            MockResponse().setBodyDelay(30, TimeUnit.SECONDS).setBody("[]")
    }
    server.start()
    seedVerifiedConfig(server.url("/").toString().trimEnd('/'))

    ActivityScenario.launch(MainActivity::class.java).use {
        compose.waitUntil(2_000) {
            compose.onAllNodes(hasText("AGNES TV")).fetchSemanticsNodes().isNotEmpty()
        }
        assertTrue(compose.onAllNodes(hasText("ΖΩΝΤΑΝΑ")).fetchSemanticsNodes().isNotEmpty())
    }
}
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
gradle :app:connectedDebugAndroidTest \
  -Pandroid.testInstrumentationRunnerArguments.class=mom.agnes.tv.V2StartupRegressionTest
```

Expected: FAIL because the v2 shell contract does not exist yet.

- [ ] **Step 3: Add exact dependencies**

In `app/build.gradle.kts`, keep the existing Compose BOM and Media3 dependencies; add:

```kotlin
implementation("androidx.tv:tv-material:1.0.0")
implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")
implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.7")
implementation("androidx.room:room-runtime:2.6.1")
implementation("androidx.room:room-ktx:2.6.1")
ksp("androidx.room:room-compiler:2.6.1")
implementation("io.coil-kt:coil-compose:2.7.0")
```

Add the KSP plugin to `plugins`:

```kotlin
id("com.google.devtools.ksp") version "2.0.21-1.0.28"
```

Bump the development line to:

```kotlin
versionCode = 24
versionName = "2.0.0-dev1"
```

- [ ] **Step 4: Reduce `MainActivity` to the composition entry point**

`MainActivity.kt` should contain only Activity lifecycle setup and:

```kotlin
setContent {
    AgnesTvTheme {
        AgnesTvApp()
    }
}
```

Do not move v1.8.0 functions into the new file wholesale. Later tasks migrate only required behavior.

- [ ] **Step 5: Create root section contract**

`TvSection.kt`:

```kotlin
enum class TvSection(val label: String) {
    HOME("ΑΡΧΙΚΗ"),
    LIVE("ΖΩΝΤΑΝΑ"),
    SETTINGS("ΡΥΘΜΙΣΕΙΣ")
}
```

`AgnesTvApp.kt` initially renders a simple v2 shell skeleton with `AGNES TV` and these three functional sections only.

- [ ] **Step 6: Run startup test and compile**

Run:

```bash
gradle :app:assembleDebug :app:connectedDebugAndroidTest \
  -Pandroid.testInstrumentationRunnerArguments.class=mom.agnes.tv.V2StartupRegressionTest
```

Expected: PASS; shell appears before delayed network response.

- [ ] **Step 7: Commit**

```bash
git add app/build.gradle.kts app/src/main/java/mom/agnes/tv/MainActivity.kt \
  app/src/main/java/mom/agnes/tv/app \
  app/src/main/java/mom/agnes/tv/ui/theme \
  app/src/androidTest/java/mom/agnes/tv/V2StartupRegressionTest.kt
git commit -m "refactor: establish AGNES TV v2 shell"
```

---

### Task 2: Introduce Room cache for instant Live content

**Files:**
- Create: `app/src/main/java/mom/agnes/tv/data/cache/LiveChannelEntity.kt`
- Create: `app/src/main/java/mom/agnes/tv/data/cache/LiveChannelDao.kt`
- Create: `app/src/main/java/mom/agnes/tv/data/cache/AgnesTvDatabase.kt`
- Test: `app/src/test/java/mom/agnes/tv/data/cache/LiveChannelDaoTest.kt`

**Interfaces:**
- Produces: `LiveChannelEntity`, `LiveChannelDao.observeAll(): Flow<List<LiveChannelEntity>>`, `replaceAll(items: List<LiveChannelEntity>, refreshedAt: Long)` implemented transactionally through repository/database helper.

- [ ] **Step 1: Write the failing cache contract test**

Use an in-memory Room database and assert cached rows are observable in deterministic sort order:

```kotlin
@Test
fun cachedChannelsAreObservableWithoutNetwork() = runTest {
    dao.upsertAll(
        listOf(
            LiveChannelEntity(2, "ERT 2", "", "News", 200L),
            LiveChannelEntity(1, "ERT 1", "", "Morning", 200L)
        )
    )

    assertEquals(listOf(1, 2), dao.observeAll().first().map { it.streamId })
}
```

- [ ] **Step 2: Verify RED**

Run:

```bash
gradle :app:testDebugUnitTest --tests "*LiveChannelDaoTest*"
```

Expected: compile/test FAIL because cache types do not exist.

- [ ] **Step 3: Define the entity**

```kotlin
@Entity(tableName = "live_channels")
data class LiveChannelEntity(
    @PrimaryKey val streamId: Int,
    val name: String,
    val logoUrl: String,
    val currentProgramme: String?,
    val refreshedAt: Long,
    val sortKey: Int = streamId
)
```

- [ ] **Step 4: Define DAO**

```kotlin
@Dao
interface LiveChannelDao {
    @Query("SELECT * FROM live_channels ORDER BY sortKey, name")
    fun observeAll(): Flow<List<LiveChannelEntity>>

    @Query("SELECT * FROM live_channels ORDER BY sortKey, name")
    suspend fun getAll(): List<LiveChannelEntity>

    @Upsert
    suspend fun upsertAll(items: List<LiveChannelEntity>)

    @Query("DELETE FROM live_channels")
    suspend fun clear()
}
```

- [ ] **Step 5: Define database**

```kotlin
@Database(entities = [LiveChannelEntity::class], version = 1, exportSchema = true)
abstract class AgnesTvDatabase : RoomDatabase() {
    abstract fun liveChannelDao(): LiveChannelDao
}
```

Expose a singleton builder from `companion object fun get(context: Context): AgnesTvDatabase` using `applicationContext`.

- [ ] **Step 6: Run cache tests**

Run:

```bash
gradle :app:testDebugUnitTest --tests "*LiveChannelDaoTest*"
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/src/main/java/mom/agnes/tv/data/cache app/src/test/java/mom/agnes/tv/data/cache
git commit -m "feat: add persistent live channel cache"
```

---

### Task 3: Extract Xtream config and streaming Live client from the monolith

**Files:**
- Create: `app/src/main/java/mom/agnes/tv/data/xtream/XtreamConfig.kt`
- Create: `app/src/main/java/mom/agnes/tv/data/xtream/XtreamClient.kt`
- Modify: `app/src/main/java/mom/agnes/tv/LoginActivity.kt`
- Modify: `app/src/main/java/mom/agnes/tv/PrefillConfig.kt` only if imports/types require it; do not change privacy behavior.
- Test: `app/src/test/java/mom/agnes/tv/data/xtream/XtreamClientTest.kt`

**Interfaces:**
- Produces: `data class XtreamConfig(server: String, username: String, password: String)` and `suspend fun XtreamClient.fetchLiveChannels(config: XtreamConfig): List<LiveChannelRemote>`.
- Preserves verified-pref keys used by current login flow.

- [ ] **Step 1: Write failing streaming parse/request tests**

Use MockWebServer to assert the client requests `action=get_live_streams` and parses a generated array without `JSONArray`:

```kotlin
@Test
fun fetchLiveChannelsUsesLiveEndpointAndParsesStreamingJson() = runTest {
    server.enqueue(json("""[
      {"stream_id":11,"name":"Channel A","stream_icon":"a.png"},
      {"stream_id":12,"name":"Channel B","stream_icon":"b.png"}
    ]"""))

    val items = client.fetchLiveChannels(config(server))

    assertEquals(listOf(11, 12), items.map { it.streamId })
    assertEquals("get_live_streams", server.takeRequest().requestUrl!!.queryParameter("action"))
}
```

Add a large generated-response test (for example 10,000 small objects) and assert the parser returns capped/sane results without constructing a `JSONArray` path.

- [ ] **Step 2: Verify RED**

```bash
gradle :app:testDebugUnitTest --tests "*XtreamClientTest*"
```

Expected: FAIL because extracted client does not exist.

- [ ] **Step 3: Implement streaming client**

Use `HttpURLConnection`, `InputStreamReader`, and `JsonReader` inside `withContext(Dispatchers.IO)`. Parse only fields needed by Live UI:

```kotlin
data class LiveChannelRemote(
    val streamId: Int,
    val name: String,
    val logoUrl: String
)
```

The public client method must close readers/connections with `use`/`finally`, enforce connect/read timeouts, reject non-2xx responses, and never return a partially constructed `JSONArray`.

- [ ] **Step 4: Preserve config bridge**

Move config load/save helpers out of `MainActivity.kt` into `XtreamConfig.kt`, preserving the exact preference file/key behavior already used by `LoginActivity` so verified auto-login remains compatible.

- [ ] **Step 5: Run tests and existing login regression**

```bash
gradle :app:testDebugUnitTest --tests "*XtreamClientTest*"
gradle :app:connectedDebugAndroidTest \
  -Pandroid.testInstrumentationRunnerArguments.class=mom.agnes.tv.AgnesTvFlowTest
```

Expected: Xtream unit tests PASS; existing auth/login tests remain green or are migrated with equivalent assertions if class names changed.

- [ ] **Step 6: Commit**

```bash
git add app/src/main/java/mom/agnes/tv/data/xtream \
  app/src/main/java/mom/agnes/tv/LoginActivity.kt \
  app/src/main/java/mom/agnes/tv/PrefillConfig.kt \
  app/src/test/java/mom/agnes/tv/data/xtream
git commit -m "refactor: extract streaming Xtream live client"
```

---

### Task 4: Build cache-first `LiveRepository`

**Files:**
- Create: `app/src/main/java/mom/agnes/tv/data/repository/LiveRepository.kt`
- Test: `app/src/test/java/mom/agnes/tv/data/repository/LiveRepositoryTest.kt`

**Interfaces:**
- Consumes: `LiveChannelDao`, `XtreamClient`, `XtreamConfig`.
- Produces:

```kotlin
data class LiveSnapshot(
    val channels: List<LiveChannelEntity>,
    val refreshing: Boolean,
    val stale: Boolean,
    val lastError: String?
)

interface LiveRepository {
    val snapshot: Flow<LiveSnapshot>
    suspend fun refresh(config: XtreamConfig)
}
```

- [ ] **Step 1: Write failing stale-cache test**

```kotlin
@Test
fun cachedChannelsRemainVisibleWhenRefreshFails() = runTest {
    dao.upsertAll(listOf(cachedChannel(1, "Cached One")))
    client.nextFailure = IOException("provider slow")

    repository.refresh(config)
    val state = repository.snapshot.first { !it.refreshing }

    assertEquals("Cached One", state.channels.single().name)
    assertTrue(state.stale)
    assertNotNull(state.lastError)
}
```

Also add a success test proving network rows replace/update cache without blanking it first.

- [ ] **Step 2: Verify RED**

```bash
gradle :app:testDebugUnitTest --tests "*LiveRepositoryTest*"
```

Expected: FAIL because repository does not exist.

- [ ] **Step 3: Implement cache-first state**

Construct snapshot using `combine` of DAO Flow plus internal refresh/error state. `refresh()` must:

1. set `refreshing=true`;
2. fetch remote channels on IO;
3. map remote items to entities with a single `refreshedAt` timestamp;
4. update cache in one database transaction;
5. on failure, retain cached rows and set `stale=true`/`lastError`;
6. always finish with `refreshing=false`.

Do not clear the table before successful data is available.

- [ ] **Step 4: Run repository tests**

```bash
gradle :app:testDebugUnitTest --tests "*LiveRepositoryTest*"
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/main/java/mom/agnes/tv/data/repository app/src/test/java/mom/agnes/tv/data/repository
git commit -m "feat: add cache-first live repository"
```

---

### Task 5: Implement premium TV navigation and deterministic focus contract

**Files:**
- Create: `app/src/main/java/mom/agnes/tv/ui/components/TvNavItem.kt`
- Create: `app/src/main/java/mom/agnes/tv/ui/components/TvChannelCard.kt`
- Create: `app/src/main/java/mom/agnes/tv/ui/components/TvLoadingStatus.kt`
- Create: `app/src/main/java/mom/agnes/tv/ui/shell/TvShell.kt`
- Create: `app/src/main/java/mom/agnes/tv/ui/shell/TvShellViewModel.kt`
- Modify: `app/src/main/java/mom/agnes/tv/app/AgnesTvApp.kt`
- Test: `app/src/androidTest/java/mom/agnes/tv/V2TvFocusRegressionTest.kt`

**Interfaces:**
- Produces `TvShell(selected: TvSection, onSectionSelected: (TvSection) -> Unit, content: @Composable () -> Unit)` and reusable focus visuals.

- [ ] **Step 1: Write the failing focus semantics test**

Give each focusable nav item semantics describing selected/focused state. Test D-pad movement from HOME to LIVE and assert both semantic state and visible contract marker change:

```kotlin
@Test
fun dpadFocusAndSelectedSectionAreDistinctAndDeterministic() {
    launchVerifiedV2()
    compose.onNodeWithTag("nav-HOME").requestFocus()
    device.pressDPadDown()
    compose.waitForIdle()

    compose.onNodeWithTag("nav-LIVE").assertIsFocused()
    compose.onNodeWithTag("nav-HOME").assert(SemanticsMatcher.expectValue(SelectedKey, true))

    device.pressEnter()
    compose.waitForIdle()
    compose.onNodeWithTag("nav-LIVE").assert(SemanticsMatcher.expectValue(SelectedKey, true))
}
```

Use a stable `testTag` for tests, but actual UI feedback must remain visual and not depend on test semantics.

- [ ] **Step 2: Verify RED**

Run the single instrumentation test; expect FAIL because v2 focus contract does not exist.

- [ ] **Step 3: Implement focus tokens**

Use TV Material focusable components. Focused elements must apply:

```kotlin
Modifier
    .scale(if (focused) 1.06f else 1f)
    .border(
        width = if (focused) 3.dp else 0.dp,
        color = if (focused) Color.White else Color.Transparent,
        shape = shape
    )
    .shadow(if (focused) 14.dp else 0.dp, shape)
```

Selected nav section also gets a persistent geometric marker (for example a 4.dp vertical bar) whether or not it currently has focus.

No blur, image reload, or network call may run from `onFocusChanged`.

- [ ] **Step 4: Implement shell**

Left rail order in Phase 1:

```text
AGNES TV
ΑΡΧΙΚΗ
ΖΩΝΤΑΝΑ
ΡΥΘΜΙΣΕΙΣ
```

Do not display Sports/Movies/Kids placeholders during this intermediate foundation milestone.

- [ ] **Step 5: Run focus test**

Expected: PASS on TV emulator.

- [ ] **Step 6: Commit**

```bash
git add app/src/main/java/mom/agnes/tv/ui/components \
  app/src/main/java/mom/agnes/tv/ui/shell \
  app/src/main/java/mom/agnes/tv/app/AgnesTvApp.kt \
  app/src/androidTest/java/mom/agnes/tv/V2TvFocusRegressionTest.kt
git commit -m "feat: add premium TV shell and focus contract"
```

---

### Task 6: Configure production image loading with Coil

**Files:**
- Create: `app/src/main/java/mom/agnes/tv/image/AgnesImageLoader.kt`
- Modify: `app/src/main/java/mom/agnes/tv/ui/components/TvChannelCard.kt`
- Remove migrated manual poster bitmap path from `MainActivity.kt` as the monolith is retired.
- Test: `app/src/androidTest/java/mom/agnes/tv/V2ImageLoadingRegressionTest.kt`

**Interfaces:**
- Produces: `fun createAgnesImageLoader(context: Context): ImageLoader` and channel-card `AsyncImage` requests with bounded dimensions.

- [ ] **Step 1: Write failing image request regression**

Expose a debug/test-only semantic content description or injectable image loader to assert a channel logo request uses a bounded target size. The card test should render 100 channel cards and verify focus movement does not increase MockWebServer image requests for already-cached visible URLs.

- [ ] **Step 2: Verify RED**

Run only `V2ImageLoadingRegressionTest`; expected FAIL against old/manual image path.

- [ ] **Step 3: Implement one app-scoped Coil loader**

Configure:

```kotlin
ImageLoader.Builder(context)
    .memoryCache {
        MemoryCache.Builder(context).maxSizePercent(0.12).build()
    }
    .diskCache {
        DiskCache.Builder()
            .directory(context.cacheDir.resolve("agnes_image_cache"))
            .maxSizeBytes(128L * 1024L * 1024L)
            .build()
    }
    .respectCacheHeaders(false)
    .build()
```

`TvChannelCard` requests a logo/card size close to rendered dimensions rather than source dimensions. Future hero/backdrop screens will define separate bounded requests.

- [ ] **Step 4: Run test and inspect request count**

Expected: PASS; focus-only movement over cached/visible cards does not trigger repeated full network fetches.

- [ ] **Step 5: Commit**

```bash
git add app/src/main/java/mom/agnes/tv/image \
  app/src/main/java/mom/agnes/tv/ui/components/TvChannelCard.kt \
  app/src/androidTest/java/mom/agnes/tv/V2ImageLoadingRegressionTest.kt \
  app/src/main/java/mom/agnes/tv/MainActivity.kt
git commit -m "perf: replace manual bitmap loading with Coil cache"
```

---

### Task 7: Build `LiveViewModel` and instant Live screen

**Files:**
- Create: `app/src/main/java/mom/agnes/tv/ui/live/LiveViewModel.kt`
- Create: `app/src/main/java/mom/agnes/tv/ui/live/LiveScreen.kt`
- Modify: `app/src/main/java/mom/agnes/tv/app/AgnesTvApp.kt`
- Test: `app/src/androidTest/java/mom/agnes/tv/V2StaleCacheRegressionTest.kt`

**Interfaces:**
- Consumes: `LiveRepository.snapshot`, verified `XtreamConfig`.
- Produces:

```kotlin
data class LiveUiState(
    val channels: List<LiveChannelUi>,
    val refreshing: Boolean,
    val stale: Boolean,
    val message: String?
)
```

and `fun refresh()`.

- [ ] **Step 1: Write failing stale-cache UI test**

Seed Room with two channels, configure MockWebServer to delay/fail, launch Live screen, and assert cached channel names are visible before refresh completes plus an unobtrusive `ΕΝΗΜΕΡΩΣΗ…`/offline indicator.

- [ ] **Step 2: Verify RED**

Expected: FAIL because Live screen/ViewModel do not exist.

- [ ] **Step 3: Implement ViewModel**

Collect repository snapshot with `stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), initialState)` and launch `repository.refresh(config)` once per visible/explicit refresh cycle, not every recomposition.

- [ ] **Step 4: Implement Live screen**

Use `LazyColumn` or TV-appropriate lazy grid based on measured readability, but retain one row/card composition per channel. Each item shows:

- logo;
- channel name;
- current programme if present;
- stable placeholder when EPG/logo absent.

No fullscreen loading screen. Cached list remains present during refresh.

- [ ] **Step 5: Run stale-cache test**

Expected: PASS with delayed/failed provider mock.

- [ ] **Step 6: Commit**

```bash
git add app/src/main/java/mom/agnes/tv/ui/live \
  app/src/main/java/mom/agnes/tv/app/AgnesTvApp.kt \
  app/src/androidTest/java/mom/agnes/tv/V2StaleCacheRegressionTest.kt
git commit -m "feat: add instant cache-first Live IPTV screen"
```

---

### Task 8: Migrate player into an isolated TV route with exact focus restoration

**Files:**
- Create: `app/src/main/java/mom/agnes/tv/ui/player/PlayerController.kt`
- Create: `app/src/main/java/mom/agnes/tv/ui/player/PlayerScreen.kt`
- Modify: `app/src/main/java/mom/agnes/tv/app/AgnesTvApp.kt`
- Modify: `app/src/main/java/mom/agnes/tv/ui/live/LiveScreen.kt`
- Test: `app/src/androidTest/java/mom/agnes/tv/V2LivePlayerFlowTest.kt`

**Interfaces:**
- Produces:

```kotlin
data class PlayerRequest(val title: String, val url: String, val stableKey: String)
```

and `PlayerScreen(request: PlayerRequest, onBack: () -> Unit)`.

- [ ] **Step 1: Write failing Live → Player → Back test**

```kotlin
@Test
fun enterOpensPlayerAndBackRestoresSameChannelFocus() {
    launchLiveWithMockChannels(20)
    compose.onNodeWithTag("channel-7").performClick()
    compose.onNodeWithTag("player-surface").assertExists()

    device.pressBack()
    compose.waitForIdle()

    compose.onNodeWithTag("channel-7").assertIsFocused()
}
```

Use a mock playable local/test URI or debug player hook so the test validates navigation contract without external stream dependency.

- [ ] **Step 2: Verify RED**

Expected: FAIL because v2 player route/focus restoration do not exist.

- [ ] **Step 3: Implement player controller**

Create/release one ExoPlayer per active `PlayerScreen`, attach the MediaItem, call `prepare()`, and release in `DisposableEffect` cleanup. Player errors expose two focusable actions: `ΞΑΝΑ` and `ΠΙΣΩ`.

- [ ] **Step 4: Preserve Live focus key**

Before navigating to player, store the selected channel `stableKey`. After Back, use a `FocusRequester` registered for that visible channel and request focus after the list has restored the item/scroll position.

- [ ] **Step 5: Run flow test**

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/src/main/java/mom/agnes/tv/ui/player \
  app/src/main/java/mom/agnes/tv/ui/live \
  app/src/main/java/mom/agnes/tv/app/AgnesTvApp.kt \
  app/src/androidTest/java/mom/agnes/tv/V2LivePlayerFlowTest.kt
git commit -m "feat: isolate player and restore TV focus on back"
```

---

### Task 9: Build the Live-first Home snapshot

**Files:**
- Create: `app/src/main/java/mom/agnes/tv/ui/home/HomeViewModel.kt`
- Create: `app/src/main/java/mom/agnes/tv/ui/home/HomeScreen.kt`
- Modify: `app/src/main/java/mom/agnes/tv/app/AgnesTvApp.kt`
- Test: `app/src/androidTest/java/mom/agnes/tv/V2HomeRegressionTest.kt`

**Interfaces:**
- Consumes cached `LiveRepository.snapshot` only in this phase.
- Produces Home hero/Live rail without Movies/Kids dependency.

- [ ] **Step 1: Write failing Home test**

Seed cached Live channels and delay network. Assert:

```text
AGNES TV
ΖΩΝΤΑΝΑ ΤΩΡΑ
LIVE ΚΑΝΑΛΙΑ
<cached channel name>
```

all appear without waiting on provider response.

- [ ] **Step 2: Verify RED**

Expected: FAIL before Home is implemented.

- [ ] **Step 3: Implement lightweight Home state**

Select featured cached channel/programme deterministically. Do not fabricate sports fixture data. If no EPG/current-programme evidence exists, hero is the first useful Live channel and copy stays generic.

- [ ] **Step 4: Implement premium Home layout**

Use one dominant hero, a compact `ΖΩΝΤΑΝΑ ΤΩΡΑ` area, then `LIVE ΚΑΝΑΛΙΑ` rail. No Movies/Kids rails in Phase 1 because they are not yet migrated. No dead placeholders.

- [ ] **Step 5: Run test**

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/src/main/java/mom/agnes/tv/ui/home \
  app/src/main/java/mom/agnes/tv/app/AgnesTvApp.kt \
  app/src/androidTest/java/mom/agnes/tv/V2HomeRegressionTest.kt
git commit -m "feat: add Live-first premium Home"
```

---

### Task 10: Add TV startup, heap, and network-delay validation gates

**Files:**
- Modify: `.github/workflows/android-instrumentation.yml`
- Create: `app/src/androidTest/java/mom/agnes/tv/V2PerformanceRegressionTest.kt`
- Modify/Create: validation report script in workflow only; do not commit test credentials.

**Interfaces:**
- Produces CI evidence for TV profile, shell independence from network, navigation suite, and memory snapshot.

- [ ] **Step 1: Extend workflow assertions**

Ensure emulator runner uses:

```yaml
api-level: 35
target: google_apis
arch: x86_64
profile: tv_1080p
```

Before tests, capture display size and fail if it is not 1920×1080-equivalent TV profile.

- [ ] **Step 2: Add delayed-network startup test**

`V2PerformanceRegressionTest` launches with MockWebServer delayed by 30 seconds and records elapsed time until the root shell semantic tag is present. Assert under 2 seconds in CI to provide margin around the product target of cached Home under 1 second on target-class hardware.

- [ ] **Step 3: Add navigation stress loop**

Seed at least 1,000 synthetic cached channels and perform repeated D-pad navigation/scroll cycles. Do not build a 1,000-item JSON string inside production code; seed Room directly for this UI/memory test.

- [ ] **Step 4: Capture meminfo after stress**

In workflow after instrumentation:

```bash
adb shell dumpsys meminfo mom.agnes.tv > app/build/v2-meminfo.txt
```

Parse `TOTAL PSS` / relevant process total and fail only on a deliberately conservative regression ceiling (for example 220 MB in emulator), while reporting the spec’s practical target (<~160 MB) separately. This avoids false confidence while still catching runaway heap growth.

- [ ] **Step 5: Run the complete Phase 1 suite**

Run:

```bash
gradle testDebugUnitTest connectedDebugAndroidTest --stacktrace
```

Expected: all unit + TV instrumentation tests pass; no skipped failure gate.

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/android-instrumentation.yml \
  app/src/androidTest/java/mom/agnes/tv/V2PerformanceRegressionTest.kt
git commit -m "test: gate AGNES TV v2 startup and memory performance"
```

---

### Task 11: Remove the retired v1.8.0 UI path and verify auth/privacy compatibility

**Files:**
- Modify: `app/src/main/java/mom/agnes/tv/MainActivity.kt`
- Modify: old v1.8.0 UI helpers only where they remain after extraction; delete dead functions/files once references are zero.
- Test: existing auth tests plus all v2 tests.

**Interfaces:**
- Produces one UI architecture only: v2 shell. Login/prefill remain separate and private packaging remains external to public repo.

- [ ] **Step 1: Prove dead-code references before deletion**

Run code search/compile and list old monolithic functions (`TvShell`, old `VodScreen`, old `RemotePoster`, old `PlayerScreen`) still referenced. Only delete symbols with zero v2 consumers; do not delete reusable endpoint-discovery/auth behavior that belongs in Login/Xtream code.

- [ ] **Step 2: Delete retired presentation code**

Remove old Material3 prototype screen code and manual bitmap loader from `MainActivity.kt`. `MainActivity.kt` remains a small Activity entry point.

- [ ] **Step 3: Run auth regression + full suite**

```bash
gradle testDebugUnitTest connectedDebugAndroidTest --stacktrace
```

Explicitly confirm:

- stale verified prefs cannot bypass required auth rules;
- private prefill behavior still works only when private packaging supplies it;
- no credential literal is present in tracked source;
- all v2 foundation/Live tests pass.

- [ ] **Step 4: Search tracked repo for private credential patterns**

Use a safe local scan against known config-property keys and the private asset filename. Do not print secret values to logs. Fail if `agnes_prefill.properties` or non-placeholder credential asset is tracked.

- [ ] **Step 5: Commit cleanup**

```bash
git add -A
git commit -m "refactor: retire AGNES TV v1 presentation path"
```

---

### Task 12: Phase 1 final verification checkpoint

**Files:**
- No feature code unless verification exposes a defect.
- Update: `validation/v2.0.0-foundation-live.txt` only after evidence exists.

**Interfaces:**
- Produces a green foundation milestone that later Sports/Movies/Kids plans can build on.

- [ ] **Step 1: Run fresh build from clean checkout/worktree**

```bash
git status --short
gradle clean assembleDebug testDebugUnitTest connectedDebugAndroidTest --stacktrace
```

Expected: clean working tree before run; build and all tests PASS.

- [ ] **Step 2: Verify TV profile evidence**

Confirm logs explicitly show `tv_1080p` / 1920×1080 test environment.

- [ ] **Step 3: Verify key user flows from logs/reports**

Required green flows:

```text
launch -> shell without network
Home cached Live -> Live section
Live cached list while refresh delayed
D-pad focus navigation
Live channel -> Player -> Back -> same focus
provider failure -> stale cached content remains
login/auth regressions
```

- [ ] **Step 4: Verify memory evidence**

Inspect committed/artifact `v2-meminfo.txt`. If the emulator process exceeds the regression ceiling, investigate before continuing. Do not raise the limit to make the test green without root-cause review.

- [ ] **Step 5: Write validation report**

`validation/v2.0.0-foundation-live.txt` must include:

```text
commit: <exact tested SHA>
build: success
unit tests: <count>, 0 failed
TV instrumentation: <count>, 0 failed
profile: tv_1080p / 1920x1080
startup delayed-network shell: pass
live cache-first: pass
player/back focus restore: pass
memory stress: <measured value> / pass
```

- [ ] **Step 6: Commit validation evidence**

```bash
git add validation/v2.0.0-foundation-live.txt
git commit -m "docs: record AGNES TV v2 foundation validation"
```

This checkpoint is **not** the final user APK release. The next implementation plans add Sports, then Movies/Kids/subtitles, then final full-product performance/private packaging. The foundation milestone may be installed only if the user explicitly wants an intermediate engineering build.
