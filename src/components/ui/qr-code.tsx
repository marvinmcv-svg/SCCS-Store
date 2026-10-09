import QRCode from 'qrcode';
import { cn } from '@/lib/utils';

/**
 * Server-rendered QR (pure SVG, no client JS). Used for pickup codes.
 * High error correction so a cracked phone screen still scans.
 */
export async function QrCode({ value, label, className }: { value: string; label: string; className?: string }) {
  const svg = await QRCode.toString(value, {
    type: 'svg',
    errorCorrectionLevel: 'H',
    margin: 1,
    color: { dark: '#14142b', light: '#ffffff' },
  });
  return (
    <div
      role="img"
      aria-label={label}
      className={cn('aspect-square w-full rounded-[12px] bg-white p-3 [&>svg]:h-full [&>svg]:w-full', className)}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
