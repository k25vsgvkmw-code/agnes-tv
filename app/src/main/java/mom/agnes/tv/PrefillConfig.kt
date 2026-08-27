package mom.agnes.tv

import android.content.Context

internal data class PrefillConfig(
    val server: String = "",
    val username: String = "",
    val password: String = ""
)

internal fun loadPrefillConfig(context: Context): PrefillConfig {
    return runCatching {
        val text = context.assets.open("agnes_prefill.properties")
            .bufferedReader()
            .use { it.readText() }
        parsePrefillConfig(text)
    }.getOrDefault(PrefillConfig())
}

internal fun parsePrefillConfig(text: String): PrefillConfig {
    val values = text.lineSequence()
        .map { it.trim() }
        .filter { it.isNotBlank() && !it.startsWith("#") && it.contains('=') }
        .associate { line ->
            val key = line.substringBefore('=').trim()
            val value = line.substringAfter('=').trim()
            key to value
        }

    return PrefillConfig(
        server = values["server"].orEmpty().trim().trimEnd('/'),
        username = values["username"].orEmpty().trim(),
        password = values["password"].orEmpty()
    )
}
