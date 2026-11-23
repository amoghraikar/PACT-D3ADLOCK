# PACT Android Release Artifacts

This directory holds the generated Android APK builds for PACT:

- `pact-debug.apk`: Debug APK for development and emulator testing.
- `pact-release-signed.apk`: Cryptographically signed release APK for physical device testing.
- `pact-release-unsigned.apk`: Intermediate release APK prior to signature application.

To regenerate these APKs at any time:
```bash
./scripts/build_android_apks.sh
```
Or view the full guide at [`docs/ANDROID_RELEASE_GUIDE.md`](../docs/ANDROID_RELEASE_GUIDE.md).
