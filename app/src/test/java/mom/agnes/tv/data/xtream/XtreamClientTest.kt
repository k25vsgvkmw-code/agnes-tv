package mom.agnes.tv.data.xtream

import com.squareup.okhttp.mockwebserver.MockResponse
import com.squareup.okhttp.mockwebserver.MockWebServer
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test

class XtreamClientTest {
    private lateinit var server: MockWebServer
    private lateinit var client: XtreamClient

    @Before
    fun setUp() {
        server = MockWebServer()
        server.start()
        client = XtreamClient()
    }

    @After
    fun tearDown() {
        server.shutdown()
    }

    @Test
    fun fetchLiveChannelsUsesGetLiveStreamsAndStreamingParser() = runTest {
        server.enqueue(
            MockResponse()
                .setHeader("Content-Type", "application/json")
                .setBody("""[
                    {"stream_id":11,"name":"Channel A","stream_icon":"a.png"},
                    {"stream_id":12,"name":"Channel B","stream_icon":"b.png"}
                ]""".trimIndent())
        )

        val result = client.fetchLiveChannels(config())

        assertEquals(listOf(11, 12), result.map { it.streamId })
        assertEquals("get_live_streams", server.takeRequest().requestUrl!!.queryParameter("action"))
    }

    @Test
    fun largeLiveCatalogueIsCappedAtThreeThousandRows() = runTest {
        val payload = buildString {
            append('[')
            repeat(10_000) { index ->
                if (index > 0) append(',')
                append("{\"stream_id\":${index + 1},\"name\":\"Channel ${index + 1}\",\"stream_icon\":\"\"}")
            }
            append(']')
        }
        server.enqueue(MockResponse().setBody(payload))

        val result = client.fetchLiveChannels(config())

        assertEquals(3_000, result.size)
        assertEquals(1, result.first().streamId)
        assertEquals(3_000, result.last().streamId)
    }

    private fun config(): XtreamConfig = XtreamConfig(
        server = server.url("/").toString().trimEnd('/'),
        username = "tester",
        password = "secret"
    )
}
