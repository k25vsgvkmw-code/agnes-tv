package mom.agnes.tv

import mom.agnes.tv.data.cache.LiveChannelDaoTest
import mom.agnes.tv.data.xtream.XtreamConfigPreferencesTest
import org.junit.runner.RunWith
import org.junit.runners.Suite

@RunWith(Suite::class)
@Suite.SuiteClasses(
    V2StartupRegressionTest::class,
    LiveChannelDaoTest::class,
    XtreamConfigPreferencesTest::class
)
class V2RegressionSuite
