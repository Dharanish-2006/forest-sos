#!/bin/bash
# Forest SOS APK Builder

# 1️⃣ Set your keystore info
KEYSTORE="android/app/keystore.jks"
ALIAS="forest-sos-key"
STORE_PASSWORD="YOUR_STORE_PASSWORD"
KEY_PASSWORD="YOUR_KEY_PASSWORD"

# 2️⃣ Create keystore if it doesn't exist
if [ ! -f "$KEYSTORE" ]; then
  echo "Keystore not found! Creating..."
  keytool -genkey -v -keystore $KEYSTORE -alias $ALIAS \
    -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass $STORE_PASSWORD -keypass $KEY_PASSWORD \
    -dname "CN=ForestSOS, OU=App, O=YourCompany, L=City, ST=State, C=US"
fi

# 3️⃣ Update Gradle signing config temporarily
GRADLE_FILE="android/app/build.gradle"
if ! grep -q "signingConfigs" $GRADLE_FILE; then
  echo "Adding signing configs to build.gradle..."
  cat <<EOT >> $GRADLE_FILE

android {
    signingConfigs {
        release {
            storeFile file("$KEYSTORE")
            storePassword "$STORE_PASSWORD"
            keyAlias "$ALIAS"
            keyPassword "$KEY_PASSWORD"
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            shrinkResources false
        }
    }
}
EOT
fi

# 4️⃣ Clean previous builds
cd android
./gradlew clean

# 5️⃣ Build release APK
./gradlew assembleRelease

# 6️⃣ Show APK location
APK_PATH="app/build/outputs/apk/release/app-release.apk"
if [ -f "$APK_PATH" ]; then
  echo "✅ APK built successfully: android/app/build/outputs/apk/release/app-release.apk"
else
  echo "❌ APK build failed!"
fi
