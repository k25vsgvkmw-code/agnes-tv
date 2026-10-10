package com.agnes.family

import android.os.Bundle
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat

class MainActivity : ComponentActivity() {
    private lateinit var prefs: ProfilePrefs

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        prefs = ProfilePrefs(this)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        WindowCompat.setDecorFitsSystemWindows(window, false)

        setContent {
            AgnesFamilyApp(
                prefs = prefs,
                onRoleChanged = { applyDisplayMode(it) },
                onExitRequested = { finish() },
            )
        }
    }

    override fun onResume() {
        super.onResume()
        applyDisplayMode(prefs.role)
    }

    private fun applyDisplayMode(role: UserRole?) {
        val controller = WindowInsetsControllerCompat(window, window.decorView)
        if (role?.isChild == true) {
            controller.hide(WindowInsetsCompat.Type.systemBars())
            controller.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        } else {
            controller.show(WindowInsetsCompat.Type.systemBars())
        }
    }
}
