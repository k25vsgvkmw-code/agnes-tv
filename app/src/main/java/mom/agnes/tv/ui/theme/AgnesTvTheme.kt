package mom.agnes.tv.ui.theme

import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.darkColorScheme

private val AgnesTvColors = darkColorScheme(
    background = Color(0xFF05080F),
    surface = Color(0xFF0C121D),
    primary = Color(0xFF9B4DFF),
    secondary = Color(0xFF72D5FF),
    onBackground = Color.White,
    onSurface = Color.White,
    onPrimary = Color.White
)

@Composable
fun AgnesTvTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = AgnesTvColors,
        content = content
    )
}
