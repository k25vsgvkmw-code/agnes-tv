package mom.agnes.tv

import android.content.Context
import androidx.compose.ui.test.hasContentDescription
import androidx.compose.ui.test.junit4.createEmptyComposeRule
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class TvFocusRegressionTest {
    @get:Rule val compose = createEmptyComposeRule()

    private lateinit var target: Context
    private lateinit var server: MockWebServer

    @Before
    fun setUp() {
        target = InstrumentationRegistry.getInstrumentation().targetContext
        server = MockWebServer()
        server.enqueue(MockResponse().setResponseCode(200).setHeader("Content-Type", "application/json").setBody("[]"))
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
    fun selectedNavigationHasNonColorOnlyMarker() {
        ActivityScenario.launch(MainActivity::class.java).use {
            compose.waitUntil(8_000) {
                compose.onAllNodes(hasContentDescription("SELECTED: ⚽ ΑΓΩΝΕΣ")).fetchSemanticsNodes().isNotEmpty()
            }
            assertTrue(compose.onAllNodes(hasContentDescription("SELECTED: ⚽ ΑΓΩΝΕΣ")).fetchSemanticsNodes().isNotEmpty())
        }
    }
}
