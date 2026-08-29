package mom.agnes.tv.data.xtream

import android.content.Context

private const val XTREAM_PREFS = "agnes_xtream"
private const val KEY_SERVER = "server"
private const val KEY_USERNAME = "username"
private const val KEY_PASSWORD = "password"
private const val KEY_VERIFIED = "verified"

data class XtreamConfig(
    val server: String,
    val username: String,
    val password: String
)

fun saveVerifiedXtreamConfig(context: Context, config: XtreamConfig) {
    context.getSharedPreferences(XTREAM_PREFS, Context.MODE_PRIVATE).edit()
        .putString(KEY_SERVER, config.server.trim().trimEnd('/'))
        .putString(KEY_USERNAME, config.username)
        .putString(KEY_PASSWORD, config.password)
        .putBoolean(KEY_VERIFIED, true)
        .commit()
}

fun loadVerifiedXtreamConfig(context: Context): XtreamConfig? {
    val prefs = context.getSharedPreferences(XTREAM_PREFS, Context.MODE_PRIVATE)
    if (!prefs.getBoolean(KEY_VERIFIED, false)) return null

    val server = prefs.getString(KEY_SERVER, null).orEmpty().trim().trimEnd('/')
    val username = prefs.getString(KEY_USERNAME, null).orEmpty()
    val password = prefs.getString(KEY_PASSWORD, null).orEmpty()
    if (server.isBlank() || username.isBlank() || password.isBlank()) return null

    return XtreamConfig(server, username, password)
}
