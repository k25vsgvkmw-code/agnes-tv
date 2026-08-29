package mom.agnes.tv

import android.content.Context
import androidx.compose.ui.test.assertIsFocused
import androidx.compose.ui.test.assertIsNotSelected
import androidx.compose.ui.test.assertIsSelected
import androidx.compose.ui.test.junit4.createEmptyComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.UiDevice
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class V2TvFocusRegressionTest {
    @get:Rule
    val compose = createEmptyComposeRule()

    private lateinit var target: Context
    private lateinit var device: UiDevice

    @Before
    fun setUp() {
        target = InstrumentationRegistry.getInstrumentation().targetContext
        device = UiDevice.getInstance(InstrumentationRegistry.getInstrumentation())
        target.getSharedPreferences("agnes_xtream", Context.MODE_PRIVATE).edit()
            .putString("server", "http://127.0.0.1:65530")
            .putString("username", "tester")
            .putString("password", "secret")
            .putBoolean("verified", true)
            .commit()
    }

    @After
    fun tearDown() {
        target.getSharedPreferences("agnes_xtream", Context.MODE_PRIVATE).edit().clear().commit()
    }

    @Test
    fun dpadFocusAndSelectedSectionAreUnmistakable() {
        ActivityScenario.launch(MainActivity::class.java).use {
            compose.waitForIdle()
            compose.onNodeWithTag("nav-HOME").assertIsFocused().assertIsSelected()

            device.pressDPadDown()
            compose.waitForIdle()
            compose.onNodeWithTag("nav-LIVE").assertIsFocused().assertIsNotSelected()

            device.pressEnter()
            compose.waitForIdle()
            compose.onNodeWithTag("nav-LIVE").assertIsSelected()
        }
    }
}
