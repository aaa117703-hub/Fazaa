import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// الاهتزاز يُستدعى بحذر: لا على الايباد (بلا محرّك اهتزاز) ولا يُسمح لأي خطأ أن يطيّح التطبيق.
const ok = Platform.OS === 'ios' ? !(Platform as unknown as { isPad?: boolean }).isPad : Platform.OS === 'android';

export function tap() {
  if (!ok) return;
  try { Haptics.selectionAsync().catch(() => {}); } catch { /* ignore */ }
}
export function warn() {
  if (!ok) return;
  try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}); } catch { /* ignore */ }
}

export const safe = <T,>(f: () => T, d: T): T => { try { return f(); } catch { return d; } };
