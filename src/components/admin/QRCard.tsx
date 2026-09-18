import { useRef, useState, useCallback } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import {
  Download,
  Loader2,
  X,
  ScanLine,
  Utensils,
  Share2,
  CheckCircle,
  Printer,
  Copy,
  MessageCircle,
  FileImage,
  QrCode as QrCodeIcon,
  ChevronDown,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Bed,
} from 'lucide-react';
import { toPng } from 'html-to-image';
import {
  downloadImageFile,
  shareImageFile,
  copyTextToClipboard,
  openWhatsAppShare,
  printIframeHtml,
} from '@/lib/fileExport';
import {
  generateQRCardDataUrl,
  generateRawQRDataUrl,
  getSingleQRPrintHtml,
} from '@/lib/qrCanvasGenerator';
import { triggerHaptic } from '@/lib/haptics';

export interface QRCardProps {
  tableNumber: string;
  tableName?: string;
  qrValue: string;
  restaurantName?: string;
  logoUrl?: string | null;
  onClose?: () => void;
  // Hotel Room extensions
  isRoom?: boolean;
  roomType?: string;
  floorNumber?: number;
  onRegenerateToken?: () => void;
  previewUrl?: string;
}

export function QRCard({
  tableNumber,
  tableName,
  qrValue,
  restaurantName = 'Smart Restaurant',
  logoUrl,
  onClose,
  isRoom = false,
  roomType,
  floorNumber,
  onRegenerateToken,
  previewUrl,
}: QRCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'info' } | null>(null);
  const [logoError, setLogoError] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printMode, setPrintMode] = useState<'standee' | 'pos80mm' | 'a4'>('standee');

  const hasLogo = Boolean(logoUrl && logoUrl.trim() && !logoError);

  const showToast = (text: string, type: 'success' | 'info' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  /**
   * Captures the exact DOM card element from the on-screen preview.
   * Guarantees 100% fidelity with colors, badges, fonts, and borders.
   */
  const getCardPreviewDataUrl = useCallback(async (): Promise<string> => {
    if (cardRef.current) {
      try {
        await new Promise((r) => setTimeout(r, 120));
        return await toPng(cardRef.current, {
          cacheBust: true,
          pixelRatio: 3, // Ultra-crisp 300 DPI high resolution
          backgroundColor: '#FFFCF7',
          quality: 1,
        });
      } catch (domErr) {
        console.warn('toPng direct preview capture failed, falling back to canvas generator:', domErr);
      }
    }
    // Fallback to high-res canvas renderer
    return await generateQRCardDataUrl({
      tableNumber,
      tableName,
      qrValue,
      restaurantName,
      logoUrl: hasLogo ? logoUrl : null,
      isRoom,
    });
  }, [tableNumber, tableName, qrValue, restaurantName, logoUrl, hasLogo, isRoom]);

  /**
   * 1. High-Resolution Standee PNG Download (Exact Preview Match)
   */
  const handleDownloadStandee = useCallback(async () => {
    triggerHaptic('medium');
    setDownloadLoading(true);

    const typePrefix = isRoom ? 'room' : 'table';
    try {
      const dataUrl = await getCardPreviewDataUrl();
      const fileName = `${restaurantName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${typePrefix}-${tableNumber}-qr.png`;
      await downloadImageFile(dataUrl, fileName);

      triggerHaptic('success');
      showToast(`Downloaded ${fileName}`);
    } catch (error) {
      console.error('QR Standee download failed, falling back to raw QR:', error);
      try {
        const rawDataUrl = await generateRawQRDataUrl(qrValue, 800, hasLogo ? logoUrl : null);
        await downloadImageFile(rawDataUrl, `${typePrefix}-${tableNumber}-qr.png`);
        showToast(`Downloaded ${typePrefix}-${tableNumber}-qr.png`);
      } catch (err) {
        showToast('Download failed. Please try copying link.', 'info');
      }
    } finally {
      setDownloadLoading(false);
    }
  }, [getCardPreviewDataUrl, restaurantName, tableNumber, qrValue, hasLogo, logoUrl, isRoom]);

  /**
   * 2. Raw High-Res QR Code Only Download
   */
  const handleDownloadRawQR = useCallback(async () => {
    triggerHaptic('medium');
    setDownloadLoading(true);

    const typePrefix = isRoom ? 'room' : 'table';
    try {
      const rawDataUrl = await generateRawQRDataUrl(qrValue, 1000, hasLogo ? logoUrl : null);
      const fileName = `${typePrefix}-${tableNumber}-raw-qrcode.png`;
      await downloadImageFile(rawDataUrl, fileName);

      triggerHaptic('success');
      showToast(`Downloaded ${fileName}`);
    } catch (error) {
      console.error('Raw QR download failed:', error);
      showToast('Download failed. Please try again.', 'info');
    } finally {
      setDownloadLoading(false);
    }
  }, [tableNumber, qrValue, hasLogo, logoUrl, isRoom]);

  /**
   * 3. Print QR Card Trigger (Standee, 80mm POS Thermal, or A4)
   */
  const handlePrintQR = useCallback(async (mode: 'standee' | 'pos80mm' | 'a4' = printMode) => {
    triggerHaptic('medium');
    setPrintLoading(true);

    try {
      const [cardDataUrl, rawQrDataUrl] = await Promise.all([
        getCardPreviewDataUrl(),
        generateRawQRDataUrl(qrValue, 600, hasLogo ? logoUrl : null),
      ]);

      const html = getSingleQRPrintHtml(
        cardDataUrl,
        rawQrDataUrl,
        tableNumber,
        tableName,
        restaurantName,
        mode
      );

      printIframeHtml(html, `${isRoom ? 'Room' : 'Table'} ${tableNumber} QR - ${restaurantName}`);
      triggerHaptic('success');
      setShowPrintModal(false);
    } catch (error) {
      console.error('Print QR failed:', error);
      showToast('Print failed. Please try downloading image.', 'info');
    } finally {
      setPrintLoading(false);
    }
  }, [getCardPreviewDataUrl, qrValue, tableNumber, tableName, restaurantName, printMode, hasLogo, logoUrl, isRoom]);

  /**
   * 4. Native / Web Image Share (Exact Preview Match)
   */
  const handleShareImage = useCallback(async () => {
    triggerHaptic('medium');
    setShareLoading(true);

    const typePrefix = isRoom ? 'room' : 'table';
    try {
      const dataUrl = await getCardPreviewDataUrl();
      const fileName = `${restaurantName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${typePrefix}-${tableNumber}.png`;
      const shareText = isRoom
        ? `🏨 ${restaurantName} - Room Service & In-Room Dining for Room ${tableNumber}\nScan or open link: ${qrValue}`
        : `🍽️ ${restaurantName} - Digital Menu for Table ${tableNumber}\nScan or open link: ${qrValue}`;

      await shareImageFile(dataUrl, fileName, `${isRoom ? 'Room' : 'Table'} ${tableNumber} QR - ${restaurantName}`, shareText);
      triggerHaptic('success');
      setShowShareModal(false);
    } catch (error) {
      console.error('Share QR failed:', error);
      showToast('Sharing failed. Try copying link.', 'info');
    } finally {
      setShareLoading(false);
    }
  }, [getCardPreviewDataUrl, tableNumber, restaurantName, qrValue, isRoom]);

  /**
   * 5. 1-Tap WhatsApp Share
   */
  const handleWhatsAppShare = () => {
    triggerHaptic('selection');
    const msg = isRoom
      ? `🏨 *${restaurantName}*\n\nHere is the Room Service & In-Room Dining QR for *Room ${tableNumber}${roomType ? ` (${roomType})` : ''}*:\n🔗 ${qrValue}\n\n_Scan or tap to request room services, order food & view live bill!_`
      : `🍽️ *${restaurantName}*\n\nHere is the digital menu for *Table ${tableNumber}${tableName ? ` (${tableName})` : ''}*:\n🔗 ${qrValue}\n\n_Scan or tap to browse menu & place your order!_`;
    openWhatsAppShare(msg);
    showToast('Opening WhatsApp…');
    setShowShareModal(false);
  };

  /**
   * 6. Copy Menu Link
   */
  const handleCopyLink = async () => {
    triggerHaptic('success');
    const success = await copyTextToClipboard(qrValue);
    if (success) {
      showToast(isRoom ? 'Room portal URL copied to clipboard! 📋' : 'Menu URL copied to clipboard! 📋');
    } else {
      showToast('Failed to copy link', 'info');
    }
    setShowShareModal(false);
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 480;
  const qrSize = isMobile ? 185 : 220;

  return (
    <div
      className="
        relative
        w-full
        max-w-xs
        sm:max-w-md
        rounded-[24px]
        sm:rounded-[30px]
        bg-[#F3F0E9]
        p-3
        sm:p-4
        shadow-[0_25px_80px_rgba(15,23,42,0.16)]
      "
    >
      {/* ========================================
          CLOSE BUTTON
      ======================================== */}
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Close"
          className="
            absolute
            right-4
            top-4
            sm:right-6
            sm:top-6
            z-50
            flex
            h-8
            w-8
            sm:h-9
            sm:w-9
            items-center
            justify-center
            rounded-full
            border
            border-[#E7E2D8]
            bg-white
            text-[#78716C]
            shadow-sm
            transition-all
            hover:bg-[#F5F3EE]
            hover:text-[#0F172A]
            hover:shadow-md
            native-press
          "
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {/* ========================================
          MAIN PRINTABLE CARD DISPLAY
      ======================================== */}
      <div
        ref={cardRef}
        className="
          relative
          mx-auto
          w-full
          max-w-[420px]
          overflow-hidden
          rounded-[20px]
          sm:rounded-[26px]
          border
          border-[#E7E2D8]
          bg-[#FFFCF7]
          px-4
          sm:px-6
          pb-5
          sm:pb-6
          pt-5
          sm:pt-6
          shadow-[0_15px_50px_rgba(15,23,42,0.08)]
        "
      >
        {/* Subtle decorative background pattern */}
        <div
          className="
            pointer-events-none
            absolute
            inset-0
            opacity-[0.03]
            bg-[radial-gradient(#0F766E_1px,transparent_1px)]
            [background-size:16px_16px]
          "
        />

        {/* Top Accent Bar */}
        <div className="relative flex justify-center mb-1">
          <div className="h-[3.5px] w-14 rounded-full bg-[#0F766E]" />
        </div>

        {/* ======================================
            1. RESTAURANT / HOTEL NAME & BADGE
        ====================================== */}
        <div className="relative mt-3 sm:mt-4 flex flex-col items-center text-center">
          {/* Logo or Icon */}
          {hasLogo ? (
            <div
              className="
                flex
                h-[52px]
                w-[52px]
                sm:h-[64px]
                sm:w-[64px]
                items-center
                justify-center
                overflow-hidden
                rounded-full
                border
                border-[#D9C9A9]
                bg-white
                shadow-[0_6px_20px_rgba(15,118,110,0.12)]
                mb-2
              "
            >
              <img
                src={logoUrl!}
                alt={`${restaurantName} logo`}
                className="h-full w-full object-contain p-1.5"
                crossOrigin="anonymous"
                onError={() => setLogoError(true)}
              />
            </div>
          ) : (
            <div
              className="
                flex
                h-[50px]
                w-[50px]
                sm:h-[60px]
                sm:w-[60px]
                items-center
                justify-center
                rounded-full
                border
                border-[#E7E2D8]
                bg-[#F5F3EE]
                shadow-[0_6px_20px_rgba(15,23,42,0.06)]
                mb-2
              "
            >
              {isRoom ? (
                <Bed className="h-6 w-6 text-[#0F766E]" />
              ) : (
                <Utensils className="h-6 w-6 text-[#0F766E]" />
              )}
            </div>
          )}

          {/* Name */}
          <h1
            className="
              text-[18px]
              sm:text-[21px]
              font-black
              tracking-tight
              text-[#171717]
              leading-tight
              max-w-[290px]
            "
          >
            {restaurantName}
          </h1>

          {/* Pill Badge */}
          <div className="mt-1.5 flex items-center justify-center gap-2">
            <span className="h-px w-6 bg-[#C59D5F]/60" />
            <span
              className="
                text-[10px]
                sm:text-[11px]
                font-black
                tracking-[0.24em]
                text-[#0F766E]
                uppercase
              "
            >
              {isRoom ? 'ROOM SERVICE & DINING' : 'DIGITAL MENU'}
            </span>
            <span className="h-px w-6 bg-[#C59D5F]/60" />
          </div>
        </div>

        {/* ======================================
            2. YOUR TABLE / YOUR ROOM SECTION
        ====================================== */}
        <div
          className="
            relative
            mt-4
            sm:mt-5
            flex
            items-center
            justify-between
            bg-[#F7F4EC]
            border
            border-[#E8E2D5]
            rounded-2xl
            p-3
            sm:p-3.5
          "
        >
          <div>
            <p
              className="
                text-[9px]
                font-bold
                uppercase
                tracking-[0.2em]
                text-[#8C827A]
              "
            >
              {isRoom ? 'YOUR ROOM' : 'YOUR TABLE'}
            </p>

            <h2
              className="
                text-[19px]
                sm:text-[22px]
                font-black
                leading-none
                tracking-tight
                text-[#171717]
                mt-0.5
              "
            >
              {isRoom ? `ROOM ${tableNumber}` : `TABLE ${tableNumber}`}
            </h2>

            {isRoom ? (
              <p
                className="
                  mt-0.5
                  text-[11px]
                  sm:text-[12px]
                  font-semibold
                  text-[#0F766E]
                "
              >
                {roomType || tableName || 'Hotel Room'}{floorNumber ? ` • Floor ${floorNumber}` : ''}
              </p>
            ) : tableName ? (
              <p
                className="
                  mt-0.5
                  text-[11px]
                  sm:text-[12px]
                  font-semibold
                  text-[#0F766E]
                "
              >
                {tableName}
              </p>
            ) : null}
          </div>

          {/* Number Pill */}
          <div
            className="
              flex
              h-10
              w-10
              sm:h-12
              sm:w-12
              items-center
              justify-center
              rounded-xl
              sm:rounded-2xl
              bg-[#0D3B36]
              border-2
              border-[#C59D5F]
              shadow-[0_6px_18px_rgba(13,59,54,0.3)]
            "
          >
            <span className="text-[14px] sm:text-[16px] font-black text-white">
              {tableNumber}
            </span>
          </div>
        </div>

        {/* ======================================
            3. QR CODE PANEL & INSTRUCTIONS
        ====================================== */}
        <div
          className="
            relative
            mt-4
            sm:mt-4.5
            overflow-hidden
            rounded-2xl
            sm:rounded-3xl
            border
            border-[#E7E2D8]
            bg-[#F5F3EE]
            p-3.5
            sm:p-4
            shadow-[0_8px_25px_rgba(15,23,42,0.04)]
            text-center
          "
        >
          <div className="flex items-center justify-center gap-1.5 text-[#0F172A]">
            <ScanLine className="h-3.5 w-3.5 text-[#0F766E]" />
            <h3
              className="
                text-[10px]
                sm:text-[11px]
                font-black
                tracking-[0.16em]
                uppercase
              "
            >
              {isRoom ? 'SCAN FOR ROOM SERVICE & FOOD' : 'SCAN TO VIEW MENU'}
            </h3>
          </div>

          <p
            className="
              mt-0.5
              text-[9px]
              sm:text-[9.5px]
              font-bold
              tracking-[0.12em]
              text-[#78716C]
              uppercase
            "
          >
            SCAN WITH GOOGLE / CAMERA
          </p>

          {/* QR Canvas Box with Luxury Gold Corner Brackets */}
          <div className="relative mx-auto mt-2.5 sm:mt-3 w-fit p-1.5">
            {/* 4 Decorative Gold Corner Guide Brackets */}
            <span className="pointer-events-none absolute -top-0.5 -left-0.5 h-4 w-4 rounded-tl-md border-t-2 border-l-2 border-[#C59D5F]" />
            <span className="pointer-events-none absolute -top-0.5 -right-0.5 h-4 w-4 rounded-tr-md border-t-2 border-r-2 border-[#C59D5F]" />
            <span className="pointer-events-none absolute -bottom-0.5 -left-0.5 h-4 w-4 rounded-bl-md border-b-2 border-l-2 border-[#C59D5F]" />
            <span className="pointer-events-none absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-br-md border-b-2 border-r-2 border-[#C59D5F]" />

            <div
              className="
                rounded-[18px]
                sm:rounded-[22px]
                border
                border-[#E0D9CB]
                bg-white
                p-2.5
                sm:p-3
                shadow-[0_8px_24px_rgba(15,23,42,0.07)]
              "
            >
              <QRCodeCanvas
                value={qrValue}
                size={qrSize}
                bgColor="#ffffff"
                fgColor="#0D3B36"
                level="H"
                includeMargin
                imageSettings={{
                  src: hasLogo ? logoUrl! : '/logo.png',
                  height: Math.round(qrSize * 0.22),
                  width: Math.round(qrSize * 0.22),
                  excavate: true,
                }}
                style={{
                  display: 'block',
                  maxWidth: '100%',
                  height: 'auto',
                }}
              />
            </div>
          </div>

          {/* Tagline with Gold Diamond Accents */}
          <div className="mt-2.5 flex items-center justify-center gap-2">
            <span className="h-1.5 w-1.5 rotate-45 bg-[#C59D5F]" />
            <p className="text-[9px] sm:text-[9.5px] font-black tracking-[0.2em] text-[#0F766E] uppercase">
              {isRoom ? 'SCAN • SERVICES • DINING' : 'SCAN • BROWSE • ORDER'}
            </p>
            <span className="h-1.5 w-1.5 rotate-45 bg-[#C59D5F]" />
          </div>
        </div>
      </div>

      {/* ========================================
          FEEDBACK TOAST
      ======================================== */}
      {feedbackMsg && (
        <div
          className={`mt-2.5 flex items-center justify-center gap-1.5 text-xs font-bold py-2 px-3 rounded-xl border animate-fadeIn ${
            feedbackMsg.type === 'success'
              ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
              : 'text-blue-700 bg-blue-50 border-blue-200'
          }`}
        >
          <CheckCircle className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{feedbackMsg.text}</span>
        </div>
      )}

      {/* ========================================
          ACTION BUTTONS BAR: PRINT, DOWNLOAD, SHARE
      ======================================== */}
      <div className="mt-3.5 grid grid-cols-3 gap-2">
        {/* 1. PRINT QR BUTTON */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setShowPrintModal(true);
          }}
          disabled={printLoading || downloadLoading || shareLoading}
          className="
            flex
            flex-col
            sm:flex-row
            items-center
            justify-center
            gap-1
            sm:gap-2
            rounded-2xl
            btn-theme-primary
            py-2.5
            px-2
            sm:px-3
            text-xs
            font-black
            text-white
            shadow-theme
            transition-all
            duration-200
            hover:-translate-y-0.5
            active:translate-y-0
            disabled:opacity-60
            native-press
          "
        >
          {printLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Printer className="h-4 w-4 shrink-0" />
          )}
          <span>Print</span>
        </button>

        {/* 2. DOWNLOAD QR BUTTON */}
        <button
          type="button"
          onClick={handleDownloadStandee}
          disabled={printLoading || downloadLoading || shareLoading}
          className="
            flex
            flex-col
            sm:flex-row
            items-center
            justify-center
            gap-1
            sm:gap-2
            rounded-2xl
            bg-[#0F172A]
            py-2.5
            px-2
            sm:px-3
            text-xs
            font-black
            text-white
            shadow-md
            transition-all
            duration-200
            hover:-translate-y-0.5
            hover:bg-[#0F766E]
            active:translate-y-0
            disabled:opacity-60
            native-press
          "
        >
          {downloadLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4 shrink-0" />
          )}
          <span>Download</span>
        </button>

        {/* 3. SHARE QR BUTTON */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setShowShareModal(true);
          }}
          disabled={printLoading || downloadLoading || shareLoading}
          className="
            flex
            flex-col
            sm:flex-row
            items-center
            justify-center
            gap-1
            sm:gap-2
            rounded-2xl
            bg-white
            border
            border-slate-300
            py-2.5
            px-2
            sm:px-3
            text-xs
            font-black
            text-slate-800
            shadow-sm
            transition-all
            duration-200
            hover:bg-slate-100
            active:translate-y-0
            disabled:opacity-60
            native-press
          "
        >
          {shareLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Share2 className="h-4 w-4 text-theme-primary shrink-0" />
          )}
          <span>Share</span>
        </button>
      </div>

      {/* QUICK DOWNLOAD OPTIONS LINK */}
      <div className="mt-2 flex items-center justify-center gap-3 text-[10px] text-slate-500 font-medium">
        <button
          type="button"
          onClick={handleDownloadRawQR}
          className="hover:text-theme-primary transition underline decoration-dotted font-semibold"
        >
          Download Raw QR Only
        </button>
        <span>•</span>
        <span>300 DPI Print Ready</span>
      </div>

      {/* ========================================
          OPTIONAL REGENERATE & PREVIEW BAR
      ======================================== */}
      {(onRegenerateToken || previewUrl) && (
        <div className="mt-3 pt-2.5 border-t border-[#E7E2D8] flex items-center justify-between text-xs px-1">
          {onRegenerateToken && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic('medium');
                onRegenerateToken();
              }}
              className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900 font-bold transition native-press text-[11px]"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
              <span>Regenerate QR</span>
            </button>
          )}

          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-[#0F766E] hover:underline font-bold transition text-[11px] ml-auto"
            >
              <span>Preview Guest View</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      )}

      {/* ========================================
          PRINT FORMAT MODAL / POPOVER
      ======================================== */}
      {showPrintModal && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-backdrop">
          <div className="bg-white rounded-t-[28px] sm:rounded-3xl shadow-2xl w-full max-w-sm p-5 animate-bottom-sheet sm:animate-none pb-safe sm:pb-5">
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-3 sm:hidden" />
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-theme-light flex items-center justify-center text-theme-primary">
                  <Printer className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">{isRoom ? 'Print Room QR' : 'Print Table QR'}</h3>
                  <p className="text-[11px] text-slate-400 font-medium">{isRoom ? `Room ${tableNumber}` : `Table ${tableNumber}`}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 mb-4">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Select Print Layout
              </label>

              {/* Format Option 1: Standee */}
              <button
                type="button"
                onClick={() => setPrintMode('standee')}
                className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition native-press ${
                  printMode === 'standee'
                    ? 'border-theme-primary bg-theme-light/40 text-theme-dark font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div>
                  <p className="text-xs font-bold">{isRoom ? '🪧 Room Standee / Tent (4" x 6")' : '🪧 Table Standee / Tent (4" x 6")'}</p>
                  <p className="text-[10px] text-slate-400">{isRoom ? 'Fits standard nightstand card holders' : 'Fits standard acrylic table card holders'}</p>
                </div>
                {printMode === 'standee' && <Sparkles className="w-4 h-4 text-theme-primary shrink-0" />}
              </button>

              {/* Format Option 2: 80mm POS Thermal */}
              <button
                type="button"
                onClick={() => setPrintMode('pos80mm')}
                className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition native-press ${
                  printMode === 'pos80mm'
                    ? 'border-theme-primary bg-theme-light/40 text-theme-dark font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div>
                  <p className="text-xs font-bold">🖨️ 80mm POS Thermal Slip</p>
                  <p className="text-[10px] text-slate-400">Print directly on receipt paper / stickers</p>
                </div>
                {printMode === 'pos80mm' && <Sparkles className="w-4 h-4 text-theme-primary shrink-0" />}
              </button>

              {/* Format Option 3: A4 Full Page */}
              <button
                type="button"
                onClick={() => setPrintMode('a4')}
                className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition native-press ${
                  printMode === 'a4'
                    ? 'border-theme-primary bg-theme-light/40 text-theme-dark font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div>
                  <p className="text-xs font-bold">📄 A4 Page with Cut Border</p>
                  <p className="text-[10px] text-slate-400">Large print ready to cut and laminate</p>
                </div>
                {printMode === 'a4' && <Sparkles className="w-4 h-4 text-theme-primary shrink-0" />}
              </button>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handlePrintQR(printMode)}
                disabled={printLoading}
                className="flex-1 py-2.5 rounded-xl btn-theme-primary text-xs font-black text-white shadow-theme flex items-center justify-center gap-1.5"
              >
                {printLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
                <span>Print Now</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================
          SHARE OPTIONS MODAL / POPOVER
      ======================================== */}
      {showShareModal && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-backdrop">
          <div className="bg-white rounded-t-[28px] sm:rounded-3xl shadow-2xl w-full max-w-sm p-5 animate-bottom-sheet sm:animate-none pb-safe sm:pb-5">
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-3 sm:hidden" />
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-theme-light flex items-center justify-center text-theme-primary">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">{isRoom ? 'Share Room QR & Portal' : 'Share QR & Menu'}</h3>
                  <p className="text-[11px] text-slate-400 font-medium">{isRoom ? `Room ${tableNumber}` : `Table ${tableNumber}`}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 mb-4">
              {/* Option 1: WhatsApp Direct Share */}
              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 text-emerald-950 transition native-press text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-black">Share on WhatsApp</p>
                  <p className="text-[10px] text-emerald-800">{isRoom ? 'Send room service portal link & room details' : 'Send preformatted menu link & table info'}</p>
                </div>
              </button>

              {/* Option 2: Native Share Sheet (Image File) */}
              <button
                type="button"
                onClick={handleShareImage}
                disabled={shareLoading}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 transition native-press text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-[#0F172A] text-white flex items-center justify-center shrink-0 shadow-xs">
                  {shareLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileImage className="w-5 h-5" />}
                </div>
                <div>
                  <p className="text-xs font-black">Share QR Card Image</p>
                  <p className="text-[10px] text-slate-500">Send high-res PNG file to any app / printer</p>
                </div>
              </button>

              {/* Option 3: Copy Link */}
              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 transition native-press text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-theme-light text-theme-primary flex items-center justify-center shrink-0">
                  <Copy className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black">{isRoom ? 'Copy Room Portal Link' : 'Copy Digital Menu Link'}</p>
                  <p className="text-[10px] text-slate-400 truncate">{qrValue}</p>
                </div>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowShareModal(false)}
              className="w-full py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}