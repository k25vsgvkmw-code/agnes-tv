package mom.agnes.tv

import android.content.Context
import android.content.Intent
import androidx.activity.ComponentActivity
import androidx.compose.ui.test.hasSetTextAction
import androidx.compose.ui.test.junit4.createEmptyComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTextInput
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.UiDevice
import okhttp3.mockwebserver.Dispatcher
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import okhttp3.mockwebserver.RecordedRequest
import org.junit.After
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import java.util.Base64

@RunWith(AndroidJUnit4::class)
class AgnesTvFlowTest {

    @get:Rule
    val compose = createEmptyComposeRule()

    private lateinit var server: MockWebServer
    private lateinit var target: Context
    private lateinit var device: UiDevice

    @Before
    fun setUp() {
        target = InstrumentationRegistry.getInstrumentation().targetContext
        device = UiDevice.getInstance(InstrumentationRegistry.getInstrumentation())
        target.getSharedPreferences("agnes_xtream", Context.MODE_PRIVATE).edit().clear().commit()

        server = MockWebServer()
        server.dispatcher = xtreamDispatcher()
        server.start()
    }

    @After
    fun tearDown() {
        target.getSharedPreferences("agnes_xtream", Context.MODE_PRIVATE).edit().clear().commit()
        server.shutdown()
    }

    @Test
    fun loginIsPasswordOnlyAndVerifiesBeforeOpening() {
        val intent = Intent(target, LoginActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            putExtra(LoginActivity.EXTRA_TEST_SERVERS, arrayOf(server.url("/").toString().trimEnd('/')))
        }

        ActivityScenario.launch<ComponentActivity>(intent).use {
            compose.waitUntil(10_000) {
                compose.onAllNodes(hasSetTextAction()).fetchSemanticsNodes().isNotEmpty()
            }

            assertTrue(compose.onAllNodesWithText("Username").fetchSemanticsNodes().isEmpty())
            assertTrue(compose.onAllNodesWithText("Password").fetchSemanticsNodes().isNotEmpty())

            val editable = compose.onAllNodes(hasSetTextAction())
            assertFalse(editable.fetchSemanticsNodes().isEmpty())
            editable[0].performTextInput("test-password")

            device.pressDPadDown()
            compose.waitForIdle()
            assertTrue(compose.onAllNodesWithText("ΣΥΝΔΕΣΗ").fetchSemanticsNodes().isNotEmpty())
            device.pressEnter()

            compose.waitUntil(12_000) {
                compose.onAllNodesWithText("ΟΛΟΙ ΟΙ ΑΓΩΝΕΣ ΣΗΜΕΡΑ").fetchSemanticsNodes().isNotEmpty()
            }
            assertTrue(compose.onAllNodesWithText("ΟΛΟΙ ΟΙ ΑΓΩΝΕΣ ΣΗΜΕΡΑ").fetchSemanticsNodes().isNotEmpty())
        }
    }

    @Test
    fun fullTvFlowShowsMatchesChannelsMoviesKidsAndPlayer() {
        val base = server.url("/").toString().trimEnd('/')
        target.getSharedPreferences("agnes_xtream", Context.MODE_PRIVATE).edit()
            .putString("server", base)
            .putString("username", "tester")
            .putString("password", "secret")
            .commit()

        ActivityScenario.launch(MainActivity::class.java).use {
            compose.waitUntil(15_000) {
                compose.onAllNodesWithText("Olympiacos vs Liverpool").fetchSemanticsNodes().isNotEmpty()
            }
            assertTrue(compose.onAllNodesWithText("Olympiacos vs Liverpool").fetchSemanticsNodes().isNotEmpty())
            compose.onNodeWithText("ΚΑΝΑΛΙΑ (2)").performClick()
            compose.onNodeWithText("▶ Cosmote Sport 1 HD").performClick()

            compose.waitUntil(8_000) {
                compose.onAllNodesWithText("Olympiacos vs Liverpool • Cosmote Sport 1 HD").fetchSemanticsNodes().isNotEmpty()
            }
            assertTrue(compose.onAllNodesWithText("Olympiacos vs Liverpool • Cosmote Sport 1 HD").fetchSemanticsNodes().isNotEmpty())

            device.pressBack()
            compose.waitUntil(8_000) {
                compose.onAllNodesWithText("ΟΛΟΙ ΟΙ ΑΓΩΝΕΣ ΣΗΜΕΡΑ").fetchSemanticsNodes().isNotEmpty()
            }

            compose.onNodeWithText("🎬 ΤΑΙΝΙΕΣ").performClick()
            compose.waitUntil(10_000) {
                compose.onAllNodesWithText("Test Movie Greek Subs").fetchSemanticsNodes().isNotEmpty()
            }
            compose.onNodeWithText("Test Movie Greek Subs").performClick()
            compose.waitUntil(8_000) {
                compose.onAllNodesWithText("Test Movie Greek Subs").fetchSemanticsNodes().isNotEmpty()
            }

            device.pressBack()
            compose.waitUntil(8_000) {
                compose.onAllNodesWithText("ΤΑΙΝΙΕΣ ΓΙΑ ΑΠΟΨΕ").fetchSemanticsNodes().isNotEmpty()
            }

            compose.onNodeWithText("🧸 ΠΑΙΔΙΚΑ").performClick()
            compose.waitUntil(10_000) {
                compose.onAllNodesWithText("Kids Test Cartoon").fetchSemanticsNodes().isNotEmpty()
            }
            assertTrue(compose.onAllNodesWithText("Kids Test Cartoon").fetchSemanticsNodes().isNotEmpty())

            val paths = synchronized(requestPaths) { requestPaths.toList() }
            assertTrue(paths.any { it.contains("action=get_live_streams") })
            assertTrue(paths.any { it.contains("action=get_short_epg") })
            assertTrue(paths.any { it.contains("action=get_vod_categories") })
            assertTrue(paths.any { it.contains("action=get_vod_streams") })
        }
    }

    private val requestPaths = mutableListOf<String>()

    private fun xtreamDispatcher(): Dispatcher = object : Dispatcher() {
        override fun dispatch(request: RecordedRequest): MockResponse {
            synchronized(requestPaths) { requestPaths += request.path.orEmpty() }
            val path = request.requestUrl?.encodedPath.orEmpty()
            val action = request.requestUrl?.queryParameter("action")

            if (path == "/player_api.php" && action == null) {
                return json("""{"user_info":{"auth":1,"status":"Active"},"server_info":{"url":"mock"}}""")
            }

            if (path == "/player_api.php" && action == "get_live_streams") {
                return json(
                    """[
                        {"stream_id":101,"name":"Cosmote Sport 1 HD"},
                        {"stream_id":102,"name":"Nova Sports Prime"},
                        {"stream_id":999,"name":"General Channel"}
                    ]""".trimIndent()
                )
            }

            if (path == "/player_api.php" && action == "get_short_epg") {
                val encodedTitle = Base64.getEncoder().encodeToString("Olympiacos vs Liverpool".toByteArray())
                val now = System.currentTimeMillis() / 1000L
                return json("""{"epg_listings":[{"title":"$encodedTitle","start_timestamp":$now}]}""")
            }

            if (path == "/player_api.php" && action == "get_vod_categories") {
                return json(
                    """[
                        {"category_id":"10","category_name":"Greek Subs"},
                        {"category_id":"20","category_name":"Kids"}
                    ]""".trimIndent()
                )
            }

            if (path == "/player_api.php" && action == "get_vod_streams") {
                return json(
                    """[
                        {"stream_id":201,"name":"Test Movie Greek Subs","category_id":"10","container_extension":"mp4","rating":"8.2","stream_icon":""},
                        {"stream_id":301,"name":"Kids Test Cartoon","category_id":"20","container_extension":"mp4","rating":"7.5","stream_icon":""}
                    ]""".trimIndent()
                )
            }

            if (path.startsWith("/live/") || path.startsWith("/movie/")) {
                return MockResponse()
                    .setResponseCode(200)
                    .setHeader("Content-Type", "video/mp2t")
                    .setBody("mock-media")
            }

            return MockResponse().setResponseCode(404)
        }
    }

    private fun json(body: String) = MockResponse()
        .setResponseCode(200)
        .setHeader("Content-Type", "application/json")
        .setBody(body)
}
