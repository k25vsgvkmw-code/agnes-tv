package mom.agnes.tv

import android.content.Context
import androidx.compose.ui.test.hasTestTag
import androidx.compose.ui.test.junit4.createEmptyComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import okhttp3.mockwebserver.Dispatcher
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import okhttp3.mockwebserver.RecordedRequest
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import java.util.concurrent.TimeUnit

@RunWith(AndroidJUnit4::class)
class V2StartupRegressionTest {
    @get:Rule
    val compose = createEmptyComposeRule()

    private lateinit var server: MockWebServer
    private lateinit var target: Context

    @Before
    fun setUp() {
        target = InstrumentationRegistry.getInstrumentation().targetContext
        server = MockWebServer()
        server.start()
    }

    @After
    fun tearDown() {
        target.getSharedPreferences("agnes_xtream", Context.MODE_PRIVATE).edit().clear().commit()
        server.shutdown()
    }

    @Test
    fun shellRendersBeforeNetworkCompletes() {
        server.dispatcher = object : Dispatcher() {
            override fun dispatch(request: RecordedRequest): MockResponse =
                MockResponse()
                    .setBodyDelay(30, TimeUnit.SECONDS)
                    .setHeader("Content-Type", "application/json")
                    .setBody("[]")
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

    private fun seedVerifiedConfig(serverUrl: String) {
        target.getSharedPreferences("agnes_xtream", Context.MODE_PRIVATE).edit()
            .putString("server", serverUrl)
            .putString("username", "tester")
            .putString("password", "secret")
            .putBoolean("verified", true)
            .commit()
    }
}
