package br.com.rotaposto.app;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;

/**
 * MapLaunchActivity — captura rotaposto://maps?lat=X&lng=Y&olat=A&olng=B
 * e abre o Google Maps (ou Waze) nativamente sem passar pelo Custom Tab.
 *
 * Fluxo:
 *   1. App JS navega para rotaposto://maps?... (scheme do próprio app)
 *   2. TWA trata rotaposto:// como "fora do escopo" → dispara intent
 *   3. Android resolve o intent-filter desta Activity
 *   4. Activity monta a URL do Maps/Waze e abre via startActivity
 *   5. Activity finaliza imediatamente (sem UI)
 */
public class MapLaunchActivity extends Activity {

    private static final String GMAPS_PKG  = "com.google.android.apps.maps";
    private static final String WAZE_PKG   = "com.waze";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Uri data = getIntent().getData();
        if (data == null) { finish(); return; }

        String lat  = data.getQueryParameter("lat");
        String lng  = data.getQueryParameter("lng");
        String olat = data.getQueryParameter("olat");
        String olng = data.getQueryParameter("olng");
        String app  = data.getQueryParameter("app");   // "google" | "waze" (default google)

        if (lat == null || lng == null) { finish(); return; }

        if ("waze".equals(app)) {
            openWaze(lat, lng);
        } else {
            openGoogleMaps(lat, lng, olat, olng);
        }

        finish();
    }

    private void openGoogleMaps(String lat, String lng, String olat, String olng) {
        // 1ª tentativa: URI scheme nativo do Google Maps (não passa pelo Custom Tab)
        StringBuilder uri = new StringBuilder("google.navigation:q=")
                .append(lat).append(",").append(lng)
                .append("&mode=d");

        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(uri.toString()));
        intent.setPackage(GMAPS_PKG);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

        if (isAppInstalled(GMAPS_PKG)) {
            startActivity(intent);
            return;
        }

        // Fallback: abre Play Store ou browser
        openFallback("https://maps.google.com/maps?daddr=" + lat + "," + lng
                + (olat != null && olng != null ? "&saddr=" + olat + "," + olng : "")
                + "&dirflg=d");
    }

    private void openWaze(String lat, String lng) {
        String uri = "waze://?ll=" + lat + "," + lng + "&navigate=yes";
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(uri));
        intent.setPackage(WAZE_PKG);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

        if (isAppInstalled(WAZE_PKG)) {
            startActivity(intent);
            return;
        }

        openFallback("https://waze.com/ul?ll=" + lat + "%2C" + lng + "&navigate=yes");
    }

    private void openFallback(String url) {
        Intent browser = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
        browser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        startActivity(browser);
    }

    private boolean isAppInstalled(String pkg) {
        try {
            getPackageManager().getPackageInfo(pkg, 0);
            return true;
        } catch (PackageManager.NameNotFoundException e) {
            return false;
        }
    }
}
