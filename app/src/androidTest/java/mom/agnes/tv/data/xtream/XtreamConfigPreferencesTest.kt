package mom.agnes.tv.data.xtream

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class XtreamConfigPreferencesTest {
    private lateinit var context: Context

    @Before
    fun setUp() {
        context = ApplicationProvider.getApplicationContext()
        context.getSharedPreferences("agnes_xtream", Context.MODE_PRIVATE).edit().clear().commit()
    }

    @After
    fun tearDown() {
        context.getSharedPreferences("agnes_xtream", Context.MODE_PRIVATE).edit().clear().commit()
    }

    @Test
    fun verifiedConfigUsesExistingPreferenceContract() {
        val config = XtreamConfig("http://example.test:8080", "tester", "secret")

        saveVerifiedXtreamConfig(context, config)

        assertEquals(config, loadVerifiedXtreamConfig(context))
        val prefs = context.getSharedPreferences("agnes_xtream", Context.MODE_PRIVATE)
        assertEquals("http://example.test:8080", prefs.getString("server", null))
        assertEquals("tester", prefs.getString("username", null))
        assertEquals("secret", prefs.getString("password", null))
        assertEquals(true, prefs.getBoolean("verified", false))

        prefs.edit().remove("verified").commit()
        assertNull(loadVerifiedXtreamConfig(context))
    }
}
