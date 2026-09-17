import { useState, useRef, useEffect, useCallback, type MouseEvent, type TouchEvent } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Upload,
  Check,
  Loader2,
  Trash2,
  Image as ImageIcon,
  Move,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { triggerHaptic } from '@/lib/haptics';

interface ImageAdjustModalProps {
  isOpen: boolean;
  initialImageUrl?: string | null;
  restaurantId?: string;
  onSave: (finalImageUrl: string) => void;
  onRemove?: () => void;
  onClose: () => void;
  aspectRatio?: number; // width / height (default 1.6 -> 16:10)
}

export default function ImageAdjustModal({
  isOpen,
  initialImageUrl,
  restaurantId,
  onSave,
  onRemove,
  onClose,
  aspectRatio = 1.6,
}: ImageAdjustModalProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize or reset when modal opens or initialImageUrl changes
  useEffect(() => {
    if (isOpen) {
      if (initialImageUrl) {
        setImageSrc(initialImageUrl);
        setZoom(1);
        setPan({ x: 0, y: 0 });
      } else {
        setImageSrc(null);
        setZoom(1);
        setPan({ x: 0, y: 0 });
      }
      setError(null);
      setImageLoaded(false);
    }
  }, [isOpen, initialImageUrl]);

  // Load image element when imageSrc updates
  useEffect(() => {
    if (!imageSrc) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;
      setImageLoaded(true);
    };
    img.onerror = () => {
      // Fallback: try loading without crossOrigin if CORS issues
      const fallbackImg = new Image();
      fallbackImg.onload = () => {
        imgRef.current = fallbackImg;
        setImageLoaded(true);
      };
      fallbackImg.onerror = () => {
        setError('Failed to load image. Please select a valid file.');
      };
      fallbackImg.src = imageSrc;
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // File Upload Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    triggerHaptic('selection');
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageSrc(reader.result);
        setZoom(1);
        setPan({ x: 0, y: 0 });
        setError(null);
        setImageLoaded(false);
      }
    };
    reader.readAsDataURL(file);
    // Reset file input value so same file can be reselected
    e.target.value = '';
  };

  // Mouse Pan Handlers
  const handleMouseDown = (e: MouseEvent) => {
    if (!imageLoaded) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch Pan Handlers
  const handleTouchStart = (e: TouchEvent) => {
    if (!imageLoaded || e.touches.length === 0) return;
    setIsDragging(true);
    const touch = e.touches[0];
    setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging || e.touches.length === 0) return;
    const touch = e.touches[0];
    setPan({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Reset Adjustments
  const handleReset = () => {
    triggerHaptic('light');
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Zoom Steppers
  const handleZoomIn = () => {
    triggerHaptic('light');
    setZoom((prev) => Math.min(3, +(prev + 0.15).toFixed(2)));
  };

  const handleZoomOut = () => {
    triggerHaptic('light');
    setZoom((prev) => Math.max(1, +(prev - 0.15).toFixed(2)));
  };

  // Export cropped & compressed canvas image
  const generateCroppedImage = useCallback(async (): Promise<string> => {
    if (!imgRef.current || !containerRef.current) {
      throw new Error('Image not loaded');
    }

    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // High resolution output canvas (e.g. 800px wide)
    const targetWidth = 800;
    const targetHeight = Math.round(targetWidth / aspectRatio);

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context unavailable');

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Calculate scaling ratio between container display and output canvas
    const scaleRatio = targetWidth / containerWidth;

    // Fill background (neutral white/transparent)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetWidth, targetHeight);

    const img = imgRef.current;
    const naturalWidth = img.naturalWidth || img.width;
    const naturalHeight = img.naturalHeight || img.height;

    // Calculate dimensions of image as rendered in container
    const imgAspect = naturalWidth / naturalHeight;
    const containerAspect = containerWidth / containerHeight;

    let baseRenderW: number;
    let baseRenderH: number;

    if (imgAspect > containerAspect) {
      // Image is wider than container: fit height
      baseRenderH = containerHeight;
      baseRenderW = containerHeight * imgAspect;
    } else {
      // Image is taller than container: fit width
      baseRenderW = containerWidth;
      baseRenderH = containerWidth / imgAspect;
    }

    const currentRenderW = baseRenderW * zoom;
    const currentRenderH = baseRenderH * zoom;

    // Center offset + user pan in container space
    const centerOffsetX = (containerWidth - currentRenderW) / 2 + pan.x;
    const centerOffsetY = (containerHeight - currentRenderH) / 2 + pan.y;

    // Draw on target canvas
    ctx.drawImage(
      img,
      centerOffsetX * scaleRatio,
      centerOffsetY * scaleRatio,
      currentRenderW * scaleRatio,
      currentRenderH * scaleRatio
    );

    // Convert canvas to optimized JPEG Blob/DataURL (0.85 quality)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    return dataUrl;
  }, [aspectRatio, pan.x, pan.y, zoom]);

  // Handle Save Image to Supabase Storage + fallback
  const handleSave = async () => {
    if (!imageSrc) {
      setError('Please select or upload an image first.');
      return;
    }

    setSaving(true);
    setError(null);
    triggerHaptic('medium');

    try {
      const croppedDataUrl = await generateCroppedImage();

      // Convert Data URL to Blob for Supabase Storage
      const byteString = atob(croppedDataUrl.split(',')[1]);
      const mimeString = croppedDataUrl.split(',')[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mimeString });

      const fileName = `menu-items/${restaurantId || 'general'}-${Date.now()}.jpg`;

      // Try uploading to Supabase Storage bucket 'restaurant-assets'
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('restaurant-assets')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (!uploadErr && uploadData?.path) {
        const { data: publicUrlData } = supabase.storage
          .from('restaurant-assets')
          .getPublicUrl(uploadData.path);

        if (publicUrlData?.publicUrl) {
          triggerHaptic('success');
          onSave(publicUrlData.publicUrl);
          onClose();
          return;
        }
      }

      // If bucket upload returned error, use compressed DataURL directly
      triggerHaptic('success');
      onSave(croppedDataUrl);
      onClose();
    } catch (err) {
      console.warn('Error during image save, using fallback:', err);
      try {
        const fallbackUrl = await generateCroppedImage();
        onSave(fallbackUrl);
        onClose();
      } catch (fallbackErr) {
        setError('Failed to process image. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-xs animate-backdrop">
      <div
        className="bg-white rounded-t-[28px] sm:rounded-2xl shadow-2xl w-full max-w-lg max-h-[95vh] flex flex-col overflow-hidden animate-bottom-sheet sm:animate-none pb-safe sm:pb-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile handle indicator */}
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-3 mb-1 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-theme-light rounded-lg text-theme-primary">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-none">
                Adjust Menu Item Photo
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Drag to reposition • Use slider to zoom
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3">
              {error}
            </div>
          )}

          {/* Interactive Viewport Area */}
          <div className="flex flex-col items-center">
            {imageSrc ? (
              <div
                ref={containerRef}
                style={{ aspectRatio: `${aspectRatio}` }}
                className="relative w-full max-w-md bg-slate-950 rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing border-2 border-slate-300 select-none touch-none shadow-inner"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {/* Image element inside viewport */}
                <img
                  src={imageSrc}
                  alt="Crop preview"
                  draggable={false}
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: 'center center',
                    transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                  }}
                  className="w-full h-full object-cover pointer-events-none select-none"
                />

                {/* Subtle Grid overlay for alignment assistance */}
                <div className="absolute inset-0 pointer-events-none border border-white/20 grid grid-cols-3 grid-rows-3 opacity-30">
                  <div className="border-r border-b border-white/20" />
                  <div className="border-r border-b border-white/20" />
                  <div className="border-b border-white/20" />
                  <div className="border-r border-b border-white/20" />
                  <div className="border-r border-b border-white/20" />
                  <div className="border-b border-white/20" />
                  <div className="border-r border-white/20" />
                  <div className="border-r border-white/20" />
                  <div />
                </div>

                {/* Pan indicator badge */}
                <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md text-white px-2 py-0.5 rounded-md text-[10px] font-semibold flex items-center gap-1 pointer-events-none">
                  <Move className="w-2.5 h-2.5" />
                  <span>Pan to position</span>
                </div>

                {/* Aspect Ratio Badge */}
                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-white px-2 py-0.5 rounded-md text-[10px] font-semibold pointer-events-none">
                  Card Fit (16:10)
                </div>
              </div>
            ) : (
              /* No Image Empty Upload State */
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{ aspectRatio: `${aspectRatio}` }}
                className="w-full max-w-md bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:bg-slate-100/70 hover:border-theme-primary transition group"
              >
                <div className="w-12 h-12 rounded-2xl bg-theme-light flex items-center justify-center text-theme-primary mb-2 group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">
                  Click to Upload Food Image
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Supports PNG, JPG, WebP (up to 10MB)
                </p>
              </div>
            )}
          </div>

          {/* Controls Bar */}
          {imageSrc && (
            <div className="bg-slate-50 rounded-2xl p-3 sm:p-4 border border-slate-200/80 space-y-3">
              {/* Zoom Slider & Buttons */}
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  disabled={zoom <= 1}
                  className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition native-press"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>

                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.02"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-theme-primary"
                  />
                  <span className="text-xs font-mono font-bold text-slate-600 w-10 text-right">
                    {Math.round(zoom * 100)}%
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleZoomIn}
                  disabled={zoom >= 3}
                  className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition native-press"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition native-press flex items-center gap-1 text-xs font-semibold"
                  title="Reset Position & Zoom"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="hidden sm:inline">Reset</span>
                </button>
              </div>

              {/* Action Buttons: Replace & Remove */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl transition native-press"
                >
                  <Upload className="w-3.5 h-3.5 text-theme-primary" />
                  Replace Photo
                </button>

                {onRemove && (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('alert');
                      onRemove();
                      onClose();
                    }}
                    className="inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-xl transition native-press"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove Photo
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-5 py-3.5 border-t border-slate-200 bg-slate-50 sticky bottom-0">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            disabled={saving}
            className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-200 transition native-press"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !imageSrc}
            className="inline-flex items-center gap-2 btn-theme-primary disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl px-5 py-2.5 transition shadow-theme native-press"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Optimizing & Saving…</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Apply & Save Photo</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
