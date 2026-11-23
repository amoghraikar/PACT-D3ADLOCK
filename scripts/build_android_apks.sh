#!/usr/bin/env bash
set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_DIR="${PROJECT_ROOT}/apps/web"
ANDROID_DIR="${WEB_DIR}/android"
RELEASE_DIR="${PROJECT_ROOT}/release"
APKSIGNER="/usr/local/share/android-commandlinetools/build-tools/35.0.0/apksigner"

echo "=========================================================="
echo " PACT Android APK Automated Build & Signing Pipeline"
echo "=========================================================="

mkdir -p "${RELEASE_DIR}"

# 1. Build Frontend Static Assets
echo "Step 1/5: Compiling Next.js static production export..."
cd "${WEB_DIR}"
npm run build

# 2. Sync Capacitor Android Project
echo "Step 2/5: Syncing Capacitor Android assets & native plugins..."
npx cap sync android

# 3. Assemble Android Debug APK
echo "Step 3/5: Building Android Debug APK via Gradle..."
cd "${ANDROID_DIR}"
./gradlew assembleDebug

# 4. Assemble Android Release APK
echo "Step 4/5: Building Android Release APK via Gradle..."
./gradlew assembleRelease

# Copy Debug APK
cp "${ANDROID_DIR}/app/build/outputs/apk/debug/app-debug.apk" "${RELEASE_DIR}/pact-debug.apk"
echo "✔ Debug APK created: ${RELEASE_DIR}/pact-debug.apk"

# 5. Sign Release APK
echo "Step 5/5: Configuring release signing..."
KEYSTORE_PATH="${RELEASE_DIR}/pact-release-key.jks"
KEY_ALIAS="pactkey"
STORE_PASS="pactpassword123"

if [ ! -f "${KEYSTORE_PATH}" ]; then
    echo "Generating standard release keystore..."
    keytool -genkeypair -v \
        -keystore "${KEYSTORE_PATH}" \
        -alias "${KEY_ALIAS}" \
        -keyalg RSA \
        -keysize 2048 \
        -validity 10000 \
        -storepass "${STORE_PASS}" \
        -keypass "${STORE_PASS}" \
        -dname "CN=PACT, OU=Mobile, O=Pantry Collective, L=Bengaluru, ST=Karnataka, C=IN"
fi

UNSIGNED_APK="${ANDROID_DIR}/app/build/outputs/apk/release/app-release-unsigned.apk"
SIGNED_APK="${RELEASE_DIR}/pact-release-signed.apk"

cp "${UNSIGNED_APK}" "${RELEASE_DIR}/pact-release-unsigned.apk"

# Sign with apksigner (v1 + v2 + v3 signatures)
"${APKSIGNER}" sign \
    --ks "${KEYSTORE_PATH}" \
    --ks-key-alias "${KEY_ALIAS}" \
    --ks-pass "pass:${STORE_PASS}" \
    --key-pass "pass:${STORE_PASS}" \
    --out "${SIGNED_APK}" \
    "${UNSIGNED_APK}"

# Verify signed APK
echo "Verifying signed release APK with apksigner..."
"${APKSIGNER}" verify --verbose "${SIGNED_APK}"

echo "=========================================================="
echo " PACT Android APK Build & Verification Complete!"
echo " Artifacts available in: ${RELEASE_DIR}"
echo " - Debug APK:         ${RELEASE_DIR}/pact-debug.apk"
echo " - Release (Signed):  ${RELEASE_DIR}/pact-release-signed.apk"
echo " - Release (Unsigned):${RELEASE_DIR}/pact-release-unsigned.apk"
echo "=========================================================="
