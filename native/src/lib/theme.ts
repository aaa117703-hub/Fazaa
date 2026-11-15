// هوية سند جايك v2: رمادي داكن / فضي / أصفر (نفس الموقع)
export const C = {
  bg: '#14171A',
  surface: '#1C2024',
  surface2: '#252A2F',
  line: '#343A40',
  text: '#F2F3F4',
  muted: '#8C949B',
  silver: '#D9DADC',
  accent: '#FFC93C',
  accent2: '#FFD76A',
  accentPress: '#E5AE1F',
  onAccent: '#1B1E21',
  ok: '#3DD68C',
  warn: '#FFC93C',
  danger: '#F0463C',
  info: '#5AA9FF',
} as const;

export const R = { sm: 14, md: 18, lg: 24, pill: 999 } as const;

// خط IBM Plex Sans Arabic: عائلة لكل وزن (RN ما يركّب الأوزان لخط مخصص)
export function fontFor(weight?: string | number): string {
  const w = parseInt(String(weight ?? '400').replace('bold', '700').replace('normal', '400'), 10) || 400;
  if (w >= 700) return 'IBMPlexSansArabic_700Bold';
  if (w >= 600) return 'IBMPlexSansArabic_600SemiBold';
  if (w >= 500) return 'IBMPlexSansArabic_500Medium';
  return 'IBMPlexSansArabic_400Regular';
}
