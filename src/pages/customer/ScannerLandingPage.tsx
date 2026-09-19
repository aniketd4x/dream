import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getBaseUrl } from "@/lib/baseUrl";
import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import {
  Camera,
  CheckCircle2,
  Loader2,
  QrCode,
  ScanLine,
  ShieldCheck,
  Smartphone,
  UtensilsCrossed,
  X,
  ArrowRight,
  Sparkles,
  Clock,
  Menu,
  Search,
  ShoppingBag,
  Store,
} from "lucide-react";

type ScannerStatus = "idle" | "starting" | "scanning" | "success" | "error";

export function ScannerLandingPage() {
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerStatus, setScannerStatus] = useState<ScannerStatus>("idle");
  const [scannerError, setScannerError] = useState("");
  const [scanSuccess, setScanSuccess] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const readerRef = useRef<BrowserQRCodeReader | null>(null);
  const scanHandledRef = useRef(false);

  useEffect(() => {
    document.title = "DishGaze — Scan. Browse. Order.";
  }, []);

  const stopScanner = useCallback(() => {
    try {
      const controls = controlsRef.current;
      if (controls) {
        controls.stop();
        controlsRef.current = null;
      }
    } catch (error) {
      console.warn("Scanner stop warning:", error);
    }

    try {
      const video = videoRef.current;
      if (video) {
        const source = video.srcObject;
        if (source instanceof MediaStream) {
          source.getTracks().forEach((track) => {
            track.stop();
          });
        }
        video.srcObject = null;
      }
    } catch (error) {
      console.warn("Camera stream stop warning:", error);
    }

    readerRef.current = null;
  }, []);

  const closeScanner = useCallback(() => {
    stopScanner();
    scanHandledRef.current = false;
    setScannerOpen(false);
    setScannerStatus("idle");
    setScannerError("");
    setScanSuccess(false);
  }, [stopScanner]);

  const handleScanResult = useCallback(
    (rawValue: string) => {
      if (!rawValue || scanHandledRef.current) return;
      scanHandledRef.current = true;

      const scanned = rawValue.trim();
      setScanSuccess(true);
      setScannerStatus("success");
      stopScanner();

      window.setTimeout(() => {
        try {
          if (scanned.startsWith("https://") || scanned.startsWith("http://")) {
            const url = new URL(scanned);
            const match = url.pathname.match(/^\/menu\/([^/]+)\/?$/i);
            if (match?.[1]) {
              navigate(`/menu/${decodeURIComponent(match[1])}`);
              return;
            }
            const roomMatch = url.pathname.match(/^\/room\/([^/]+)\/?$/i);
            if (roomMatch?.[1]) {
              navigate(`/room/${decodeURIComponent(roomMatch[1])}`);
              return;
            }
            if (url.origin === window.location.origin || url.origin === getBaseUrl()) {
              window.location.href = url.href;
              return;
            }
            setScanSuccess(false);
            setScannerStatus("error");
            setScannerError("This QR code does not belong to DishGaze.");
            scanHandledRef.current = false;
            return;
          }

          const pathMatch = scanned.match(/^\/?menu\/([^/]+)\/?$/i);
          if (pathMatch?.[1]) {
            navigate(`/menu/${decodeURIComponent(pathMatch[1])}`);
            return;
          }

          const roomPathMatch = scanned.match(/^\/?room\/([^/]+)\/?$/i);
          if (roomPathMatch?.[1]) {
            navigate(`/room/${decodeURIComponent(roomPathMatch[1])}`);
            return;
          }

          const cleanToken = scanned.replace(/^\/+/, "").replace(/\/+$/, "").trim();
          if (cleanToken.toUpperCase().startsWith("RM-") || cleanToken.toUpperCase().startsWith("ROOM-")) {
            navigate(`/room/${cleanToken}`);
            return;
          }
          if (cleanToken.length >= 3 && cleanToken.length <= 200) {
            navigate(`/menu/${cleanToken}`);
            return;
          }

          throw new Error("Invalid DishGaze QR token.");
        } catch (error) {
          console.error("QR navigation error:", error);
          setScanSuccess(false);
          setScannerStatus("error");
          setScannerError("This QR code is not a valid DishGaze menu QR code.");
          scanHandledRef.current = false;
        }
      }, 500);
    },
    [navigate, stopScanner]
  );

  const startScanner = useCallback(async () => {
    const video = videoRef.current;
    if (!video) {
      setScannerStatus("error");
      setScannerError("Camera preview is not ready. Please try again.");
      return;
    }

    if (controlsRef.current) return;
    scanHandledRef.current = false;
    setScannerStatus("starting");
    setScannerError("");
    setScanSuccess(false);

    try {
      const isSecure =
        window.isSecureContext ||
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";

      if (!isSecure) {
        throw new Error("Camera requires HTTPS. Please open DishGaze using HTTPS.");
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API is not supported by this browser.");
      }

      let devices = await BrowserQRCodeReader.listVideoInputDevices();

      if (devices.length === 0) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        stream.getTracks().forEach((track) => {
          track.stop();
        });
        devices = await BrowserQRCodeReader.listVideoInputDevices();
      }

      const firstDevice = devices.at(0);
      if (!firstDevice) {
        throw new Error("No camera was found on this device.");
      }

      let selectedDeviceId = firstDevice.deviceId;
      const rearCamera = devices.find((device) => {
        const label = (device.label ?? "").toLowerCase();
        return label.includes("back") || label.includes("rear") || label.includes("environment");
      });
      if (rearCamera) {
        selectedDeviceId = rearCamera.deviceId;
      }

      const reader = new BrowserQRCodeReader();
      readerRef.current = reader;

      video.setAttribute("playsinline", "true");
      video.setAttribute("autoplay", "true");
      video.muted = true;

      const controls = await reader.decodeFromVideoDevice(
        selectedDeviceId,
        video,
        (result) => {
          if (!result) return;
          const text = result.getText();
          if (!text) return;
          handleScanResult(text);
        }
      );

      controlsRef.current = controls;
      setScannerStatus("scanning");

      try {
        await video.play();
      } catch (playError) {
        console.warn("Video autoplay warning:", playError);
      }
    } catch (error) {
      console.error("DishGaze scanner error:", error);
      stopScanner();
      setScannerStatus("error");

      if (error instanceof DOMException) {
        switch (error.name) {
          case "NotAllowedError":
            setScannerError("Camera permission was denied. Please allow camera access and try again.");
            break;
          case "NotFoundError":
            setScannerError("No camera was found on this device.");
            break;
          case "NotReadableError":
            setScannerError("Camera is already being used by another app or browser tab.");
            break;
          case "OverconstrainedError":
            setScannerError("The selected camera is unavailable. Please try again.");
            break;
          case "SecurityError":
            setScannerError("Camera access is blocked. Please use HTTPS.");
            break;
          default:
            setScannerError(`Camera error: ${error.name}`);
        }
      } else if (error instanceof Error) {
        setScannerError(error.message || "Unable to start QR scanner.");
      } else {
        setScannerError("Unable to start QR scanner. Please try again.");
      }
    }
  }, [handleScanResult, stopScanner]);

  const openScanner = () => {
    scanHandledRef.current = false;
    setScannerError("");
    setScanSuccess(false);
    setScannerStatus("idle");
    setScannerOpen(true);
  };

  useEffect(() => {
    if (!scannerOpen) return;
    const timer = window.setTimeout(() => {
      void startScanner();
    }, 350);
    return () => {
      window.clearTimeout(timer);
    };
  }, [scannerOpen, startScanner]);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  const openToken = () => {
    const value = token.trim();
    if (!value) return;
    navigate(`/menu/${encodeURIComponent(value)}`);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#F8F7F3] via-white to-[#F8F7F3] text-[#0F172A]">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-[#E7E2D8] bg-[#FFFCF7]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-8 md:py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#0F766E] to-[#0D665F] text-white shadow-lg shadow-[#0F766E]/20 transition-transform hover:scale-105">
              <UtensilsCrossed className="size-5" />
            </div>
            <div>
              <p className="text-lg font-black tracking-tight">
                Dish
                <span className="text-[#C59D5F]">Gaze</span>
              </p>
              <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-[#78716C]">
                Smart QR Dining
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/menu/TBL-M12WSF9O"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
            >
              <span className="size-1.5 animate-pulse rounded-full bg-emerald-600" />
              Demo Table T1
            </Link>
            <Link
              to="/admin"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800 hover:-translate-y-0.5"
            >
              <Store className="size-3.5 text-emerald-400" />
              Restaurant Admin
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -left-32 top-20 size-72 rounded-full bg-[#0F766E]/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-32 top-10 size-80 rounded-full bg-[#C59D5F]/10 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-4 py-10 sm:py-16 md:px-8">
          <div className="mx-auto max-w-3xl text-center">
            {/* MAIN CARD - SCANNER */}
            <div className="mx-auto max-w-md rounded-[32px] border border-[#E7E2D8] bg-[#FFFCF7] p-6 shadow-[0_25px_80px_rgba(15,23,42,0.10)] sm:p-7 md:p-8">
              {/* QR Icon */}
              <div className="relative mx-auto flex size-28 items-center justify-center rounded-[28px] bg-gradient-to-br from-[#0F766E] to-[#0D665F] shadow-[0_15px_40px_rgba(15,118,110,0.25)] transition-transform hover:scale-105">
                <div className="absolute inset-3 rounded-2xl border border-white/20" />
                <QrCode className="size-14 text-white" />
                <div className="absolute -right-2 -top-2 flex size-9 items-center justify-center rounded-full bg-[#C59D5F] text-white shadow-lg shadow-[#C59D5F]/30">
                  <ScanLine className="size-4" />
                </div>
              </div>

              <h2 className="mt-5 text-2xl font-extrabold">Scan Table QR Code</h2>
              <p className="mt-2 text-sm leading-5 text-[#78716C]">
                Point your camera at the QR code on your table to instantly view the menu and order.
              </p>

              {/* SCAN BUTTON */}
              <button
                type="button"
                onClick={openScanner}
                className="group mt-6 inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#0F766E] to-[#0D665F] px-5 py-3.5 text-sm font-bold text-white shadow-[0_12px_30px_rgba(15,118,110,0.25)] transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_40px_rgba(15,118,110,0.30)] active:translate-y-0"
              >
                <Camera className="size-5 transition-transform group-hover:scale-110" />
                Open QR Scanner
                <ArrowRight className="ml-auto size-4 transition-transform group-hover:translate-x-1" />
              </button>

              {/* DIVIDER */}
              <div className="my-5 flex items-center gap-4">
                <div className="h-px flex-1 bg-[#E7E2D8]" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#A8A29E]">
                  or enter code manually
                </span>
                <div className="h-px flex-1 bg-[#E7E2D8]" />
              </div>

              {/* MANUAL INPUT */}
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  openToken();
                }}
                className="flex gap-2"
              >
                <input
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  placeholder="e.g. TBL-M12WSF9O"
                  aria-label="Restaurant slug or QR token"
                  autoComplete="off"
                  className="min-w-0 flex-1 rounded-xl border border-[#E7E2D8] bg-[#F8F7F3] px-3.5 py-2.5 text-sm outline-none transition-all placeholder:text-[#A8A29E] focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/20 focus:bg-white"
                />
                <button
                  type="submit"
                  disabled={!token.trim()}
                  className="inline-flex items-center justify-center rounded-xl bg-[#0F172A] px-5 text-sm font-bold text-white transition-all hover:bg-[#0F766E] hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
                >
                  Open
                </button>
              </form>

              {/* QUICK DEMO SHORTCUT */}
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Want to test without a QR?</span>
                <Link
                  to="/menu/TBL-M12WSF9O"
                  className="font-bold text-[#0F766E] hover:underline"
                >
                  Open Demo Menu →
                </Link>
              </div>

              {/* SECURITY */}
              <div className="mt-4 flex items-center justify-center gap-2 text-[11px] font-medium text-[#78716C]">
                <ShieldCheck className="size-3.5 text-[#0F766E]" />
                Direct live restaurant menu
              </div>
            </div>
          </div>

          {/* HOW IT WORKS */}
          <div className="mt-16 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#D9C9A9] bg-[#FFFCF7] px-4 py-1.5 text-xs font-bold text-[#0F766E] shadow-sm">
              <Menu className="size-3.5" />
              HOW IT WORKS
            </div>
            <h2 className="mt-4 text-2xl font-black tracking-tight sm:text-3xl">
              From Table to Order in 3 Steps
            </h2>

            <div className="mt-8 grid gap-6 md:grid-cols-3">
              <div className="rounded-2xl border border-[#E7E2D8] bg-[#FFFCF7] p-6 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-[#0F766E]/10 text-[#0F766E]">
                  <ScanLine className="size-6" />
                </div>
                <h3 className="mt-4 font-extrabold text-base">1. Scan Table QR</h3>
                <p className="mt-1.5 text-xs leading-5 text-[#78716C]">
                  Scan the QR sticker on your dining table.
                </p>
              </div>

              <div className="rounded-2xl border border-[#E7E2D8] bg-[#FFFCF7] p-6 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-[#C59D5F]/10 text-[#C59D5F]">
                  <Search className="size-6" />
                </div>
                <h3 className="mt-4 font-extrabold text-base">2. Browse Live Menu</h3>
                <p className="mt-1.5 text-xs leading-5 text-[#78716C]">
                  Filter by Veg / Non-Veg, select variants, and add to cart.
                </p>
              </div>

              <div className="rounded-2xl border border-[#E7E2D8] bg-[#FFFCF7] p-6 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-[#0F766E]/10 text-[#0F766E]">
                  <ShoppingBag className="size-6" />
                </div>
                <h3 className="mt-4 font-extrabold text-base">3. Order & Track</h3>
                <p className="mt-1.5 text-xs leading-5 text-[#78716C]">
                  Place your order and follow real-time cooking status.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[#E7E2D8] bg-[#FFFCF7] py-6 text-center text-xs text-[#78716C]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 sm:flex-row">
          <p>© {new Date().getFullYear()} Dishgaze. Smart QR Menu & Restaurant Management.</p>
          <Link to="/admin" className="font-semibold text-slate-800 hover:text-emerald-700">
            Restaurant Admin Portal →
          </Link>
        </div>
      </footer>

      {/* SCANNER MODAL */}
      {scannerOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0F172A]/80 p-4 backdrop-blur-md">
          <div className="relative w-full max-w-md overflow-hidden rounded-[32px] bg-[#FFFCF7] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E7E2D8] px-5 py-4">
              <div>
                <p className="text-base font-extrabold">Scan Table QR</p>
                <p className="mt-0.5 text-[11px] text-[#78716C]">Point camera at the table QR code</p>
              </div>
              <button
                type="button"
                onClick={closeScanner}
                className="flex size-9 items-center justify-center rounded-full border border-[#E7E2D8] bg-white text-[#78716C] hover:bg-[#F5F3EE]"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="relative aspect-[4/5] overflow-hidden bg-[#0F172A]">
              <video
                ref={videoRef}
                className="h-full w-full object-cover"
                autoPlay
                muted
                playsInline
              />

              {/* SCAN FRAME */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="relative size-60">
                  <div className="absolute left-0 top-0 size-8 rounded-tl-xl border-l-4 border-t-4 border-[#C59D5F]" />
                  <div className="absolute right-0 top-0 size-8 rounded-tr-xl border-r-4 border-t-4 border-[#C59D5F]" />
                  <div className="absolute bottom-0 left-0 size-8 rounded-bl-xl border-b-4 border-l-4 border-[#C59D5F]" />
                  <div className="absolute bottom-0 right-0 size-8 rounded-br-xl border-b-4 border-r-4 border-[#C59D5F]" />
                </div>
              </div>

              {scannerStatus === "starting" && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#0F172A]/70 text-center text-white">
                  <div>
                    <Loader2 className="mx-auto size-8 animate-spin text-[#0F766E]" />
                    <p className="mt-2 text-sm font-bold">Starting camera...</p>
                  </div>
                </div>
              )}

              {scanSuccess && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#0F766E]/90 text-center text-white">
                  <div>
                    <CheckCircle2 className="mx-auto size-12" />
                    <p className="mt-2 text-lg font-bold">QR Detected!</p>
                  </div>
                </div>
              )}
            </div>

            {scannerStatus === "error" && scannerError && (
              <div className="bg-red-50 p-4 text-center text-xs text-red-700">
                <p>{scannerError}</p>
                <button
                  type="button"
                  onClick={closeScanner}
                  className="mt-2 text-xs font-bold underline"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
