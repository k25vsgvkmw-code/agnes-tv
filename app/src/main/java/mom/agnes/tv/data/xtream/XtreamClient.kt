package mom.agnes.tv.data.xtream

import com.google.gson.stream.JsonReader
import com.google.gson.stream.JsonToken
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.nio.charset.StandardCharsets

class XtreamClient {
    suspend fun fetchLiveChannels(config: XtreamConfig): List<LiveChannelRemote> = withContext(Dispatchers.IO) {
        val url = URL(
            "${config.server.trimEnd('/')}/player_api.php" +
                "?username=${encode(config.username)}" +
                "&password=${encode(config.password)}" +
                "&action=get_live_streams"
        )
        val connection = (url.openConnection() as HttpURLConnection).apply {
            connectTimeout = 7_000
            readTimeout = 7_000
            requestMethod = "GET"
        }

        try {
            val code = connection.responseCode
            require(code in 200..299) { "Xtream live request failed: HTTP $code" }

            InputStreamReader(connection.inputStream, StandardCharsets.UTF_8).use { input ->
                JsonReader(input).use { reader ->
                    parseLiveChannels(reader)
                }
            }
        } finally {
            connection.disconnect()
        }
    }

    private fun parseLiveChannels(reader: JsonReader): List<LiveChannelRemote> {
        val channels = ArrayList<LiveChannelRemote>(256)
        reader.beginArray()
        while (reader.hasNext() && channels.size < MAX_LIVE_CHANNELS) {
            var streamId: Int? = null
            var name = ""
            var logoUrl = ""

            reader.beginObject()
            while (reader.hasNext()) {
                when (reader.nextName()) {
                    "stream_id" -> streamId = readInt(reader)
                    "name" -> name = readString(reader)
                    "stream_icon" -> logoUrl = readString(reader)
                    else -> reader.skipValue()
                }
            }
            reader.endObject()

            val id = streamId
            if (id != null && id > 0 && name.isNotBlank()) {
                channels += LiveChannelRemote(id, name, logoUrl)
            }
        }
        return channels
    }

    private fun readInt(reader: JsonReader): Int? = when (reader.peek()) {
        JsonToken.NUMBER -> reader.nextInt()
        JsonToken.STRING -> reader.nextString().toIntOrNull()
        JsonToken.NULL -> {
            reader.nextNull()
            null
        }
        else -> {
            reader.skipValue()
            null
        }
    }

    private fun readString(reader: JsonReader): String = when (reader.peek()) {
        JsonToken.STRING -> reader.nextString()
        JsonToken.NUMBER -> reader.nextString()
        JsonToken.NULL -> {
            reader.nextNull()
            ""
        }
        else -> {
            reader.skipValue()
            ""
        }
    }

    private fun encode(value: String): String =
        URLEncoder.encode(value, StandardCharsets.UTF_8.toString())

    private companion object {
        const val MAX_LIVE_CHANNELS = 3_000
    }
}
