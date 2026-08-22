package mom.agnes.tv

import android.content.ComponentName
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
private enum class ServiceAction { CYTAVISION, SPORTS, FITNESS, SMART_HOME, KIDS, FAMILY, TRAVEL, MUSIC, APPS }

private data class ServiceItem(
    val icon: String,
    val title: String,
    val subtitle: String,
    val detail: String,
    val action: ServiceAction
)

private data class InstalledApp(
    val label: String,
    val packageName: String,
    val activityName: String,
    val leanback: Boolean
)

private fun installedApps(context: Context): List<InstalledApp> {
    val pm = context.packageManager
    val sources = listOf(
        true to Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LEANBACK_LAUNCHER),
        false to Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
    )

    return sources
        .flatMap { (leanback, intent) ->
            pm.queryIntentActivities(intent, PackageManager.MATCH_ALL).map { info ->
                InstalledApp(
                    label = info.loadLabel(pm).toString(),
                    packageName = info.activityInfo.packageName,
                    activityName = info.activityInfo.name,
                    leanback = leanback
                )
            }
        }
        .filter { it.packageName != context.packageName }
        .sortedWith(
            compareByDescending<InstalledApp> { it.leanback }
                .thenBy { it.label.lowercase(Locale.getDefault()) }
        )
        .distinctBy { it.packageName }
}

private fun launchInstalledApp(context: Context, app: InstalledApp): Boolean {
    val explicit = Intent(Intent.ACTION_MAIN).apply {
        component = ComponentName(app.packageName, app.activityName)
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    }

    if (runCatching { context.startActivity(explicit) }.isSuccess) return true

    val fallback = context.packageManager.getLaunchIntentForPackage(app.packageName) ?: return false
    fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    return runCatching { context.startActivity(fallback) }.isSuccess
}

private fun findInstalledApp(context: Context, keywords: List<String>): InstalledApp? {
    val apps = installedApps(context)
    return apps.firstOrNull { app ->
        val haystack = "${app.label} ${app.packageName}".lowercase(Locale.getDefault())
        keywords.any { key -> haystack.contains(key.lowercase(Locale.getDefault())) }
    }
}

private fun findCytavision(context: Context): InstalledApp? {
    val apps = installedApps(context)
    return apps.firstOrNull { it.label.contains("Cytavision", true) }
        ?: apps.firstOrNull { it.label.contains("Cyta", true) }
        ?: apps.firstOrNull { it.packageName.contains("cyta", true) }
}

private fun openCytavision(context: Context): Boolean {
    val app = findCytavision(context) ?: return false
    return launchInstalledApp(context, app)
}

private fun openPlayStore(context: Context): Boolean {
    val apps = installedApps(context)
    val store = apps.firstOrNull { it.packageName == "com.android.vending" }
        ?: apps.firstOrNull { it.label.contains("Play Store", true) || it.label.contains("Google Play", true) }
    return store?.let { launchInstalledApp(context, it) } ?: false
}

@Composable
private fun AgnesTvApp(context: Context) {
    var screen by remember { mutableStateOf(Screen.HOME) }
    BackHandler(enabled = screen != Screen.HOME) { screen = Screen.HOME }

    when (screen) {
        Screen.HOME -> AgnesHome(
            context = context,
            onSports = { screen = Screen.SPORTS },
            onApps = { screen = Screen.APPS }
        )
        Screen.SPORTS -> SportsScreen(onBack = { screen = Screen.HOME })
        Screen.APPS -> AppsScreen(context = context, onBack = { screen = Screen.HOME })
    }
}

@Composable
private fun AgnesHome(context: Context, onSports: () -> Unit, onApps: () -> Unit) {
    var clock by remember { mutableStateOf(currentTime()) }
    var agnesMessage by remember { mutableStateOf<String?>(null) }
    val detectedApps = remember { installedApps(context) }
    val cytavision = remember { findCytavision(context) }
    val spotify = remember { findInstalledApp(context, listOf("Spotify")) }
    val smartHome = remember { findInstalledApp(context, listOf("Google Home", "Mi Home", "SmartThings")) }
    val kids = remember { findInstalledApp(context, listOf("YouTube Kids", "Kids")) }

    LaunchedEffect(Unit) {
        while (true) {
            clock = currentTime()
            delay(30_000)
        }
    }

    val services = remember {
        listOf(
            ServiceItem("📺", "TV", "Cytavision", "Live TV από την εφαρμογή που είναι πραγματικά εγκατεστημένη στο box.", ServiceAction.CYTAVISION),
            ServiceItem("⚽", "SPORTS", "Αγώνες & κανάλια", "Ανοίγει το επίσημο πρόγραμμα Cytavision για ώρες και κανάλια.", ServiceAction.SPORTS),
            ServiceItem("🏃", "ΓΥΜΝΑΣΤΙΚΗ", "AGNES Fitness", "Υπηρεσία AGNES. Δεν ανοίγω ψεύτικη εφαρμογή αν δεν υπάρχει.", ServiceAction.FITNESS),
            ServiceItem("🏠", "SMART HOME", "Συνδεδεμένο σπίτι", "Ανοίγει Smart Home app μόνο όταν ανιχνεύεται στο box.", ServiceAction.SMART_HOME),
            ServiceItem("🧸", "ΠΑΙΔΙΚΟ", "Kids", "Ανοίγει παιδική εφαρμογή μόνο όταν είναι εγκατεστημένη.", ServiceAction.KIDS),
            ServiceItem("❤", "FAMILY", "AGNES Family", "Οικογενειακές ειδοποιήσεις και πληροφορίες της AGNES.", ServiceAction.FAMILY),
            ServiceItem("✈", "TRAVEL", "AGNES Travel", "Travel service της AGNES χωρίς ψεύτικα shortcuts.", ServiceAction.TRAVEL),
            ServiceItem("🎵", "MUSIC", "Spotify", "Ανοίγει Spotify μόνο αν υπάρχει στο box.", ServiceAction.MUSIC),
            ServiceItem("▦", "APPS", "Εγκατεστημένες εφαρμογές", "Δείχνει αποκλειστικά όσα apps βρίσκει πραγματικά στο Xiaomi box.", ServiceAction.APPS)
        )
    }

    var selectedIndex by remember { mutableIntStateOf(0) }
    val selected = services[selectedIndex]

    fun activate(service: ServiceItem) {
        when (service.action) {
            ServiceAction.CYTAVISION -> {
                if (!openCytavision(context)) {
                    agnesMessage = if (cytavision == null) {
                        "Δεν ανίχνευσα Cytavision στο launcher του box. Δεν θα σου δείξω ψεύτικο κουμπί."
                    } else {
                        "Βρήκα τη Cytavision (${cytavision.label}), αλλά το box δεν επέτρεψε να ανοίξει."
                    }
                }
            }
            ServiceAction.SPORTS -> onSports()
            ServiceAction.FITNESS -> agnesMessage = "Το AGNES Fitness δεν είναι ακόμη ενεργή υπηρεσία. Το κρατάω καθαρό αντί να ανοίγω άσχετη εφαρμογή."
            ServiceAction.SMART_HOME -> {
                if (smartHome != null) {
                    if (!launchInstalledApp(context, smartHome)) agnesMessage = "Βρήκα ${smartHome.label}, αλλά δεν άνοιξε."
                } else agnesMessage = "Δεν βρήκα Smart Home εφαρμογή εγκατεστημένη στο box."
            }
            ServiceAction.KIDS -> {
                if (kids != null) {
                    if (!launchInstalledApp(context, kids)) agnesMessage = "Βρήκα ${kids.label}, αλλά δεν άνοιξε."
                } else agnesMessage = "Δεν βρήκα παιδική εφαρμογή εγκατεστημένη στο box."
            }
            ServiceAction.FAMILY -> agnesMessage = "AGNES Family: εδώ θα εμφανίζονται μόνο πραγματικές οικογενειακές ειδοποιήσεις και υπενθυμίσεις."
            ServiceAction.TRAVEL -> agnesMessage = "AGNES Travel: η υπηρεσία δεν είναι ακόμη συνδεδεμένη. Δεν εμφανίζω πλασματικά δεδομένα."
            ServiceAction.MUSIC -> {
                if (spotify != null) {
                    if (!launchInstalledApp(context, spotify)) agnesMessage = "Βρήκα Spotify, αλλά δεν άνοιξε."
                } else agnesMessage = "Το Spotify δεν είναι εγκατεστημένο στο box."
            }
            ServiceAction.APPS -> onApps()
        }
    }

    Box(
        Modifier
            .fillMaxSize()
            .background(Brush.linearGradient(listOf(Color(0xFF050608), Color(0xFF120C14), Color(0xFF081017))))
            .padding(horizontal = 30.dp, vertical = 22.dp)
    ) {
        Column(Modifier.fillMaxSize()) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("AGNES TV", color = Color.White, fontSize = 32.sp, fontWeight = FontWeight.Black)
                    Text("Ό,τι υπάρχει πραγματικά στο box • χωρίς ψεύτικα shortcuts", color = Color(0xFFCAC0C7), fontSize = 13.sp)
                }
                StatusChip(if (cytavision != null) "● CYTAVISION" else "○ CYTAVISION", if (cytavision != null) "DETECTED" else "NOT DETECTED")
                Spacer(Modifier.width(10.dp))
                SmallAction("PLAY STORE") {
                    if (!openPlayStore(context)) agnesMessage = "Το Play Store δεν ανιχνεύτηκε στο box."
                }
                Spacer(Modifier.width(18.dp))
                Column(horizontalAlignment = Alignment.End) {
                    Text(clock, color = Color.White, fontSize = 29.sp, fontWeight = FontWeight.Bold)
                    Text("AGNES TV • v1.5.0", color = Color(0xFFFF79B2), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
            }

            Spacer(Modifier.height(18.dp))

            ServiceRail(
                services = services,
                selectedIndex = selectedIndex,
                onIndexChange = {
                    selectedIndex = it
                    agnesMessage = null
                },
                onActivate = { activate(selected) },
                modifier = Modifier.fillMaxWidth().height(92.dp)
            )

            Spacer(Modifier.height(16.dp))

            Row(Modifier.fillMaxWidth().weight(1f), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                ServiceHero(
                    service = selected,
                    cytavision = cytavision,
                    detectedCount = detectedApps.size,
                    modifier = Modifier.weight(1.65f).fillMaxHeight()
                )

                Column(Modifier.weight(.85f).fillMaxHeight(), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    InfoPanel("ΠΡΑΓΜΑΤΙΚΗ ΚΑΤΑΣΤΑΣΗ", Modifier.weight(1f)) {
                        StatusLine("Cytavision", cytavision?.label ?: "Δεν ανιχνεύτηκε", cytavision != null)
                        Spacer(Modifier.height(10.dp))
                        StatusLine("Spotify", spotify?.label ?: "Δεν είναι εγκατεστημένο", spotify != null)
                        Spacer(Modifier.height(10.dp))
                        StatusLine("Smart Home", smartHome?.label ?: "Δεν είναι εγκατεστημένο", smartHome != null)
                        Spacer(Modifier.height(10.dp))
                        StatusLine("Kids", kids?.label ?: "Δεν είναι εγκατεστημένο", kids != null)
                    }
                    InfoPanel("APPS ΣΤΟ BOX", Modifier.weight(.72f)) {
                        Text("${detectedApps.size}", color = Color.White, fontSize = 34.sp, fontWeight = FontWeight.Black)
                        Text("launcher εφαρμογές που ανιχνεύτηκαν πραγματικά", color = Color(0xFFB9BDC5), fontSize = 12.sp)
                        Spacer(Modifier.weight(1f))
                        Text("APPS → για πραγματικά icons και άνοιγμα", color = Color(0xFFFF86B9), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        agnesMessage?.let { message ->
            AgnesMessageCard(
                message = message,
                onDismiss = { agnesMessage = null },
                modifier = Modifier.align(Alignment.BottomEnd).width(470.dp)
            )
        }
    }
}

@Composable
private fun ServiceRail(
    services: List<ServiceItem>,
    selectedIndex: Int,
    onIndexChange: (Int) -> Unit,
    onActivate: () -> Unit,
    modifier: Modifier = Modifier
) {
    var focused by remember { mutableStateOf(false) }
    Row(
        modifier
            .background(Color(0xCC11141A), RoundedCornerShape(22.dp))
            .border(if (focused) 2.dp else 1.dp, if (focused) Color(0xFFFF82B8) else Color(0x22FFFFFF), RoundedCornerShape(22.dp))
            .onFocusChanged { focused = it.isFocused }
            .onKeyEvent { event ->
                if (event.type != KeyEventType.KeyUp) return@onKeyEvent false
                when (event.key) {
                    Key.DirectionLeft -> { onIndexChange((selectedIndex - 1 + services.size) % services.size); true }
                    Key.DirectionRight -> { onIndexChange((selectedIndex + 1) % services.size); true }
                    Key.Enter, Key.DirectionCenter -> { onActivate(); true }
                    else -> false
                }
            }
            .focusable()
            .padding(8.dp),
        horizontalArrangement = Arrangement.spacedBy(7.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        services.forEachIndexed { index, item ->
            val selected = index == selectedIndex
            Row(
                Modifier
                    .weight(1f)
                    .fillMaxHeight()
                    .background(if (selected) Color(0xFF6F2851) else Color(0xFF1A1D24), RoundedCornerShape(16.dp))
                    .border(if (selected) 2.dp else 1.dp, if (selected) Color(0xFFFF88BC) else Color(0x22FFFFFF), RoundedCornerShape(16.dp))
                    .padding(horizontal = 9.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Center
            ) {
                Text(item.icon, fontSize = 18.sp)
                Spacer(Modifier.width(6.dp))
                Text(item.title, color = Color.White, fontSize = 10.sp, fontWeight = if (selected) FontWeight.Black else FontWeight.Bold, maxLines = 1)
            }
        }
    }
}

@Composable
private fun ServiceHero(service: ServiceItem, cytavision: InstalledApp?, detectedCount: Int, modifier: Modifier) {
    Column(
        modifier
            .background(
                Brush.linearGradient(listOf(Color(0xFF281520), Color(0xFF11151C), Color(0xFF0B1118))),
                RoundedCornerShape(28.dp)
            )
            .border(1.dp, Color(0x33FFFFFF), RoundedCornerShape(28.dp))
            .padding(26.dp)
    ) {
        Text("${service.icon}  ${service.title}", color = Color.White, fontSize = 30.sp, fontWeight = FontWeight.Black)
        Spacer(Modifier.height(6.dp))
        Text(service.subtitle, color = Color(0xFFFF86BA), fontSize = 15.sp, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(18.dp))
        Text(service.detail, color = Color(0xFFD0D3D8), fontSize = 16.sp, lineHeight = 23.sp)

        Spacer(Modifier.height(24.dp))

        when (service.action) {
            ServiceAction.CYTAVISION -> {
                if (cytavision != null) {
                    Text("✓ ${cytavision.label}", color = Color(0xFF9CE5B2), fontSize = 18.sp, fontWeight = FontWeight.Black)
                    Text("Package: ${cytavision.packageName}", color = Color(0xFF9EA4AC), fontSize = 11.sp)
                    Text("OK για άνοιγμα με το πραγματικό launcher activity", color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                } else {
                    Text("Δεν ανιχνεύτηκε Cytavision", color = Color(0xFFFF9AAA), fontSize = 18.sp, fontWeight = FontWeight.Black)
                    Text("Η AGNES δεν θα προσποιηθεί ότι υπάρχει.", color = Color(0xFFB7BBC1), fontSize = 13.sp)
                }
            }
            ServiceAction.APPS -> {
                Text("$detectedCount εφαρμογές ανιχνεύτηκαν", color = Color.White, fontSize = 22.sp, fontWeight = FontWeight.Black)
                Text("Η λίστα δημιουργείται από το ίδιο το Xiaomi box.", color = Color(0xFFB7BBC1), fontSize = 13.sp)
            }
            ServiceAction.SPORTS -> {
                Text("Επίσημο Cytavision Sports πρόγραμμα", color = Color.White, fontSize = 20.sp, fontWeight = FontWeight.Black)
                Text("OK για αγώνες • ώρες • κανάλια", color = Color(0xFFB7BBC1), fontSize = 13.sp)
            }
            else -> {
                Text("AGNES SERVICE", color = Color.White, fontSize = 20.sp, fontWeight = FontWeight.Black)
                Text("Αν δεν υπάρχει πραγματική σύνδεση, η AGNES στο λέει καθαρά.", color = Color(0xFFB7BBC1), fontSize = 13.sp)
            }
        }

        Spacer(Modifier.weight(1f))
        Text("← / → ΑΛΛΑΓΗ ΥΠΗΡΕΣΙΑΣ     •     OK ΕΝΕΡΓΕΙΑ", color = Color(0xFFFF88BC), fontSize = 12.sp, fontWeight = FontWeight.Black)
    }
}

@Composable
private fun AgnesMessageCard(message: String, onDismiss: () -> Unit, modifier: Modifier = Modifier) {
    var focused by remember { mutableStateOf(false) }
    Row(
        modifier
            .background(Color(0xF21B1520), RoundedCornerShape(22.dp))
            .border(if (focused) 2.dp else 1.dp, if (focused) Color.White else Color(0xAAFF75AF), RoundedCornerShape(22.dp))
            .onFocusChanged { focused = it.isFocused }
            .onKeyEvent { event ->
                if (event.type == KeyEventType.KeyUp && (event.key == Key.Enter || event.key == Key.DirectionCenter || event.key == Key.Back)) {
                    onDismiss(); true
                } else false
            }
            .focusable()
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            Modifier.size(54.dp).background(Color(0xFF7A2A54), CircleShape).border(2.dp, Color(0xFFFF83B8), CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Text("A", color = Color.White, fontSize = 24.sp, fontWeight = FontWeight.Black)
        }
        Spacer(Modifier.width(13.dp))
        Column(Modifier.weight(1f)) {
            Text("ΑΓΝΗ", color = Color(0xFFFF83B8), fontSize = 12.sp, fontWeight = FontWeight.Black)
            Text(message, color = Color.White, fontSize = 13.sp, lineHeight = 18.sp)
        }
        Text("OK", color = Color(0xFFADB1B8), fontSize = 10.sp, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun AppsScreen(context: Context, onBack: () -> Unit) {
    val apps = remember { installedApps(context) }
    var selected by remember { mutableStateOf(apps.firstOrNull()) }

    Box(
        Modifier
            .fillMaxSize()
            .background(Brush.linearGradient(listOf(Color(0xFF050608), Color(0xFF150D13), Color(0xFF081017))))
            .padding(28.dp)
    ) {
        Column(Modifier.fillMaxSize()) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                TvButton("‹ AGNES", onBack)
                Spacer(Modifier.width(18.dp))
                Column(Modifier.weight(1f)) {
                    Text("AGNES APPS", color = Color.White, fontSize = 31.sp, fontWeight = FontWeight.Black)
                    Text("Μόνο όσα είναι πραγματικά εγκατεστημένα στο box", color = Color(0xFFBEC1C8), fontSize = 13.sp)
                }
                Text("${apps.size} APPS", color = Color(0xFFFF7EB5), fontSize = 12.sp, fontWeight = FontWeight.Black)
                Spacer(Modifier.width(14.dp))
                SmallAction("PLAY STORE") { if (!openPlayStore(context)) toast(context, "Το Play Store δεν βρέθηκε") }
            }

            Spacer(Modifier.height(18.dp))

            Row(Modifier.fillMaxWidth().weight(1f), horizontalArrangement = Arrangement.spacedBy(18.dp)) {
                AppHero(context, selected, Modifier.width(330.dp).fillMaxHeight())
                LazyVerticalGrid(
                    columns = GridCells.Fixed(4),
                    modifier = Modifier.fillMaxSize(),
                    horizontalArrangement = Arrangement.spacedBy(14.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    items(apps, key = { it.packageName }) { app ->
                        AppTile(context, app, onFocus = { selected = app }) {
                            if (!launchInstalledApp(context, app)) toast(context, "${app.label} δεν άνοιξε")
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun AppHero(context: Context, app: InstalledApp?, modifier: Modifier) {
    Column(
        modifier
            .background(Color(0xD9181A20), RoundedCornerShape(26.dp))
            .border(1.dp, Color(0x33FFFFFF), RoundedCornerShape(26.dp))
            .padding(22.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        if (app != null) {
            val icon = remember(app.packageName) {
                runCatching { context.packageManager.getApplicationIcon(app.packageName).toBitmap(220, 220).asImageBitmap() }.getOrNull()
            }
            if (icon != null) Image(icon, null, Modifier.size(150.dp), contentScale = ContentScale.Fit)
            Spacer(Modifier.height(18.dp))
            Text(app.label, color = Color.White, fontSize = 25.sp, fontWeight = FontWeight.Black, maxLines = 2)
            Text(app.packageName, color = Color(0xFF9EA3AB), fontSize = 9.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Spacer(Modifier.height(8.dp))
            Text("OK για άνοιγμα", color = Color(0xFFFF84B9), fontSize = 12.sp, fontWeight = FontWeight.Bold)
        } else {
            Text("Δεν βρέθηκαν εφαρμογές", color = Color.White, fontSize = 22.sp, fontWeight = FontWeight.Black)
        }
        Spacer(Modifier.weight(1f))
        Text("AGNES • REAL APPS ONLY", color = Color(0xFFFF7EB5), fontSize = 10.sp, fontWeight = FontWeight.Black)
    }
}

@Composable
private fun AppTile(context: Context, app: InstalledApp, onFocus: () -> Unit, onClick: () -> Unit) {
    var focused by remember { mutableStateOf(false) }
    val bg by animateColorAsState(if (focused) Color(0xFF54283E) else Color(0xD91B1D23), label = "app")
    val icon = remember(app.packageName) {
        runCatching { context.packageManager.getApplicationIcon(app.packageName).toBitmap(150, 150).asImageBitmap() }.getOrNull()
    }

    Column(
        Modifier
            .height(156.dp)
            .scale(if (focused) 1.055f else 1f)
            .background(bg, RoundedCornerShape(22.dp))
            .border(if (focused) 3.dp else 1.dp, if (focused) Color(0xFFFF82B8) else Color(0x22FFFFFF), RoundedCornerShape(22.dp))
            .onFocusChanged { focused = it.isFocused; if (it.isFocused) onFocus() }
            .onKeyEvent { event ->
                if (event.type == KeyEventType.KeyUp && (event.key == Key.Enter || event.key == Key.DirectionCenter)) {
                    onClick(); true
                } else false
            }
            .focusable()
            .padding(14.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        if (icon != null) Image(icon, null, Modifier.size(72.dp), contentScale = ContentScale.Fit)
        Spacer(Modifier.height(10.dp))
        Text(app.label, color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold, maxLines = 2, overflow = TextOverflow.Ellipsis)
    }
}

@Composable
private fun SportsScreen(onBack: () -> Unit) {
    val url = "https://epg.cyta.com.cy/tv-live-sports-events/en"
    Column(Modifier.fillMaxSize().background(Color.Black)) {
        Row(
            Modifier.fillMaxWidth().height(72.dp).background(Color(0xFF111318)).padding(horizontal = 24.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            TvButton("‹ AGNES", onBack)
            Spacer(Modifier.width(18.dp))
            Column(Modifier.weight(1f)) {
                Text("SPORTS LIVE", color = Color.White, fontSize = 23.sp, fontWeight = FontWeight.Black)
                Text("Επίσημο Cytavision πρόγραμμα • αγώνες • ώρα • κανάλι", color = Color(0xFFBFC3CA), fontSize = 11.sp)
            }
            Text("AGNES", color = Color(0xFFFF7CB4), fontSize = 13.sp, fontWeight = FontWeight.Black)
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

@Composable
private fun StatusChip(title: String, subtitle: String) {
    Column(
        Modifier
            .background(Color(0xAA23252B), RoundedCornerShape(17.dp))
            .border(1.dp, Color(0x22FFFFFF), RoundedCornerShape(17.dp))
            .padding(horizontal = 14.dp, vertical = 7.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(title, color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
        Text(subtitle, color = Color(0xFFB7BBC2), fontSize = 9.sp)
    }
}

@Composable
private fun StatusLine(title: String, subtitle: String, ok: Boolean) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Box(
            Modifier.size(12.dp).background(if (ok) Color(0xFF75D995) else Color(0xFF6A6E76), CircleShape)
        )
        Spacer(Modifier.width(10.dp))
        Column(Modifier.weight(1f)) {
            Text(title, color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Bold)
            Text(subtitle, color = Color(0xFFADB2B9), fontSize = 10.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
    }
}

@Composable
private fun SmallAction(text: String, onClick: () -> Unit) {
    var focused by remember { mutableStateOf(false) }
    Box(
        Modifier
            .scale(if (focused) 1.04f else 1f)
            .background(if (focused) Color(0xFFFF4F9A) else Color(0xFF24272E), RoundedCornerShape(16.dp))
            .border(if (focused) 2.dp else 1.dp, if (focused) Color.White else Color(0x33FFFFFF), RoundedCornerShape(16.dp))
            .onFocusChanged { focused = it.isFocused }
            .onKeyEvent { event ->
                if (event.type == KeyEventType.KeyUp && (event.key == Key.Enter || event.key == Key.DirectionCenter)) {
                    onClick(); true
                } else false
            }
            .focusable()
            .padding(horizontal = 16.dp, vertical = 11.dp)
    ) {
        Text(text, color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Black)
    }
}

@Composable
private fun TvButton(text: String, onClick: () -> Unit) = SmallAction(text, onClick)

@Composable
private fun InfoPanel(title: String, modifier: Modifier, content: @Composable ColumnScope.() -> Unit) {
    Column(
        modifier
            .fillMaxHeight()
            .background(Color(0xD914171D), RoundedCornerShape(24.dp))
            .border(1.dp, Color(0x2FFFFFFF), RoundedCornerShape(24.dp))
            .padding(18.dp)
    ) {
        Text(title, color = Color(0xFFFF78B1), fontSize = 11.sp, fontWeight = FontWeight.Black)
        Spacer(Modifier.height(12.dp))
        content()
    }
}

private fun toast(context: Context, message: String) = Toast.makeText(context, message, Toast.LENGTH_SHORT).show()
private fun currentTime(): String = SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date())
