package mom.agnes.tv

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import mom.agnes.tv.app.AgnesTvApp
import mom.agnes.tv.ui.theme.AgnesTvTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            AgnesTvTheme {
                AgnesTvApp()
            }
        }
    }
}
