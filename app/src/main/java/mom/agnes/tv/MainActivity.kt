package mom.agnes.tv

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Bundle
import android.util.Base64
import android.util.JsonReader
import android.util.JsonToken
import android.util.LruCache
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.ui.draw.scale
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.window.Dialog
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.common.Tracks
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.InputStreamReader
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
private val FocusWhite = Color(0xFFFFFFFF)
private val SelectedLine = Color(0xFFFFFFFF)

private enum class Tab { SPORTS, MOVIES, KIDS }

private data class XtreamConfig(val server: String, val username: String, val password: String)
private data class LiveStream(val id: Int, val name: String)
private data class MatchItem(val title: String, val startMs: Long, val channels: List<LiveStream>)
private data class VodCategory(val id: String, val name: String)
private data class VodItem(
    val id: Int,
    val name: String,
    val icon: String,
    val extension: String,
    val category: String,
    val rating: String,
    val likelyGreek: Boolean
)
private data class PlayingItem(
    val title: String,
    val url: String,
    val vodId: Int? = null
)
private data class VodCacheEntry(val createdAt: Long, val items: List<VodItem>)

private val vodCache = mutableMapOf<String, VodCacheEntry>()
private const val VOD_CACHE_MS = 10 * 60 * 1000L
private const val MAX_VODS = 120
private const val MAX_VOD_CATEGORIES = 12
private const val MAX_VODS_PER_CATEGORY = 40

private object PosterCache : LruCache<String, Bitmap>(12 * 1024) {
    override fun sizeOf(key: String, value: Bitmap): Int = (value.byteCount / 1024).coerceAtLeast(1)
}

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
                    if (verified) "v${BuildConfig.VERSION_NAME} • XTREAM CONNECTED" else "v${BuildConfig.VERSION_NAME} • XTREAM NOT VERIFIED",
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
            TvOutlinedButton("⚙ XTREAM", onSettings)
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
private fun Modifier.tvFocus(label: String, selected: Boolean = false, shape: RoundedCornerShape = RoundedCornerShape(14.dp)): Modifier {
    var focused by remember { mutableStateOf(false) }
    return this
        .onFocusChanged { focused = it.isFocused || it.hasFocus }
        .scale(if (focused) 1.055f else 1f)
        .border(
            width = when {
                focused -> 4.dp
                selected -> 2.dp
                else -> 1.dp
            },
            color = when {
                focused -> FocusWhite
                selected -> Green
                else -> Color.Transparent
            },
            shape = shape
        )
        .semantics {
            contentDescription = if (selected) "SELECTED: $label" else if (focused) "FOCUS: $label" else label
        }
}

@Composable
private fun NavButton(label: String, selected: Boolean, onClick: () -> Unit) {
    val shape = RoundedCornerShape(14.dp)
    Button(
        onClick = onClick,
        colors = ButtonDefaults.buttonColors(containerColor = if (selected) Purple else Panel2),
        shape = shape,
        modifier = Modifier.height(58.dp).tvFocus(label, selected, shape)
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(label, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(3.dp))
            Box(
                Modifier
                    .width(if (selected) 30.dp else 1.dp)
                    .height(4.dp)
                    .background(if (selected) SelectedLine else Color.Transparent, RoundedCornerShape(4.dp))
            )
        }
    }
}

@Composable
private fun TvOutlinedButton(label: String, onClick: () -> Unit) {
    val shape = RoundedCornerShape(14.dp)
    OutlinedButton(
        onClick = onClick,
        shape = shape,
        modifier = Modifier.height(54.dp).tvFocus(label, shape = shape)
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
            TvOutlinedButton("↻ ΑΝΑΝΕΩΣΗ") { refresh++ }
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
private fun MatchRow(match: MatchItem, onAutoPlay: () -> Unit, onChannels: () -> Unit) {
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
            val watchShape = RoundedCornerShape(12.dp)
            Button(
                onClick = onAutoPlay,
                colors = ButtonDefaults.buttonColors(containerColor = Red),
                shape = watchShape,
                modifier = Modifier.tvFocus("▶ ΔΕΣ ${match.title}", shape = watchShape)
            ) {
                Text("▶ ΔΕΣ", fontWeight = FontWeight.Black)
            }
            Spacer(Modifier.width(8.dp))
            val channelShape = RoundedCornerShape(12.dp)
            OutlinedButton(
                onClick = onChannels,
                shape = channelShape,
                modifier = Modifier.tvFocus("ΚΑΝΑΛΙΑ ${match.title}", shape = channelShape)
            ) {
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
                        val shape = RoundedCornerShape(12.dp)
                        Button(
                            onClick = { onChannel(channel) },
                            colors = ButtonDefaults.buttonColors(containerColor = Panel2),
                            shape = shape,
                            modifier = Modifier.fillMaxWidth().height(60.dp).tvFocus(channel.name, shape = shape)
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
        if (refresh > 0) clearVodCache(config, kids)
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
                    if (kids) "Γρήγορη φόρτωση μόνο από παιδικές κατηγορίες" else "🇬🇷 Πιθανόν Ελληνικά = δηλώνεται από τον πάροχο • Ελληνικοί υπότιτλοι = επιβεβαιωμένο track",
                    color = if (kids) Color(0xFFFFD44C) else Color(0xFF72D5FF),
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold
                )
            }
            Text("${items.size} διαθέσιμα", color = Muted, modifier = Modifier.padding(end = 14.dp))
            TvOutlinedButton("↻ ΑΝΑΝΕΩΣΗ") { refresh++ }
        }
        Spacer(Modifier.height(12.dp))

        if (error != null) {
            ErrorBox(error!!)
        } else if (loading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Purple) }
        } else if (items.isEmpty()) {
            EmptyBox(
                if (kids) "Δεν βρέθηκε παιδική VOD κατηγορία στο Xtream σου."
                else "Δεν βρέθηκαν VOD κατηγορίες που να δηλώνουν Greek/GR subtitles.\nΔεν θα εμφανιστεί επιβεβαιωμένο 🇬🇷 αν δεν βρεθεί πραγματικό Greek subtitle track."
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
                        onPlay(PlayingItem(vod.name, vodUrl(config, vod), vodId = vod.id))
                    }
                }
            }
        }
    }
}

@Composable
private fun VodCard(vod: VodItem, kids: Boolean, onClick: () -> Unit) {
    val context = LocalContext.current
    val verifiedGreek = remember(vod.id) {
        context.getSharedPreferences("agnes_media_meta", Context.MODE_PRIVATE)
            .getBoolean("greek_subtitle_${vod.id}", false)
    }
    val shape = RoundedCornerShape(16.dp)
    Button(
        onClick = onClick,
        colors = ButtonDefaults.buttonColors(containerColor = Panel),
        contentPadding = PaddingValues(0.dp),
        shape = shape,
        modifier = Modifier
            .fillMaxWidth()
            .height(255.dp)
            .tvFocus(vod.name, shape = shape)
    ) {
        Column(Modifier.fillMaxSize()) {
            RemotePoster(vod.icon, Modifier.fillMaxWidth().weight(1f))
            Column(Modifier.padding(10.dp)) {
                Text(vod.name, color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Black, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text(
                    when {
                        kids -> vod.category
                        verifiedGreek -> "🇬🇷 Ελληνικοί υπότιτλοι"
                        vod.likelyGreek -> "🇬🇷 Πιθανόν Ελληνικά"
                        else -> "Υπότιτλοι: άγνωστο"
                    },
                    color = when {
                        kids -> Color(0xFFFFD86B)
                        verifiedGreek -> Green
                        vod.likelyGreek -> Color(0xFF72D5FF)
                        else -> Muted
                    },
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
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
    var bitmap by remember(url) { mutableStateOf<ImageBitmap?>(PosterCache.get(url)?.asImageBitmap()) }
    LaunchedEffect(url) {
        if (url.isNotBlank() && bitmap == null) {
            bitmap = withContext(Dispatchers.IO) {
                loadPosterBitmap(url)?.also { PosterCache.put(url, it) }?.asImageBitmap()
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

private fun loadPosterBitmap(url: String): Bitmap? {
    val cached = PosterCache.get(url)
    if (cached != null) return cached
    val conn = runCatching { URL(url).openConnection() as HttpURLConnection }.getOrNull() ?: return null
    return try {
        conn.connectTimeout = 4_000
        conn.readTimeout = 5_000
        conn.setRequestProperty("User-Agent", "AGNES-TV/${BuildConfig.VERSION_NAME}")
        if (conn.responseCode !in 200..299) return null
        val options = BitmapFactory.Options().apply {
            inPreferredConfig = Bitmap.Config.RGB_565
            inSampleSize = 2
        }
        conn.inputStream.use { BitmapFactory.decodeStream(it, null, options) }
    } catch (_: Throwable) {
        null
    } finally {
        conn.disconnect()
    }
}

@Composable
private fun PlayerScreen(item: PlayingItem, onBack: () -> Unit) {
    val context = LocalContext.current
    val mediaPrefs = remember { context.getSharedPreferences("agnes_media_meta", Context.MODE_PRIVATE) }
    val player = remember(item.url) {
        ExoPlayer.Builder(context).build().apply {
            setMediaItem(MediaItem.fromUri(Uri.parse(item.url)))
            prepare()
            playWhenReady = true
        }
    }

    DisposableEffect(player, item.vodId) {
        fun rememberGreekIfPresent(tracks: Tracks) {
            val id = item.vodId ?: return
            if (tracksHasGreekText(tracks)) {
                mediaPrefs.edit().putBoolean("greek_subtitle_$id", true).apply()
            }
        }
        val listener = object : Player.Listener {
            override fun onTracksChanged(tracks: Tracks) {
                rememberGreekIfPresent(tracks)
            }
        }
        player.addListener(listener)
        rememberGreekIfPresent(player.currentTracks)
        onDispose {
            player.removeListener(listener)
            player.release()
        }
    }
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

private fun tracksHasGreekText(tracks: Tracks): Boolean {
    for (group in tracks.groups) {
        if (group.type != C.TRACK_TYPE_TEXT) continue
        for (i in 0 until group.length) {
            val language = group.getTrackFormat(i).language?.lowercase(Locale.ROOT).orEmpty()
            if (language == "el" || language == "ell" || language == "gre" || language == "gr" || language.startsWith("el-")) {
                return true
            }
        }
    }
    return false
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
    conn.setRequestProperty("User-Agent", "AGNES-TV/${BuildConfig.VERSION_NAME}")
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
    }.distinctBy { it.id }.take(60)

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

private fun vodCacheKey(config: XtreamConfig, kids: Boolean): String =
    "${config.server}|${config.username}|$kids"

private fun clearVodCache(config: XtreamConfig, kids: Boolean) {
    synchronized(vodCache) { vodCache.remove(vodCacheKey(config, kids)) }
}

private suspend fun fetchVods(config: XtreamConfig, kids: Boolean): List<VodItem> {
    val key = vodCacheKey(config, kids)
    synchronized(vodCache) {
        vodCache[key]?.let { cached ->
            if (System.currentTimeMillis() - cached.createdAt < VOD_CACHE_MS) return cached.items
            vodCache.remove(key)
        }
    }

    val categories = fetchVodCategories(config)
    val targetCategories = categories.filter { category ->
        val hay = category.name.lowercase(Locale.getDefault())
        if (kids) isKidsVod(hay) else isGreekSubtitleVod(hay)
    }.take(MAX_VOD_CATEGORIES)

    if (targetCategories.isEmpty()) return emptyList()

    val result = mutableListOf<VodItem>()
    for (category in targetCategories) {
        if (result.size >= MAX_VODS) break
        val limit = minOf(MAX_VODS_PER_CATEGORY, MAX_VODS - result.size)
        result += fetchVodCategoryStreams(config, category, kids, limit)
    }

    val distinct = result.distinctBy { it.id }.take(MAX_VODS)
    synchronized(vodCache) { vodCache[key] = VodCacheEntry(System.currentTimeMillis(), distinct) }
    return distinct
}

private suspend fun fetchVodCategories(config: XtreamConfig): List<VodCategory> =
    withJsonReader(apiUrl(config, "get_vod_categories")) { reader ->
        val result = mutableListOf<VodCategory>()
        reader.beginArray()
        while (reader.hasNext()) {
            var id = ""
            var name = ""
            reader.beginObject()
            while (reader.hasNext()) {
                when (reader.nextName()) {
                    "category_id" -> id = reader.flexString()
                    "category_name" -> name = reader.flexString()
                    else -> reader.skipValue()
                }
            }
            reader.endObject()
            if (id.isNotBlank() && name.isNotBlank()) result += VodCategory(id, name)
        }
        reader.endArray()
        result
    }

private suspend fun fetchVodCategoryStreams(
    config: XtreamConfig,
    category: VodCategory,
    kids: Boolean,
    limit: Int
): List<VodItem> = withJsonReader(
    apiUrl(config, "get_vod_streams", "&category_id=${enc(category.id)}")
) { reader ->
    val result = mutableListOf<VodItem>()
    reader.beginArray()
    while (reader.hasNext()) {
        var id = 0
        var name = ""
        var icon = ""
        var extension = "mp4"
        var rating = ""
        reader.beginObject()
        while (reader.hasNext()) {
            when (reader.nextName()) {
                "stream_id" -> id = reader.flexString().toIntOrNull() ?: 0
                "name" -> name = reader.flexString()
                "stream_icon" -> icon = reader.flexString()
                "container_extension" -> extension = reader.flexString().ifBlank { "mp4" }
                "rating" -> rating = reader.flexString()
                else -> reader.skipValue()
            }
        }
        reader.endObject()
        if (id > 0 && name.isNotBlank() && result.size < limit) {
            result += VodItem(
                id = id,
                name = name,
                icon = icon,
                extension = extension,
                category = category.name,
                rating = rating,
                likelyGreek = !kids && isGreekSubtitleVod("${category.name} $name".lowercase(Locale.getDefault()))
            )
        }
    }
    reader.endArray()
    result
}

private suspend fun <T> withJsonReader(url: String, block: (JsonReader) -> T): T = withContext(Dispatchers.IO) {
    val conn = URL(url).openConnection() as HttpURLConnection
    conn.connectTimeout = 8_000
    conn.readTimeout = 12_000
    conn.requestMethod = "GET"
    conn.setRequestProperty("User-Agent", "AGNES-TV/${BuildConfig.VERSION_NAME}")
    try {
        val code = conn.responseCode
        if (code !in 200..299) throw IllegalStateException("HTTP $code από Xtream server")
        InputStreamReader(conn.inputStream, Charsets.UTF_8).use { input ->
            JsonReader(input).use { reader -> block(reader) }
        }
    } finally {
        conn.disconnect()
    }
}

private fun JsonReader.flexString(): String = when (peek()) {
    JsonToken.STRING, JsonToken.NUMBER -> nextString()
    JsonToken.BOOLEAN -> nextBoolean().toString()
    JsonToken.NULL -> { nextNull(); "" }
    else -> { skipValue(); "" }
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
