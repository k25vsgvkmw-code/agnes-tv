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
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
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
import androidx.compose.ui.input.key.*
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private const val DEFAULT_SERVER = "https://comepitv.online"

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
                    onSave = { username, password ->
                        getSharedPreferences("agnes_xtream", Context.MODE_PRIVATE).edit()
                            .putString("server", DEFAULT_SERVER)
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
private fun TvXtreamLogin(onSave: (String, String) -> Unit) {
    var username by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }

    val usernameFocus = remember { FocusRequester() }
    val passwordFocus = remember { FocusRequester() }
    val connectFocus = remember { FocusRequester() }

    LaunchedEffect(Unit) { usernameFocus.requestFocus() }

    fun submit() {
        if (username.isNotBlank() && password.isNotBlank()) {
            onSave(username, password)
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

                Surface(color = Color(0xFF111D2B), shape = RoundedCornerShape(16.dp)) {
                    Row(Modifier.fillMaxWidth().padding(16.dp)) {
                        Text("Server", color = LoginMuted, modifier = Modifier.width(110.dp))
                        Text(DEFAULT_SERVER, color = Color.White, fontWeight = FontWeight.Bold)
                    }
                }

                Text(
                    "Ο server είναι ήδη περασμένος. Γράψε Username και Password.",
                    color = LoginMuted,
                    fontSize = 15.sp
                )

                OutlinedTextField(
                    value = username,
                    onValueChange = { username = it },
                    label = { Text("Username") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
                    keyboardActions = KeyboardActions(onNext = { passwordFocus.requestFocus() }),
                    modifier = Modifier
                        .fillMaxWidth()
                        .focusRequester(usernameFocus)
                        .onPreviewKeyEvent { event ->
                            if (event.type == KeyEventType.KeyDown && event.key == Key.DirectionDown) {
                                passwordFocus.requestFocus(); true
                            } else false
                        }
                )

                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it },
                    label = { Text("Password") },
                    singleLine = true,
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                    keyboardActions = KeyboardActions(onDone = { submit() }),
                    modifier = Modifier
                        .fillMaxWidth()
                        .focusRequester(passwordFocus)
                        .onPreviewKeyEvent { event ->
                            when {
                                event.type == KeyEventType.KeyDown && event.key == Key.DirectionDown -> {
                                    connectFocus.requestFocus(); true
                                }
                                event.type == KeyEventType.KeyDown && event.key == Key.DirectionUp -> {
                                    usernameFocus.requestFocus(); true
                                }
                                else -> false
                            }
                        }
                )

                Spacer(Modifier.height(2.dp))

                Button(
                    onClick = { submit() },
                    colors = ButtonDefaults.buttonColors(containerColor = LoginPurple),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(58.dp)
                        .focusRequester(connectFocus)
                        .onPreviewKeyEvent { event ->
                            if (event.type == KeyEventType.KeyDown && event.key == Key.DirectionUp) {
                                passwordFocus.requestFocus(); true
                            } else false
                        }
                ) {
                    Text("ΣΥΝΔΕΣΗ & ΑΝΟΙΓΜΑ AGNES TV", fontWeight = FontWeight.Black)
                }

                Text("AGNES TV v1.6.2", color = LoginMuted, fontSize = 11.sp)
            }
        }
    }
}
