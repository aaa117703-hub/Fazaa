import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

// تفضيلات المستخدم المحفوظة على الجهاز: حجم الخط والأزرار، اللغة، تقليل الحركة، وأول دخول.
export const FONT_STEPS: [number, string][] = [[0.88, 'صغير'], [1, 'عادي'], [1.14, 'كبير'], [1.3, 'كبير جداً'], [1.5, 'ضخم']];
export const BTN_STEPS: [number, string][] = [[0.9, 'صغير'], [1, 'عادي'], [1.15, 'كبير'], [1.3, 'كبير جداً']];
export type Lang = 'ar' | 'en' | 'ckb';
export type Prefs = { fontStep: number; btnStep: number; lang: Lang; reduceMotion: boolean; onboarded: boolean; loaded: boolean };

const KEY = 'sanad_prefs_v1';
let state: Prefs = { fontStep: 1, btnStep: 1, lang: 'ar', reduceMotion: false, onboarded: false, loaded: false };
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

AsyncStorage.getItem(KEY).then((v) => {
  try { if (v) state = { ...state, ...JSON.parse(v) }; } catch { /* */ }
  state = { ...state, loaded: true };
  emit();
}).catch(() => { state = { ...state, loaded: true }; emit(); });

export function setPrefs(patch: Partial<Prefs>) {
  state = { ...state, ...patch };
  const { loaded: _l, ...save } = state; // eslint-disable-line @typescript-eslint/no-unused-vars
  AsyncStorage.setItem(KEY, JSON.stringify(save)).catch(() => {});
  emit();
}
export const getPrefs = () => state;
export function usePrefs(): Prefs {
  return useSyncExternalStore((cb) => { subs.add(cb); return () => { subs.delete(cb); }; }, () => state, () => state);
}
export const fontScale = (p: Prefs) => FONT_STEPS[Math.min(FONT_STEPS.length - 1, Math.max(0, p.fontStep))][0];
export const btnScale = (p: Prefs) => BTN_STEPS[Math.min(BTN_STEPS.length - 1, Math.max(0, p.btnStep))][0];
