# PACT — Android APK Build, Signing & Physical Device Testing Guide

This guide details the end-to-end process of packaging, signing, and deploying the PACT native mobile application for Android using **Capacitor 7** and **Gradle**.

---

## 1. Application Specification

- **App Name**: PACT (Pantry Collective Commerce)
- **Application ID / Package**: `com.pact.collective`
- **Minimum Android SDK**: 24 (Android 7.0 Nougat)
- **Target Android SDK**: 35 (Android 15)
- **Architecture**: Single codebase sharing static Next.js production build (`output: "export"`) with responsive mobile layout and native Capacitor bridges.

---

## 2. Automated Build Commands

We have created an automated one-click build and signing pipeline:

```bash
# Run the complete automated pipeline:
./scripts/build_android_apks.sh
```

Or execute step-by-step:

### Step 1: Compile Next.js Static Export
```bash
cd apps/web
npm run build
```
Generates production static HTML, CSS, JavaScript, and assets into `apps/web/out/`.

### Step 2: Sync Capacitor Android Assets & Plugins
```bash
npx cap sync android
```
Copies `out/` into `android/app/src/main/assets/public/` and updates native plugin bridges:
- `@capacitor/app`: Lifecycle and hardware back button
- `@capacitor/status-bar`: Native primary teal status bar styling
- `@capacitor/splash-screen`: Native brand splash screen auto-hide
- `@capacitor/keyboard`: Window soft input resize handling
- `@capacitor/preferences`: Secure offline token persistence

### Step 3: Compile Debug APK
```bash
cd android
./gradlew assembleDebug
```
Output: `apps/web/android/app/build/outputs/apk/debug/app-debug.apk`

### Step 4: Compile Release APK
```bash
./gradlew assembleRelease
```
Output: `apps/web/android/app/build/outputs/apk/release/app-release-unsigned.apk`

---

## 3. Secure Release Signing with `apksigner`

For Google Play or physical side-loading:

### Step 1: Generate a 2048-bit RSA Keystore
```bash
keytool -genkeypair -v \
    -keystore release/pact-release-key.jks \
    -alias pactkey \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000 \
    -dname "CN=PACT, OU=Mobile, O=Pantry Collective, L=Bengaluru, ST=Karnataka, C=IN"
```

### Step 2: Sign the Release APK (v2 & v3 Scheme)
```bash
apksigner sign \
    --ks release/pact-release-key.jks \
    --ks-key-alias pactkey \
    --out release/pact-release-signed.apk \
    apps/web/android/app/build/outputs/apk/release/app-release-unsigned.apk
```

### Step 3: Verify Cryptographic Signatures
```bash
apksigner verify --verbose release/pact-release-signed.apk
```
Expected output:
```
Verifies
Verified using v2 scheme (APK Signature Scheme v2): true
Verified using v3 scheme (APK Signature Scheme v3): true
Number of signers: 1
```

---

## 4. Verification on Physical Android Devices

To test and verify PACT on a physical Android handset:

### Prerequisites
1. On your Android smartphone, enable **Developer Options**:
   - Go to **Settings** > **About Phone**.
   - Tap **Build Number** 7 times until you see "You are now a developer!".
2. Enable **USB Debugging**:
   - Go to **Settings** > **Developer Options** > Enable **USB Debugging**.
3. Connect the Android phone to your machine with a USB cable.

### Installation via ADB (Android Debug Bridge)
```bash
# 1. Check connected device
adb devices

# 2. Install Debug APK
adb install -r release/pact-debug.apk

# 3. Or install signed Release APK
adb install -r release/pact-release-signed.apk

# 4. Launch PACT directly from terminal
adb shell am start -n com.pact.collective/.MainActivity
```

### Physical Device Verification Checklist

- [x] **Splash Screen**: Native teal background (`#0f766e`) displays and transitions smoothly into the web interface.
- [x] **Status Bar**: Status bar adapts to dark icons with primary teal header.
- [x] **Safe Area Insets**: Top notch and bottom gesture bar padding (`pb-safe`) prevent overlap on curved screens.
- [x] **Authentication Flow**: Quick persona switchers and OTP login authenticate and persist token.
- [x] **Microphone & Speech**: Voice ordering (`/customer/speak`) requests and receives audio recording permission for Hindi/Hinglish speech recognition.
- [x] **Hardware Back Button**: Pressing the Android back button navigates back in browser history; pressing back on home screens exits the app cleanly.
- [x] **Soft Keyboard**: Tapping inputs resizes the layout without hiding action buttons (`adjustResize`).
- [x] **Network Resilience**: Displays offline indicators or error toasts when disconnected, reconnecting cleanly upon restoration.
