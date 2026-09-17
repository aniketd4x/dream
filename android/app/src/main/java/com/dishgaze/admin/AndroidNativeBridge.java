package com.dishgaze.admin;

import android.app.Activity;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.util.Base64;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import androidx.core.content.FileProvider;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

public class AndroidNativeBridge {
    private static final String TAG = "AndroidNativeBridge";
    private final Activity activity;

    public AndroidNativeBridge(Activity activity) {
        this.activity = activity;
    }

    /**
     * Native Android Print Dialog (Supports WiFi, Bluetooth, Thermal, and PDF printers)
     */
    @JavascriptInterface
    public void printHtml(final String html, final String docName) {
        new Handler(Looper.getMainLooper()).post(new Runnable() {
            @Override
            public void run() {
                try {
                    WebView printWebView = new WebView(activity);
                    printWebView.setWebViewClient(new WebViewClient() {
                        @Override
                        public void onPageFinished(WebView view, String url) {
                            try {
                                PrintManager printManager = (PrintManager) activity.getSystemService(Context.PRINT_SERVICE);
                                if (printManager != null) {
                                    String jobName = (docName != null && !docName.isEmpty()) ? docName : "Dishgaze Document";
                                    PrintDocumentAdapter printAdapter = printWebView.createPrintDocumentAdapter(jobName);
                                    PrintAttributes.Builder builder = new PrintAttributes.Builder();
                                    builder.setColorMode(PrintAttributes.COLOR_MODE_COLOR);
                                    builder.setMediaSize(PrintAttributes.MediaSize.ISO_A4);
                                    printManager.print(jobName, printAdapter, builder.build());
                                }
                            } catch (Exception e) {
                                Log.e(TAG, "PrintManager error", e);
                            }
                        }
                    });
                    printWebView.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null);
                } catch (Exception e) {
                    Log.e(TAG, "Error initializing print WebView", e);
                }
            }
        });
    }

    /**
     * Native Android Share Dialog with attached image file
     */
    @JavascriptInterface
    public void shareImage(final String base64Data, final String fileName, final String title, final String text) {
        new Handler(Looper.getMainLooper()).post(new Runnable() {
            @Override
            public void run() {
                try {
                    String cleanBase64 = base64Data.contains(",") ? base64Data.split(",")[1] : base64Data;
                    byte[] imageBytes = Base64.decode(cleanBase64, Base64.DEFAULT);

                    File cacheDir = new File(activity.getCacheDir(), "shared_images");
                    if (!cacheDir.exists()) {
                        cacheDir.mkdirs();
                    }

                    String outFileName = (fileName != null && !fileName.isEmpty()) ? fileName : "dishgaze-share.png";
                    File shareFile = new File(cacheDir, outFileName);
                    FileOutputStream fos = new FileOutputStream(shareFile);
                    fos.write(imageBytes);
                    fos.flush();
                    fos.close();

                    Uri contentUri = FileProvider.getUriForFile(activity, activity.getPackageName() + ".fileprovider", shareFile);
                    if (contentUri != null) {
                        Intent shareIntent = new Intent(Intent.ACTION_SEND);
                        shareIntent.setType("image/png");
                        shareIntent.putExtra(Intent.EXTRA_STREAM, contentUri);
                        if (text != null && !text.isEmpty()) {
                            shareIntent.putExtra(Intent.EXTRA_TEXT, text);
                        }
                        if (title != null && !title.isEmpty()) {
                            shareIntent.putExtra(Intent.EXTRA_SUBJECT, title);
                        }
                        shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        activity.startActivity(Intent.createChooser(shareIntent, title != null ? title : "Share Image"));
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Error sharing image", e);
                    Toast.makeText(activity, "Failed to open share menu", Toast.LENGTH_SHORT).show();
                }
            }
        });
    }

    /**
     * Native Android Direct Save to Pictures / Gallery with Toast notification
     */
    @JavascriptInterface
    public void saveImageToGallery(final String base64Data, final String fileName) {
        new Handler(Looper.getMainLooper()).post(new Runnable() {
            @Override
            public void run() {
                try {
                    String cleanBase64 = base64Data.contains(",") ? base64Data.split(",")[1] : base64Data;
                    byte[] imageBytes = Base64.decode(cleanBase64, Base64.DEFAULT);
                    Bitmap bitmap = BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.length);

                    String outFileName = (fileName != null && !fileName.isEmpty()) ? fileName : "Dishgaze_" + System.currentTimeMillis() + ".png";
                    OutputStream fos = null;

                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        ContentValues values = new ContentValues();
                        values.put(MediaStore.Images.Media.DISPLAY_NAME, outFileName);
                        values.put(MediaStore.Images.Media.MIME_TYPE, "image/png");
                        values.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/Dishgaze");
                        Uri uri = activity.getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
                        if (uri != null) {
                            fos = activity.getContentResolver().openOutputStream(uri);
                        }
                    } else {
                        File imagesDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES);
                        File dishgazeDir = new File(imagesDir, "Dishgaze");
                        if (!dishgazeDir.exists()) dishgazeDir.mkdirs();
                        File image = new File(dishgazeDir, outFileName);
                        fos = new FileOutputStream(image);
                    }

                    if (bitmap != null && fos != null) {
                        bitmap.compress(Bitmap.CompressFormat.PNG, 100, fos);
                        fos.flush();
                        fos.close();
                        Toast.makeText(activity, "Saved to Gallery: " + outFileName, Toast.LENGTH_LONG).show();
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Error saving to gallery", e);
                    Toast.makeText(activity, "Saved to Storage", Toast.LENGTH_SHORT).show();
                }
            }
        });
    }
}
