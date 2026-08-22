package mom.agnes.tv

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.*
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import kotlinx.coroutines.delay
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                AgnesTvApp(this)
            }
        }
    }
}

private enum class Screen { HOME, SPORTS }

private data class HubItem(
    val title: String,
    val subtitle: String,
    val keywords: List<String> = emptyList(),
    val internal: Screen? = null
)

private fun openInstalledAppByLabel(context: Context, keywords: List<String>): Boolean {
    val pm = context.packageManager
    val intents = listOf(
        Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LEANBACK_LAUNCHER),
        Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
    )

    val activities = intents.flatMap { intent ->
        pm.queryIntentActivities(intent, PackageManager.MATCH_ALL)
    }.distinctBy { it.activityInfo.packageName }

    val match = activities.firstOrNull { info ->
        val label = info.loadLabel(pm).toString()
        keywords.any { key -> label.contains(key, ignoreCase = true) }
    } ?: return false

    val launchIntent = pm.getLaunchIntentForPackage(match.activityInfo.packageName) ?: return false
    launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    context.startActivity(launchIntent)
    return true
}

@Composable
private fun AgnesTvApp(context: Context) {
    var screen by remember { mutableStateOf(Screen.HOME) }

    BackHandler(enabled = screen != Screen.HOME) {
        screen = Screen.HOME
    }

    when (screen) {
        Screen.HOME -> AgnesHome(
            onInternal = { screen = it },
            onOpenApp = { title, keywords ->
                if (!openInstalledAppByLabel(context, keywords)) {
                    Toast.makeText(context, "$title δεν βρέθηκε στο box", Toast.LENGTH_SHORT).show()
                }
            }
        )
        Screen.SPORTS -> SportsScreen(onBack = { screen = Screen.HOME })
    }
}

@Composable
private fun AgnesHome(
    onInternal: (Screen) -> Unit,
    onOpenApp: (String, List<String>) -> Unit
) {
    var clock by remember { mutableStateOf(currentTime()) }
    LaunchedEffect(Unit) {
        while (true) {
            clock = currentTime()
            delay(30_000)
        }
    }

    val cream = Color(0xFFFFF6EA)
    val glass = Color(0xB31B2832)
    val muted = Color(0xFFD5DEE3)
    val soft = Color(0xFF8DB9C8)

    val items = listOf(
        HubItem("CYTAVISION", "Live TV", listOf("Cytavision")),
        HubItem("SPORTS LIVE", "Αγώνες • ώρα • κανάλι", internal = Screen.SPORTS),
        HubItem("NETFLIX", "Movies & Series", listOf("Netflix")),
        HubItem("YOUTUBE", "Video", listOf("YouTube")),
        HubItem("SPOTIFY", "Music", listOf("Spotify"))
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.linearGradient(
                    listOf(
                        Color(0xFF071D29),
                        Color(0xFF123B4B),
                        Color(0xFF5D4B55)
                    )
                )
            )
            .padding(horizontal = 42.dp, vertical = 30.dp)
    ) {
        Column(Modifier.fillMaxSize()) {
            Row(
                Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(Modifier.weight(1f)) {
                    Text(
                        "AGNES TV",
                        color = Color.White,
                        fontSize = 38.sp,
                        fontWeight = FontWeight.ExtraBold
                    )
                    Text(
                        "Η AGNES μπροστά. Οι εφαρμογές από πίσω.",
                        color = muted,
                        fontSize = 17.sp
                    )
                }

                Column(horizontalAlignment = Alignment.End) {
                    Text(clock, color = Color.White, fontSize = 34.sp, fontWeight = FontWeight.Bold)
                    Text("HOME • TV • SPORTS • MUSIC", color = soft, fontSize = 13.sp)
                }
            }

            Spacer(Modifier.height(25.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                items.forEach { item ->
                    HubTile(
                        title = item.title,
                        subtitle = item.subtitle,
                        modifier = Modifier.weight(1f),
                        accent = item.internal == Screen.SPORTS,
                        onClick = {
                            item.internal?.let(onInternal)
                                ?: onOpenApp(item.title, item.keywords)
                        }
                    )
                }
            }

            Spacer(Modifier.height(24.dp))

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                horizontalArrangement = Arrangement.spacedBy(22.dp)
            ) {
                Column(
                    modifier = Modifier
                        .weight(1.55f)
                        .fillMaxHeight()
                        .background(glass, RoundedCornerShape(28.dp))
                        .border(1.dp, Color(0x33FFFFFF), RoundedCornerShape(28.dp))
                        .padding(26.dp)
                ) {
                    Text("AGNES SPORTS", color = soft, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(8.dp))
                    Text(
                        "Πρόγραμμα ποδοσφαίρου & κανάλι",
                        color = cream,
                        fontSize = 28.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(Modifier.height(12.dp))
                    Text(
                        "Το SPORTS LIVE ανοίγει μέσα στην AGNES το επίσημο Live Sports πρόγραμμα της Cytavision. Βλέπεις πραγματικές ώρες, αγώνες και κανάλια χωρίς demo δεδομένα.",
                        color = muted,
                        fontSize = 17.sp,
                        lineHeight = 24.sp
                    )
                    Spacer(Modifier.height(20.dp))
                    Text(
                        "Πάτησε SPORTS LIVE",
                        color = Color.White,
                        fontSize = 23.sp,
                        fontWeight = FontWeight.ExtraBold
                    )
                    Text(
                        "BACK επιστρέφει πάντα στην AGNES.",
                        color = soft,
                        fontSize = 14.sp
                    )
                    Spacer(Modifier.weight(1f))
                    Text(
                        "Πηγή προγράμματος: Cytavision Live Sports",
                        color = muted,
                        fontSize = 13.sp
                    )
                }

                Column(
                    modifier = Modifier
                        .weight(0.75f)
                        .fillMaxHeight()
                        .background(Color(0xA6142530), RoundedCornerShape(28.dp))
                        .border(1.dp, Color(0x33FFFFFF), RoundedCornerShape(28.dp))
                        .padding(24.dp)
                ) {
                    Text("AGNES NOW", color = soft, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(10.dp))
                    Text(
                        "Ένα Home για όλα",
                        color = cream,
                        fontSize = 25.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(Modifier.height(12.dp))
                    Text(
                        "Cytavision, Sports, Netflix, YouTube και Spotify ανοίγουν από εδώ. Η AGNES μπορεί επίσης να δηλωθεί ως Home εφαρμογή όταν το Google TV box το επιτρέπει.",
                        color = muted,
                        fontSize = 16.sp,
                        lineHeight = 22.sp
                    )
                    Spacer(Modifier.weight(1f))
                    Text("AGNES TV • v1.0.0", color = soft, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
}

@Composable
private fun HubTile(
    title: String,
    subtitle: String,
    modifier: Modifier = Modifier,
    accent: Boolean = false,
    onClick: () -> Unit
) {
    var focused by remember { mutableStateOf(false) }
    val focusedColor = if (accent) Color(0xFF2D9CC1) else Color(0xFF4C7180)
    val baseColor = if (accent) Color(0xFF17536B) else Color(0xAA203843)
    val bg by animateColorAsState(if (focused) focusedColor else baseColor, label = "hubTile")

    Box(
        modifier = modifier
            .height(126.dp)
            .scale(if (focused) 1.055f else 1f)
            .background(bg, RoundedCornerShape(24.dp))
            .border(
                if (focused) 3.dp else 1.dp,
                if (focused) Color.White else Color(0x35FFFFFF),
                RoundedCornerShape(24.dp)
            )
            .onFocusChanged { focused = it.isFocused }
            .onKeyEvent { event ->
                if (event.type == KeyEventType.KeyUp &&
                    (event.key == Key.Enter || event.key == Key.DirectionCenter)
                ) {
                    onClick()
                    true
                } else false
            }
            .focusable()
            .padding(19.dp)
    ) {
        Column {
            Text(title, color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.ExtraBold)
            Spacer(Modifier.height(8.dp))
            Text(subtitle, color = Color(0xFFE0EAEE), fontSize = 13.sp)
        }
    }
}

@Composable
private fun SportsScreen(onBack: () -> Unit) {
    val url = "https://epg.cyta.com.cy/tv-live-sports-events/en"

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF071D29))
    ) {
        Column(Modifier.fillMaxSize()) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(78.dp)
                    .background(Color(0xFF102E3B))
                    .padding(horizontal = 28.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                TvButton("‹  AGNES HOME", onBack)
                Spacer(Modifier.width(24.dp))
                Column(Modifier.weight(1f)) {
                    Text("SPORTS LIVE", color = Color.White, fontSize = 25.sp, fontWeight = FontWeight.Bold)
                    Text("Επίσημο πρόγραμμα Cytavision • αγώνες • ώρα • κανάλι", color = Color(0xFFD4E3E8), fontSize = 13.sp)
                }
                Text("BACK = AGNES", color = Color(0xFF8DB9C8), fontSize = 13.sp)
            }

            AndroidView(
                modifier = Modifier.fillMaxSize(),
                factory = { ctx ->
                    WebView(ctx).apply {
                        webViewClient = WebViewClient()
                        settings.javaScriptEnabled = true
                        settings.domStorageEnabled = true
                        settings.loadWithOverviewMode = true
                        settings.useWideViewPort = true
                        settings.builtInZoomControls = true
                        settings.displayZoomControls = false
                        isFocusable = true
                        isFocusableInTouchMode = true
                        loadUrl(url)
                    }
                },
                update = { webView ->
                    if (webView.url == null) webView.loadUrl(url)
                }
            )
        }
    }
}

@Composable
private fun TvButton(text: String, onClick: () -> Unit) {
    var focused by remember { mutableStateOf(false) }
    Box(
        modifier = Modifier
            .scale(if (focused) 1.05f else 1f)
            .background(if (focused) Color(0xFF2D9CC1) else Color(0xFF214654), RoundedCornerShape(16.dp))
            .border(if (focused) 2.dp else 1.dp, if (focused) Color.White else Color(0x33FFFFFF), RoundedCornerShape(16.dp))
            .onFocusChanged { focused = it.isFocused }
            .onKeyEvent { event ->
                if (event.type == KeyEventType.KeyUp &&
                    (event.key == Key.Enter || event.key == Key.DirectionCenter)
                ) {
                    onClick()
                    true
                } else false
            }
            .focusable()
            .padding(horizontal = 18.dp, vertical = 12.dp)
    ) {
        Text(text, color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Bold)
    }
}

private fun currentTime(): String =
    SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date())
