import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/** يصغّر الصورة ويضغطها قبل الرفع. إذا فشل لأي سبب نرجع الصورة الأصلية (ما نوقف المستخدم). */
export async function shrink(uri: string, opt: { width: number; format?: 'jpeg' | 'webp'; quality?: number; base64?: boolean }): Promise<{ uri: string; base64?: string }> {
  try {
    const ctx = ImageManipulator.manipulate(uri);
    ctx.resize({ width: opt.width, height: null });
    const img = await ctx.renderAsync();
    const out = await img.saveAsync({ format: opt.format === 'webp' ? SaveFormat.WEBP : SaveFormat.JPEG, compress: opt.quality ?? 0.7, base64: opt.base64 });
    return { uri: out.uri, base64: out.base64 ?? undefined };
  } catch { return { uri }; }
}
