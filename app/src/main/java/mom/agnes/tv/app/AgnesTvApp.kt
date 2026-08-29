package mom.agnes.tv.app

import android.view.ViewTreeObserver
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.Text

private val ShellPanel = Color(0xFF0A101A)
private val ShellPanelRaised = Color(0xFF111A28)
private val ShellPurple = Color(0xFF9B4DFF)
private val ShellMuted = Color(0xFF94A2B8)
private val ShellGreen = Color(0xFF72F59B)

@Composable
fun AgnesTvApp() {
    var selectedSection by remember { mutableStateOf(TvSection.HOME) }
    val initialFocusRequester = remember { FocusRequester() }
    val rootView = LocalView.current

    DisposableEffect(rootView, initialFocusRequester) {
        val listener = ViewTreeObserver.OnWindowFocusChangeListener { hasWindowFocus ->
            if (hasWindowFocus) {
                rootView.post { initialFocusRequester.requestFocus() }
            }
        }

        rootView.viewTreeObserver.addOnWindowFocusChangeListener(listener)
        if (rootView.hasWindowFocus()) {
            rootView.post { initialFocusRequester.requestFocus() }
        }

        onDispose {
            if (rootView.viewTreeObserver.isAlive) {
                rootView.viewTreeObserver.removeOnWindowFocusChangeListener(listener)
            }
        }
    }

    Row(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .testTag("v2-shell")
    ) {
        Column(
            modifier = Modifier
                .width(300.dp)
                .fillMaxHeight()
                .background(ShellPanel)
                .padding(horizontal = 28.dp, vertical = 30.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                text = "AGNES TV",
                color = Color.White,
                fontSize = 36.sp,
                fontWeight = FontWeight.Black
            )
            Text(
                text = "v2 • FAST TV",
                color = ShellGreen,
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold
            )
            Spacer(Modifier.height(24.dp))

            TvSection.entries.forEach { section ->
                V2NavItem(
                    section = section,
                    selected = selectedSection == section,
                    onClick = { selectedSection = section },
                    modifier = if (section == TvSection.HOME) {
                        Modifier.focusRequester(initialFocusRequester)
                    } else {
                        Modifier
                    }
                )
            }
        }

        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 44.dp, vertical = 34.dp)
        ) {
            Column(Modifier.fillMaxWidth()) {
                Text(
                    text = selectedSection.label,
                    color = Color.White,
                    fontSize = 38.sp,
                    fontWeight = FontWeight.Black
                )
                Spacer(Modifier.height(8.dp))
                Text(
                    text = when (selectedSection) {
                        TvSection.HOME -> "Η TV εμπειρία ανοίγει αμέσως. Το περιεχόμενο γεμίζει προοδευτικά."
                        TvSection.LIVE -> "Ζωντανά κανάλια με cache-first φόρτωση."
                        TvSection.SETTINGS -> "Ρυθμίσεις λογαριασμού και σύνδεσης."
                    },
                    color = ShellMuted,
                    fontSize = 18.sp
                )
            }
        }
    }
}

@Composable
private fun V2NavItem(
    section: TvSection,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    var focused by remember { mutableStateOf(false) }
    val shape = RoundedCornerShape(16.dp)

    Row(
        modifier = modifier
            .testTag("nav-${section.name}")
            .fillMaxWidth()
            .height(64.dp)
            .scale(if (focused) 1.06f else 1f)
            .shadow(if (focused) 14.dp else 0.dp, shape)
            .background(
                color = when {
                    focused -> ShellPanelRaised
                    selected -> Color(0xFF171126)
                    else -> Color.Transparent
                },
                shape = shape
            )
            .border(
                width = when {
                    focused -> 3.dp
                    selected -> 1.dp
                    else -> 0.dp
                },
                color = when {
                    focused -> Color.White
                    selected -> ShellPurple
                    else -> Color.Transparent
                },
                shape = shape
            )
            .onFocusChanged { focused = it.isFocused || it.hasFocus }
            .clickable(onClick = onClick)
            .focusable()
            .semantics { this.selected = selected }
            .padding(horizontal = 18.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .width(5.dp)
                .height(28.dp)
                .background(
                    if (selected) ShellPurple else Color.Transparent,
                    RoundedCornerShape(8.dp)
                )
        )
        Spacer(Modifier.width(14.dp))
        Text(
            text = section.label,
            color = Color.White,
            fontSize = 19.sp,
            fontWeight = if (selected) FontWeight.Black else FontWeight.Bold
        )
    }
}
