import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

export type PermState = 'granted' | 'denied' | 'undetermined';
export type Perms = { location: PermState; notifications: PermState };

const KEY = 'sanad_perm_asked';

function norm(granted: boolean, canAsk: boolean): PermState { return granted ? 'granted' : canAsk ? 'undetermined' : 'denied'; }

export async function readPerms(): Promise<Perms> {
  const [l, n] = await Promise.all([
    Location.getForegroundPermissionsAsync().catch(() => null),
    Notifications.getPermissionsAsync().catch(() => null),
  ]);
  return { location: l ? norm(l.granted, l.canAskAgain && l.status === 'undetermined') : 'undetermined', notifications: n ? norm(n.granted || !!n.ios?.allowsBadge, n.canAskAgain && n.status === 'undetermined') : 'undetermined' };
}
export async function askLocation() { try { await Location.requestForegroundPermissionsAsync(); } catch { /* */ } }
export async function askNotifications() { try { await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: true, allowSound: true } }); } catch { /* */ } }

export async function wasAsked() { try { return (await AsyncStorage.getItem(KEY)) === '1'; } catch { return true; } }
export async function markAsked() { try { await AsyncStorage.setItem(KEY, '1'); } catch { /* */ } }

/** حالة الأذونات الحالية، وتتحدّث لمّا يرجع المستخدم من إعدادات الجهاز. */
export function usePerms() {
  const [p, setP] = useState<Perms | null>(null);
  const refresh = useCallback(() => { readPerms().then(setP).catch(() => {}); }, []);
  useEffect(() => {
    refresh();
    const s = AppState.addEventListener('change', (x) => { if (x === 'active') refresh(); });
    return () => s.remove();
  }, [refresh]);
  return [p, refresh] as const;
}
