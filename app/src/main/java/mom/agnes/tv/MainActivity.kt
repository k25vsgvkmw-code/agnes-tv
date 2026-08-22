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
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
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
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.input.key.*
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.graphics.drawable.toBitmap
import kotlinx.coroutines.delay
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { MaterialTheme { AgnesTvApp(this) } }
    }
}

private enum class Screen { HOME, SPORTS, APPS }

private data class HubItem(
    val icon: String,
    val title: String,
    val subtitle: String,
    val keywords: List<String> = emptyList(),
    val internal: Screen? = null,
    val accent: Color
)

private data class InstalledApp(
    val label: String,
    val packageName: String
)

private fun openInstalledAppByLabel(context: Context, keywords: List<String>): Boolean {
    val pm = context.packageManager
    val intents = listOf(
        Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LEANBACK_LAUNCHER),
        Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
    )
    val activities = intents.flatMap { pm.queryIntentActivities(it, PackageManager.MATCH_ALL) }
        .distinctBy { it.activityInfo.packageName }
    val match = activities.firstOrNull { info ->
        val label = info.loadLabel(pm).toString()
        keywords.any { key -> label.contains(key, ignoreCase = true) }
    } ?: return false
    return launchPackage(context, match.activityInfo.packageName)
}

private fun launchPackage(context: Context, packageName: String): Boolean {
    val launchIntent = context.packageManager.getLaunchIntentForPackage(packageName) ?: return false
    launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    context.startActivity(launchIntent)
    return true
}

private fun installedApps(context: Context): List<InstalledApp> {
    val pm = context.packageManager
    val intents = listOf(
        Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LEANBACK_LAUNCHER),
        Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
    )
    return intents
        .flatMap { pm.queryIntentActivities(it, PackageManager.MATCH_ALL) }
        .distinctBy { it.activityInfo.packageName }
        .filter { it.activityInfo.packageName != context.packageName }
        .map {
            InstalledApp(
                label = it.loadLabel(pm).toString(),
                packageName = it.activityInfo.packageName
            )
        }
        .sortedBy { it.label.lowercase(Locale.getDefault()) }
}

private fun appCategory(label: String): String {
    val n = label.lowercase(Locale.getDefault())
    return when {
        listOf("cytavision", "tv", "iptv", "smarters", "iqiyi").any { n.contains(it) } -> "TV"
        listOf("netflix", "prime", "hbo", "disney", "apple tv", "movie").any { n.contains(it) } -> "MOVIES"
        listOf("spotify", "music", "radio").any { n.contains(it) } -> "MUSIC"
        listOf("kids", "games", "play games").any { n.contains(it) } -> "KIDS"
        else -> "UTILITIES"
    }
}

@Composable
private fun AgnesTvApp(context: Context) {
    var screen by remember { mutableStateOf(Screen.HOME) }
    BackHandler(enabled = screen != Screen.HOME) { screen = Screen.HOME }

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
        Screen.APPS -> AppsScreen(context = context, onBack = { screen = Screen.HOME })
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

    val pink = Color(0xFFFF4F9A)
    val glass = Color(0xCC111319)
    val glass2 = Color(0xD71A1D24)
    val muted = Color(0xFFBFC3CA)

    val items = listOf(
        HubItem("📺", "CYTAVISION", "Live TV", listOf("Cytavision"), accent = Color(0xFF7A274E)),
        HubItem("N", "NETFLIX", "Movies & Series", listOf("Netflix"), accent = Color(0xFF4A171C)),
        HubItem("▶", "YOUTUBE", "Videos", listOf("YouTube"), accent = Color(0xFF461B1B)),
        HubItem("●", "SPOTIFY", "Music", listOf("Spotify"), accent = Color(0xFF153D2B)),
        HubItem("⚽", "SPORTS LIVE", "Αγώνες & Κανάλια", internal = Screen.SPORTS, accent = Color(0xFF24252A)),
        HubItem("🧳", "TRAVEL", "Ταξίδια", accent = Color(0xFF13305A)),
        HubItem("👥", "FAMILY", "Οικογένεια", accent = Color(0xFF3F2451)),
        HubItem("▦", "APPS", "Εφαρμογές", internal = Screen.APPS, accent = Color(0xFF5B3217))
    )

    Box(
        Modifier
            .fillMaxSize()
            .background(Brush.linearGradient(listOf(Color(0xFF06070A), Color(0xFF171014), Color(0xFF090A0E))))
            .padding(26.dp)
    ) {
        Column(Modifier.fillMaxSize()) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("AGNES TV", color = Color.White, fontSize = 30.sp, fontWeight = FontWeight.Black)
                    Text("Η οικογένειά μας, σε 1 μέρος ♥", color = Color(0xFFE6D4D9), fontSize = 14.sp)
                }
                GlassChip("☀ 22°C", "Λεμεσός")
                Spacer(Modifier.width(12.dp))
                GlassChip("👨‍👩‍👧‍👦 Οικογένεια", "Όλοι καλά ♥")
                Spacer(Modifier.width(18.dp))
                Column(horizontalAlignment = Alignment.End) {
                    Text(clock, color = Color.White, fontSize = 28.sp, fontWeight = FontWeight.Bold)
                    Text("AGNES TV • v1.3.0", color = muted, fontSize = 12.sp)
                }
            }

            Spacer(Modifier.height(18.dp))

            Row(Modifier.fillMaxWidth().weight(1f), horizontalArrangement = Arrangement.spacedBy(18.dp)) {
                AssistantPanel(
                    modifier = Modifier.weight(0.78f).fillMaxHeight(),
                    pink = pink,
                    glass = glass
                )

                Column(Modifier.weight(2.62f).fillMaxHeight()) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        items.forEach { item ->
                            HomeTile(
                                item = item,
                                modifier = Modifier.weight(1f),
                                onClick = {
                                    item.internal?.let(onInternal)
                                        ?: if (item.keywords.isNotEmpty()) onOpenApp(item.title, item.keywords) else Unit
                                }
                            )
                        }
                    }

                    Spacer(Modifier.height(14.dp))

                    Row(Modifier.fillMaxWidth().weight(1f), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        PanelCard("ΣΗΜΕΡΑ", Modifier.weight(1.25f), glass2) {
                            MatchLine("⚽", "SPORTS LIVE", "Πάτησε για το επίσημο πρόγραμμα", "Cytavision")
                            Spacer(Modifier.height(8.dp))
                            MatchLine("★", "Ολυμπιακός / Liverpool", "Αγαπημένες ομάδες", "AGNES")
                        }

                        PanelCard("🔥 ΜΗ ΧΑΣΕΙΣ", Modifier.weight(0.95f), glass2) {
                            InfoLine("★", "ΟΛΥΜΠΙΑΚΟΣ", "Επόμενος αγώνας από SPORTS LIVE")
                            Spacer(Modifier.height(9.dp))
                            InfoLine("★", "LIVERPOOL", "Επόμενος αγώνας από SPORTS LIVE")
                        }

                        PanelCard("🔔 ΥΠΕΝΘΥΜΙΣΕΙΣ", Modifier.weight(1.05f), glass2) {
                            InfoLine("🎒", "Family", "Ημέρα • δραστηριότητες • pickups")
                            Spacer(Modifier.height(8.dp))
                            InfoLine("🎵", "Spotify", "Music & morning flow")
                            Spacer(Modifier.height(8.dp))
                            InfoLine("✈", "Travel", "Ταξίδια & ευκαιρίες")
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun AppsScreen(context: Context, onBack: () -> Unit) {
    val allApps = remember { installedApps(context) }
    val categories = listOf("ALL", "TV", "MOVIES", "MUSIC", "KIDS", "UTILITIES")
    var category by remember { mutableStateOf("ALL") }
    val visibleApps = remember(allApps, category) {
        if (category == "ALL") allApps else allApps.filter { appCategory(it.label) == category }
    }
    var selected by remember { mutableStateOf(allApps.firstOrNull()) }
    val pink = Color(0xFFFF4F9A)

    Box(
        Modifier
            .fillMaxSize()
            .background(
                Brush.linearGradient(
                    listOf(Color(0xFF050608), Color(0xFF140C13), Color(0xFF080A0D))
                )
            )
            .padding(horizontal = 30.dp, vertical = 24.dp)
    ) {
        Column(Modifier.fillMaxSize()) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                TvButton("‹ AGNES", onBack)
                Spacer(Modifier.width(18.dp))
                Column(Modifier.weight(1f)) {
                    Text("AGNES APPS", color = Color.White, fontSize = 32.sp, fontWeight = FontWeight.Black)
                    Text("Premium library • πραγματικά icons • γρήγορο άνοιγμα", color = Color(0xFFB9BDC5), fontSize = 13.sp)
                }
                Text("${allApps.size} APPS", color = pink, fontSize = 13.sp, fontWeight = FontWeight.Black)
            }

            Spacer(Modifier.height(16.dp))

            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                categories.forEach { name ->
                    CategoryChip(
                        label = when (name) {
                            "ALL" -> "ΟΛΑ"
                            "TV" -> "TV"
                            "MOVIES" -> "MOVIES"
                            "MUSIC" -> "MUSIC"
                            "KIDS" -> "KIDS"
                            else -> "UTILITIES"
                        },
                        selected = category == name,
                        onClick = {
                            category = name
                            selected = (if (name == "ALL") allApps else allApps.filter { appCategory(it.label) == name }).firstOrNull()
                        },
                        modifier = Modifier.weight(1f)
                    )
                }
            }

            Spacer(Modifier.height(18.dp))

            Row(Modifier.fillMaxWidth().weight(1f), horizontalArrangement = Arrangement.spacedBy(22.dp)) {
                PremiumAppHero(
                    context = context,
                    app = selected,
                    modifier = Modifier.width(330.dp).fillMaxHeight(),
                    onOpen = {
                        selected?.let {
                            if (!launchPackage(context, it.packageName)) {
                                Toast.makeText(context, "${it.label} δεν άνοιξε", Toast.LENGTH_SHORT).show()
                            }
                        }
                    }
                )

                Column(Modifier.weight(1f).fillMaxHeight()) {
                    Text(
                        if (category == "ALL") "ΟΛΕΣ ΟΙ ΕΦΑΡΜΟΓΕΣ" else category,
                        color = Color(0xFFFF7CB3),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Black
                    )
                    Spacer(Modifier.height(10.dp))

                    LazyVerticalGrid(
                        columns = GridCells.Fixed(4),
                        modifier = Modifier.fillMaxSize(),
                        horizontalArrangement = Arrangement.spacedBy(14.dp),
                        verticalArrangement = Arrangement.spacedBy(14.dp),
                        contentPadding = PaddingValues(end = 4.dp, bottom = 10.dp)
                    ) {
                        items(visibleApps, key = { it.packageName }) { app ->
                            PremiumAppTile(
                                context = context,
                                app = app,
                                onFocus = { selected = app },
                                onClick = {
                                    if (!launchPackage(context, app.packageName)) {
                                        Toast.makeText(context, "${app.label} δεν άνοιξε", Toast.LENGTH_SHORT).show()
                                    }
                                }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun CategoryChip(label: String, selected: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier) {
    var focused by remember { mutableStateOf(false) }
    val bg = when {
        selected -> Color(0xFF9C2D60)
        focused -> Color(0xFF4F2740)
        else -> Color(0xCC17191F)
    }
    Box(
        modifier
            .height(54.dp)
            .scale(if (focused) 1.035f else 1f)
            .background(bg, RoundedCornerShape(17.dp))
            .border(if (focused || selected) 2.dp else 1.dp, if (focused || selected) Color(0xFFFF82BA) else Color(0x22FFFFFF), RoundedCornerShape(17.dp))
            .onFocusChanged { focused = it.isFocused }
            .onKeyEvent { event ->
                if (event.type == KeyEventType.KeyUp && (event.key == Key.Enter || event.key == Key.DirectionCenter)) {
                    onClick(); true
                } else false
            }
            .focusable(),
        contentAlignment = Alignment.Center
    ) {
        Text(label, color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.ExtraBold)
    }
}

@Composable
private fun PremiumAppHero(
    context: Context,
    app: InstalledApp?,
    modifier: Modifier,
    onOpen: () -> Unit
) {
    val pink = Color(0xFFFF4F9A)
    Column(
        modifier
            .background(
                Brush.verticalGradient(listOf(Color(0xFF25151F), Color(0xFF111319))),
                RoundedCornerShape(30.dp)
            )
            .border(1.dp, Color(0x33FFFFFF), RoundedCornerShape(30.dp))
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text("SELECTED", color = Color(0xFFFF7CB3), fontSize = 11.sp, fontWeight = FontWeight.Black)
        Spacer(Modifier.height(18.dp))

        if (app != null) {
            val bitmap = remember(app.packageName) {
                context.packageManager.getApplicationIcon(app.packageName).toBitmap(180, 180).asImageBitmap()
            }
            Box(
                Modifier
                    .size(174.dp)
                    .background(Color(0xFF0D0F13), RoundedCornerShape(36.dp))
                    .border(1.dp, Color(0x44FFFFFF), RoundedCornerShape(36.dp)),
                contentAlignment = Alignment.Center
            ) {
                Image(
                    bitmap = bitmap,
                    contentDescription = app.label,
                    modifier = Modifier.size(126.dp),
                    contentScale = ContentScale.Fit
                )
            }
            Spacer(Modifier.height(22.dp))
            Text(app.label, color = Color.White, fontSize = 25.sp, fontWeight = FontWeight.Black, maxLines = 2)
            Spacer(Modifier.height(6.dp))
            Text(appCategory(app.label), color = Color(0xFFB8BDC5), fontSize = 12.sp)
            Spacer(Modifier.height(8.dp))
            Text("Έτοιμο να ανοίξει από την AGNES", color = Color(0xFFD6D9DE), fontSize = 13.sp)
            Spacer(Modifier.weight(1f))
            HeroOpenButton("ΑΝΟΙΓΜΑ", onOpen)
        } else {
            Spacer(Modifier.weight(1f))
            Text("Δεν βρέθηκαν εφαρμογές", color = Color.White, fontSize = 18.sp)
            Spacer(Modifier.weight(1f))
        }

        Spacer(Modifier.height(18.dp))
        Text("BACK → AGNES HOME", color = pink.copy(alpha = .8f), fontSize = 10.sp, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun PremiumAppTile(
    context: Context,
    app: InstalledApp,
    onFocus: () -> Unit,
    onClick: () -> Unit
) {
    var focused by remember { mutableStateOf(false) }
    val bg by animateColorAsState(
        if (focused) Color(0xFF3D2334) else Color(0xDD15181E),
        label = "premiumAppTile"
    )
    val bitmap = remember(app.packageName) {
        context.packageManager.getApplicationIcon(app.packageName).toBitmap(128, 128).asImageBitmap()
    }

    Column(
        Modifier
            .height(162.dp)
            .scale(if (focused) 1.065f else 1f)
            .background(bg, RoundedCornerShape(24.dp))
            .border(
                if (focused) 3.dp else 1.dp,
                if (focused) Color(0xFFFF7CB3) else Color(0x2AFFFFFF),
                RoundedCornerShape(24.dp)
            )
            .onFocusChanged {
                focused = it.isFocused
                if (it.isFocused) onFocus()
            }
            .onKeyEvent { event ->
                if (event.type == KeyEventType.KeyUp && (event.key == Key.Enter || event.key == Key.DirectionCenter)) {
                    onClick(); true
                } else false
            }
            .focusable()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Box(
            Modifier
                .size(78.dp)
                .background(Color(0xFF090B0F), RoundedCornerShape(22.dp)),
            contentAlignment = Alignment.Center
        ) {
            Image(
                bitmap = bitmap,
                contentDescription = app.label,
                modifier = Modifier.size(60.dp),
                contentScale = ContentScale.Fit
            )
        }
        Spacer(Modifier.height(12.dp))
        Text(
            app.label,
            color = Color.White,
            fontSize = 13.sp,
            fontWeight = FontWeight.ExtraBold,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
        Text(appCategory(app.label), color = Color(0xFF9399A2), fontSize = 9.sp)
    }
}

@Composable
private fun HeroOpenButton(text: String, onClick: () -> Unit) {
    var focused by remember { mutableStateOf(false) }
    Box(
        Modifier
            .fillMaxWidth()
            .height(58.dp)
            .scale(if (focused) 1.035f else 1f)
            .background(if (focused) Color(0xFFFF4F9A) else Color(0xFF8B2B57), RoundedCornerShape(18.dp))
            .border(if (focused) 2.dp else 1.dp, if (focused) Color.White else Color(0x55FFFFFF), RoundedCornerShape(18.dp))
            .onFocusChanged { focused = it.isFocused }
            .onKeyEvent { event ->
                if (event.type == KeyEventType.KeyUp && (event.key == Key.Enter || event.key == Key.DirectionCenter)) {
                    onClick(); true
                } else false
            }
            .focusable(),
        contentAlignment = Alignment.Center
    ) {
        Text(text, color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Black)
    }
}

@Composable
private fun AssistantPanel(modifier: Modifier, pink: Color, glass: Color) {
    Column(
        modifier
            .background(Brush.verticalGradient(listOf(Color(0xFF342127), Color(0xFF181318))), RoundedCornerShape(26.dp))
            .border(1.dp, Color(0x33FFFFFF), RoundedCornerShape(26.dp))
            .padding(18.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box(
            Modifier
                .size(132.dp)
                .background(Color(0xFFE8C6A8), CircleShape)
                .border(4.dp, Color(0xFFB88763), CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Text("AGNES", color = Color(0xFF2B1C20), fontSize = 26.sp, fontWeight = FontWeight.Black)
        }
        Spacer(Modifier.height(14.dp))
        Text("Γεια σου Daddy! 👋", color = Color.White, fontSize = 19.sp, fontWeight = FontWeight.Bold)
        Text("Τι θέλεις να δούμε σήμερα;", color = Color(0xFFD5C7CC), fontSize = 13.sp)
        Spacer(Modifier.height(14.dp))
        Column(
            Modifier
                .fillMaxWidth()
                .background(glass, RoundedCornerShape(18.dp))
                .border(1.dp, pink.copy(alpha = .45f), RoundedCornerShape(18.dp))
                .padding(14.dp)
        ) {
            Text("🎙  Μίλα στην AGNES", color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.Bold)
            Text("Πες μου ή πάτησε το μικρόφωνο", color = Color(0xFFBFC3CA), fontSize = 11.sp)
        }
        Spacer(Modifier.weight(1f))
        Text("Η AGNES έχει τον πρώτο ρόλο.", color = Color(0xFFFF83B8), fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
private fun GlassChip(title: String, subtitle: String) {
    Column(
        Modifier
            .background(Color(0xAA24262B), RoundedCornerShape(18.dp))
            .border(1.dp, Color(0x22FFFFFF), RoundedCornerShape(18.dp))
            .padding(horizontal = 16.dp, vertical = 8.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(title, color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Bold)
        Text(subtitle, color = Color(0xFFC7CBD1), fontSize = 10.sp)
    }
}

@Composable
private fun HomeTile(item: HubItem, modifier: Modifier, onClick: () -> Unit) {
    var focused by remember { mutableStateOf(false) }
    val bg by animateColorAsState(if (focused) item.accent else item.accent.copy(alpha = .72f), label = "tileBg")
    Column(
        modifier
            .height(142.dp)
            .scale(if (focused) 1.055f else 1f)
            .background(bg, RoundedCornerShape(18.dp))
            .border(if (focused) 3.dp else 1.dp, if (focused) Color(0xFFFF83B8) else Color(0x33FFFFFF), RoundedCornerShape(18.dp))
            .onFocusChanged { focused = it.isFocused }
            .onKeyEvent { event ->
                if (event.type == KeyEventType.KeyUp && (event.key == Key.Enter || event.key == Key.DirectionCenter)) {
                    onClick(); true
                } else false
            }
            .focusable()
            .padding(12.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(item.icon, color = Color.White, fontSize = 30.sp, fontWeight = FontWeight.Black)
        Spacer(Modifier.height(7.dp))
        Text(item.title, color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.ExtraBold, maxLines = 1)
        Text(item.subtitle, color = Color(0xFFD7D9DE), fontSize = 9.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}

@Composable
private fun PanelCard(title: String, modifier: Modifier, bg: Color, content: @Composable ColumnScope.() -> Unit) {
    Column(
        modifier
            .fillMaxHeight()
            .background(bg, RoundedCornerShape(22.dp))
            .border(1.dp, Color(0x33FFFFFF), RoundedCornerShape(22.dp))
            .padding(16.dp)
    ) {
        Text(title, color = Color(0xFFFF6CA8), fontSize = 12.sp, fontWeight = FontWeight.Black)
        Spacer(Modifier.height(12.dp))
        content()
    }
}

@Composable
private fun MatchLine(icon: String, title: String, subtitle: String, channel: String) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Text(icon, fontSize = 18.sp)
        Spacer(Modifier.width(10.dp))
        Column(Modifier.weight(1f)) {
            Text(title, color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Bold)
            Text(subtitle, color = Color(0xFFADB2B9), fontSize = 10.sp)
        }
        Text(channel, color = Color.White, fontSize = 9.sp, modifier = Modifier.background(Color(0xFF292C32), RoundedCornerShape(10.dp)).padding(8.dp))
    }
}

@Composable
private fun InfoLine(icon: String, title: String, subtitle: String) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Text(icon, fontSize = 16.sp)
        Spacer(Modifier.width(8.dp))
        Column(Modifier.weight(1f)) {
            Text(title, color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
            Text(subtitle, color = Color(0xFFADB2B9), fontSize = 9.sp, maxLines = 2)
        }
    }
}

@Composable
private fun SportsScreen(onBack: () -> Unit) {
    val url = "https://epg.cyta.com.cy/tv-live-sports-events/en"
    Box(Modifier.fillMaxSize().background(Color.Black)) {
        Column(Modifier.fillMaxSize()) {
            Row(
                Modifier.fillMaxWidth().height(70.dp).background(Color(0xFF111318)).padding(horizontal = 22.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                TvButton("‹ ΠΙΣΩ", onBack)
                Spacer(Modifier.width(18.dp))
                Column(Modifier.weight(1f)) {
                    Text("SPORTS LIVE", color = Color.White, fontSize = 23.sp, fontWeight = FontWeight.Bold)
                    Text("Επίσημο Cytavision πρόγραμμα • αγώνες • ώρα • κανάλι", color = Color(0xFFBFC3CA), fontSize = 11.sp)
                }
                Text("AGNES TV", color = Color(0xFFFF6CA8), fontSize = 13.sp, fontWeight = FontWeight.Bold)
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
                        loadUrl(url)
                    }
                },
                update = { if (it.url == null) it.loadUrl(url) }
            )
        }
    }
}

@Composable
private fun TvButton(text: String, onClick: () -> Unit) {
    var focused by remember { mutableStateOf(false) }
    Box(
        Modifier
            .scale(if (focused) 1.05f else 1f)
            .background(if (focused) Color(0xFFFF4F9A) else Color(0xFF2A2D33), RoundedCornerShape(14.dp))
            .border(if (focused) 2.dp else 1.dp, if (focused) Color.White else Color(0x33FFFFFF), RoundedCornerShape(14.dp))
            .onFocusChanged { focused = it.isFocused }
            .onKeyEvent { event ->
                if (event.type == KeyEventType.KeyUp && (event.key == Key.Enter || event.key == Key.DirectionCenter)) {
                    onClick(); true
                } else false
            }
            .focusable()
            .padding(horizontal = 16.dp, vertical = 10.dp)
    ) { Text(text, color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold) }
}

private fun currentTime(): String = SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date())
