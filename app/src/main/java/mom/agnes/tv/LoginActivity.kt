package mom.agnes.tv

import android.content.Context
import android.content.Intent
import android.os.Bundle
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
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.PasswordVisualTransformation
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

class LoginActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        if (hasSavedXtream()) {
            openAgnesTv()
            return
        }

        setContent {
            MaterialTheme(colorScheme = darkColorScheme()) {
                TvXtreamLogin(
                    onSave = { server, username, password ->
                        getSharedPreferences("agnes_xtream", Context.MODE_PRIVATE).edit()
                            .putString("server", server.trim().trimEnd('/'))
                            .putString("username", username.trim())
                            .putString("password", password)
                            .apply()
                        openAgnesTv()
                    }
                )
            }
        }
    }

    private fun hasSavedXtream(): Boolean {
        val p = getSharedPreferences("agnes_xtream", Context.MODE_PRIVATE)
        return !p.getString("server", null).isNullOrBlank() &&
            !p.getString("username", null).isNullOrBlank() &&
            !p.getString("password", null).isNullOrBlank()
    }

    private fun openAgnesTv() {
        startActivity(Intent(this, MainActivity::class.java))
        finish()
    }
}

private val LoginBg = Color(0xFF040810)
private val LoginPanel = Color(0xFF0B1420)
private val LoginPurple = Color(0xFF9B4DFF)
private val LoginGreen = Color(0xFF78FF50)
private val LoginMuted = Color(0xFF98A6B8)

@Composable
private fun TvXtreamLogin(onSave: (String, String, String) -> Unit) {
    var server by remember { mutableStateOf("") }
    var username by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }

    val serverFocus = remember { FocusRequester() }
    val usernameFocus = remember { FocusRequester() }
    val passwordFocus = remember { FocusRequester() }
    val connectFocus = remember { FocusRequester() }

    LaunchedEffect(Unit) { serverFocus.requestFocus() }

    fun Modifier.tvFocus(
        requester: FocusRequester,
        up: FocusRequester?,
        down: FocusRequester?
    ): Modifier = this
        .focusRequester(requester)
        .onPreviewKeyEvent { event ->
            if (event.type != KeyEventType.KeyDown) return@onPreviewKeyEvent false
            when (event.key) {
                Key.DirectionDown -> {
                    down?.requestFocus()
                    down != null
                }
                Key.DirectionUp -> {
                    up?.requestFocus()
                    up != null
                }
                else -> false
            }
        }

    Box(
        Modifier.fillMaxSize().background(LoginBg).padding(40.dp),
        contentAlignment = Alignment.Center
    ) {
        Surface(
            color = LoginPanel,
            shape = RoundedCornerShape(28.dp),
            modifier = Modifier.width(760.dp)
        ) {
            Column(
                Modifier.padding(34.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Text("AGNES TV", color = Color.White, fontSize = 42.sp, fontWeight = FontWeight.Black)
                Text("Σύνδεση XTREAM IPTV", color = LoginGreen, fontSize = 20.sp, fontWeight = FontWeight.Bold)
                Text(
                    "Με το τηλεχειριστήριο: ↓ επόμενο πεδίο, ↑ προηγούμενο πεδίο, OK για πληκτρολόγηση.",
                    color = LoginMuted,
                    fontSize = 15.sp
                )

                OutlinedTextField(
                    value = server,
                    onValueChange = { server = it },
                    label = { Text("Server") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth().tvFocus(serverFocus, null, usernameFocus)
                )

                OutlinedTextField(
                    value = username,
                    onValueChange = { username = it },
                    label = { Text("Username") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth().tvFocus(usernameFocus, serverFocus, passwordFocus)
                )

                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it },
                    label = { Text("Password") },
                    singleLine = true,
                    visualTransformation = PasswordVisualTransformation(),
                    modifier = Modifier.fillMaxWidth().tvFocus(passwordFocus, usernameFocus, connectFocus)
                )

                Spacer(Modifier.height(2.dp))

                Button(
                    onClick = {
                        if (server.isNotBlank() && username.isNotBlank() && password.isNotBlank()) {
                            onSave(server, username, password)
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = LoginPurple),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(58.dp)
                        .tvFocus(connectFocus, passwordFocus, null)
                ) {
                    Text("ΣΥΝΔΕΣΗ & ΑΝΟΙΓΜΑ AGNES TV", fontWeight = FontWeight.Black)
                }

                Text("AGNES TV v1.6.1", color = LoginMuted, fontSize = 11.sp)
            }
        }
    }
}
