package com.agnes.family

import android.content.Context
import java.security.SecureRandom
import java.util.Base64
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.PBEKeySpec

class ProfilePrefs(context: Context) {
    private val prefs = context.getSharedPreferences("agnes_family_profile", Context.MODE_PRIVATE)

    var role: UserRole?
        get() = UserRole.parse(prefs.getString("role", null))
        set(value) { prefs.edit().putString("role", value?.name).apply() }

    var pinRecord: String?
        get() = prefs.getString("pin_record", null)
        set(value) { prefs.edit().putString("pin_record", value).apply() }

    var stars: Int
        get() = prefs.getInt("stars", 0)
        private set(value) { prefs.edit().putInt("stars", value).apply() }

    private var failedAttempts: Int
        get() = prefs.getInt("pin_failures", 0)
        set(value) { prefs.edit().putInt("pin_failures", value).apply() }

    private var lockedUntilMs: Long
        get() = prefs.getLong("pin_locked_until", 0L)
        set(value) { prefs.edit().putLong("pin_locked_until", value).apply() }

    private var completedMissions: Set<String>
        get() = prefs.getStringSet("completed_missions", emptySet())?.toSet() ?: emptySet()
        set(value) { prefs.edit().putStringSet("completed_missions", value).apply() }

    fun setParentPin(pin: String) {
        pinRecord = PinVault.create(pin)
        failedAttempts = 0
        lockedUntilMs = 0L
    }

    fun checkParentPin(pin: String, nowMs: Long = System.currentTimeMillis()): PinResult {
        val record = pinRecord ?: return PinResult.WRONG
        val state = PinState(failedAttempts, lockedUntilMs)
        val check = evaluatePin(state, pin, nowMs) { PinVault.verify(it, record) }
        failedAttempts = check.nextState.failedAttempts
        lockedUntilMs = check.nextState.lockedUntilMs
        return check.result
    }

    fun completeMission(id: String, rewardStars: Int): Int {
        val ledger = MissionLedger(completedMissions, stars)
        val awarded = ledger.complete(id, rewardStars)
        if (awarded > 0) {
            completedMissions = ledger.completedIds()
            stars = ledger.stars
        }
        return awarded
    }

    fun isMissionComplete(id: String): Boolean = id in completedMissions

    fun resetProfile() {
        prefs.edit().clear().apply()
    }
}

object PinVault {
    private const val ITERATIONS = 120_000
    private const val KEY_BITS = 256

    fun create(pin: String): String {
        require(pin.matches(Regex("\\d{4,6}")))
        val salt = ByteArray(16).also { SecureRandom().nextBytes(it) }
        val hash = derive(pin, salt)
        return Base64.getEncoder().encodeToString(salt) + ":" + Base64.getEncoder().encodeToString(hash)
    }

    fun verify(pin: String, record: String): Boolean {
        val parts = record.split(':')
        if (parts.size != 2) return false
        return runCatching {
            val salt = Base64.getDecoder().decode(parts[0])
            val expected = Base64.getDecoder().decode(parts[1])
            val actual = derive(pin, salt)
            java.security.MessageDigest.isEqual(expected, actual)
        }.getOrDefault(false)
    }

    private fun derive(pin: String, salt: ByteArray): ByteArray {
        val spec = PBEKeySpec(pin.toCharArray(), salt, ITERATIONS, KEY_BITS)
        return try {
            SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).encoded
        } finally {
            spec.clearPassword()
        }
    }
}
