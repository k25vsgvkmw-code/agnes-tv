package com.agnes.family

enum class UserRole {
    PARENT, VASILIS, ELENIOS;

    val isChild: Boolean get() = this != PARENT
    val displayName: String
        get() = when (this) {
            PARENT -> "Γονείς"
            VASILIS -> "Βασίλης"
            ELENIOS -> "Ελένιος"
        }

    companion object {
        fun parse(raw: String?): UserRole? = entries.firstOrNull { it.name == raw }
    }
}

enum class PinResult { OK, WRONG, LOCKED }

data class PinState(val failedAttempts: Int = 0, val lockedUntilMs: Long = 0L)

data class PinCheck(val result: PinResult, val nextState: PinState)

fun evaluatePin(
    state: PinState,
    pin: String,
    nowMs: Long,
    verifier: (String) -> Boolean,
    maxAttempts: Int = 5,
    lockoutMs: Long = 30_000L,
): PinCheck {
    if (nowMs < state.lockedUntilMs) return PinCheck(PinResult.LOCKED, state)

    if (verifier(pin)) return PinCheck(PinResult.OK, PinState())

    val failures = state.failedAttempts + 1
    return if (failures >= maxAttempts) {
        PinCheck(PinResult.LOCKED, PinState(failedAttempts = 0, lockedUntilMs = nowMs + lockoutMs))
    } else {
        PinCheck(PinResult.WRONG, state.copy(failedAttempts = failures, lockedUntilMs = 0L))
    }
}

enum class ChildBackAction { RETURN_HOME, REQUEST_PARENT_PIN }

fun childBackAction(screen: String): ChildBackAction =
    if (screen == "games") ChildBackAction.RETURN_HOME else ChildBackAction.REQUEST_PARENT_PIN

class MissionLedger(
    completedIds: Set<String> = emptySet(),
    initialStars: Int = 0,
) {
    private val completed = completedIds.toMutableSet()
    var stars: Int = initialStars
        private set

    fun complete(id: String, rewardStars: Int): Int {
        require(rewardStars >= 0)
        if (!completed.add(id)) return 0
        stars += rewardStars
        return rewardStars
    }

    fun completedIds(): Set<String> = completed.toSet()
}

data class GameApp(val title: String, val packageName: String, val emoji: String)

object AppCatalog {
    val games = listOf(
        GameApp("Brawl Stars", "com.supercell.brawlstars", "⭐"),
        GameApp("FC Mobile", "com.ea.gp.fifamobile", "⚽"),
        GameApp("Block Craft 3D", "com.fungames.blockcraft", "🧱"),
        GameApp("Geometry Dash Lite", "com.robtopx.geometryjumplite", "🔷"),
    )
}

object AppLaunchPolicy {
    fun canMutateExternalAppData(): Boolean = false
}
