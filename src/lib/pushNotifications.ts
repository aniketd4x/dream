import { Capacitor } from '@capacitor/core';
import { PushNotifications, type Token, type ActionPerformed, type PushNotificationSchema } from '@capacitor/push-notifications';
import { supabase } from '@/lib/supabase';
import { startOrderRinging } from '@/lib/audio';
import { triggerHaptic } from '@/lib/haptics';

export const ORDER_CHANNEL_ID = 'dishgaze_orders_sound_v2';

let isInitialized = false;

/**
 * Save FCM Device Token into Supabase restaurant_devices table
 */
export async function saveDeviceToken(restaurantId: string, fcmToken: string) {
  try {
    const { data, error } = await supabase
      .from('restaurant_devices')
      .upsert(
        {
          restaurant_id: restaurantId,
          fcm_token: fcmToken,
          platform: 'android',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'fcm_token' }
      )
      .select();

    if (error) {
      console.warn('⚠️ Could not save FCM token to Supabase:', error.message);
    } else {
      console.log('✅ FCM token registered in Supabase:', data);
    }
  } catch (err) {
    console.error('Error saving device token:', err);
  }
}

/**
 * Initialize Push Notifications for Android native container
 */
export async function initPushNotifications(restaurantId: string, onNavigate?: (route: string) => void) {
  if (!Capacitor.isNativePlatform()) {
    console.log('ℹ️ Push notifications: skipped (running in web browser)');
    return;
  }

  if (isInitialized) {
    console.log('ℹ️ Push notifications already initialized');
    return;
  }
  isInitialized = true;

  try {
    console.log('🚀 Initializing Push Notifications for restaurant:', restaurantId);

    // 1. Create High-Priority Android Notification Channel with sound & vibration
    try {
      await PushNotifications.createChannel({
        id: ORDER_CHANNEL_ID,
        name: 'Dishgaze Order Alerts',
        description: 'Urgent incoming customer order alerts',
        importance: 5, // MAX importance (heads-up banner on top of screen)
        visibility: 1, // Visible on lock screen
        sound: 'order_ring',
        vibration: true,
        lights: true,
        lightColor: '#F97316',
      });
      console.log('✅ Notification channel created:', ORDER_CHANNEL_ID);
    } catch (chanErr) {
      console.warn('Channel creation warning:', chanErr);
    }

    // 2. Set up event listeners BEFORE calling register() to prevent race conditions!
    await PushNotifications.addListener('registration', async (token: Token) => {
      console.log('🎉 FCM Registration Token received:', token.value);
      await saveDeviceToken(restaurantId, token.value);
    });

    await PushNotifications.addListener('registrationError', (err: any) => {
      console.error('❌ Push notification registration error:', JSON.stringify(err));
    });

    await PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('🔔 Push notification received in foreground:', notification);
      triggerHaptic('alert');
      startOrderRinging();

      // Dispatch event to refresh live order screens
      window.dispatchEvent(
        new CustomEvent('new_order_received', {
          detail: notification.data || { order_number: notification.title },
        })
      );
    });

    await PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
      console.log('📲 Notification clicked by manager:', action);
      if (onNavigate) {
        onNavigate('table:orders');
      } else {
        window.dispatchEvent(new CustomEvent('app_navigate', { detail: 'table:orders' }));
      }
    });

    // 3. Request Notification Permission
    let permStatus = await PushNotifications.checkPermissions();
    console.log('Current notification permission status:', permStatus.receive);

    if (permStatus.receive === 'prompt' || permStatus.receive === 'prompt-with-rationale') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.warn('⚠️ Push notification permission denied by user (status: ' + permStatus.receive + ')');
      return;
    }

    // 4. Register device with FCM
    console.log('📡 Calling PushNotifications.register()...');
    await PushNotifications.register();
  } catch (error) {
    console.error('❌ Error initializing push notifications:', error);
  }
}
