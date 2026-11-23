import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { Platform, Vibration } from 'react-native';

// تنبيه الطلب الجديد داخل التطبيق: اهتزاز + صوت إشعار + بانر.
// (الصوت المخصص assets/sounds/new-request.wav جاهز، يُفعَّل مع إشعارات الدفع الخارجية لما يتوفر حساب آبل.)
let ready = false;
function setup() {
  if (ready) return;
  ready = true;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
    });
  } catch { /* */ }
}

export async function newRequestAlert(title: string, body: string): Promise<boolean> {
  setup();
  try {
    if (Platform.OS === 'android') Vibration.vibrate([0, 350, 150, 350, 150, 500]);
    else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}), 450);
    }
  } catch { /* */ }
  try {
    const p = await Notifications.getPermissionsAsync();
    if (!p.granted) return false;
    await Notifications.scheduleNotificationAsync({ content: { title, body, sound: true }, trigger: null });
    return true;
  } catch { return false; }
}
