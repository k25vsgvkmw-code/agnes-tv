package mom.agnes.tv

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.provider.Settings
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
    val action: ServiceAction,
    val accent: Color
)

private data class InstalledApp(val label: String, val packageName: String)

private fun launchPackage(context: Context, packageName: String): Boolean {
    val launchIntent = context.packageManager.getLaunchIntentForPackage(packageName) ?: return false
    launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    context.startActivity(launchIntent)
    return true
}

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

private fun openPlayStore(context: Context): Boolean {
    if (launchPackage(context, "com.android.vending")) return true
    return openInstalledAppByLabel(context, listOf("Play Store", "Google Play"))
}

private fun installedApps(context: Context): List<InstalledApp> {
    val pm = context.packageManager
    val intents = listOf(
        Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LEANBACK_LAUNCHER),
        Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
    )
    return intents.flatMap { pm.queryIntentActivities(it, PackageManager.MATCH_ALL) }
        .distinctBy { it.activityInfo.packageName }
        .filter { it.activityInfo.packageName != context.packageName }
        .map { InstalledApp(it.loadLabel(pm).toString(), it.activityInfo.packageName) }
        .sortedBy { it.label.lowercase(Locale.getDefault()) }
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
    LaunchedEffect(Unit) {
        while (true) {
            clock = currentTime()
            delay(30_000)
        }
    }

    val services = remember {
        listOf(
            ServiceItem("📺", "TV", "Cytavision & Live TV", "Ζωντανή τηλεόραση και γρήγορη πρόσβαση στη Cytavision.", ServiceAction.CYTAVISION, Color(0xFF7A274E)),
            ServiceItem("⚽", "SPORTS", "Αγώνες & κανάλια", "Πρόγραμμα αγώνων, ώρες και κανάλια μέσα στην AGNES.", ServiceAction.SPORTS, Color(0xFF263E64)),
            ServiceItem("🏃", "ΓΥΜΝΑΣΤΙΚΗ", "Workout & movement", "Μεγάλη οθόνη για προπονήσεις, πρόγραμμα και καθημερινό στόχο.", ServiceAction.FITNESS, Color(0xFF315849)),
            ServiceItem("🏠", "SMART HOME", "Το σπίτι από την TV", "Φώτα, συσκευές, κάμερες και σκηνές από ένα σημείο.", ServiceAction.SMART_HOME, Color(0xFF415B68)),
            ServiceItem("🧸", "ΠΑΙΔΙΚΟ", "Kids World", "Παιδικό περιεχόμενο, ιστορίες, χαλάρωση και ασφαλής πρόσβαση.", ServiceAction.KIDS, Color(0xFF68517B)),
            ServiceItem("👨‍👩‍👦", "FAMILY", "Η οικογένεια τώρα", "Πρόγραμμα, δραστηριότητες, υπενθυμίσεις και οικογενειακή ροή.", ServiceAction.FAMILY, Color(0xFF7B4B69)),
            ServiceItem("✈", "TRAVEL", "Ταξίδια & ευκαιρίες", "Προορισμοί, ταξίδια, sports travel και οικογενειακές αποδράσεις.", ServiceAction.TRAVEL, Color(0xFF244F76)),
            ServiceItem("🎵", "MUSIC", "Spotify", "Μουσική, πρωινή αφύπνιση και βραδινή χαλάρωση.", ServiceAction.MUSIC, Color(0xFF246044)),
            ServiceItem("▦", "APPS", "Ό,τι είναι εγκατεστημένο", "Premium βιβλιοθήκη εφαρμογών μέσα στην AGNES, όχι έξω στο launcher.", ServiceAction.APPS, Color(0xFF6A492B))
        )
    }
    var selectedIndex by remember { mutableIntStateOf(0) }
    val selected = services[selectedIndex]

    fun activate(service: ServiceItem) {
        when (service.action) {
            ServiceAction.CYTAVISION -> if (!openInstalledAppByLabel(context, listOf("Cytavision"))) toast(context, "Η Cytavision δεν βρέθηκε")
            ServiceAction.SPORTS -> onSports()
            ServiceAction.FITNESS -> toast(context, "AGNES Fitness • έρχεται στο επόμενο service pack")
            ServiceAction.SMART_HOME -> if (!openInstalledAppByLabel(context, listOf("Google Home", "Home"))) toast(context, "Δεν βρέθηκε Smart Home εφαρμογή")
            ServiceAction.KIDS -> if (!openInstalledAppByLabel(context, listOf("YouTube Kids", "Kids"))) toast(context, "AGNES Kids • έρχεται στο επόμενο service pack")
            ServiceAction.FAMILY -> toast(context, "AGNES Family • έρχεται στο επόμενο service pack")
            ServiceAction.TRAVEL -> toast(context, "AGNES Travel • έρχεται στο επόμενο service pack")
            ServiceAction.MUSIC -> if (!openInstalledAppByLabel(context, listOf("Spotify"))) toast(context, "Το Spotify δεν βρέθηκε")
            ServiceAction.APPS -> onApps()
        }
    }

    Box(
        Modifier
            .fillMaxSize()
            .background(Brush.linearGradient(listOf(Color(0xFF050608), Color(0xFF160E14), Color(0xFF081117))))
            .padding(horizontal = 32.dp, vertical = 24.dp)
    ) {
        Column(Modifier.fillMaxSize()) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("AGNES", color = Color.White, fontSize = 34.sp, fontWeight = FontWeight.Black)
                    Text("Το δικό μας Home • όλα ξεκινούν από εδώ", color = Color(0xFFD3C7CC), fontSize = 14.sp)
                }
                StatusChip("☀ 22°C", "Κύπρος")
                Spacer(Modifier.width(10.dp))
                StatusChip("● AGNES", "HOME ACTIVE")
                Spacer(Modifier.width(12.dp))
                SmallAction("PLAY STORE") {
                    if (!openPlayStore(context)) toast(context, "Το Play Store δεν βρέθηκε")
                }
                Spacer(Modifier.width(18.dp))
                Column(horizontalAlignment = Alignment.End) {
                    Text(clock, color = Color.White, fontSize = 30.sp, fontWeight = FontWeight.Bold)
                    Text("AGNES OS • v1.4.0", color = Color(0xFFFF79B2), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
            }

            Spacer(Modifier.height(20.dp))

            Row(Modifier.fillMaxWidth().weight(1f), horizontalArrangement = Arrangement.spacedBy(20.dp)) {
                AgnesPresence(Modifier.width(270.dp).fillMaxHeight())

                Column(Modifier.weight(1f).fillMaxHeight()) {
                    Text("ΥΠΗΡΕΣΙΑ", color = Color(0xFFFF78B1), fontSize = 12.sp, fontWeight = FontWeight.Black)
                    Spacer(Modifier.height(8.dp))
                    ServiceCarousel(
                        services = services,
                        selectedIndex = selectedIndex,
                        onIndexChange = { selectedIndex = it },
                        onActivate = { activate(selected) },
                        modifier = Modifier.fillMaxWidth().height(220.dp)
                    )

                    Spacer(Modifier.height(16.dp))

                    Row(Modifier.fillMaxWidth().weight(1f), horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                        InfoPanel("ΤΩΡΑ", Modifier.weight(1f)) {
                            Text(selected.title, color = Color.White, fontSize = 23.sp, fontWeight = FontWeight.Black)
                            Spacer(Modifier.height(8.dp))
                            Text(selected.detail, color = Color(0xFFC7CBD0), fontSize = 14.sp, lineHeight = 20.sp)
                            Spacer(Modifier.weight(1f))
                            Text("← / → αλλάζει υπηρεσία   •   OK ανοίγει", color = Color(0xFFFF8DBC), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                        InfoPanel("AGNES LIVE", Modifier.weight(1f)) {
                            InfoLine("⚽", "Sports", "Αγώνες, ώρα και κανάλι")
                            Spacer(Modifier.height(10.dp))
                            InfoLine("🏠", "Home", "Η AGNES είναι το κεντρικό launcher")
                            Spacer(Modifier.height(10.dp))
                            InfoLine("▶", "Apps", "Οι εφαρμογές μένουν πίσω από την AGNES")
                            Spacer(Modifier.weight(1f))
                            Text("Μόνο AGNES + Play Store μπροστά.", color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ServiceCarousel(
    services: List<ServiceItem>,
    selectedIndex: Int,
    onIndexChange: (Int) -> Unit,
    onActivate: () -> Unit,
    modifier: Modifier = Modifier
) {
    var focused by remember { mutableStateOf(false) }
    val current = services[selectedIndex]
    val prev = services[(selectedIndex - 1 + services.size) % services.size]
    val next = services[(selectedIndex + 1) % services.size]

    Row(
        modifier
            .background(Color(0xCC11151B), RoundedCornerShape(26.dp))
            .border(if (focused) 3.dp else 1.dp, if (focused) Color(0xFFFF7EB5) else Color(0x33FFFFFF), RoundedCornerShape(26.dp))
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
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        PeekService(prev, Modifier.weight(.72f), false)
        Box(
            Modifier
                .weight(1.56f)
                .fillMaxHeight()
                .background(
                    Brush.linearGradient(listOf(current.accent.copy(alpha = .95f), Color(0xFF17171D))),
                    RoundedCornerShape(22.dp)
                )
                .border(1.dp, Color(0x55FFFFFF), RoundedCornerShape(22.dp))
                .padding(22.dp)
        ) {
            Row(Modifier.fillMaxSize(), verticalAlignment = Alignment.CenterVertically) {
                Text(current.icon, fontSize = 50.sp)
                Spacer(Modifier.width(20.dp))
                Column(Modifier.weight(1f)) {
                    Text(current.title, color = Color.White, fontSize = 28.sp, fontWeight = FontWeight.Black)
                    Text(current.subtitle, color = Color(0xFFE7DDE1), fontSize = 14.sp)
                    Spacer(Modifier.height(12.dp))
                    Text("OK • ΑΝΟΙΓΜΑ", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Black)
                }
                Text("›", color = Color.White, fontSize = 46.sp, fontWeight = FontWeight.Light)
            }
        }
        PeekService(next, Modifier.weight(.72f), true)
    }
}

@Composable
private fun PeekService(item: ServiceItem, modifier: Modifier, right: Boolean) {
    Column(
        modifier
            .fillMaxHeight()
            .background(item.accent.copy(alpha = .42f), RoundedCornerShape(20.dp))
            .border(1.dp, Color(0x22FFFFFF), RoundedCornerShape(20.dp))
            .padding(16.dp),
        horizontalAlignment = if (right) Alignment.End else Alignment.Start,
        verticalArrangement = Arrangement.Center
    ) {
        Text(item.icon, fontSize = 30.sp)
        Spacer(Modifier.height(8.dp))
        Text(item.title, color = Color.White.copy(alpha = .75f), fontSize = 14.sp, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun AgnesPresence(modifier: Modifier) {
    Column(
        modifier
            .background(Brush.verticalGradient(listOf(Color(0xFF3A252D), Color(0xFF171217))), RoundedCornerShape(28.dp))
            .border(1.dp, Color(0x44FFFFFF), RoundedCornerShape(28.dp))
            .padding(20.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box(
            Modifier
                .size(138.dp)
                .background(Color(0xFFE7C8AD), CircleShape)
                .border(4.dp, Color(0xFFFF79B2), CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Text("AGNES", color = Color(0xFF2C1B20), fontSize = 25.sp, fontWeight = FontWeight.Black)
        }
        Spacer(Modifier.height(16.dp))
        Text("Γεια σου Daddy 👋", color = Color.White, fontSize = 20.sp, fontWeight = FontWeight.Black)
        Text("Τι θέλεις να κάνουμε;", color = Color(0xFFD1C5CA), fontSize = 13.sp)
        Spacer(Modifier.height(18.dp))
        Box(
            Modifier
                .fillMaxWidth()
                .background(Color(0xCC101217), RoundedCornerShape(18.dp))
                .border(1.dp, Color(0x66FF79B2), RoundedCornerShape(18.dp))
                .padding(15.dp)
        ) {
            Column {
                Text("🎙  Μίλα στην AGNES", color = Color.White, fontSize = 15.sp, fontWeight = FontWeight.Bold)
                Text("TV • Sports • Family • Home", color = Color(0xFFB8BBC2), fontSize = 10.sp)
            }
        }
        Spacer(Modifier.weight(1f))
        Text("AGNES FIRST", color = Color(0xFFFF79B2), fontSize = 11.sp, fontWeight = FontWeight.Black)
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
                    Text("Οι εφαρμογές είναι εδώ μέσα, όχι στο κεντρικό Home", color = Color(0xFFBEC1C8), fontSize = 13.sp)
                }
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
                            if (!launchPackage(context, app.packageName)) toast(context, "${app.label} δεν άνοιξε")
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
            if (icon != null) {
                Image(icon, null, Modifier.size(150.dp), contentScale = ContentScale.Fit)
            }
            Spacer(Modifier.height(18.dp))
            Text(app.label, color = Color.White, fontSize = 25.sp, fontWeight = FontWeight.Black, maxLines = 2)
            Text("Εγκατεστημένη στο Xiaomi box", color = Color(0xFFB9BDC4), fontSize = 12.sp)
        } else {
            Text("APPS", color = Color.White, fontSize = 25.sp, fontWeight = FontWeight.Black)
        }
        Spacer(Modifier.weight(1f))
        Text("AGNES LIBRARY", color = Color(0xFFFF7EB5), fontSize = 11.sp, fontWeight = FontWeight.Black)
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
                if (event.type == KeyEventType.KeyUp && (event.key == Key.Enter || event.key == Key.DirectionCenter)) { onClick(); true } else false
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
                Text("Cytavision • αγώνες • ώρα • κανάλι", color = Color(0xFFBFC3CA), fontSize = 11.sp)
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
        Modifier.background(Color(0xAA23252B), RoundedCornerShape(17.dp)).border(1.dp, Color(0x22FFFFFF), RoundedCornerShape(17.dp)).padding(horizontal = 14.dp, vertical = 7.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(title, color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
        Text(subtitle, color = Color(0xFFB7BBC2), fontSize = 9.sp)
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
            .onKeyEvent { event -> if (event.type == KeyEventType.KeyUp && (event.key == Key.Enter || event.key == Key.DirectionCenter)) { onClick(); true } else false }
            .focusable()
            .padding(horizontal = 16.dp, vertical = 11.dp)
    ) { Text(text, color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Black) }
}

@Composable
private fun TvButton(text: String, onClick: () -> Unit) = SmallAction(text, onClick)

@Composable
private fun InfoPanel(title: String, modifier: Modifier, content: @Composable ColumnScope.() -> Unit) {
    Column(
        modifier.fillMaxHeight().background(Color(0xD914171D), RoundedCornerShape(24.dp)).border(1.dp, Color(0x2FFFFFFF), RoundedCornerShape(24.dp)).padding(18.dp)
    ) {
        Text(title, color = Color(0xFFFF78B1), fontSize = 11.sp, fontWeight = FontWeight.Black)
        Spacer(Modifier.height(12.dp))
        content()
    }
}

@Composable
private fun InfoLine(icon: String, title: String, subtitle: String) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Text(icon, fontSize = 18.sp)
        Spacer(Modifier.width(9.dp))
        Column {
            Text(title, color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Bold)
            Text(subtitle, color = Color(0xFFADB2B9), fontSize = 10.sp)
        }
    }
}

private fun toast(context: Context, message: String) = Toast.makeText(context, message, Toast.LENGTH_SHORT).show()
private fun currentTime(): String = SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date())
