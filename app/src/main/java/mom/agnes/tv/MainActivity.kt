package mom.agnes.tv

import android.content.Context
import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                AgnesTvHome(
                    openApp = { packageName -> openExternalApp(this, packageName) }
                )
            }
        }
    }
}

private fun openExternalApp(context: Context, packageName: String) {
    val intent = context.packageManager.getLaunchIntentForPackage(packageName)
    if (intent != null) {
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
    }
}

data class MatchItem(
    val time: String,
    val competition: String,
    val home: String,
    val away: String,
    val channel: String,
    val favourite: Boolean = false
)

private val demoMatches = listOf(
    MatchItem("19:00", "Cyprus League", "Νέα Σαλαμίνα", "Αντίπαλος", "Cytavision Sports", true),
    MatchItem("20:30", "Super League Greece", "Ολυμπιακός", "Αντίπαλος", "Sports Channel", true),
    MatchItem("22:00", "Premier League", "Liverpool", "Αντίπαλος", "Cytavision Sports", true),
    MatchItem("22:00", "European Football", "Team A", "Team B", "Sports Channel")
)

@Composable
fun AgnesTvHome(openApp: (String) -> Unit) {
    val now = remember { SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date()) }

    val red = Color(0xFFE32932)
    val deepRed = Color(0xFF6A0E16)
    val cream = Color(0xFFFFF7F2)
    val panel = Color(0xFF211317)
    val muted = Color(0xFFD6C8CB)

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.linearGradient(
                    listOf(Color(0xFF120A0C), Color(0xFF2B1015), deepRed, Color(0xFF8D111B))
                )
            )
            .padding(horizontal = 38.dp, vertical = 28.dp)
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(52.dp)
                                .background(red, RoundedCornerShape(17.dp)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text("A", color = Color.White, fontSize = 29.sp, fontWeight = FontWeight.Black)
                        }
                        Spacer(Modifier.width(14.dp))
                        Column {
                            Text("AGNES TV", color = Color.White, fontSize = 34.sp, fontWeight = FontWeight.Black)
                            Text("Η AGNES έχει τον πρώτο ρόλο.", color = muted, fontSize = 15.sp)
                        }
                    }
                }

                Column(horizontalAlignment = Alignment.End) {
                    Text(now, color = Color.White, fontSize = 34.sp, fontWeight = FontWeight.Bold)
                    Text("TV • Sports • Family • Travel", color = muted, fontSize = 13.sp)
                }
            }

            Spacer(Modifier.height(22.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                HomeTile("CYTAVISION", "Live TV", "01", Modifier.weight(1.18f)) {
                    openApp("cy.com.cyta.cytavision")
                }
                HomeTile("SPORTS", "Αγώνες & κανάλια", "02", Modifier.weight(1f)) {}
                HomeTile("MOVIES", "Netflix • YouTube", "03", Modifier.weight(1f)) {}
                HomeTile("TRAVEL", "Προορισμοί & τιμές", "04", Modifier.weight(1f)) {}
                HomeTile("FAMILY", "Σήμερα", "05", Modifier.weight(1f)) {}
            }

            Spacer(Modifier.height(20.dp))

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                horizontalArrangement = Arrangement.spacedBy(20.dp)
            ) {
                FootballPanel(
                    matches = demoMatches,
                    modifier = Modifier.weight(1.7f),
                    accent = red,
                    panel = panel,
                    muted = muted
                )

                Column(
                    modifier = Modifier
                        .weight(0.72f)
                        .fillMaxHeight()
                        .background(
                            Brush.verticalGradient(listOf(Color(0xFF3C161C), Color(0xFF1A1013))),
                            RoundedCornerShape(28.dp)
                        )
                        .border(1.dp, Color(0x44FFFFFF), RoundedCornerShape(28.dp))
                        .padding(22.dp)
                ) {
                    Text("AGNES NOW", color = red, fontSize = 13.sp, fontWeight = FontWeight.Black)
                    Spacer(Modifier.height(10.dp))
                    Text("Απόψε έχει ποδόσφαιρο ⚽", color = cream, fontSize = 24.sp, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(10.dp))
                    Text(
                        "Το panel είναι ήδη TV-first. Στην επόμενη σύνδεση API θα γεμίζει αυτόματα με πραγματικούς αγώνες, ώρες και κανάλια.",
                        color = muted,
                        fontSize = 15.sp,
                        lineHeight = 21.sp
                    )
                    Spacer(Modifier.height(18.dp))
                    InfoPill("★ Ολυμπιακός")
                    Spacer(Modifier.height(8.dp))
                    InfoPill("★ Liverpool")
                    Spacer(Modifier.height(8.dp))
                    InfoPill("★ Νέα Σαλαμίνα")
                    Spacer(Modifier.weight(1f))
                    Box(
                        modifier = Modifier
                            .background(Color(0x22FFFFFF), RoundedCornerShape(12.dp))
                            .padding(horizontal = 12.dp, vertical = 8.dp)
                    ) {
                        Text("v0.2.0 • TV HOME", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@Composable
private fun InfoPill(text: String) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color(0x18FFFFFF), RoundedCornerShape(14.dp))
            .border(1.dp, Color(0x22FFFFFF), RoundedCornerShape(14.dp))
            .padding(horizontal = 14.dp, vertical = 10.dp)
    ) {
        Text(text, color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
private fun HomeTile(
    title: String,
    subtitle: String,
    number: String,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    var focused by remember { mutableStateOf(false) }
    val bg by animateColorAsState(
        if (focused) Color(0xFFF23842) else Color(0xFF4B1920),
        label = "tileBg"
    )

    Box(
        modifier = modifier
            .height(128.dp)
            .scale(if (focused) 1.06f else 1f)
            .background(bg, RoundedCornerShape(26.dp))
            .border(
                width = if (focused) 3.dp else 1.dp,
                color = if (focused) Color.White else Color(0x33FFFFFF),
                shape = RoundedCornerShape(26.dp)
            )
            .onFocusChanged { focused = it.isFocused }
            .onKeyEvent {
                if (it.type == KeyEventType.KeyUp && (it.key == Key.Enter || it.key == Key.DirectionCenter)) {
                    onClick()
                    true
                } else false
            }
            .focusable()
            .padding(18.dp)
    ) {
        Text(number, color = Color(0x66FFFFFF), fontSize = 13.sp, modifier = Modifier.align(Alignment.TopEnd))
        Column(modifier = Modifier.align(Alignment.BottomStart)) {
            Text(title, color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.Black)
            Spacer(Modifier.height(5.dp))
            Text(subtitle, color = Color(0xFFEADBDD), fontSize = 13.sp)
        }
    }
}

@Composable
private fun FootballPanel(
    matches: List<MatchItem>,
    modifier: Modifier = Modifier,
    accent: Color,
    panel: Color,
    muted: Color
) {
    Column(
        modifier = modifier
            .fillMaxHeight()
            .background(panel.copy(alpha = 0.95f), RoundedCornerShape(28.dp))
            .border(1.dp, Color(0x3AFFFFFF), RoundedCornerShape(28.dp))
            .padding(22.dp)
    ) {
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                Text("AGNES FOOTBALL", color = accent, fontSize = 13.sp, fontWeight = FontWeight.Black)
                Text("Αγώνες & Κανάλια", color = Color.White, fontSize = 28.sp, fontWeight = FontWeight.Bold)
            }
            Box(
                modifier = Modifier
                    .background(Color(0xFF4A171D), RoundedCornerShape(14.dp))
                    .padding(horizontal = 12.dp, vertical = 8.dp)
            ) {
                Text("DEMO DATA", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
            }
        }

        Spacer(Modifier.height(14.dp))

        LazyColumn(verticalArrangement = Arrangement.spacedBy(9.dp)) {
            items(matches) { match -> MatchRow(match = match, accent = accent, muted = muted) }
        }
    }
}

@Composable
private fun MatchRow(match: MatchItem, accent: Color, muted: Color) {
    var focused by remember { mutableStateOf(false) }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .scale(if (focused) 1.018f else 1f)
            .background(if (focused) Color(0xFF5B242B) else Color(0xFF2E2024), RoundedCornerShape(18.dp))
            .border(
                width = if (focused) 2.dp else 1.dp,
                color = if (focused) Color.White else Color(0x22FFFFFF),
                shape = RoundedCornerShape(18.dp)
            )
            .onFocusChanged { focused = it.isFocused }
            .focusable()
            .padding(horizontal = 16.dp, vertical = 13.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.width(86.dp)) {
            Text(match.time, color = Color.White, fontSize = 21.sp, fontWeight = FontWeight.Black)
            if (match.favourite) Text("★", color = accent, fontSize = 14.sp)
        }
        Column(modifier = Modifier.weight(1f)) {
            Text("${match.home}  •  ${match.away}", color = Color.White, fontSize = 17.sp, fontWeight = FontWeight.SemiBold)
            Text(match.competition, color = muted, fontSize = 12.sp)
        }
        Box(
            modifier = Modifier
                .background(Color(0xFF171013), RoundedCornerShape(12.dp))
                .padding(horizontal = 12.dp, vertical = 9.dp)
        ) {
            Text(match.channel, color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
        }
    }
}
