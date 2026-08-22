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

    val red = Color(0xFFC51F29)
    val deepRed = Color(0xFF7C1017)
    val cream = Color(0xFFFFF8F3)
    val panel = Color(0xFF24171A)
    val muted = Color(0xFFD3C9CB)

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.linearGradient(
                    listOf(Color(0xFF170D10), Color(0xFF351216), deepRed)
                )
            )
            .padding(34.dp)
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "AGNES TV",
                        color = Color.White,
                        fontSize = 34.sp,
                        fontWeight = FontWeight.ExtraBold
                    )
                    Text(
                        text = "Το σπίτι σου, ζωντανά.",
                        color = muted,
                        fontSize = 16.sp
                    )
                }

                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = now,
                        color = Color.White,
                        fontSize = 32.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Football • Family • Travel",
                        color = muted,
                        fontSize = 14.sp
                    )
                }
            }

            Spacer(Modifier.height(26.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(18.dp)
            ) {
                HomeTile(
                    title = "CYTAVISION",
                    subtitle = "Live TV",
                    modifier = Modifier.weight(1f),
                    onClick = {
                        openApp("cy.com.cyta.cytavision")
                    }
                )

                HomeTile(
                    title = "SPORTS",
                    subtitle = "Αγώνες & κανάλια",
                    modifier = Modifier.weight(1f),
                    onClick = {}
                )

                HomeTile(
                    title = "TRAVEL",
                    subtitle = "Προορισμοί & τιμές",
                    modifier = Modifier.weight(1f),
                    onClick = {}
                )

                HomeTile(
                    title = "FAMILY",
                    subtitle = "Σήμερα",
                    modifier = Modifier.weight(1f),
                    onClick = {}
                )
            }

            Spacer(Modifier.height(24.dp))

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                horizontalArrangement = Arrangement.spacedBy(22.dp)
            ) {
                FootballPanel(
                    matches = demoMatches,
                    modifier = Modifier.weight(1.65f),
                    accent = red,
                    panel = panel,
                    muted = muted
                )

                Column(
                    modifier = Modifier
                        .weight(0.75f)
                        .fillMaxHeight()
                        .background(Color(0xB3181113), RoundedCornerShape(26.dp))
                        .border(1.dp, Color(0x33FFFFFF), RoundedCornerShape(26.dp))
                        .padding(22.dp)
                ) {
                    Text(
                        "AGNES NOW",
                        color = red,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold
                    )

                    Spacer(Modifier.height(12.dp))

                    Text(
                        "Απόψε έχει ποδόσφαιρο ⚽",
                        color = cream,
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Bold
                    )

                    Spacer(Modifier.height(10.dp))

                    Text(
                        "Θα βλέπεις εδώ τον επόμενο αγώνα, το κανάλι και ειδοποίηση λίγο πριν τη σέντρα.",
                        color = muted,
                        fontSize = 16.sp,
                        lineHeight = 22.sp
                    )

                    Spacer(Modifier.weight(1f))

                    Text(
                        "Επόμενη έκδοση: LIVE API + Cytavision channel mapping",
                        color = muted,
                        fontSize = 13.sp
                    )
                }
            }
        }
    }
}

@Composable
private fun HomeTile(
    title: String,
    subtitle: String,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    var focused by remember { mutableStateOf(false) }
    val bg by animateColorAsState(
        if (focused) Color(0xFFE4333C) else Color(0xFF4A1B20),
        label = "tileBg"
    )

    Box(
        modifier = modifier
            .height(120.dp)
            .scale(if (focused) 1.04f else 1f)
            .background(bg, RoundedCornerShape(24.dp))
            .border(
                width = if (focused) 3.dp else 1.dp,
                color = if (focused) Color.White else Color(0x33FFFFFF),
                shape = RoundedCornerShape(24.dp)
            )
            .onFocusChanged { focused = it.isFocused }
            .onKeyEvent {
                if (it.type == KeyEventType.KeyUp &&
                    (it.key == Key.Enter || it.key == Key.DirectionCenter)
                ) {
                    onClick()
                    true
                } else false
            }
            .focusable()
            .padding(20.dp)
    ) {
        Column {
            Text(
                title,
                color = Color.White,
                fontSize = 19.sp,
                fontWeight = FontWeight.ExtraBold
            )
            Spacer(Modifier.height(8.dp))
            Text(
                subtitle,
                color = Color(0xFFE8DADC),
                fontSize = 14.sp
            )
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
            .background(panel.copy(alpha = 0.92f), RoundedCornerShape(26.dp))
            .border(1.dp, Color(0x33FFFFFF), RoundedCornerShape(26.dp))
            .padding(22.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    "ΠΟΔΟΣΦΑΙΡΟ",
                    color = accent,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    "Αγώνες & Κανάλια",
                    color = Color.White,
                    fontSize = 27.sp,
                    fontWeight = FontWeight.Bold
                )
            }
            Text(
                "ΣΗΜΕΡΑ",
                color = Color.White,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold
            )
        }

        Spacer(Modifier.height(14.dp))

        LazyColumn(
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            items(matches) { match ->
                MatchRow(match = match, accent = accent, muted = muted)
            }
        }
    }
}

@Composable
private fun MatchRow(
    match: MatchItem,
    accent: Color,
    muted: Color
) {
    var focused by remember { mutableStateOf(false) }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .scale(if (focused) 1.015f else 1f)
            .background(
                if (focused) Color(0xFF5A2429) else Color(0xFF302126),
                RoundedCornerShape(18.dp)
            )
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
        Column(
            modifier = Modifier.width(86.dp)
        ) {
            Text(
                match.time,
                color = Color.White,
                fontSize = 21.sp,
                fontWeight = FontWeight.ExtraBold
            )
            if (match.favourite) {
                Text(
                    "★",
                    color = accent,
                    fontSize = 15.sp
                )
            }
        }

        Column(modifier = Modifier.weight(1f)) {
            Text(
                "${match.home}  •  ${match.away}",
                color = Color.White,
                fontSize = 17.sp,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                match.competition,
                color = muted,
                fontSize = 13.sp
            )
        }

        Box(
            modifier = Modifier
                .background(Color(0xFF1D1518), RoundedCornerShape(12.dp))
                .padding(horizontal = 12.dp, vertical = 9.dp)
        ) {
            Text(
                match.channel,
                color = Color.White,
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold
            )
        }
    }
}
