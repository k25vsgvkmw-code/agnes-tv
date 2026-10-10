package com.agnes.family

import android.content.Context
import android.content.Intent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private val DeepPurple = Color(0xFF3D236B)
private val Purple = Color(0xFF7654B4)
private val Sky = Color(0xFF59B9E8)
private val Cream = Color(0xFFFFF9F0)
private val CardWhite = Color(0xFFFDFBFF)

@Composable
fun AgnesFamilyApp(
    prefs: ProfilePrefs,
    onRoleChanged: (UserRole?) -> Unit,
    onExitRequested: () -> Unit,
) {
    var role by remember { mutableStateOf(prefs.role) }

    MaterialTheme {
        Surface(modifier = Modifier.fillMaxSize(), color = Cream) {
            if (role == null) {
                SetupScreen { selectedRole, parentPin ->
                    prefs.role = selectedRole
                    prefs.setParentPin(parentPin)
                    role = selectedRole
                    onRoleChanged(selectedRole)
                }
            } else if (role == UserRole.PARENT) {
                ParentHome(
                    prefs = prefs,
                    onResetProfile = {
                        prefs.resetProfile()
                        role = null
                        onRoleChanged(null)
                    },
                    onExitRequested = onExitRequested,
                )
            } else {
                ChildHome(
                    role = role!!,
                    prefs = prefs,
                    onExitRequested = onExitRequested,
                    onResetProfile = {
                        prefs.resetProfile()
                        role = null
                        onRoleChanged(null)
                    },
                )
            }
        }
    }
}

@Composable
private fun SetupScreen(onConfigured: (UserRole, String) -> Unit) {
    var selected by remember { mutableStateOf<UserRole?>(null) }
    var pin by remember { mutableStateOf("") }
    var pinConfirm by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Brush.linearGradient(listOf(DeepPurple, Purple, Sky)))
            .padding(32.dp),
        contentAlignment = Alignment.Center,
    ) {
        Card(
            modifier = Modifier.fillMaxWidth(0.86f),
            shape = RoundedCornerShape(32.dp),
            colors = CardDefaults.cardColors(containerColor = CardWhite),
        ) {
            Column(modifier = Modifier.padding(32.dp), verticalArrangement = Arrangement.spacedBy(18.dp)) {
                Text("AGNES FAMILY", fontSize = 34.sp, fontWeight = FontWeight.Black, color = DeepPurple)
                Text("Ρύθμιση αυτού του προφίλ", fontSize = 20.sp, color = Color.DarkGray)

                if (selected == null) {
                    Text("Ποιος χρησιμοποιεί αυτό το Android profile;", fontWeight = FontWeight.Bold)
                    RoleChoice("👨‍👩‍👦", "Γονείς") { selected = UserRole.PARENT }
                    RoleChoice("🧑", "Βασίλης") { selected = UserRole.VASILIS }
                    RoleChoice("👦", "Ελένιος") { selected = UserRole.ELENIOS }
                } else {
                    Text("Προφίλ: ${selected!!.displayName}", fontSize = 22.sp, fontWeight = FontWeight.Bold)
                    Text("Βάλε έναν γονικό PIN 4–6 ψηφίων. Στα παιδικά profiles αυτός χρειάζεται για τις γονικές επιλογές.")
                    OutlinedTextField(
                        value = pin,
                        onValueChange = { if (it.length <= 6 && it.all(Char::isDigit)) pin = it },
                        label = { Text("Γονικός PIN") },
                        visualTransformation = PasswordVisualTransformation(),
                        singleLine = true,
                    )
                    OutlinedTextField(
                        value = pinConfirm,
                        onValueChange = { if (it.length <= 6 && it.all(Char::isDigit)) pinConfirm = it },
                        label = { Text("Ξανά ο PIN") },
                        visualTransformation = PasswordVisualTransformation(),
                        singleLine = true,
                    )
                    error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        OutlinedButton(onClick = { selected = null; pin = ""; pinConfirm = "" }) { Text("Πίσω") }
                        Button(onClick = {
                            error = when {
                                pin.length !in 4..6 -> "Ο PIN πρέπει να έχει 4–6 ψηφία."
                                pin != pinConfirm -> "Οι δύο PIN δεν είναι ίδιοι."
                                else -> null
                            }
                            if (error == null) onConfigured(selected!!, pin)
                        }) { Text("Έτοιμο") }
                    }
                }
            }
        }
    }
}

@Composable
private fun RoleChoice(emoji: String, label: String, onClick: () -> Unit) {
    Button(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth().height(66.dp),
        shape = RoundedCornerShape(20.dp),
        colors = ButtonDefaults.buttonColors(containerColor = Purple),
    ) {
        Text("$emoji   $label", fontSize = 22.sp)
    }
}

@Composable
private fun ParentHome(prefs: ProfilePrefs, onResetProfile: () -> Unit, onExitRequested: () -> Unit) {
    val cards = listOf(
        HomeCard("👦👦", "Παιδιά", "Πρόοδος και αστέρια"),
        HomeCard("📅", "Πρόγραμμα", "Σήμερα και εβδομάδα"),
        HomeCard("⭐", "Rewards", "Αστέρια: ${prefs.stars}"),
        HomeCard("🎮", "Εφαρμογές", "Παιχνίδια και εργαλεία"),
        HomeCard("⚙️", "Ρυθμίσεις", "AGNES Family Tablet"),
    )
    DashboardShell(title = "Γονείς", subtitle = "AGNES Family control", cards = cards) {
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            OutlinedButton(onClick = onExitRequested) { Text("Έξοδος") }
            TextButton(onClick = onResetProfile) { Text("Αλλαγή ρόλου") }
        }
    }
}

@Composable
private fun ChildHome(
    role: UserRole,
    prefs: ProfilePrefs,
    onExitRequested: () -> Unit,
    onResetProfile: () -> Unit,
) {
    var screen by remember { mutableStateOf("home") }
    var stars by remember { mutableIntStateOf(prefs.stars) }
    var showParentPin by remember { mutableStateOf(false) }
    var parentUnlocked by remember { mutableStateOf(false) }

    when (screen) {
        "games" -> GamesScreen(onBack = { screen = "home" })
        else -> {
            val cards = listOf(
                HomeCard("☀️", "Σήμερα", "Ώρα • πρόγραμμα • καιρός"),
                HomeCard("🎯", "Αποστολές", "$stars αστέρια", action = "missions"),
                HomeCard("📚", "Μαθαίνω", "Μικρές δραστηριότητες"),
                HomeCard("🎮", "Παίζω", "Τα παιχνίδια μου", action = "games"),
                HomeCard("⚽", "Κίνηση", "Ποδόσφαιρο και άσκηση"),
                HomeCard("🎬", "Βίντεο & μουσική", "Ήρεμο και ασφαλές"),
                HomeCard("🌙", "Ιστορία / ύπνος", "Για το βράδυ"),
            )

            DashboardShell(
                title = "Καλημέρα ${role.displayName} 👋",
                subtitle = "Λάρνακα • AGNES Kids",
                cards = cards,
                onCard = { card ->
                    when (card.action) {
                        "games" -> screen = "games"
                        "missions" -> {
                            prefs.completeMission("daily-reading", 3)
                            stars = prefs.stars
                        }
                    }
                },
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("⭐ $stars", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = DeepPurple)
                    Spacer(Modifier.weight(1f))
                    TextButton(onClick = { showParentPin = true }) { Text("🔒 Γονείς") }
                }
            }
        }
    }

    if (showParentPin) {
        ParentPinDialog(
            prefs = prefs,
            onDismiss = { showParentPin = false },
            onUnlocked = {
                showParentPin = false
                parentUnlocked = true
            },
        )
    }

    if (parentUnlocked) {
        AlertDialog(
            onDismissRequest = { parentUnlocked = false },
            title = { Text("Γονικές επιλογές") },
            text = { Text("Η έξοδος και η αλλαγή ρόλου προστατεύονται μέσα στο AGNES. Το Xiaomi/Android σύστημα παραμένει ξεχωριστό.") },
            confirmButton = {
                TextButton(onClick = { parentUnlocked = false; onExitRequested() }) { Text("Έξοδος από AGNES") }
            },
            dismissButton = {
                Row {
                    TextButton(onClick = { parentUnlocked = false }) { Text("Άκυρο") }
                    TextButton(onClick = { parentUnlocked = false; onResetProfile() }) { Text("Αλλαγή ρόλου") }
                }
            },
        )
    }
}

private data class HomeCard(val emoji: String, val title: String, val subtitle: String, val action: String? = null)

@Composable
private fun DashboardShell(
    title: String,
    subtitle: String,
    cards: List<HomeCard>,
    onCard: (HomeCard) -> Unit = {},
    footer: @Composable () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Brush.linearGradient(listOf(Color(0xFFF5EEFF), Color(0xFFEAF8FF), Cream)))
            .padding(horizontal = 28.dp, vertical = 24.dp),
    ) {
        Text(title, fontSize = 32.sp, fontWeight = FontWeight.Black, color = DeepPurple)
        Text(subtitle, fontSize = 17.sp, color = Color(0xFF5D5570))
        Spacer(Modifier.height(18.dp))
        LazyVerticalGrid(
            columns = GridCells.Adaptive(minSize = 210.dp),
            modifier = Modifier.weight(1f),
            contentPadding = PaddingValues(vertical = 4.dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            items(cards) { card ->
                Card(
                    onClick = { onCard(card) },
                    shape = RoundedCornerShape(26.dp),
                    colors = CardDefaults.cardColors(containerColor = CardWhite),
                    elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
                ) {
                    Column(modifier = Modifier.padding(22.dp)) {
                        Text(card.emoji, fontSize = 34.sp)
                        Spacer(Modifier.height(10.dp))
                        Text(card.title, fontSize = 22.sp, fontWeight = FontWeight.Bold, color = DeepPurple)
                        Spacer(Modifier.height(6.dp))
                        Text(card.subtitle, fontSize = 15.sp, color = Color(0xFF655D70))
                    }
                }
            }
        }
        Spacer(Modifier.height(12.dp))
        footer()
    }
}

@Composable
private fun GamesScreen(onBack: () -> Unit) {
    val context = LocalContext.current
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Brush.linearGradient(listOf(Color(0xFFF5EEFF), Color(0xFFEAF8FF))))
            .padding(28.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            OutlinedButton(onClick = onBack) { Text("← Πίσω") }
            Spacer(Modifier.width(16.dp))
            Text("🎮 Τα παιχνίδια μου", fontSize = 30.sp, fontWeight = FontWeight.Black, color = DeepPurple)
        }
        Spacer(Modifier.height(20.dp))
        LazyVerticalGrid(
            columns = GridCells.Adaptive(220.dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            items(AppCatalog.games) { game ->
                val launchIntent = remember(game.packageName) {
                    context.packageManager.getLaunchIntentForPackage(game.packageName)
                }
                Card(shape = RoundedCornerShape(24.dp), colors = CardDefaults.cardColors(containerColor = CardWhite)) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        Text(game.emoji, fontSize = 36.sp)
                        Text(game.title, fontSize = 20.sp, fontWeight = FontWeight.Bold, color = DeepPurple)
                        Spacer(Modifier.height(8.dp))
                        if (launchIntent != null) {
                            Button(onClick = { context.safeLaunch(launchIntent) }) { Text("Άνοιγμα") }
                        } else {
                            Text("Δεν είναι διαθέσιμο σε αυτό το Android profile.", color = Color(0xFF6F6878))
                        }
                    }
                }
            }
        }
    }
}

private fun Context.safeLaunch(intent: Intent) {
    runCatching { startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }
}

@Composable
private fun ParentPinDialog(prefs: ProfilePrefs, onDismiss: () -> Unit, onUnlocked: () -> Unit) {
    var pin by remember { mutableStateOf("") }
    var message by remember { mutableStateOf<String?>(null) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Γονικός PIN") },
        text = {
            Column {
                OutlinedTextField(
                    value = pin,
                    onValueChange = { if (it.length <= 6 && it.all(Char::isDigit)) pin = it },
                    label = { Text("PIN") },
                    visualTransformation = PasswordVisualTransformation(),
                    singleLine = true,
                )
                message?.let { Text(it, modifier = Modifier.padding(top = 10.dp), color = MaterialTheme.colorScheme.error) }
            }
        },
        confirmButton = {
            Button(onClick = {
                when (prefs.checkParentPin(pin)) {
                    PinResult.OK -> onUnlocked()
                    PinResult.WRONG -> message = "Λάθος PIN"
                    PinResult.LOCKED -> message = "Πολλές προσπάθειες. Δοκίμασε ξανά σε 30 δευτερόλεπτα."
                }
            }) { Text("Ξεκλείδωμα") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Άκυρο") } },
    )
}
