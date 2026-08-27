package mom.agnes.tv

import android.content.Context
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.createEmptyComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
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
class VodMemoryRegressionTest {

    @get:Rule
    val compose = createEmptyComposeRule()

    private lateinit var server: MockWebServer
    private lateinit var target: Context
    private val requestPaths = mutableListOf<String>()

    @Before
    fun setUp() {
        target = InstrumentationRegistry.getInstrumentation().targetContext
        target.getSharedPreferences("agnes_xtream", Context.MODE_PRIVATE).edit().clear().commit()
        requestPaths.clear()

        server = MockWebServer()
        server.dispatcher = dispatcher()
        server.start()

        target.getSharedPreferences("agnes_xtream", Context.MODE_PRIVATE).edit()
            .putString("server", server.url("/").toString().trimEnd('/'))
            .putString("username", "tester")
            .putString("password", "secret")
            .putBoolean("verified", true)
            .commit()
    }

    @After
    fun tearDown() {
        target.getSharedPreferences("agnes_xtream", Context.MODE_PRIVATE).edit().clear().commit()
        server.shutdown()
    }

    @Test
    fun moviesUseCategoryScopedVodRequestAndExplicitGreekStatus() {
        ActivityScenario.launch(MainActivity::class.java).use {
            compose.waitUntil(12_000) {
                compose.onAllNodes(hasText("ΟΛΟΙ ΟΙ ΑΓΩΝΕΣ ΣΗΜΕΡΑ")).fetchSemanticsNodes().isNotEmpty()
            }

            compose.onNodeWithText("🎬 ΤΑΙΝΙΕΣ").performClick()
            compose.waitUntil(12_000) {
                compose.onAllNodes(hasText("AGNES CINEMA")).fetchSemanticsNodes().isNotEmpty()
            }

            assertTrue(
                compose.onAllNodes(hasText("Πιθανόν Ελληνικά", substring = true)).fetchSemanticsNodes().isNotEmpty()
            )

            val paths = synchronized(requestPaths) { requestPaths.toList() }
            assertTrue(paths.any { it.contains("action=get_vod_streams") && it.contains("category_id=10") })
            assertFalse(paths.any { it.contains("action=get_vod_streams") && !it.contains("category_id=") })
        }
    }

    @Test
    fun kidsUseCategoryScopedVodRequest() {
        ActivityScenario.launch(MainActivity::class.java).use {
            compose.waitUntil(12_000) {
                compose.onAllNodes(hasText("ΟΛΟΙ ΟΙ ΑΓΩΝΕΣ ΣΗΜΕΡΑ")).fetchSemanticsNodes().isNotEmpty()
            }

            compose.onNodeWithText("🧸 ΠΑΙΔΙΚΑ").performClick()
            compose.waitUntil(12_000) {
                compose.onAllNodes(hasText("AGNES KIDS")).fetchSemanticsNodes().isNotEmpty()
            }

            val paths = synchronized(requestPaths) { requestPaths.toList() }
            assertTrue(paths.any { it.contains("action=get_vod_streams") && it.contains("category_id=20") })
            assertFalse(paths.any { it.contains("action=get_vod_streams") && !it.contains("category_id=") })
        }
    }

    private fun dispatcher(): Dispatcher = object : Dispatcher() {
        override fun dispatch(request: RecordedRequest): MockResponse {
            synchronized(requestPaths) { requestPaths += request.path.orEmpty() }
            val path = request.requestUrl?.encodedPath.orEmpty()
            val action = request.requestUrl?.queryParameter("action")
            val categoryId = request.requestUrl?.queryParameter("category_id")

            if (path == "/player_api.php" && action == null) {
                return json("""{"user_info":{"auth":1,"status":"Active"}}""")
            }

            if (path == "/player_api.php" && action == "get_live_streams") {
                return json("""[{"stream_id":101,"name":"Cosmote Sport 1 HD"}]""")
            }

            if (path == "/player_api.php" && action == "get_short_epg") {
                val title = Base64.getEncoder().encodeToString("Olympiacos vs Liverpool".toByteArray())
                val now = System.currentTimeMillis() / 1000L
                return json("""{"epg_listings":[{"title":"$title","start_timestamp":$now}]}""")
            }

            if (path == "/player_api.php" && action == "get_vod_categories") {
                return json(
                    """[
                      {"category_id":"10","category_name":"Greek Subs"},
                      {"category_id":"20","category_name":"Kids"},
                      {"category_id":"99","category_name":"Huge General Catalog"}
                    ]""".trimIndent()
                )
            }

            if (path == "/player_api.php" && action == "get_vod_streams") {
                return when (categoryId) {
                    "10" -> json("""[{"stream_id":201,"name":"Test Movie Greek Subs","category_id":"10","container_extension":"mp4","rating":"8.2","stream_icon":""}]""")
                    "20" -> json("""[{"stream_id":301,"name":"Kids Test Cartoon","category_id":"20","container_extension":"mp4","rating":"7.5","stream_icon":""}]""")
                    else -> json(
                        """[
                          {"stream_id":201,"name":"Test Movie Greek Subs","category_id":"10","container_extension":"mp4","rating":"8.2","stream_icon":""},
                          {"stream_id":301,"name":"Kids Test Cartoon","category_id":"20","container_extension":"mp4","rating":"7.5","stream_icon":""},
                          {"stream_id":999,"name":"Large Unrelated Catalog Entry","category_id":"99","container_extension":"mp4","rating":"5.0","stream_icon":""}
                        ]""".trimIndent()
                    )
                }
            }

            return MockResponse().setResponseCode(404)
        }
    }

    private fun json(body: String) = MockResponse()
        .setResponseCode(200)
        .setHeader("Content-Type", "application/json")
        .setBody(body)
}
