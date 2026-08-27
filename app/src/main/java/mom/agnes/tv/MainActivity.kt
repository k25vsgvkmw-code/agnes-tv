package mom.agnes.tv

import android.content.Context
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Bundle
import android.util.Base64
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items as gridItems
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.window.Dialog
import androidx.media3.common.MediaItem
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme(colorScheme = darkColorScheme()) {
                AgnesTvApp()
            }
        }
    }
}

private val Bg = Color(0xFF040810)
private val Panel = Color(0xFF0B1420)
private val Panel2 = Color(0xFF111D2B)
private val Purple = Color(0xFF9B4DFF)
private val Green = Color(0xFF78FF50)
private val Red = Color(0xFFD92E35)
private val Muted = Color(0xFF98A6B8)

private enum class Tab { SPORTS, MOVIES, KIDS }

private data class XtreamConfig(val server: String, val username: String, val password: String)
private data class LiveStream(val id: Int, val name: String)
private data class MatchItem(val title: String, val startMs: Long, val channels: List<LiveStream>)
private data class VodItem(
    val id: Int,
    val name: String,
    val icon: String,
    val extension: String,
    val category: String,
    val rating: String
)
private data class PlayingItem(val title: String, val url: String)

@Composable
private fun AgnesTvApp() {
    val context = LocalContext.current
    val prefs = remember { context.getSharedPreferences("agnes_xtream", Context.MODE_PRIVATE) }
    var config by remember { mutableStateOf(loadConfig(context)) }
    var verified by remember { mutableStateOf(prefs.getBoolean("verified", false)) }
    var editing by remember { mutableStateOf(config == null) }

    if (editing || config == null) {
        SetupScreen(
            initial = config,
            onSave = {
                saveConfig(context, it)
                config = it
                verified = false
                editing = false
            }
        )
    } else {
        TvShell(config = config!!, verified = verified, onSettings = { editing = true })
    }
}

@Composable
private fun SetupScreen(initial: XtreamConfig?, onSave: (XtreamConfig) -> Unit) {
    var server by remember { mutableStateOf(initial?.server.orEmpty()) }
    var username by remember { mutableStateOf(initial?.username.orEmpty()) }
    var password by remember { mutableStateOf(initial?.password.orEmpty()) }

    Box(
        Modifier.fillMaxSize().background(Bg).padding(48.dp),
        contentAlignment = Alignment.Center
    ) {
        Surface(
            color = Panel,
            shape = RoundedCornerShape(28.dp),
            tonalElevation = 4.dp,
            modifier = Modifier.width(760.dp)
        ) {
            Column(Modifier.padding(34.dp), verticalArrangement = Arrangement.spacedBy(18.dp)) {
                Text("AGNES TV", color = Color.White, fontSize = 42.sp, fontWeight = FontWeight.Black)
                Text("Σύνδεση XTREAM IPTV", color = Green, fontSize = 20.sp, fontWeight = FontWeight.Bold)
                Text(
                    "Προχωρημένες ρυθμίσεις XTREAM. Η κατάσταση CONNECTED εμφανίζεται μόνο μετά από πραγματικό authentication.",
                    color = Muted,
                    fontSize = 15.sp
                )
                OutlinedTextField(
                    value = server,
                    onValueChange = { server = it },
                    label = { Text("Server (π.χ. http://server:port)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = username,
                    onValueChange = { username = it },
                    label = { Text("Username") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it },
                    label = { Text("Password") },
                    singleLine = true,
                    visualTransformation = PasswordVisualTransformation(),
                    modifier = Modifier.fillMaxWidth()
                )
                Button(
                    onClick = {
                        val normalized = server.trim().trimEnd('/')
                        if (normalized.isNotBlank() && username.isNotBlank() && password.isNotBlank()) {
                            onSave(XtreamConfig(normalized, username.trim(), password))
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Purple),
                    modifier = Modifier.fillMaxWidth().height(58.dp)
                ) {
                    Text("ΑΠΟΘΗΚΕΥΣΗ • ΑΠΑΙΤΕΙ ΝΕΟ VERIFY", fontWeight = FontWeight.Black)
                }
            }
        }
    }
}

@Composable
private fun TvShell(config: XtreamConfig, verified: Boolean, onSettings: () -> Unit) {
    var tab by remember { mutableStateOf(Tab.SPORTS) }
    var playing by remember { mutableStateOf<PlayingItem?>(null) }

    if (playing != null) {
        PlayerScreen(item = playing!!, onBack = { playing = null })
        return
    }

    Column(Modifier.fillMaxSize().background(Bg).padding(horizontal = 28.dp, vertical = 18.dp)) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text("AGNES TV", color = Color.White, fontSize = 34.sp, fontWeight = FontWeight.Black)
                Text(
                    if (verified) "v1.7.1 • XTREAM CONNECTED" else "v1.7.1 • XTREAM NOT VERIFIED",
                    color = if (verified) Green else Color(0xFFFFA36C),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold
                )
            }
            NavButton("⚽ ΑΓΩΝΕΣ", tab == Tab.SPORTS) { tab = Tab.SPORTS }
            Spacer(Modifier.width(10.dp))
            NavButton("🎬 ΤΑΙΝΙΕΣ", tab == Tab.MOVIES) { tab = Tab.MOVIES }
            Spacer(Modifier.width(10.dp))
            NavButton("🧸 ΠΑΙΔΙΚΑ", tab == Tab.KIDS) { tab = Tab.KIDS }
            Spacer(Modifier.width(10.dp))
            OutlinedButton(onClick = onSettings) { Text("⚙ XTREAM") }
        }

        Spacer(Modifier.height(16.dp))

        when (tab) {
            Tab.SPORTS -> SportsScreen(config = config, onPlay = { playing = it }, modifier = Modifier.weight(1f))
            Tab.MOVIES -> VodScreen(config = config, kids = false, onPlay = { playing = it }, modifier = Modifier.weight(1f))
            Tab.KIDS -> VodScreen(config = config, kids = true, onPlay = { playing = it }, modifier = Modifier.weight(1f))
        }
    }
}

@Composable
private fun NavButton(label: String, selected: Boolean, onClick: () -> Unit) {
    Button(
        onClick = onClick,
        colors = ButtonDefaults.buttonColors(containerColor = if (selected) Purple else Panel2),
        modifier = Modifier.height(52.dp)
    ) {
        Text(label, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun SportsScreen(config: XtreamConfig, onPlay: (PlayingItem) -> Unit, modifier: Modifier = Modifier) {
    var matches by remember(config) { mutableStateOf<List<MatchItem>>(emptyList()) }
    var loading by remember(config) { mutableStateOf(true) }
    var error by remember(config) { mutableStateOf<String?>(null) }
    var refresh by remember { mutableIntStateOf(0) }
    var selectedMatch by remember { mutableStateOf<MatchItem?>(null) }

    LaunchedEffect(config, refresh) {
        loading = true
        error = null
        runCatching { fetchTodaysMatches(config) }
            .onSuccess { matches = it }
            .onFailure { error = it.message ?: "Αποτυχία φόρτωσης EPG" }
        loading = false
    }

    Column(modifier.fillMaxWidth()) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text("ΟΛΟΙ ΟΙ ΑΓΩΝΕΣ ΣΗΜΕΡΑ", color = Color.White, fontSize = 30.sp, fontWeight = FontWeight.Black)
                Text(
                    when {
                        loading -> "Ψάχνω τα sports κανάλια και το EPG…"
                        error != null -> "Πρόβλημα σύνδεσης"
                        else -> "${matches.size} αγώνες • πάτησε ΔΕΣ ή ΚΑΝΑΛΙΑ"
                    },
                    color = if (error == null) Green else Color(0xFFFF7777),
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold
                )
            }
            OutlinedButton(onClick = { refresh++ }) { Text("↻ ΑΝΑΝΕΩΣΗ") }
        }
        Spacer(Modifier.height(12.dp))

        if (error != null) {
            ErrorBox(error!!)
        } else if (loading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Purple) }
        } else if (matches.isEmpty()) {
            EmptyBox("Δεν βρέθηκαν ποδοσφαιρικοί αγώνες στο σημερινό Xtream EPG.\nΑυτό εξαρτάται από το EPG που δίνει ο πάροχός σου.")
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxSize()) {
                items(matches, key = { "${it.startMs}-${it.title}" }) { match ->
                    MatchRow(
                        config = config,
                        match = match,
                        onAutoPlay = {
                            match.channels.firstOrNull()?.let { channel ->
                                onPlay(PlayingItem(match.title, liveUrl(config, channel.id)))
                            }
                        },
                        onChannels = { selectedMatch = match }
                    )
                }
            }
        }
    }

    selectedMatch?.let { match ->
        ChannelDialog(
            match = match,
            onDismiss = { selectedMatch = null },
            onChannel = { channel ->
                selectedMatch = null
                onPlay(PlayingItem("${match.title} • ${channel.name}", liveUrl(config, channel.id)))
            }
        )
    }
}

@Composable
private fun MatchRow(config: XtreamConfig, match: MatchItem, onAutoPlay: () -> Unit, onChannels: () -> Unit) {
    Surface(color = Panel, shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 13.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(matchTime(match.startMs), color = Color.White, fontSize = 25.sp, fontWeight = FontWeight.Black, modifier = Modifier.width(92.dp))
            Column(Modifier.weight(1f)) {
                Text(match.title, color = Color.White, fontSize = 19.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text(
                    match.channels.joinToString(" • ") { it.name },
                    color = Muted,
                    fontSize = 12.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
            Button(onClick = onAutoPlay, colors = ButtonDefaults.buttonColors(containerColor = Red)) {
                Text("▶ ΔΕΣ", fontWeight = FontWeight.Black)
            }
            Spacer(Modifier.width(8.dp))
            OutlinedButton(onClick = onChannels) {
                Text("ΚΑΝΑΛΙΑ (${match.channels.size})", fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
private fun ChannelDialog(match: MatchItem, onDismiss: () -> Unit, onChannel: (LiveStream) -> Unit) {
    Dialog(onDismissRequest = onDismiss) {
        Surface(color = Panel, shape = RoundedCornerShape(24.dp), modifier = Modifier.width(720.dp).heightIn(max = 620.dp)) {
            Column(Modifier.padding(26.dp)) {
                Text("ΕΠΙΛΕΞΕ ΚΑΝΑΛΙ", color = Green, fontSize = 15.sp, fontWeight = FontWeight.Black)
                Text(match.title, color = Color.White, fontSize = 25.sp, fontWeight = FontWeight.Black)
                Spacer(Modifier.height(16.dp))
                LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(match.channels, key = { it.id }) { channel ->
                        Button(
                            onClick = { onChannel(channel) },
                            colors = ButtonDefaults.buttonColors(containerColor = Panel2),
                            modifier = Modifier.fillMaxWidth().height(56.dp)
                        ) {
                            Text("▶ ${channel.name}", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun VodScreen(
    config: XtreamConfig,
    kids: Boolean,
    onPlay: (PlayingItem) -> Unit,
    modifier: Modifier = Modifier
) {
    var items by remember(config, kids) { mutableStateOf<List<VodItem>>(emptyList()) }
    var loading by remember(config, kids) { mutableStateOf(true) }
    var error by remember(config, kids) { mutableStateOf<String?>(null) }
    var refresh by remember { mutableIntStateOf(0) }

    LaunchedEffect(config, kids, refresh) {
        loading = true
        error = null
        runCatching { fetchVods(config, kids) }
            .onSuccess { items = it }
            .onFailure { error = it.message ?: "Αποτυχία φόρτωσης VOD" }
        loading = false
    }

    Column(modifier.fillMaxWidth()) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(
                    if (kids) "ΠΑΙΔΙΚΑ" else "ΤΑΙΝΙΕΣ ΓΙΑ ΑΠΟΨΕ",
                    color = Color.White,
                    fontSize = 30.sp,
                    fontWeight = FontWeight.Black
                )
                Text(
                    if (kids) "Από τις παιδικές κατηγορίες του Xtream VOD" else "Μόνο κατηγορίες/τίτλοι που δηλώνουν Ελληνικούς υπότιτλους",
                    color = if (kids) Color(0xFFFFD44C) else Color(0xFF66C8FF),
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold
                )
            }
            Text("${items.size} διαθέσιμα", color = Muted, modifier = Modifier.padding(end = 14.dp))
            OutlinedButton(onClick = { refresh++ }) { Text("↻ ΑΝΑΝΕΩΣΗ") }
        }
        Spacer(Modifier.height(12.dp))

        if (error != null) {
            ErrorBox(error!!)
        } else if (loading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Purple) }
        } else if (items.isEmpty()) {
            EmptyBox(
                if (kids) "Δεν βρέθηκε παιδική VOD κατηγορία στο Xtream σου."
                else "Δεν βρέθηκαν VOD κατηγορίες που να δηλώνουν Greek/GR subtitles.\nΔεν θα σου βαφτίσω ταινίες ως ελληνικούς υπότιτλους αν ο πάροχος δεν το δηλώνει."
            )
        } else {
            LazyVerticalGrid(
                columns = GridCells.Fixed(6),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                gridItems(items, key = { it.id }) { vod ->
                    VodCard(vod = vod, kids = kids) {
                        onPlay(PlayingItem(vod.name, vodUrl(config, vod)))
                    }
                }
            }
        }
    }
}

@Composable
private fun VodCard(vod: VodItem, kids: Boolean, onClick: () -> Unit) {
    Button(
        onClick = onClick,
        colors = ButtonDefaults.buttonColors(containerColor = Panel),
        contentPadding = PaddingValues(0.dp),
        shape = RoundedCornerShape(16.dp),
        modifier = Modifier.fillMaxWidth().height(255.dp)
    ) {
        Column(Modifier.fillMaxSize()) {
            RemotePoster(vod.icon, Modifier.fillMaxWidth().weight(1f))
            Column(Modifier.padding(10.dp)) {
                Text(vod.name, color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Black, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text(
                    if (kids) vod.category else "🇬🇷 ${vod.category}",
                    color = if (kids) Color(0xFFFFD86B) else Color(0xFF72D5FF),
                    fontSize = 10.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                if (vod.rating.isNotBlank()) Text("★ ${vod.rating}", color = Muted, fontSize = 10.sp)
            }
        }
    }
}

@Composable
private fun RemotePoster(url: String, modifier: Modifier = Modifier) {
    var bitmap by remember(url) { mutableStateOf<ImageBitmap?>(null) }
    LaunchedEffect(url) {
        if (url.isNotBlank()) {
            bitmap = withContext(Dispatchers.IO) {
                runCatching {
                    val conn = URL(url).openConnection() as HttpURLConnection
                    conn.connectTimeout = 7000
                    conn.readTimeout = 7000
                    conn.inputStream.use { BitmapFactory.decodeStream(it)?.asImageBitmap() }
                }.getOrNull()
            }
        }
    }
    if (bitmap != null) {
        Image(bitmap = bitmap!!, contentDescription = null, contentScale = ContentScale.Crop, modifier = modifier)
    } else {
        Box(modifier.background(if (url.isBlank()) Panel2 else Color(0xFF172437)), contentAlignment = Alignment.Center) {
            Text("AGNES", color = Purple, fontWeight = FontWeight.Black)
        }
    }
}

@Composable
private fun PlayerScreen(item: PlayingItem, onBack: () -> Unit) {
    val context = LocalContext.current
    val player = remember(item.url) {
        ExoPlayer.Builder(context).build().apply {
            setMediaItem(MediaItem.fromUri(item.url))
            prepare()
            playWhenReady = true
        }
    }

    DisposableEffect(player) { onDispose { player.release() } }
    BackHandler { onBack() }

    Box(Modifier.fillMaxSize().background(Color.Black)) {
        AndroidView(
            factory = { ctx ->
                PlayerView(ctx).apply {
                    this.player = player
                    useController = true
                    keepScreenOn = true
                    requestFocus()
                }
            },
            modifier = Modifier.fillMaxSize()
        )
        Surface(
            color = Color.Black.copy(alpha = 0.62f),
            shape = RoundedCornerShape(10.dp),
            modifier = Modifier.align(Alignment.TopStart).padding(18.dp)
        ) {
            Text(item.title, color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(10.dp, 7.dp))
        }
    }
}

@Composable
private fun ErrorBox(message: String) {
    Surface(color = Color(0xFF321519), shape = RoundedCornerShape(18.dp), modifier = Modifier.fillMaxWidth()) {
        Text(message, color = Color(0xFFFFA3A3), fontSize = 16.sp, modifier = Modifier.padding(22.dp))
    }
}

@Composable
private fun EmptyBox(message: String) {
    Box(Modifier.fillMaxSize().background(Panel, RoundedCornerShape(18.dp)), contentAlignment = Alignment.Center) {
        Text(message, color = Muted, fontSize = 18.sp, modifier = Modifier.padding(30.dp))
    }
}

private fun loadConfig(context: Context): XtreamConfig? {
    val p = context.getSharedPreferences("agnes_xtream", Context.MODE_PRIVATE)
    val server = p.getString("server", null)?.trim().orEmpty()
    val username = p.getString("username", null)?.trim().orEmpty()
    val password = p.getString("password", null).orEmpty()
    return if (server.isNotBlank() && username.isNotBlank() && password.isNotBlank()) XtreamConfig(server, username, password) else null
}

private fun saveConfig(context: Context, config: XtreamConfig) {
    context.getSharedPreferences("agnes_xtream", Context.MODE_PRIVATE).edit()
        .putString("server", config.server.trimEnd('/'))
        .putString("username", config.username)
        .putString("password", config.password)
        .putBoolean("verified", false)
        .apply()
}

private fun enc(value: String): String = URLEncoder.encode(value, "UTF-8")

private fun apiUrl(config: XtreamConfig, action: String, extra: String = ""): String =
    "${config.server.trimEnd('/')}/player_api.php?username=${enc(config.username)}&password=${enc(config.password)}&action=$action$extra"

private fun liveUrl(config: XtreamConfig, streamId: Int): String =
    "${config.server.trimEnd('/')}/live/${enc(config.username)}/${enc(config.password)}/$streamId.ts"

private fun vodUrl(config: XtreamConfig, vod: VodItem): String =
    "${config.server.trimEnd('/')}/movie/${enc(config.username)}/${enc(config.password)}/${vod.id}.${vod.extension.ifBlank { "mp4" }}"

private suspend fun httpGet(url: String): String = withContext(Dispatchers.IO) {
    val conn = URL(url).openConnection() as HttpURLConnection
    conn.connectTimeout = 12_000
    conn.readTimeout = 18_000
    conn.requestMethod = "GET"
    conn.setRequestProperty("User-Agent", "AGNES-TV/1.7.1")
    try {
        val code = conn.responseCode
        if (code !in 200..299) throw IllegalStateException("HTTP $code από Xtream server")
        conn.inputStream.bufferedReader().use { it.readText() }
    } finally {
        conn.disconnect()
    }
}

private suspend fun fetchTodaysMatches(config: XtreamConfig): List<MatchItem> {
    val liveArray = JSONArray(httpGet(apiUrl(config, "get_live_streams")))
    val sports = buildList {
        for (i in 0 until liveArray.length()) {
            val o = liveArray.optJSONObject(i) ?: continue
            val id = o.optInt("stream_id")
            val name = o.optString("name")
            if (id > 0 && looksLikeSportsChannel(name)) add(LiveStream(id, name))
        }
    }.distinctBy { it.id }.take(80)

    if (sports.isEmpty()) return emptyList()

    val entries = coroutineScope {
        sports.map { stream ->
            async(Dispatchers.IO) {
                runCatching {
                    val root = JSONObject(httpGet(apiUrl(config, "get_short_epg", "&stream_id=${stream.id}&limit=20")))
                    val epg = root.optJSONArray("epg_listings") ?: JSONArray()
                    buildList {
                        for (i in 0 until epg.length()) {
                            val e = epg.optJSONObject(i) ?: continue
                            val title = decodeMaybeBase64(e.optString("title")).replace(Regex("\\s+"), " ").trim()
                            val startMs = epgStartMs(e)
                            if (startMs > 0L && isToday(startMs) && looksLikeFootballMatch(title)) {
                                add(Triple(title, startMs, stream))
                            }
                        }
                    }
                }.getOrElse { emptyList() }
            }
        }.awaitAll().flatten()
    }

    val grouped = linkedMapOf<String, MutableList<Triple<String, Long, LiveStream>>>()
    entries.forEach { entry ->
        val key = normalizeTitle(entry.first) + "|" + (entry.second / 60_000L)
        grouped.getOrPut(key) { mutableListOf() }.add(entry)
    }

    return grouped.values.map { group ->
        val first = group.first()
        MatchItem(
            title = first.first,
            startMs = first.second,
            channels = group.map { it.third }.distinctBy { it.id }
        )
    }.sortedBy { it.startMs }
}

private fun looksLikeSportsChannel(name: String): Boolean {
    val n = name.lowercase(Locale.getDefault())
    return listOf(
        "sport", "sports", "cosmote", "nova sport", "novasport", "cytavision sport",
        "sky sport", "dazn", "bein", "arena sport", "match!", "football"
    ).any { n.contains(it) }
}

private fun looksLikeFootballMatch(title: String): Boolean {
    if (title.isBlank()) return false
    val t = title.lowercase(Locale.getDefault())
    val excluded = listOf("news", "highlights", "magazine", "review", "replay", "documentary")
    if (excluded.any { t.contains(it) }) return false
    val football = listOf(
        "football", "soccer", "premier league", "champions league", "europa league", "conference league",
        "super league", "la liga", "laliga", "serie a", "bundesliga", "ligue 1", "eredivisie",
        "fa cup", "coppa", "copa", "κύπελλο", "ποδόσφαιρο"
    ).any { t.contains(it) }
    val matchup = Regex("\\s(vs?\\.?|versus)\\s|\\s[-–—]\\s", RegexOption.IGNORE_CASE).containsMatchIn(title)
    return football || matchup
}

private fun epgStartMs(o: JSONObject): Long {
    val ts = o.optLong("start_timestamp", 0L)
    if (ts > 0L) return ts * 1000L
    val raw = o.optString("start")
    return runCatching {
        val fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")
        java.time.LocalDateTime.parse(raw, fmt).atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()
    }.getOrDefault(0L)
}

private fun isToday(ms: Long): Boolean =
    Instant.ofEpochMilli(ms).atZone(ZoneId.systemDefault()).toLocalDate() == LocalDate.now()

private fun decodeMaybeBase64(value: String): String {
    if (value.isBlank()) return value
    return runCatching {
        val decoded = String(Base64.decode(value, Base64.DEFAULT), Charsets.UTF_8)
        if (decoded.any { !it.isISOControl() || it == '\n' || it == '\r' || it == '\t' }) decoded else value
    }.getOrDefault(value)
}

private fun normalizeTitle(title: String): String =
    title.lowercase(Locale.getDefault()).replace(Regex("[^\\p{L}\\p{N}]+"), " ").trim()

private fun matchTime(ms: Long): String =
    Instant.ofEpochMilli(ms).atZone(ZoneId.systemDefault()).format(DateTimeFormatter.ofPattern("HH:mm"))

private suspend fun fetchVods(config: XtreamConfig, kids: Boolean): List<VodItem> {
    val categoryArray = JSONArray(httpGet(apiUrl(config, "get_vod_categories")))
    val categories = mutableMapOf<String, String>()
    for (i in 0 until categoryArray.length()) {
        val o = categoryArray.optJSONObject(i) ?: continue
        categories[o.optString("category_id")] = o.optString("category_name")
    }

    val streams = JSONArray(httpGet(apiUrl(config, "get_vod_streams")))
    val result = mutableListOf<VodItem>()
    for (i in 0 until streams.length()) {
        val o = streams.optJSONObject(i) ?: continue
        val id = o.optInt("stream_id")
        if (id <= 0) continue
        val name = o.optString("name")
        val category = categories[o.optString("category_id")].orEmpty()
        val hay = "$category $name".lowercase(Locale.getDefault())
        val include = if (kids) isKidsVod(hay) else isGreekSubtitleVod(hay)
        if (!include) continue
        result += VodItem(
            id = id,
            name = name,
            icon = o.optString("stream_icon"),
            extension = o.optString("container_extension", "mp4"),
            category = category.ifBlank { if (kids) "Kids" else "Greek Subs" },
            rating = o.optString("rating")
        )
        if (result.size >= 180) break
    }
    return result
}

private fun isGreekSubtitleVod(hay: String): Boolean {
    return listOf(
        "greek sub", "greek-sub", "greek subtitles", "greek subtitle", "gr sub", "gr-sub",
        "ελληνικοί υπότιτ", "ελληνικοι υποτιτ", "ελλ. υποτιτ", "υπότιτλοι gr"
    ).any { hay.contains(it) }
}

private fun isKidsVod(hay: String): Boolean {
    return listOf("kids", "kid ", "children", "childrens", "παιδικ", "cartoon", "animation", "family kids").any { hay.contains(it) }
}
