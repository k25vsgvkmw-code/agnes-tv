# AGNES TV v2 Foundation + Instant Live IPTV Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild AGNES TV’s runtime foundation so the TV shell and cached Live IPTV appear immediately, D-pad focus is product-grade, and Live → Player → Back works without waiting for Movies/Kids or full-catalogue work.

**Architecture:** Replace the monolithic v1.8.0 presentation path with a TV-first Compose shell, Room-backed cache-first Live repository, streaming Xtream client, Coil image pipeline, and isolated screen state. This milestone intentionally exposes only functional v2 sections (Home, Live, Settings); Sports and VOD are separate plans layered on the validated foundation.

**Tech Stack:** Android Gradle Plugin 8.7.3, Kotlin 2.0.21, Java 17, Android SDK 35, Jetpack Compose, `androidx.tv:tv-material`, AndroidX Lifecycle/ViewModel, Room + KSP, Coil Compose, Kotlin coroutines/Flow, Media3 ExoPlayer, MockWebServer, Compose UI tests, Android TV `tv_1080p` emulator.

**Spec:** `docs/superpowers/specs/2026-08-29-agnes-tv-premium-redesign-design.md`

## Global Constraints

- Package remains `mom.agnes.tv`.
- `minSdk = 26`, `targetSdk = 35`, Java 17.
- Root project remains Android Gradle Plugin `8.7.3` and Kotlin/Compose plugin `2.0.21`.
- Public repository contains no private Xtream credentials or private prefill asset.
- Preserve the endpoint-discovery/auth behavior already proven by the v1.8.0 login flow.
- Never block shell rendering on a provider request.
- Never fetch Movies/Kids as part of Phase 1 startup.
- Never buffer a huge provider catalogue into a `String`/`JSONArray` path.
- D-pad focus uses outline + scale + depth; selected navigation also has a persistent geometric marker.
- Focus changes perform no network request, image reload, or expensive blur computation.
- TV CI uses Android TV `tv_1080p` / 1920×1080.
- No Phase 1 build is called validated until unit tests, TV instrumentation, delayed-network startup, stale-cache behavior, Live → Player → Back, and memory stress are green.
- Phase 1 is an engineering milestone, not the final private APK release.

---

## File Structure

```text
app/src/main/java/mom/agnes/tv/
  MainActivity.kt
  LoginActivity.kt
  PrefillConfig.kt
  app/
    AgnesTvApp.kt
    TvSection.kt
  data/
    xtream/
      XtreamConfig.kt
      XtreamClient.kt
      LiveChannelRemote.kt
    cache/
      AgnesTvDatabase.kt
      LiveChannelEntity.kt
      LiveChannelDao.kt
    repository/
      LiveRepository.kt
      LiveSnapshot.kt
  image/
    AgnesImageLoader.kt
  ui/
    theme/AgnesTvTheme.kt
    shell/TvShell.kt
    shell/TvShellViewModel.kt
    components/TvNavItem.kt
    components/TvChannelCard.kt
    components/TvLoadingStatus.kt
    home/HomeScreen.kt
    home/HomeViewModel.kt
    live/LiveScreen.kt
    live/LiveViewModel.kt
    player/PlayerRequest.kt
    player/PlayerController.kt
    player/PlayerScreen.kt
```

Tests:

```text
app/src/test/java/mom/agnes/tv/
  data/xtream/XtreamClientTest.kt
  data/repository/LiveRepositoryTest.kt

app/src/androidTest/java/mom/agnes/tv/
  data/cache/LiveChannelDaoTest.kt
  V2StartupRegressionTest.kt
  V2TvFocusRegressionTest.kt
  V2ImageLoadingRegressionTest.kt
  V2StaleCacheRegressionTest.kt
  V2LivePlayerFlowTest.kt
  V2HomeRegressionTest.kt
  V2PerformanceRegressionTest.kt
```

---

### Task 1: Establish v2 dependencies and a network-independent shell

**Files:**
- Modify: `build.gradle.kts`
- Modify: `app/build.gradle.kts`
- Modify: `app/src/main/java/mom/agnes/tv/MainActivity.kt`
- Create: `app/src/main/java/mom/agnes/tv/app/AgnesTvApp.kt`
- Create: `app/src/main/java/mom/agnes/tv/app/TvSection.kt`
- Create: `app/src/main/java/mom/agnes/tv/ui/theme/AgnesTvTheme.kt`
- Test: `app/src/androidTest/java/mom/agnes/tv/V2StartupRegressionTest.kt`

**Interfaces:**
- Produces `@Composable fun AgnesTvApp()`.
- Produces `enum class TvSection { HOME, LIVE, SETTINGS }`.
- Produces `@Composable fun AgnesTvTheme(content: @Composable () -> Unit)`.

- [ ] **Step 1: Write the failing startup test**

`V2StartupRegressionTest.kt` launches an already-verified configuration against a server that delays every response for 30 seconds:

```kotlin
@Test
fun shellRendersBeforeNetworkCompletes() {
    server.dispatcher = object : Dispatcher() {
        override fun dispatch(request: RecordedRequest): MockResponse =
            MockResponse().setBodyDelay(30, TimeUnit.SECONDS).setBody("[]")
    }
    seedVerifiedConfig(server.url("/").toString().trimEnd('/'))

    ActivityScenario.launch(MainActivity::class.java).use {
        compose.waitUntil(2_000) {
            compose.onAllNodes(hasTestTag("v2-shell")).fetchSemanticsNodes().isNotEmpty()
        }
        compose.onNodeWithText("AGNES TV").assertExists()
        compose.onNodeWithText("ΖΩΝΤΑΝΑ").assertExists()
    }
}
```

- [ ] **Step 2: Run RED**

```bash
gradle :app:connectedDebugAndroidTest \
  -Pandroid.testInstrumentationRunnerArguments.class=mom.agnes.tv.V2StartupRegressionTest
```

Expected: FAIL because the v2 shell/tag does not exist.

- [ ] **Step 3: Add exact build plugins/dependencies**

Root `build.gradle.kts` adds KSP using the same Kotlin line:

```kotlin
id("com.google.devtools.ksp") version "2.0.21-1.0.28" apply false
```

`app/build.gradle.kts` adds:

```kotlin
id("com.google.devtools.ksp")
```

and dependencies:

```kotlin
implementation("androidx.tv:tv-material:1.0.0")
implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")
implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.7")
implementation("androidx.room:room-runtime:2.6.1")
implementation("androidx.room:room-ktx:2.6.1")
ksp("androidx.room:room-compiler:2.6.1")
implementation("io.coil-kt:coil-compose:2.7.0")
```

Set development version:

```kotlin
versionCode = 24
versionName = "2.0.0-dev1"
```

- [ ] **Step 4: Reduce `MainActivity` to the composition entry point**

```kotlin
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            AgnesTvTheme {
                AgnesTvApp()
            }
        }
    }
}
```

Do not copy the old monolithic UI functions into `AgnesTvApp.kt`.

- [ ] **Step 5: Add the exact section contract**

```kotlin
enum class TvSection(val label: String) {
    HOME("ΑΡΧΙΚΗ"),
    LIVE("ΖΩΝΤΑΝΑ"),
    SETTINGS("ΡΥΘΜΙΣΕΙΣ")
}
```

Initial shell renders these functional sections only and has `Modifier.testTag("v2-shell")`.

- [ ] **Step 6: Run GREEN**

```bash
gradle :app:assembleDebug :app:connectedDebugAndroidTest \
  -Pandroid.testInstrumentationRunnerArguments.class=mom.agnes.tv.V2StartupRegressionTest
```

Expected: PASS; shell appears while provider response is still delayed.

- [ ] **Step 7: Commit**

```bash
git add build.gradle.kts app/build.gradle.kts app/src/main/java/mom/agnes/tv/MainActivity.kt \
  app/src/main/java/mom/agnes/tv/app app/src/main/java/mom/agnes/tv/ui/theme \
  app/src/androidTest/java/mom/agnes/tv/V2StartupRegressionTest.kt
git commit -m "refactor: establish AGNES TV v2 shell"
```

---

### Task 2: Add persistent Room Live cache

**Files:**
- Create: `app/src/main/java/mom/agnes/tv/data/cache/LiveChannelEntity.kt`
- Create: `app/src/main/java/mom/agnes/tv/data/cache/LiveChannelDao.kt`
- Create: `app/src/main/java/mom/agnes/tv/data/cache/AgnesTvDatabase.kt`
- Test: `app/src/androidTest/java/mom/agnes/tv/data/cache/LiveChannelDaoTest.kt`

**Interfaces:**
- Produces `LiveChannelDao.observeAll(): Flow<List<LiveChannelEntity>>`.
- Produces `LiveChannelDao.replaceAll(items: List<LiveChannelEntity>)` as a transaction.

- [ ] **Step 1: Write the failing Android Room test**

Use `ApplicationProvider.getApplicationContext()` and an in-memory Room DB:

```kotlin
@Test
fun cachedChannelsAreObservableInStableOrder() = runTest {
    dao.replaceAll(
        listOf(
            LiveChannelEntity(2, "Channel B", "", null, 200L, 2),
            LiveChannelEntity(1, "Channel A", "", "Morning", 200L, 1)
        )
    )

    assertEquals(listOf(1, 2), dao.observeAll().first().map { it.streamId })
}
```

- [ ] **Step 2: Run RED**

```bash
gradle :app:connectedDebugAndroidTest \
  -Pandroid.testInstrumentationRunnerArguments.class=mom.agnes.tv.data.cache.LiveChannelDaoTest
```

Expected: FAIL because database types do not exist.

- [ ] **Step 3: Implement entity**

```kotlin
@Entity(tableName = "live_channels")
data class LiveChannelEntity(
    @PrimaryKey val streamId: Int,
    val name: String,
    val logoUrl: String,
    val currentProgramme: String?,
    val refreshedAt: Long,
    val sortKey: Int
)
```

- [ ] **Step 4: Implement DAO with exact transactional replacement**

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

    @Transaction
    suspend fun replaceAll(items: List<LiveChannelEntity>) {
        clear()
        upsertAll(items)
    }
}
```

- [ ] **Step 5: Implement database singleton**

```kotlin
@Database(entities = [LiveChannelEntity::class], version = 1, exportSchema = true)
abstract class AgnesTvDatabase : RoomDatabase() {
    abstract fun liveChannelDao(): LiveChannelDao
}
```

`AgnesTvDatabase.get(context)` uses `context.applicationContext` and database name `agnes-tv.db`.

- [ ] **Step 6: Run GREEN and commit**

```bash
gradle :app:connectedDebugAndroidTest \
  -Pandroid.testInstrumentationRunnerArguments.class=mom.agnes.tv.data.cache.LiveChannelDaoTest
git add app/src/main/java/mom/agnes/tv/data/cache app/src/androidTest/java/mom/agnes/tv/data/cache
git commit -m "feat: add persistent live channel cache"
```

---

### Task 3: Extract config and a streaming Xtream Live client

**Files:**
- Create: `app/src/main/java/mom/agnes/tv/data/xtream/XtreamConfig.kt`
- Create: `app/src/main/java/mom/agnes/tv/data/xtream/LiveChannelRemote.kt`
- Create: `app/src/main/java/mom/agnes/tv/data/xtream/XtreamClient.kt`
- Modify: `app/src/main/java/mom/agnes/tv/LoginActivity.kt`
- Modify: `app/src/main/java/mom/agnes/tv/PrefillConfig.kt` only for moved type imports if necessary.
- Test: `app/src/test/java/mom/agnes/tv/data/xtream/XtreamClientTest.kt`

**Interfaces:**

```kotlin
data class XtreamConfig(val server: String, val username: String, val password: String)
data class LiveChannelRemote(val streamId: Int, val name: String, val logoUrl: String)

class XtreamClient {
    suspend fun fetchLiveChannels(config: XtreamConfig): List<LiveChannelRemote>
}
```

- [ ] **Step 1: Write failing endpoint/parser test**

```kotlin
@Test
fun fetchLiveChannelsUsesGetLiveStreamsAndStreamingParser() = runTest {
    server.enqueue(json("""[
      {"stream_id":11,"name":"Channel A","stream_icon":"a.png"},
      {"stream_id":12,"name":"Channel B","stream_icon":"b.png"}
    ]"""))

    val result = client.fetchLiveChannels(config(server))

    assertEquals(listOf(11, 12), result.map { it.streamId })
    assertEquals(
        "get_live_streams",
        server.takeRequest().requestUrl!!.queryParameter("action")
    )
}
```

Add a generated 10,000-object response test. The test verifies correct parsing/capping and the implementation code review verifies `JsonReader` is used rather than `readText()` + `JSONArray`.

- [ ] **Step 2: Run RED**

```bash
gradle :app:testDebugUnitTest --tests "*XtreamClientTest*"
```

- [ ] **Step 3: Implement client**

Use `HttpURLConnection`, `InputStreamReader`, and `android.util.JsonReader` inside `withContext(Dispatchers.IO)`. Parse only `stream_id`, `name`, `stream_icon`; skip unknown fields. Cap returned Live rows at 3,000 to bound UI/cache work. Use 7-second connect/read timeouts, require HTTP 2xx, close reader/connection in `use`/`finally`.

- [ ] **Step 4: Move config load/save helpers without changing pref keys**

`XtreamConfig.kt` owns current `agnes_xtream` preference bridge. `LoginActivity` and private prefill behavior continue to save/read the same server/username/password/verified keys. No secret literal is added.

- [ ] **Step 5: Run parser + login regressions**

```bash
gradle :app:testDebugUnitTest --tests "*XtreamClientTest*"
gradle :app:connectedDebugAndroidTest \
  -Pandroid.testInstrumentationRunnerArguments.class=mom.agnes.tv.AgnesTvFlowTest
```

- [ ] **Step 6: Commit**

```bash
git add app/src/main/java/mom/agnes/tv/data/xtream \
  app/src/main/java/mom/agnes/tv/LoginActivity.kt app/src/main/java/mom/agnes/tv/PrefillConfig.kt \
  app/src/test/java/mom/agnes/tv/data/xtream
git commit -m "refactor: extract streaming Xtream live client"
```

---

### Task 4: Implement cache-first `LiveRepository`

**Files:**
- Create: `app/src/main/java/mom/agnes/tv/data/repository/LiveSnapshot.kt`
- Create: `app/src/main/java/mom/agnes/tv/data/repository/LiveRepository.kt`
- Test: `app/src/test/java/mom/agnes/tv/data/repository/LiveRepositoryTest.kt`

**Interfaces:**

```kotlin
data class LiveSnapshot(
    val channels: List<LiveChannelEntity>,
    val refreshing: Boolean,
    val stale: Boolean,
    val lastError: String?
)

class LiveRepository(
    private val dao: LiveChannelDao,
    private val client: XtreamClient,
    private val clock: () -> Long = System::currentTimeMillis
) {
    val snapshot: Flow<LiveSnapshot>
    suspend fun refresh(config: XtreamConfig)
}
```

- [ ] **Step 1: Write failing fake-DAO repository tests**

Use a JVM fake implementation of `LiveChannelDao` backed by `MutableStateFlow`, avoiding Room in local unit tests.

Failure test:

```kotlin
@Test
fun refreshFailureKeepsCachedChannelsVisible() = runTest {
    fakeDao.replaceAll(listOf(entity(1, "Cached One")))
    fakeClient.failure = IOException("provider slow")

    repository.refresh(config)
    val state = repository.snapshot.first { !it.refreshing }

    assertEquals("Cached One", state.channels.single().name)
    assertTrue(state.stale)
    assertNotNull(state.lastError)
}
```

Success test proves old cache stays visible while refresh is in progress and is atomically replaced only after a successful fetch.

- [ ] **Step 2: Run RED**

```bash
gradle :app:testDebugUnitTest --tests "*LiveRepositoryTest*"
```

- [ ] **Step 3: Implement repository state**

`refresh()` sequence is exact:

1. set `refreshing=true` without touching cached rows;
2. fetch remote rows;
3. map to entities using one `refreshedAt` timestamp and deterministic `sortKey=index`;
4. call `dao.replaceAll(mapped)` only after fetch succeeds;
5. success sets `stale=false,lastError=null`;
6. failure preserves DAO rows and sets `stale=true,lastError=<sanitized message>`;
7. finally sets `refreshing=false`.

- [ ] **Step 4: Run GREEN and commit**

```bash
gradle :app:testDebugUnitTest --tests "*LiveRepositoryTest*"
git add app/src/main/java/mom/agnes/tv/data/repository app/src/test/java/mom/agnes/tv/data/repository
git commit -m "feat: add cache-first live repository"
```

---

### Task 5: Build the TV shell and exact focus contract

**Files:**
- Create: `app/src/main/java/mom/agnes/tv/ui/components/TvNavItem.kt`
- Create: `app/src/main/java/mom/agnes/tv/ui/components/TvChannelCard.kt`
- Create: `app/src/main/java/mom/agnes/tv/ui/components/TvLoadingStatus.kt`
- Create: `app/src/main/java/mom/agnes/tv/ui/shell/TvShell.kt`
- Create: `app/src/main/java/mom/agnes/tv/ui/shell/TvShellViewModel.kt`
- Modify: `app/src/main/java/mom/agnes/tv/app/AgnesTvApp.kt`
- Test: `app/src/androidTest/java/mom/agnes/tv/V2TvFocusRegressionTest.kt`

**Interfaces:**

```kotlin
@Composable
fun TvShell(
    selected: TvSection,
    onSectionSelected: (TvSection) -> Unit,
    content: @Composable BoxScope.() -> Unit
)
```

- [ ] **Step 1: Write failing TV focus test**

The shell initially requests focus on HOME. Use standard Compose selected semantics, not a custom undefined key:

```kotlin
@Test
fun dpadFocusAndSelectedSectionAreUnmistakable() {
    launchVerifiedV2()
    compose.onNodeWithTag("nav-HOME").assertIsFocused().assertIsSelected()

    device.pressDPadDown()
    compose.waitForIdle()
    compose.onNodeWithTag("nav-LIVE").assertIsFocused().assertIsNotSelected()

    device.pressEnter()
    compose.waitForIdle()
    compose.onNodeWithTag("nav-LIVE").assertIsSelected()
}
```

- [ ] **Step 2: Run RED**

Run `V2TvFocusRegressionTest`; expected FAIL.

- [ ] **Step 3: Implement exact visual focus tokens**

Focused nav/card applies:

```kotlin
Modifier
    .scale(if (focused) 1.06f else 1f)
    .border(if (focused) 3.dp else 0.dp, if (focused) Color.White else Color.Transparent, shape)
    .shadow(if (focused) 14.dp else 0.dp, shape)
```

Selected nav adds a persistent 4.dp vertical marker even when focus has moved away. Animate only scale/elevation over 100–140 ms. Do not animate blur/background bitmaps.

- [ ] **Step 4: Implement Phase 1 navigation only**

Order:

```text
AGNES TV
ΑΡΧΙΚΗ
ΖΩΝΤΑΝΑ
ΡΥΘΜΙΣΕΙΣ
```

No dead Sports/Movies/Kids placeholders in this milestone.

- [ ] **Step 5: Run GREEN and commit**

```bash
gradle :app:connectedDebugAndroidTest \
  -Pandroid.testInstrumentationRunnerArguments.class=mom.agnes.tv.V2TvFocusRegressionTest
git add app/src/main/java/mom/agnes/tv/ui/components app/src/main/java/mom/agnes/tv/ui/shell \
  app/src/main/java/mom/agnes/tv/app/AgnesTvApp.kt \
  app/src/androidTest/java/mom/agnes/tv/V2TvFocusRegressionTest.kt
git commit -m "feat: add premium TV shell and focus contract"
```

---

### Task 6: Replace manual bitmaps with one bounded Coil pipeline

**Files:**
- Create: `app/src/main/java/mom/agnes/tv/image/AgnesImageLoader.kt`
- Modify: `app/src/main/java/mom/agnes/tv/ui/components/TvChannelCard.kt`
- Test: `app/src/androidTest/java/mom/agnes/tv/V2ImageLoadingRegressionTest.kt`

**Interfaces:**
- Produces `fun createAgnesImageLoader(context: Context): ImageLoader`.
- Channel-logo requests are explicitly sized to `240×135` pixels for the initial 1080p card design.

- [ ] **Step 1: Write failing image-cache test**

Render a rail/list with repeated focus movement across already-visible cards whose logos come from MockWebServer. Record `server.requestCount`, move focus left/right over the same cards repeatedly, wait for idle, and assert request count does not increase after initial successful loads.

- [ ] **Step 2: Run RED**

Expected: FAIL or expose repeated/manual fetch behavior in the old path.

- [ ] **Step 3: Implement singleton Coil configuration**

```kotlin
ImageLoader.Builder(context.applicationContext)
    .memoryCache {
        MemoryCache.Builder(context.applicationContext)
            .maxSizePercent(0.12)
            .build()
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

`TvChannelCard` uses `AsyncImage`/`ImageRequest.Builder(...).data(url).size(240, 135)` with a local stable placeholder. Focus changes do not alter the request URL or size.

- [ ] **Step 4: Run GREEN and commit**

```bash
gradle :app:connectedDebugAndroidTest \
  -Pandroid.testInstrumentationRunnerArguments.class=mom.agnes.tv.V2ImageLoadingRegressionTest
git add app/src/main/java/mom/agnes/tv/image app/src/main/java/mom/agnes/tv/ui/components/TvChannelCard.kt \
  app/src/androidTest/java/mom/agnes/tv/V2ImageLoadingRegressionTest.kt
git commit -m "perf: add bounded cached TV image pipeline"
```

---

### Task 7: Build instant Live screen and stale-cache behavior

**Files:**
- Create: `app/src/main/java/mom/agnes/tv/ui/live/LiveViewModel.kt`
- Create: `app/src/main/java/mom/agnes/tv/ui/live/LiveScreen.kt`
- Modify: `app/src/main/java/mom/agnes/tv/app/AgnesTvApp.kt`
- Test: `app/src/androidTest/java/mom/agnes/tv/V2StaleCacheRegressionTest.kt`

**Interfaces:**

```kotlin
data class LiveUiState(
    val channels: List<LiveChannelEntity> = emptyList(),
    val refreshing: Boolean = false,
    val stale: Boolean = false,
    val message: String? = null
)
```

- [ ] **Step 1: Write failing stale-cache UI test**

Seed Room with two channels. Delay provider response 30 seconds. Launch Live and require both cached names to appear within 2 seconds while `ΕΝΗΜΕΡΩΣΗ…` is visible.

- [ ] **Step 2: Run RED**

Expected: FAIL because v2 Live screen does not exist.

- [ ] **Step 3: Implement ViewModel**

Collect repository `snapshot` using `stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), LiveUiState())`. Trigger one refresh from ViewModel initialization/explicit refresh intent; never from composable recomposition.

- [ ] **Step 4: Implement locked Live layout**

Use a dense `LazyColumn`, not a grid. Each 88.dp row contains:

- 112×63-ish logo region;
- channel name;
- current programme text if present;
- `Δεν υπάρχει EPG` only when programme metadata is absent;
- full-row focus surface using the Task 5 contract.

Keep cached rows on screen while refreshing. Use `TvLoadingStatus` as a small status overlay/header, never a fullscreen spinner.

- [ ] **Step 5: Run GREEN and commit**

```bash
gradle :app:connectedDebugAndroidTest \
  -Pandroid.testInstrumentationRunnerArguments.class=mom.agnes.tv.V2StaleCacheRegressionTest
git add app/src/main/java/mom/agnes/tv/ui/live app/src/main/java/mom/agnes/tv/app/AgnesTvApp.kt \
  app/src/androidTest/java/mom/agnes/tv/V2StaleCacheRegressionTest.kt
git commit -m "feat: add instant cache-first Live IPTV"
```

---

### Task 8: Isolate Media3 player and restore exact Live focus on Back

**Files:**
- Create: `app/src/main/java/mom/agnes/tv/ui/player/PlayerRequest.kt`
- Create: `app/src/main/java/mom/agnes/tv/ui/player/PlayerController.kt`
- Create: `app/src/main/java/mom/agnes/tv/ui/player/PlayerScreen.kt`
- Modify: `app/src/main/java/mom/agnes/tv/ui/live/LiveScreen.kt`
- Modify: `app/src/main/java/mom/agnes/tv/app/AgnesTvApp.kt`
- Test: `app/src/androidTest/java/mom/agnes/tv/V2LivePlayerFlowTest.kt`

**Interfaces:**

```kotlin
data class PlayerRequest(val title: String, val url: String, val stableKey: String)

@Composable
fun PlayerScreen(request: PlayerRequest, onBack: () -> Unit)
```

- [ ] **Step 1: Write failing route/focus test**

Use a debug player seam/local fake media source so external streaming is not needed:

```kotlin
@Test
fun liveEnterPlayerBackRestoresSameRowFocus() {
    launchLiveWithCachedChannels(20)
    compose.onNodeWithTag("channel-7").performClick()
    compose.onNodeWithTag("player-surface").assertExists()

    device.pressBack()
    compose.waitForIdle()
    compose.onNodeWithTag("channel-7").assertIsFocused()
}
```

- [ ] **Step 2: Run RED**

Expected: FAIL.

- [ ] **Step 3: Implement player lifecycle**

`PlayerController` creates one `ExoPlayer`, sets a `MediaItem`, calls `prepare()`, and releases on screen disposal. Player errors show two TV-focusable actions: `ΞΑΝΑ` and `ΠΙΣΩ`.

- [ ] **Step 4: Implement exact focus restoration**

Before player navigation, save `stableKey = "channel-$streamId"` and list index. On Back, restore list scroll position first, then request focus for the matching row via its registered `FocusRequester` after composition.

- [ ] **Step 5: Run GREEN and commit**

```bash
gradle :app:connectedDebugAndroidTest \
  -Pandroid.testInstrumentationRunnerArguments.class=mom.agnes.tv.V2LivePlayerFlowTest
git add app/src/main/java/mom/agnes/tv/ui/player app/src/main/java/mom/agnes/tv/ui/live \
  app/src/main/java/mom/agnes/tv/app/AgnesTvApp.kt \
  app/src/androidTest/java/mom/agnes/tv/V2LivePlayerFlowTest.kt
git commit -m "feat: isolate TV player and restore Live focus"
```

---

### Task 9: Build a Live-first Home that never waits for VOD

**Files:**
- Create: `app/src/main/java/mom/agnes/tv/ui/home/HomeViewModel.kt`
- Create: `app/src/main/java/mom/agnes/tv/ui/home/HomeScreen.kt`
- Modify: `app/src/main/java/mom/agnes/tv/app/AgnesTvApp.kt`
- Test: `app/src/androidTest/java/mom/agnes/tv/V2HomeRegressionTest.kt`

**Interfaces:**
- Home consumes only cached/live repository state in Phase 1.

- [ ] **Step 1: Write failing delayed-network Home test**

Seed cached Live channels, delay network 30 seconds, launch Home, and assert within 2 seconds:

```text
AGNES TV
ΖΩΝΤΑΝΑ ΤΩΡΑ
LIVE ΚΑΝΑΛΙΑ
<cached channel name>
```

- [ ] **Step 2: Run RED**

Expected: FAIL.

- [ ] **Step 3: Implement deterministic featured selection**

Choose the first cached channel in repository sort order with nonblank `currentProgramme`; if none has programme metadata, choose the first cached channel. If cache is empty, hero says `ΖΩΝΤΑΝΑ` with refresh status but shell remains fully usable.

- [ ] **Step 4: Implement premium Phase 1 Home**

One dominant Live hero plus one `LIVE ΚΑΝΑΛΙΑ` horizontal rail. No Movie/Kids/Sports placeholder sections yet.

- [ ] **Step 5: Run GREEN and commit**

```bash
gradle :app:connectedDebugAndroidTest \
  -Pandroid.testInstrumentationRunnerArguments.class=mom.agnes.tv.V2HomeRegressionTest
git add app/src/main/java/mom/agnes/tv/ui/home app/src/main/java/mom/agnes/tv/app/AgnesTvApp.kt \
  app/src/androidTest/java/mom/agnes/tv/V2HomeRegressionTest.kt
git commit -m "feat: add Live-first premium Home"
```

---

### Task 10: Add startup and in-process memory stress gates

**Files:**
- Modify: `.github/workflows/android-instrumentation.yml`
- Create: `app/src/androidTest/java/mom/agnes/tv/V2PerformanceRegressionTest.kt`

**Interfaces:**
- Produces measured startup and memory assertions inside the target app process plus TV-profile CI evidence.

- [ ] **Step 1: Lock CI to TV profile**

Workflow emulator runner must contain:

```yaml
api-level: 35
target: google_apis
arch: x86_64
profile: tv_1080p
```

Before instrumentation, run `adb shell wm size` and save it to the report. Fail if the physical size is not 1920×1080.

- [ ] **Step 2: Add delayed-network startup measurement**

Measure elapsed time from Activity launch until `v2-shell` exists while all provider responses are delayed 30 seconds. CI regression ceiling is 2,000 ms; report measured value. Product goal remains cached Home under 1 second on target hardware.

- [ ] **Step 3: Add 1,000-channel navigation stress test**

Seed Room directly with 1,000 channels. Navigate/scroll through repeated D-pad sequences and return to top. No synthetic 1,000-item provider JSON is needed for this UI-memory test; streaming-parser scale is already covered in Task 3.

- [ ] **Step 4: Measure memory inside instrumentation process**

At end of the stress sequence:

```kotlin
val info = Debug.MemoryInfo()
Debug.getMemoryInfo(info)
val totalPssKb = info.totalPss
assertTrue("PSS=$totalPssKb KB", totalPssKb < 220 * 1024)
```

Log the exact PSS. `220 MB` is a regression ceiling for the emulator, not the product target; spec target remains comfortably below the 256 MB device growth limit and practically below ~160 MB where runtime/device permit.

- [ ] **Step 5: Run full Phase 1 suite**

```bash
gradle testDebugUnitTest connectedDebugAndroidTest --stacktrace
```

Expected: all tests green, no skipped failure gate.

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/android-instrumentation.yml \
  app/src/androidTest/java/mom/agnes/tv/V2PerformanceRegressionTest.kt
git commit -m "test: gate v2 TV startup and memory performance"
```

---

### Task 11: Retire the v1.8.0 presentation path and verify privacy/auth

**Files:**
- Modify: `app/src/main/java/mom/agnes/tv/MainActivity.kt`
- Delete old v1.8.0 presentation helpers only after references are zero.
- Preserve: `LoginActivity.kt`, `PrefillConfig.kt`, validated endpoint/auth behavior.

**Interfaces:**
- Produces one presentation architecture only: v2.

- [ ] **Step 1: Search references before deletion**

```bash
git grep -n -E 'fun (TvShell|VodScreen|RemotePoster|PlayerScreen)' -- app/src/main/java
```

Classify each match as old or v2. Delete only old symbols with no consumers.

- [ ] **Step 2: Remove old prototype UI/manual image path**

After extraction, `MainActivity.kt` must remain a small Activity entry point. Delete old Material3 prototype navigation/VOD/manual bitmap code rather than leaving two implementations.

- [ ] **Step 3: Verify no private prefill asset is tracked**

```bash
if git ls-files | grep -q 'agnes_prefill.properties'; then
  echo 'ERROR: private prefill asset is tracked'
  exit 1
fi
```

Do not print credential values in logs.

- [ ] **Step 4: Run auth + full v2 suite**

```bash
gradle testDebugUnitTest connectedDebugAndroidTest --stacktrace
```

Required: stale verified-pref/auth regression remains green; private prefill code path remains supported but no real private asset exists in Git.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: retire v1 presentation architecture"
```

---

### Task 12: Phase 1 verification checkpoint

**Files:**
- Create: `validation/v2.0.0-foundation-live.txt`

**Interfaces:**
- Produces the exact tested SHA/evidence that Sports/VOD plans may build on.

- [ ] **Step 1: Run fresh complete verification**

From the isolated implementation worktree:

```bash
git status --short
gradle clean assembleDebug testDebugUnitTest connectedDebugAndroidTest --stacktrace
```

Expected: clean tree before run; build/tests success.

- [ ] **Step 2: Verify required evidence**

Reports/logs must explicitly prove:

```text
TV profile: tv_1080p / 1920x1080
shell visible with provider delayed
cached Live remains visible while refresh fails/delays
focus contract passes
image cache/focus regression passes
Live -> Player -> Back restores same row focus
Home renders cached Live without VOD
1,000-channel stress passes
in-process memory PSS below regression ceiling
login/auth regressions pass
```

- [ ] **Step 3: Write validation report with actual values**

Format:

```text
commit: <exact tested SHA>
build: success
unit tests: <actual count>, 0 failed
TV instrumentation: <actual count>, 0 failed
profile: tv_1080p / 1920x1080
delayed-network shell elapsed_ms: <actual>
live cache-first: pass
player/back focus restore: pass
stress channels: 1000
memory total_pss_kb: <actual>
private credential file tracked: no
```

- [ ] **Step 4: Commit evidence**

```bash
git add validation/v2.0.0-foundation-live.txt
git commit -m "docs: record AGNES TV v2 foundation validation"
```

Phase 1 ends here. Do **not** create or hand off a final private user APK from this checkpoint. Next plans, in order, are: (1) Sports/EPG, (2) Movies + Kids + Greek subtitle verification, (3) full-product performance/release/private all-in-one packaging.
