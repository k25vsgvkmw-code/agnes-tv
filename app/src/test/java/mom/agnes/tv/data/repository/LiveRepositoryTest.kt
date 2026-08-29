package mom.agnes.tv.data.repository

import kotlinx.coroutines.async
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import mom.agnes.tv.data.cache.LiveChannelDao
import mom.agnes.tv.data.cache.LiveChannelEntity
import mom.agnes.tv.data.xtream.XtreamClient
import mom.agnes.tv.data.xtream.XtreamConfig
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import java.util.concurrent.TimeUnit

class LiveRepositoryTest {
    private lateinit var server: MockWebServer
    private lateinit var dao: FakeLiveChannelDao
    private lateinit var repository: LiveRepository

    @Before
    fun setUp() {
        server = MockWebServer()
        server.start()
        dao = FakeLiveChannelDao()
        repository = LiveRepository(dao, XtreamClient(), clock = { 1_000L })
    }

    @After
    fun tearDown() {
        server.shutdown()
    }

    @Test
    fun refreshFailureKeepsCachedChannelsVisible() = runTest {
        dao.replaceAll(listOf(entity(1, "Cached One")))
        server.enqueue(MockResponse().setResponseCode(503).setBody("provider slow"))

        repository.refresh(config())
        val state = repository.snapshot.first { !it.refreshing }

        assertEquals("Cached One", state.channels.single().name)
        assertTrue(state.stale)
        assertNotNull(state.lastError)
    }

    @Test
    fun oldCacheStaysVisibleUntilSuccessfulRefreshReplacesIt() = runTest {
        dao.replaceAll(listOf(entity(1, "Cached One")))
        server.enqueue(
            MockResponse()
                .setHeader("Content-Type", "application/json")
                .setBodyDelay(250, TimeUnit.MILLISECONDS)
                .setBody("""[{"stream_id":7,"name":"Fresh Seven","stream_icon":"seven.png"}]""")
        )

        val refresh = async { repository.refresh(config()) }
        val refreshing = repository.snapshot.first { it.refreshing }

        assertEquals("Cached One", refreshing.channels.single().name)

        refresh.await()
        val done = repository.snapshot.first { !it.refreshing && it.channels.any { channel -> channel.streamId == 7 } }
        assertEquals(listOf(7), done.channels.map { it.streamId })
        assertFalse(done.stale)
        assertEquals(null, done.lastError)
    }

    private fun config() = XtreamConfig(
        server = server.url("/").toString().trimEnd('/'),
        username = "tester",
        password = "secret"
    )

    private fun entity(id: Int, name: String) = LiveChannelEntity(
        streamId = id,
        name = name,
        logoUrl = "",
        currentProgramme = null,
        refreshedAt = 100L,
        sortKey = id
    )
}

private class FakeLiveChannelDao : LiveChannelDao {
    private val rows = MutableStateFlow<List<LiveChannelEntity>>(emptyList())

    override fun observeAll(): Flow<List<LiveChannelEntity>> = rows
    override suspend fun getAll(): List<LiveChannelEntity> = rows.value
    override suspend fun upsertAll(items: List<LiveChannelEntity>) {
        rows.value = (rows.value.associateBy { it.streamId } + items.associateBy { it.streamId })
            .values.sortedWith(compareBy<LiveChannelEntity> { it.sortKey }.thenBy { it.name })
    }
    override suspend fun clear() {
        rows.value = emptyList()
    }
    override suspend fun replaceAll(items: List<LiveChannelEntity>) {
        rows.value = items.sortedWith(compareBy<LiveChannelEntity> { it.sortKey }.thenBy { it.name })
    }
}
