package com.agnes.family

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class CoreTest {
    @Test
    fun roleParsingRejectsCorruptValues() {
        assertEquals(UserRole.VASILIS, UserRole.parse("VASILIS"))
        assertNull(UserRole.parse("broken"))
    }

    @Test
    fun fifthWrongPinLocksForThirtySeconds() {
        var state = PinState()
        var now = 1_000L
        repeat(4) {
            val check = evaluatePin(state, "0000", now, verifier = { it == "2468" })
            assertEquals(PinResult.WRONG, check.result)
            state = check.nextState
        }

        val fifth = evaluatePin(state, "0000", now, verifier = { it == "2468" })
        assertEquals(PinResult.LOCKED, fifth.result)
        state = fifth.nextState

        assertEquals(PinResult.LOCKED, evaluatePin(state, "2468", now, verifier = { it == "2468" }).result)
        now += 30_001L
        assertEquals(PinResult.OK, evaluatePin(state, "2468", now, verifier = { it == "2468" }).result)
    }

    @Test
    fun missionAwardsStarsOnlyOnce() {
        val ledger = MissionLedger()
        assertEquals(3, ledger.complete("read-10m", 3))
        assertEquals(0, ledger.complete("read-10m", 3))
        assertEquals(3, ledger.stars)
    }

    @Test
    fun externalAppDataIsNeverMutatedAndBrawlStarsIsLaunchOnly() {
        assertFalse(AppLaunchPolicy.canMutateExternalAppData())
        assertTrue(AppCatalog.games.any { it.packageName == "com.supercell.brawlstars" })
    }

    @Test
    fun pinVaultDoesNotStorePlainPinAndVerifiesCorrectly() {
        val record = PinVault.create("2468")
        assertFalse(record.contains("2468"))
        assertTrue(PinVault.verify("2468", record))
        assertFalse(PinVault.verify("0000", record))
    }

    @Test
    fun childBackNeverExitsDirectly() {
        assertEquals(ChildBackAction.RETURN_HOME, childBackAction("games"))
        assertEquals(ChildBackAction.REQUEST_PARENT_PIN, childBackAction("home"))
    }
}
