package mom.agnes.tv

import android.content.Context
import androidx.compose.ui.test.hasScrollAction
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.createEmptyComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollToNode
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import okhttp3.mockwebserver.Dispatcher
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import okhttp3.mockwebserver.RecordedRequest
import org.junit.After
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class CinematicUiRegressionTest {
    @get:Rule
    val compose = createEmptyComposeRule()

    private lateinit var server: MockWebServer
    private lateinit var target: Context

    @Before
    fun setUp() {
        target = InstrumentationRegistry.getInstrumentation().targetContext
        server = MockWebServer()
        server.dispatcher = object : Dispatcher() {
            override fun dispatch(request: RecordedRequest): MockResponse {
                val action = request.requestUrl?.queryParameter("action")
                val categoryId = request.requestUrl?.queryParameter("category_id")
                return when (action) {
                    "get_live_streams" -> json("[]")
                    "get_vod_categories" -> json("""[
                        {"category_id":"10","category_name":"Greek Subs"},
                        {"category_id":"20","category_name":"Kids"}
                    ]""".trimIndent())
                    "get_vod_streams" -> when (categoryId) {
                        "10" -> json("""[
                            {"stream_id":201,"name":"Cinema Test Movie","category_id":"10","container_extension":"mp4","rating":"8.7","stream_icon":""},
                            {"stream_id":202,"name":"Cinema Test Two","category_id":"10","container_extension":"mp4","rating":"7.9","stream_icon":""}
                        ]""".trimIndent())
                        "20" -> json("""[
                            {"stream_id":301,"name":"Kids Cinema Test","category_id":"20","container_extension":"mp4","rating":"8.1","stream_icon":""}
                        ]""".trimIndent())
                        else -> json("[]")
                    }
                    else -> MockResponse().setResponseCode(404)
                }
            }
        }
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
    fun moviesUseCinematicHeroAndHorizontalRails() {
        ActivityScenario.launch(MainActivity::class.java).use {
            compose.onNodeWithText("🎬 ΤΑΙΝΙΕΣ").performClick()
            compose.waitUntil(10_000) {
                compose.onAllNodes(hasText("AGNES CINEMA")).fetchSemanticsNodes().isNotEmpty()
            }
            assertTrue(compose.onAllNodes(hasText("AGNES CINEMA")).fetchSemanticsNodes().isNotEmpty())
            assertTrue(compose.onAllNodes(hasText("ΓΙΑ ΑΠΟΨΕ")).fetchSemanticsNodes().isNotEmpty())

            compose.onNode(hasScrollAction())
                .performScrollToNode(hasText("ΚΑΛΥΤΕΡΗ ΒΑΘΜΟΛΟΓΙΑ"))
            assertTrue(compose.onAllNodes(hasText("ΚΑΛΥΤΕΡΗ ΒΑΘΜΟΛΟΓΙΑ")).fetchSemanticsNodes().isNotEmpty())
        }
    }

    @Test
    fun kidsUseCinematicHeroAndRails() {
        ActivityScenario.launch(MainActivity::class.java).use {
            compose.onNodeWithText("🧸 ΠΑΙΔΙΚΑ").performClick()
            compose.waitUntil(10_000) {
                compose.onAllNodes(hasText("AGNES KIDS")).fetchSemanticsNodes().isNotEmpty()
            }
            assertTrue(compose.onAllNodes(hasText("AGNES KIDS")).fetchSemanticsNodes().isNotEmpty())
            assertTrue(compose.onAllNodes(hasText("ΓΙΑ ΠΑΙΔΙΑ")).fetchSemanticsNodes().isNotEmpty())
        }
    }

    private fun json(body: String) = MockResponse()
        .setResponseCode(200)
        .setHeader("Content-Type", "application/json")
        .setBody(body)
}
