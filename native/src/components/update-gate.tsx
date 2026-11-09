import * as Updates from 'expo-updates';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { C, R } from '@/lib/theme';

const TIPS = [
  'إذا تعطلت سيارتك شغّل إشارات الطوارئ (الفلاشر) فوراً.',
  'ابتعد بسيارتك عن الطريق السريع قدر الإمكان قبل ما توقف.',
  'ضع المثلث العاكس خلف سيارتك بمسافة 50 متراً على الأقل.',
  'لا تقف أبداً بين سيارتك والسيارات القادمة.',
  'قبل ما تتصل بالكرين، حدّد موقعك بالتطبيق وأرسله له.',
  'اسأل الكرين عن السعر قبل التحميل، واتفق عليه بوضوح.',
  'احتفظ بإطار احتياط صالح وعدّة تبديل بالسيارة.',
];
const NOTES = ['تحسينات وإصلاحات لتجربة أسرع وأثبت', 'تنقل وأزرار أحدث', 'حماية أقوى للتطبيق'];

const pick = (prev: string) => {
  let t = prev;
  while (t === prev) t = TIPS[Math.floor(Math.random() * TIPS.length)];
  return t;
};

/** عند فتح التطبيق: يفحص تحديث EAS ويعرض نافذة (ما الجديد + نصائح + شريط 0→100%). */
export function UpdateGate() {
  const [avail, setAvail] = useState(false);
  const [phase, setPhase] = useState<'ask' | 'load'>('ask');
  const [pct, setPct] = useState(0);
  const [tip, setTip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)]);
  const [msg, setMsg] = useState('جاري التحديث… لا تسكّر التطبيق');
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;
    let off = false;
    Updates.checkForUpdateAsync()
      .then((r) => { if (!off && r.isAvailable) setAvail(true); })
      .catch(() => {});
    return () => { off = true; };
  }, []);

  const start = () => {
    setPhase('load');
    Animated.loop(Animated.timing(spin, { toValue: 1, duration: 5200, easing: Easing.linear, useNativeDriver: true })).start();
    let ready = false;
    let failed = false;
    Updates.fetchUpdateAsync().then(() => { ready = true; }).catch(() => { failed = true; });
    const t0 = Date.now();
    let cur = 0;
    const id = setInterval(() => {
      const s = (Date.now() - t0) / 1000;
      let target = Math.min(90, (s / 5) * 90);
      if (ready) target = s >= 3.2 ? 100 : Math.max(target, Math.min(97, (s / 3.2) * 100));
      cur += (target - cur) * 0.12;
      if (target === 100 && cur > 99.4) cur = 100;
      setPct(Math.round(cur));
      if (failed || s > 45) {
        clearInterval(id);
        setMsg('تعذّر التحديث الآن، جرّب لاحقاً');
        setTimeout(() => setAvail(false), 1800);
        return;
      }
      if (cur >= 100) {
        clearInterval(id);
        setMsg('تم التحديث ✓ جاري إعادة التشغيل');
        setTimeout(() => { Updates.reloadAsync().catch(() => setAvail(false)); }, 500);
      }
    }, 100);
  };

  const bump = () => {
    pulse.setValue(0.88);
    Animated.spring(pulse, { toValue: 1, friction: 3, useNativeDriver: true }).start();
  };
  const rot = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const rotRev = spin.interpolate({ inputRange: [0, 1], outputRange: ['45deg', '-315deg'] });

  return (
    <Modal visible={avail} transparent animationType="fade" onRequestClose={() => { if (phase === 'ask') setAvail(false); }}>
      <View style={s.back}>
        <View style={s.card}>
          {phase === 'ask' ? (
            <>
              <View style={s.badge}><Text style={s.badgeT}>تحديث جديد</Text></View>
              <Text style={s.h}>نسخة أحسن جاهزة لك</Text>
              <View style={s.box}>
                <Text style={s.boxH}>ما الجديد</Text>
                {NOTES.map((n) => (
                  <View key={n} style={s.row}><View style={s.dia} /><Text style={s.li}>{n}</Text></View>
                ))}
              </View>
              <Pressable style={s.tip} onPress={() => setTip((p) => pick(p))}>
                <Text style={s.tipT}>{tip}</Text>
                <Text style={s.tipS}>المس النصيحة لتطلع غيرها</Text>
              </Pressable>
              <View style={s.btns}>
                <Pressable style={[s.btn, s.later]} onPress={() => setAvail(false)}><Text style={s.laterT}>لاحقاً</Text></Pressable>
                <Pressable style={[s.btn, s.go]} onPress={start}><Text style={s.goT}>تحديث</Text></Pressable>
              </View>
            </>
          ) : (
            <View style={{ alignItems: 'center' }}>
              <Pressable onPress={bump} style={s.art}>
                <Animated.View style={{ transform: [{ scale: pulse }], alignItems: 'center', justifyContent: 'center' }}>
                  <Animated.View style={[s.sq, { width: 120, height: 120, borderColor: C.accent, transform: [{ rotate: rot }] }]} />
                  <Animated.View style={[s.sq, { width: 120, height: 120, borderColor: 'rgba(255,255,255,0.35)', transform: [{ rotate: rotRev }] }]} />
                  <Animated.View style={[s.sq, { width: 72, height: 72, borderColor: C.accent2, transform: [{ rotate: rotRev }] }]} />
                </Animated.View>
              </Pressable>
              <Text style={s.pct}>{pct}<Text style={s.pctS}>%</Text></Text>
              <View style={s.bar}><View style={[s.fill, { width: `${pct}%` }]} /></View>
              <Text style={s.msg}>{msg}</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  back: { flex: 1, backgroundColor: 'rgba(6,8,10,0.78)', alignItems: 'center', justifyContent: 'center', padding: 18 },
  card: { width: '100%', maxWidth: 400, borderRadius: 24, padding: 20, backgroundColor: C.surface, borderWidth: 1, borderColor: 'rgba(255,138,61,0.35)' },
  badge: { alignSelf: 'flex-end', paddingHorizontal: 12, paddingVertical: 4, borderRadius: R.pill, backgroundColor: 'rgba(255,107,44,0.16)' },
  badgeT: { color: '#FF9A55', fontSize: 12.5, fontWeight: '700' },
  h: { color: C.text, fontSize: 20, fontWeight: '800', textAlign: 'right', marginVertical: 12 },
  box: { padding: 14, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', marginBottom: 12 },
  boxH: { color: '#FF9A55', fontSize: 13, fontWeight: '700', textAlign: 'right', marginBottom: 6 },
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingVertical: 3 },
  dia: { width: 7, height: 7, backgroundColor: C.accent, transform: [{ rotate: '45deg' }] },
  li: { flex: 1, color: C.text, fontSize: 14.5, textAlign: 'right', lineHeight: 24 },
  tip: { padding: 14, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,138,61,0.3)', borderRightWidth: 4, borderRightColor: C.accent, backgroundColor: 'rgba(255,107,44,0.1)', marginBottom: 14 },
  tipT: { color: C.text, fontSize: 15, fontWeight: '700', textAlign: 'right', lineHeight: 26 },
  tipS: { color: C.muted, fontSize: 11.5, textAlign: 'right', marginTop: 2 },
  btns: { flexDirection: 'row', gap: 10 },
  btn: { height: 50, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  go: { flex: 1.6, backgroundColor: C.accent },
  later: { flex: 1, backgroundColor: 'rgba(255,255,255,0.07)' },
  goT: { color: '#fff', fontSize: 16, fontWeight: '800' },
  laterT: { color: '#C9CED6', fontSize: 16, fontWeight: '700' },
  art: { width: 200, height: 170, alignItems: 'center', justifyContent: 'center' },
  sq: { position: 'absolute', borderWidth: 4, borderRadius: 6 },
  pct: { color: C.text, fontSize: 44, fontWeight: '800', marginTop: 6 },
  pctS: { color: '#FF9A55', fontSize: 22 },
  bar: { width: '100%', height: 10, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.09)', overflow: 'hidden', marginTop: 8 },
  fill: { height: '100%', borderRadius: 9, backgroundColor: C.accent },
  msg: { color: C.muted, fontSize: 13.5, marginTop: 10 },
});
