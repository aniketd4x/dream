package com.dishgaze.admin;

import android.graphics.Color;
import android.os.Bundle;
import android.view.Window;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window window = getWindow();

        // 1. Ensure WebView strictly respects system windows (Status bar & Nav bar)
        WindowCompat.setDecorFitsSystemWindows(window, true);

        // 2. Set permanent solid background colors for system bars
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
        window.setStatusBarColor(Color.parseColor("#0f172a"));
        window.setNavigationBarColor(Color.parseColor("#0f172a"));

        // 3. Ensure Status Bar text/icons (Clock, Battery, Wi-Fi) are light/white
        WindowInsetsControllerCompat insetsController = WindowCompat.getInsetsController(window, window.getDecorView());
        if (insetsController != null) {
            insetsController.setAppearanceLightStatusBars(false);
            insetsController.setAppearanceLightNavigationBars(false);
        }

        // 4. Create High-Priority Notification Channel with custom order_ring sound
        createOrderNotificationChannel();

        // 5. Inject Android Native Bridge for High-Res Print, Share, and Save
        injectNativeBridge();
    }

    private void injectNativeBridge() {
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().addJavascriptInterface(new AndroidNativeBridge(this), "AndroidNativeBridge");
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    public void onStart() {
        super.onStart();
        injectNativeBridge();
    }

    private void createOrderNotificationChannel() {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            android.app.NotificationManager notificationManager = getSystemService(android.app.NotificationManager.class);
            if (notificationManager != null) {
                String channelId = "dishgaze_orders_sound_v2";
                CharSequence name = "Dishgaze Order Alerts";
                String description = "Urgent incoming customer order notifications with ringing sound";
                int importance = android.app.NotificationManager.IMPORTANCE_HIGH;

                android.app.NotificationChannel channel = new android.app.NotificationChannel(channelId, name, importance);
                channel.setDescription(description);
                channel.enableLights(true);
                channel.enableVibration(true);
                channel.setVibrationPattern(new long[]{0, 600, 250, 600, 250, 600});

                android.net.Uri soundUri = android.net.Uri.parse(
                    android.content.ContentResolver.SCHEME_ANDROID_RESOURCE + "://" + getPackageName() + "/raw/order_ring"
                );
                android.media.AudioAttributes audioAttributes = new android.media.AudioAttributes.Builder()
                    .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(android.media.AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                    .build();
                channel.setSound(soundUri, audioAttributes);

                notificationManager.createNotificationChannel(channel);
            }
        }
    }

    @Override
    public void onResume() {
        super.onResume();
    }
}
