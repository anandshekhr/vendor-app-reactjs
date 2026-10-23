import { cn } from '@/utils/cn';

export type StickerSize = 'poster' | 'card' | 'small';

/**
 * Printable shop QR design. Colours are kept print-safe (solid brand header, black QR on white).
 * The QR image is the server-rendered SVG of the stable scan URL.
 */
export function QrSticker({
  shopName,
  qrSvg,
  code,
  tableNumber,
  size = 'card',
}: {
  shopName: string;
  qrSvg: string;
  code: string;
  tableNumber?: string | null;
  size?: StickerSize;
}) {
  const s = {
    poster: { box: 'w-[150mm]', pad: 'p-8', title: 'text-4xl', sub: 'text-xl', qr: 'w-[100mm]', foot: 'text-base' },
    card: { box: 'w-[90mm]', pad: 'p-5', title: 'text-xl', sub: 'text-sm', qr: 'w-[60mm]', foot: 'text-[11px]' },
    small: { box: 'w-[60mm]', pad: 'p-3', title: 'text-base', sub: 'text-[11px]', qr: 'w-[42mm]', foot: 'text-[9px]' },
  }[size];
  return (
    <div className={cn('break-inside-avoid overflow-hidden rounded-2xl border-2 border-[#C23C3C] bg-white text-center text-black', s.box)}>
      <div className="bg-[#C23C3C] px-4 py-2 text-white">
        <p className={cn('font-semibold tracking-wide', s.sub)}>TheNearByShop</p>
      </div>
      <div className={cn('flex flex-col items-center', s.pad)}>
        <p className={cn('font-bold leading-tight', s.title)}>{shopName}</p>
        <p className={cn('mt-1 text-black/70', s.sub)}>{tableNumber ? `Table ${tableNumber} · Scan to order` : 'Scan to order online'}</p>
        <img src={qrSvg} alt={`QR code ${code} for ${shopName}`} className={cn('my-3 aspect-square', s.qr)} />
        <p className={cn('font-mono tracking-widest text-black/60', s.foot)}>{code}</p>
        <p className={cn('mt-1 text-black/60', s.foot)}>Order · Pay · Get it delivered — thenearbyshop.com</p>
      </div>
    </div>
  );
}
