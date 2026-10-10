# AGNES FAMILY — Android tablet shell

Native Android/Jetpack Compose shell for the Xiaomi Pad 7 family setup.

## Profile model

Android multi-user profiles remain the isolation boundary. Install the same APK in each profile, then choose that profile's AGNES role once: Parents, Vasilis, or Elenios. Android keeps the app data separate per user, so each profile remembers its own AGNES role and settings.

## Safety

AGNES only launches existing games with normal Android launch intents. It does not uninstall apps, clear data, move saves, or modify another app's files. If Brawl Stars exists only in the primary Android profile, AGNES in a child profile will simply report that it is unavailable there.

## Kiosk scope on Xiaomi HyperOS

The child UI uses immersive full-screen mode and protects AGNES parent actions with a local PIN. Xiaomi HyperOS blocks third-party apps from becoming the default launcher, so this build intentionally does not pretend to be a system launcher. Full Android lock-task kiosk enforcement would require device/profile-owner provisioning; that is a separate opt-in setup.

## Build

The repository GitHub Action runs JVM unit tests and builds a debug APK. The APK is uploaded as the `agnes-family-debug-apk` workflow artifact.
