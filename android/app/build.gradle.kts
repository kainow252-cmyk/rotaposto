import java.util.Properties
import java.io.FileInputStream

plugins {
    id("com.android.application")
    id("kotlin-android")
    id("dev.flutter.flutter-gradle-plugin")
}

// Carregar key.properties se existir (CI/CD e local)
val keyPropertiesFile = rootProject.file("key.properties")
val keyProperties = Properties()
if (keyPropertiesFile.exists()) {
    keyProperties.load(FileInputStream(keyPropertiesFile))
}

android {
    namespace = "br.com.rotaposto.app"
    compileSdk = 35
    ndkVersion = "27.0.12077973"

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_11.toString()
    }

    signingConfigs {
        create("release") {
            if (keyPropertiesFile.exists()) {
                // CI/CD: usa key.properties
                keyAlias = keyProperties["keyAlias"] as String
                keyPassword = keyProperties["keyPassword"] as String
                storeFile = file(keyProperties["storeFile"] as String)
                storePassword = keyProperties["storePassword"] as String
            } else {
                // Fallback local: keystore na pasta app/
                storeFile = file("rotaposto-keystore.jks")
                storePassword = "rotaposto2024"
                keyAlias = "rotaposto"
                keyPassword = "rotaposto2024"
            }
        }
    }

    defaultConfig {
        applicationId = "br.com.rotaposto.app"
        minSdk = 23
        targetSdk = 35
        versionCode = 51
        versionName = "2.0.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            isShrinkResources = false
            signingConfig = signingConfigs.getByName("release")
        }
    }
}

flutter {
    source = "../.."
}
