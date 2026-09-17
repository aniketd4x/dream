// components/TableBadge.tsx
import { QRCodeCanvas } from 'qrcode.react';
import { Download, ScanLine, Table2, Sparkles } from 'lucide-react';
import { useRef } from 'react';
import { downloadImageFile } from '@/lib/fileExport';
import { triggerHaptic } from '@/lib/haptics';

interface TableBadgeProps {
  tableNumber: string;
  tableName?: string;
  qrValue: string;
  restaurantName?: string;
  logoUrl?: string | null;
  onDownload?: () => void;
}

export function TableBadge({
  tableNumber,
  tableName,
  qrValue,
  restaurantName = 'Smart Restaurant',
  logoUrl,
  onDownload,
}: TableBadgeProps) {
  const qrRef = useRef<HTMLCanvasElement>(null);

  const downloadQR = async () => {
    if (onDownload) {
      onDownload();
      return;
    }

    if (!qrRef.current) return;

    triggerHaptic('medium');
    const canvas = qrRef.current;
    const url = canvas.toDataURL('image/png');

    await downloadImageFile(
      url,
      `table-${tableNumber}-qrcode.png`
    );
    triggerHaptic('success');
  };

  return (
    <div className="group relative w-full max-w-sm overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_-20px_rgba(15,23,42,0.20)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_25px_70px_-20px_rgba(15,23,42,0.28)]">
      {/* Top Gradient */}
      <div className="absolute inset-x-0 top-0 h-28 bg-theme-gradient opacity-95" />

      {/* Decorative circles */}
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10" />
      <div className="absolute -left-12 top-8 h-24 w-24 rounded-full bg-white/10" />

      {/* Header */}
      <div className="relative px-6 pb-6 pt-5 text-white">
        <div className="flex items-start justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-white/80">
              <Table2 className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em]">
                YOUR TABLE
              </span>
            </div>

            <h3 className="text-2xl font-black tracking-tight">
              TABLE {tableNumber}
            </h3>

            {tableName && (
              <p className="mt-0.5 text-xs font-semibold text-white/90">
                {tableName}
              </p>
            )}
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
        </div>
      </div>

      {/* QR Section */}
      <div className="relative px-6 pb-6">
        <div className="-mt-2 rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_15px_40px_-18px_rgba(15,23,42,0.35)] text-center">
          <p className="text-[9px] font-black uppercase tracking-[0.22em] text-theme-primary mb-1">
            DIGITAL MENU
          </p>

          {/* QR */}
          <div className="relative flex items-center justify-center rounded-2xl bg-slate-50 p-3 mb-3">
            <div className="relative rounded-2xl bg-white p-2.5 shadow-xs ring-1 ring-slate-100">
              {/* 4 Decorative Gold Corner Guide Brackets */}
              <span className="pointer-events-none absolute -top-0.5 -left-0.5 h-3.5 w-3.5 rounded-tl-sm border-t-2 border-l-2 border-[#C59D5F]" />
              <span className="pointer-events-none absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-tr-sm border-t-2 border-r-2 border-[#C59D5F]" />
              <span className="pointer-events-none absolute -bottom-0.5 -left-0.5 h-3.5 w-3.5 rounded-bl-sm border-b-2 border-l-2 border-[#C59D5F]" />
              <span className="pointer-events-none absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-br-sm border-b-2 border-r-2 border-[#C59D5F]" />

              <QRCodeCanvas
                ref={qrRef}
                value={qrValue}
                size={180}
                bgColor="#ffffff"
                fgColor="#0D3B36"
                level="H"
                includeMargin={true}
                imageSettings={{
                  src: logoUrl || '/logo.png',
                  height: Math.round(180 * 0.22),
                  width: Math.round(180 * 0.22),
                  excavate: true,
                }}
              />
            </div>
          </div>

          {/* Scan Message */}
          <div className="text-center space-y-1">
            <div className="mx-auto flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[#0F766E]">
              <ScanLine className="h-3.5 w-3.5" />
              <span className="text-[10px] font-bold tracking-wider uppercase">
                SCAN TO VIEW MENU
              </span>
            </div>

            <p className="text-[9px] font-bold text-slate-500 tracking-wider uppercase">
              SCAN WITH GOOGLE / CAMERA
            </p>

            <div className="flex items-center justify-center gap-1.5 pt-1">
              <span className="h-1 w-1 rotate-45 bg-[#C59D5F]" />
              <p className="text-[9px] font-black tracking-[0.16em] text-[#0F766E]">
                SCAN • BROWSE • ORDER
              </p>
              <span className="h-1 w-1 rotate-45 bg-[#C59D5F]" />
            </div>
          </div>
        </div>

        {/* Download */}
        <button
          onClick={downloadQR}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl btn-theme-primary px-4 py-3 text-xs font-bold text-white shadow-theme transition-all duration-200"
        >
          <Download className="h-4 w-4" />
          Download QR Code
        </button>
      </div>
    </div>
  );
}