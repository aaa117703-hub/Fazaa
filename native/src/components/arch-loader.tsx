import React from 'react';
import { View } from 'react-native';

// لودر سند جايك: القوس مسار، والنقطة تطلع عليه حسب النسبة (50% = منتصف القوس، 100% = نهايته).
const AL = 35 + Math.PI * 31 + 35;
function at(d: number): [number, number] {
  if (d <= 35) return [19, 86 - d];
  if (d <= 35 + Math.PI * 31) { const a = Math.PI - (d - 35) / 31; return [50 + 31 * Math.cos(a), 51 - 31 * Math.sin(a)]; }
  return [81, 51 + (d - 35 - Math.PI * 31)];
}

export function ArchLoader({ pct, size = 150 }: { pct: number; size?: number }) {
  const u = size / 100;
  const cur = Math.max(0.01, Math.min(1, pct / 100)) * AL;
  const track: React.ReactNode[] = [];
  const trail: React.ReactNode[] = [];
  for (let d = 0; d <= AL; d += 3) {
    const [x, y] = at(d);
    const dot = <View key={d} style={{ position: 'absolute', left: (x - 6) * u, top: (y - 6) * u, width: 12 * u, height: 12 * u, borderRadius: 6 * u, backgroundColor: d <= cur ? '#FF6B2C' : 'rgba(255,255,255,0.16)' }} />;
    (d <= cur ? trail : track).push(dot);
  }
  const [px, py] = at(cur);
  return (
    <View style={{ width: size, height: size }}>
      {track}
      {trail}
      <View style={{ position: 'absolute', left: 35.5 * u, top: 57.5 * u, width: 29 * u, height: 15.5 * u }}>
        <View style={{ position: 'absolute', left: -2 * u, top: 6 * u, width: 22 * u, height: 7 * u, borderRadius: 4 * u, backgroundColor: '#F5F5F0', transform: [{ rotate: '-47deg' }] }} />
        <View style={{ position: 'absolute', left: 9 * u, top: 6 * u, width: 22 * u, height: 7 * u, borderRadius: 4 * u, backgroundColor: '#F5F5F0', transform: [{ rotate: '47deg' }] }} />
      </View>
      <View style={{ position: 'absolute', left: (px - 6.5) * u, top: (py - 6.5) * u, width: 13 * u, height: 13 * u, borderRadius: 6.5 * u, backgroundColor: '#F5F5F0', shadowColor: '#FF6B2C', shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } }} />
    </View>
  );
}
