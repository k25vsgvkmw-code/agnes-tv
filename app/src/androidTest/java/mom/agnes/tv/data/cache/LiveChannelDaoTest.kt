package mom.agnes.tv.data.cache

import android.content.Context
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class LiveChannelDaoTest {
    private lateinit var database: AgnesTvDatabase
    private lateinit var dao: LiveChannelDao

    @Before
    fun setUp() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        database = Room.inMemoryDatabaseBuilder(context, AgnesTvDatabase::class.java)
            .allowMainThreadQueries()
            .build()
        dao = database.liveChannelDao()
    }

    @After
    fun tearDown() {
        database.close()
    }

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
}
