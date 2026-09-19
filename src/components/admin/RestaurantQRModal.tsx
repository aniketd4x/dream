import { useRef, useState, useCallback, useEffect } from 'react';
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
  ExternalLink,
  MessageCircle,
  Sparkles,
  Store,
  QrCode as QrCodeIcon,
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
  generateRestaurantQRCardDataUrl,
  generateRawQRDataUrl,
  getSingleRestaurantQRPrintHtml,
  getRestaurantDirectMenuUrl,
} from '@/lib/qrCanvasGenerator';
import { triggerHaptic } from '@/lib/haptics';

interface RestaurantQRModalProps {
  restaurant: {
    id: string;
    name: string;
    slug?: string;
    logo_url?: string | null;
  };
  onClose: () => void;
}

export function RestaurantQRModal({
  restaurant,
  onClose,
}: RestaurantQRModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'info' } | null>(null);
  const [logoError, setLogoError] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printMode, setPrintMode] = useState<'standee' | 'pos80mm' | 'a4'>('standee');

  const restaurantName = restaurant?.name || 'Smart Restaurant';
  const logoUrl = restaurant?.logo_url;
  const hasLogo = Boolean(logoUrl && logoUrl.trim() && !logoError);
  const menuUrl = getRestaurantDirectMenuUrl(restaurant);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const showToast = (text: string, type: 'success' | 'info' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  /**
   * Captures the DOM card or generates high-res canvas card data URL.
   */
  const getCardPreviewDataUrl = useCallback(async (): Promise<string> => {
    if (cardRef.current) {
      try {
        await new Promise((r) => setTimeout(r, 120));
        return await toPng(cardRef.current, {
          cacheBust: true,
          pixelRatio: 3, // Ultra-crisp 300 DPI
          backgroundColor: '#FFFCF7',
          quality: 1,
        });
      } catch (domErr) {
        console.warn('toPng preview capture fallback to canvas generator:', domErr);
      }
    }
    return await generateRestaurantQRCardDataUrl({
      qrValue: menuUrl,
      restaurantName,
      logoUrl: hasLogo ? logoUrl : null,
    });
  }, [menuUrl, restaurantName, logoUrl, hasLogo]);

  /**
   * 1. High-Resolution Restaurant Standee PNG Download
   */
  const handleDownloadStandee = useCallback(async () => {
    triggerHaptic('medium');
    setDownloadLoading(true);

    try {
      const dataUrl = await getCardPreviewDataUrl();
      const fileName = `${restaurantName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-main-menu-qr.png`;
      await downloadImageFile(dataUrl, fileName);

      triggerHaptic('success');
      showToast(`Downloaded ${fileName}`);
    } catch (error) {
      console.error('Restaurant QR Standee download failed:', error);
      try {
        const rawDataUrl = await generateRawQRDataUrl(menuUrl, 1000, hasLogo ? logoUrl : null);
        await downloadImageFile(rawDataUrl, `${restaurantName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-raw-qr.png`);
        showToast('Downloaded raw QR code image');
      } catch (err) {
        showToast('Download failed. Please try copying link.', 'info');
      }
    } finally {
      setDownloadLoading(false);
    }
  }, [getCardPreviewDataUrl, restaurantName, menuUrl, hasLogo, logoUrl]);

  /**
   * 2. Raw High-Res QR Code Only Download
   */
  const handleDownloadRawQR = useCallback(async () => {
    triggerHaptic('medium');
    setDownloadLoading(true);

    try {
      const rawDataUrl = await generateRawQRDataUrl(menuUrl, 1200, hasLogo ? logoUrl : null);
      const fileName = `${restaurantName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-raw-qrcode.png`;
      await downloadImageFile(rawDataUrl, fileName);

      triggerHaptic('success');
      showToast(`Downloaded ${fileName}`);
    } catch (error) {
      console.error('Raw QR download failed:', error);
      showToast('Download failed. Please try again.', 'info');
    } finally {
      setDownloadLoading(false);
    }
  }, [menuUrl, restaurantName, hasLogo, logoUrl]);

  /**
   * 3. Print QR Card (Standee, 80mm POS, or A4)
   */
  const handlePrintQR = useCallback(async (mode: 'standee' | 'pos80mm' | 'a4' = printMode) => {
    triggerHaptic('medium');
    setPrintLoading(true);

    try {
      const [cardDataUrl, rawQrDataUrl] = await Promise.all([
        getCardPreviewDataUrl(),
        generateRawQRDataUrl(menuUrl, 600, hasLogo ? logoUrl : null),
      ]);

      const html = getSingleRestaurantQRPrintHtml(
        cardDataUrl,
        rawQrDataUrl,
        restaurantName,
        menuUrl,
        mode
      );

      printIframeHtml(html, `${restaurantName} - Digital Menu QR`);
      triggerHaptic('success');
      setShowPrintModal(false);
    } catch (error) {
      console.error('Print Restaurant QR failed:', error);
      showToast('Print failed. Please try downloading image.', 'info');
    } finally {
      setPrintLoading(false);
    }
  }, [getCardPreviewDataUrl, menuUrl, restaurantName, printMode]);

  /**
   * 4. Native / Web Image Share
   */
  const handleShareImage = useCallback(async () => {
    triggerHaptic('medium');
    setShareLoading(true);

    try {
      const dataUrl = await getCardPreviewDataUrl();
      const fileName = `${restaurantName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-menu-qr.png`;
      const shareText = `🍽️ ${restaurantName} - Official Digital Menu\nScan or browse directly here: ${menuUrl}`;

      await shareImageFile(dataUrl, fileName, `${restaurantName} Digital Menu QR`, shareText);
      triggerHaptic('success');
      setShowShareModal(false);
    } catch (error) {
      console.error('Share QR failed:', error);
      showToast('Sharing failed. Try copying link.', 'info');
    } finally {
      setShareLoading(false);
    }
  }, [getCardPreviewDataUrl, restaurantName, menuUrl]);

  /**
   * 5. WhatsApp Share
   */
  const handleWhatsAppShare = () => {
    triggerHaptic('selection');
    const msg = `🍽️ *${restaurantName}* - Official Digital Menu\n\n✨ Browse our full menu, dishes, and prices directly on your phone:\n🔗 ${menuUrl}\n\n_Scan or tap the link to view our menu & place orders!_`;
    openWhatsAppShare(msg);
    showToast('Opening WhatsApp…');
    setShowShareModal(false);
  };

  /**
   * 6. Copy Direct Menu Link
   */
  const handleCopyLink = async () => {
    triggerHaptic('success');
    const success = await copyTextToClipboard(menuUrl);
    if (success) {
      showToast('Restaurant menu link copied! 📋');
    } else {
      showToast('Failed to copy link', 'info');
    }
    setShowShareModal(false);
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 480;
  const qrSize = isMobile ? 180 : 220;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div
        className="
          relative
          w-full
          max-w-md
          rounded-[26px]
          sm:rounded-[32px]
          bg-[#F3F0E9]
          p-3.5
          sm:p-4.5
          shadow-[0_25px_80px_rgba(15,23,42,0.25)]
          my-auto
          max-h-[95vh]
          overflow-y-auto
        "
      >
        {/* CLOSE BUTTON */}
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
            pt-4.5
            sm:pt-5.5
            shadow-[0_15px_50px_rgba(15,23,42,0.08)]
          "
        >
          {/* Decorative background pattern */}
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

          {/* 1. RESTAURANT LOGO & NAME */}
          <div className="relative mt-2.5 sm:mt-3 flex flex-col items-center text-center">
            {hasLogo ? (
              <div
                className="
                  flex
                  h-[54px]
                  w-[54px]
                  sm:h-[66px]
                  sm:w-[66px]
                  items-center
                  justify-center
                  overflow-hidden
                  rounded-full
                  border-2
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
                  h-[52px]
                  w-[52px]
                  sm:h-[62px]
                  sm:w-[62px]
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
                <Store className="h-6 w-6 text-[#0F766E]" />
              </div>
            )}

            <h1
              className="
                text-[18px]
                sm:text-[22px]
                font-black
                tracking-tight
                text-[#171717]
                leading-tight
                max-w-[290px]
              "
            >
              {restaurantName}
            </h1>

            {/* OFFICIAL DIGITAL MENU Badge */}
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
                OFFICIAL DIGITAL MENU
              </span>
              <span className="h-px w-6 bg-[#C59D5F]/60" />
            </div>
          </div>

          {/* 2. STOREFRONT / DIRECT MENU BANNER */}
          <div
            className="
              relative
              mt-3.5
              sm:mt-4
              flex
              flex-col
              items-center
              justify-center
              bg-[#F7F4EC]
              border
              border-[#E8E2D5]
              rounded-2xl
              py-2.5
              px-3.5
              text-center
            "
          >
            <p
              className="
                text-[12px]
                sm:text-[13px]
                font-black
                text-[#0F766E]
                tracking-wide
              "
            >
              BROWSE DISHES & SPECIALS
            </p>
            <p
              className="
                text-[10px]
                sm:text-[10.5px]
                font-medium
                text-[#78716C]
                mt-0.5
              "
            >
              Scan with any phone • Dine-in, Takeaway & Counter
            </p>
          </div>

          {/* 3. QR CODE PANEL */}
          <div
            className="
              relative
              mt-3.5
              sm:mt-4
              overflow-hidden
              rounded-2xl
              sm:rounded-3xl
              border
              border-[#E7E2D8]
              bg-[#F5F3EE]
              p-3
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
                SCAN TO VIEW FULL MENU
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

            {/* QR Canvas with Luxury Gold Corner Brackets */}
            <div className="relative mx-auto mt-2 sm:mt-2.5 w-fit p-1.5">
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
                  value={menuUrl}
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

            {/* SCAN • BROWSE • ORDER with Gold Diamond Accents */}
            <div className="mt-2.5 flex items-center justify-center gap-2">
              <span className="h-1.5 w-1.5 rotate-45 bg-[#C59D5F]" />
              <p className="text-[9px] sm:text-[9.5px] font-black tracking-[0.2em] text-[#0F766E] uppercase">
                SCAN • BROWSE • ORDER
              </p>
              <span className="h-1.5 w-1.5 rotate-45 bg-[#C59D5F]" />
            </div>
          </div>

          {/* Direct Link Preview Bar */}
          <div className="mt-3 flex items-center justify-between gap-2 px-1 py-1 rounded-xl bg-slate-100/80 border border-slate-200/60">
            <span className="text-[11px] font-mono text-slate-600 truncate pl-2">
              {menuUrl.replace(/^https?:\/\//, '')}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleCopyLink}
                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition"
                title="Copy Direct Link"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <a
                href={menuUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-lg text-theme-primary hover:bg-white transition"
                title="Open Live Menu in New Tab"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* FEEDBACK TOAST */}
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
            ACTION BUTTONS: PRINT, DOWNLOAD, SHARE
        ======================================== */}
        <div className="mt-3.5 grid grid-cols-3 gap-2">
          {/* 1. PRINT BUTTON */}
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

          {/* 2. DOWNLOAD BUTTON */}
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

          {/* 3. SHARE BUTTON */}
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

        {/* QUICK DOWNLOAD OPTIONS */}
        <div className="mt-2 flex items-center justify-center gap-3 text-[10px] text-slate-500 font-medium">
          <button
            type="button"
            onClick={handleDownloadRawQR}
            className="hover:text-theme-primary transition underline decoration-dotted font-semibold"
          >
            Download Raw QR Only
          </button>
          <span>•</span>
          <span>Fixed Restaurant Barcode</span>
          <span>•</span>
          <span>300 DPI Ready</span>
        </div>

        {/* ========================================
            PRINT FORMAT MODAL
        ======================================== */}
        {showPrintModal && (
          <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-backdrop">
            <div className="bg-white rounded-t-[28px] sm:rounded-3xl shadow-2xl w-full max-w-sm p-5 animate-bottom-sheet sm:animate-none pb-safe sm:pb-5">
              <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-3 sm:hidden" />
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-theme-light flex items-center justify-center text-theme-primary">
                    <Printer className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Print Restaurant QR</h3>
                    <p className="text-[11px] text-slate-400 font-medium">Fixed Storefront & Digital Menu</p>
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

                {/* Option 1: Standee */}
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
                    <p className="text-xs font-bold">🪧 Counter Standee / Tent (4" x 6")</p>
                    <p className="text-[10px] text-slate-400">Perfect for cash counter, reception & entrance</p>
                  </div>
                  {printMode === 'standee' && <Sparkles className="w-4 h-4 text-theme-primary shrink-0" />}
                </button>

                {/* Option 2: A4 Poster */}
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
                    <p className="text-xs font-bold">📜 A4 Poster / Window Sign</p>
                    <p className="text-[10px] text-slate-400">Great for front glass, wall frames, flyers</p>
                  </div>
                  {printMode === 'a4' && <Sparkles className="w-4 h-4 text-theme-primary shrink-0" />}
                </button>

                {/* Option 3: 80mm POS Thermal */}
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
                    <p className="text-xs font-bold">🧾 80mm POS Thermal Receipt / Sticker</p>
                    <p className="text-[10px] text-slate-400">Print on thermal paper roll for bags, bills & boxes</p>
                  </div>
                  {printMode === 'pos80mm' && <Sparkles className="w-4 h-4 text-theme-primary shrink-0" />}
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handlePrintQR(printMode)}
                  disabled={printLoading}
                  className="flex-1 py-2.5 rounded-xl btn-theme-primary text-xs font-black text-white flex items-center justify-center gap-1.5 shadow-theme"
                >
                  {printLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
                  <span>Print Now</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================
            SHARE MODAL
        ======================================== */}
        {showShareModal && (
          <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-backdrop">
            <div className="bg-white rounded-t-[28px] sm:rounded-3xl shadow-2xl w-full max-w-sm p-5 animate-bottom-sheet sm:animate-none pb-safe sm:pb-5">
              <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-3 sm:hidden" />
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-theme-light flex items-center justify-center text-theme-primary">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Share Restaurant Menu</h3>
                    <p className="text-[11px] text-slate-400 font-medium">Send directly to customers</p>
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
                {/* 1. WhatsApp */}
                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/60 text-emerald-900 transition native-press font-bold text-xs"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="text-xs font-black">Share on WhatsApp</p>
                    <p className="text-[10px] text-emerald-700 font-normal">Send pre-formatted menu message</p>
                  </div>
                </button>

                {/* 2. Copy Link */}
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 transition native-press font-bold text-xs"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center shrink-0">
                    <Copy className="w-4 h-4" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="text-xs font-black">Copy Menu URL</p>
                    <p className="text-[10px] text-slate-500 font-normal">{menuUrl}</p>
                  </div>
                </button>

                {/* 3. Native Image Share */}
                <button
                  type="button"
                  onClick={handleShareImage}
                  disabled={shareLoading}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 transition native-press font-bold text-xs"
                >
                  <div className="w-8 h-8 rounded-lg bg-theme-primary text-white flex items-center justify-center shrink-0">
                    {shareLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                  </div>
                  <div className="text-left flex-1">
                    <p className="text-xs font-black">Share Standee Image</p>
                    <p className="text-[10px] text-slate-500 font-normal">AirDrop, Instagram, SMS, etc.</p>
                  </div>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="w-full py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
