package mom.agnes.tv

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.view.KeyEvent
import android.view.inputmethod.InputMethodManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import mom.agnes.tv.data.xtream.XtreamConfig
import mom.agnes.tv.data.xtream.loadVerifiedXtreamConfig
import mom.agnes.tv.data.xtream.saveVerifiedXtreamConfig
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

/* Public fallback only. Personalized APKs use a private asset added after CI build. */
private const val DEFAULT_USERNAME = "USER00000000"

private val DEFAULT_SERVER_CANDIDATES = listOf(
    "http://comepitv.online",
    "http://comepitv.online:8080",
    "http://comepitv.online:2095"
)

class LoginActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        if (hasSavedXtream()) {
            openAgnesTv()
            return
        }

        var prefill = loadPrefillConfig(this)
        if (BuildConfig.DEBUG) {
            val testUsername = intent.getStringExtra(EXTRA_TEST_USERNAME)
            val testPassword = intent.getStringExtra(EXTRA_TEST_PASSWORD)
            if (!testUsername.isNullOrBlank() || testPassword != null) {
                prefill = prefill.copy(
                    username = testUsername?.takeIf { it.isNotBlank() } ?: prefill.username,
                    password = testPassword ?: prefill.password
                )
            }
        }

        val username = prefill.username.ifBlank { DEFAULT_USERNAME }
        val prefillCandidates = prefill.server.takeIf { it.isNotBlank() }
            ?.let { listOf(it) + DEFAULT_SERVER_CANDIDATES }
            ?: DEFAULT_SERVER_CANDIDATES

        val candidates = if (BuildConfig.DEBUG) {
            intent.getStringArrayExtra(EXTRA_TEST_SERVERS)?.toList()?.filter { it.isNotBlank() }
                ?.takeIf { it.isNotEmpty() } ?: prefillCandidates
        } else {
            prefillCandidates
        }

        setContent {
            MaterialTheme(colorScheme = darkColorScheme()) {
                TvXtreamLogin(
                    serverCandidates = candidates,
                    username = username,
                    initialPassword = prefill.password,
                    autoConnect = prefill.username.isNotBlank() && prefill.password.isNotBlank(),
                    onVerified = { server, password ->
                        saveVerifiedXtreamConfig(
                            this@LoginActivity,
                            XtreamConfig(server, username, password)
                        )
                        openAgnesTv()
                    }
                )
            }
        }
    }

    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        if (event.action == KeyEvent.ACTION_DOWN &&
            (event.keyCode == KeyEvent.KEYCODE_DPAD_DOWN || event.keyCode == KeyEvent.KEYCODE_DPAD_UP)
        ) {
            currentFocus?.let { focusedView ->
                (getSystemService(Context.INPUT_METHOD_SERVICE) as? InputMethodManager)
                    ?.hideSoftInputFromWindow(focusedView.windowToken, 0)
            }
        }
        return super.dispatchKeyEvent(event)
    }

    private fun hasSavedXtream(): Boolean = loadVerifiedXtreamConfig(this) != null

    private fun openAgnesTv() {
        startActivity(Intent(this, MainActivity::class.java))
        finish()
    }

    companion object {
        const val EXTRA_TEST_SERVERS = "agnes_test_servers"
        const val EXTRA_TEST_USERNAME = "agnes_test_username"
        const val EXTRA_TEST_PASSWORD = "agnes_test_password"
    }
}

private val LoginBg = Color(0xFF040810)
private val LoginPanel = Color(0xFF0B1420)
private val LoginPurple = Color(0xFF9B4DFF)
private val LoginGreen = Color(0xFF78FF50)
private val LoginMuted = Color(0xFF98A6B8)
private val LoginError = Color(0xFFFF8E8E)

@Composable
private fun TvXtreamLogin(
    serverCandidates: List<String>,
    username: String,
    initialPassword: String,
    autoConnect: Boolean,
    onVerified: (String, String) -> Unit
) {
    var password by remember(initialPassword) { mutableStateOf(initialPassword) }
    var checking by remember { mutableStateOf(false) }
    var status by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    val passwordFocus = remember { FocusRequester() }
    val connectFocus = remember { FocusRequester() }

    fun submit() {
        if (password.isBlank() || checking) return
        checking = true
        status = "Ελέγχω τη σύνδεση XTREAM…"
        scope.launch {
            val server = discoverXtreamServer(serverCandidates, username, password)
            checking = false
            if (server != null) {
                status = "Η σύνδεση επιβεβαιώθηκε."
                onVerified(server, password)
            } else {
                status = "Δεν έγινε επιβεβαίωση XTREAM. Έλεγξε το Password."
                passwordFocus.requestFocus()
            }
        }
    }

    LaunchedEffect(autoConnect, initialPassword) {
        if (autoConnect && initialPassword.isNotBlank()) {
            submit()
        } else {
            passwordFocus.requestFocus()
        }
    }

    Box(
        Modifier.fillMaxSize().background(LoginBg).padding(40.dp),
        contentAlignment = Alignment.Center
    ) {
        Surface(
            color = LoginPanel,
            shape = RoundedCornerShape(28.dp),
            modifier = Modifier.width(720.dp)
        ) {
            Column(
                Modifier.padding(36.dp),
                verticalArrangement = Arrangement.spacedBy(18.dp)
            ) {
                Text("AGNES TV", color = Color.White, fontSize = 42.sp, fontWeight = FontWeight.Black)
                Text("XTREAM IPTV", color = LoginGreen, fontSize = 20.sp, fontWeight = FontWeight.Bold)
                Text(
                    if (autoConnect) "Αυτόματη σύνδεση λογαριασμού…"
                    else "Ο λογαριασμός είναι προρυθμισμένος. Γράψε μόνο το Password.",
                    color = LoginMuted,
                    fontSize = 16.sp
                )

                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it },
                    label = { Text("Password") },
                    singleLine = true,
                    enabled = !checking,
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                    keyboardActions = KeyboardActions(onDone = { submit() }),
                    modifier = Modifier
                        .fillMaxWidth()
                        .focusRequester(passwordFocus)
                        .onPreviewKeyEvent { event ->
                            if (event.type == KeyEventType.KeyDown && event.key == Key.DirectionDown) {
                                connectFocus.requestFocus()
                                true
                            } else false
                        }
                )

                Spacer(Modifier.height(2.dp))

                Button(
                    onClick = { submit() },
                    enabled = password.isNotBlank() && !checking,
                    colors = ButtonDefaults.buttonColors(containerColor = LoginPurple),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(60.dp)
                        .focusRequester(connectFocus)
                        .onPreviewKeyEvent { event ->
                            if (event.type == KeyEventType.KeyDown && event.key == Key.DirectionUp) {
                                passwordFocus.requestFocus()
                                true
                            } else false
                        }
                ) {
                    if (checking) {
                        CircularProgressIndicator(
                            modifier = Modifier.width(24.dp).height(24.dp),
                            strokeWidth = 3.dp,
                            color = Color.White
                        )
                    } else {
                        Text("ΣΥΝΔΕΣΗ", fontWeight = FontWeight.Black, fontSize = 17.sp)
                    }
                }

                status?.let {
                    Text(
                        it,
                        color = if (it.startsWith("Δεν")) LoginError else LoginGreen,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                Text("AGNES TV v${BuildConfig.VERSION_NAME}", color = LoginMuted, fontSize = 11.sp)
            }
        }
    }
}

private suspend fun discoverXtreamServer(
    candidates: List<String>,
    username: String,
    password: String
): String? = withContext(Dispatchers.IO) {
    for (candidate in candidates.distinct()) {
        val server = candidate.trim().trimEnd('/')
        val url = "$server/player_api.php?username=${encLogin(username)}&password=${encLogin(password)}"
        val ok = runCatching {
            val conn = URL(url).openConnection() as HttpURLConnection
            conn.connectTimeout = 6_000
            conn.readTimeout = 8_000
            conn.requestMethod = "GET"
            conn.instanceFollowRedirects = true
            conn.setRequestProperty("User-Agent", "AGNES-TV/${BuildConfig.VERSION_NAME}")
            try {
                if (conn.responseCode !in 200..299) return@runCatching false
                val body = conn.inputStream.bufferedReader().use { it.readText() }
                val root = JSONObject(body)
                val userInfo = root.optJSONObject("user_info") ?: return@runCatching false
                when (val auth = userInfo.opt("auth")) {
                    is Number -> auth.toInt() == 1
                    is String -> auth == "1" || auth.equals("true", ignoreCase = true)
                    is Boolean -> auth
                    else -> false
                }
            } finally {
                conn.disconnect()
            }
        }.getOrDefault(false)

        if (ok) return@withContext server
    }
    null
}

private fun encLogin(value: String): String = URLEncoder.encode(value, "UTF-8")
