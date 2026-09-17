// components/PullToRefresh.tsx
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Loader2, ArrowDown } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  threshold?: number;
}

export default function PullToRefresh({
  onRefresh,
  children,
  threshold = 65,
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startYRef = useRef(0);
  const isPullingRef = useRef(false);
  const reachedThresholdRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isInteractiveOrModalElement = (target: EventTarget | null): boolean => {
      if (!target || !(target instanceof HTMLElement)) return false;
      // If user is interacting with an input, textarea, button, or inside any modal/backdrop
      return Boolean(
        target.closest(
          'input, textarea, select, button, [role="dialog"], [role="menu"], .fixed, .modal, .animate-backdrop, .animate-bottom-sheet'
        ) || document.querySelector('.animate-backdrop')
      );
    };

    const handleTouchStart = (e: TouchEvent) => {
      // Never trigger pull-to-refresh if touching inside a modal, form input, or while a modal is open
      if (isInteractiveOrModalElement(e.target)) {
        isPullingRef.current = false;
        return;
      }

      // Only initiate pull when at the very top of the page
      const scrollTop =
        window.scrollY || document.documentElement.scrollTop || document.body.scrollTop;
      if (scrollTop <= 2 && !refreshing) {
        startYRef.current = e.touches[0].clientY;
        isPullingRef.current = true;
        reachedThresholdRef.current = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPullingRef.current || refreshing) return;

      if (isInteractiveOrModalElement(e.target)) {
        isPullingRef.current = false;
        setPullDistance(0);
        return;
      }

      const scrollTop =
        window.scrollY || document.documentElement.scrollTop || document.body.scrollTop;
      if (scrollTop > 5) {
        isPullingRef.current = false;
        setPullDistance(0);
        return;
      }

      const currentY = e.touches[0].clientY;
      const rawDelta = currentY - startYRef.current;

      if (rawDelta > 0) {
        // Damping resistance formula for natural native elastic bounce
        const distance = Math.min(100, Math.pow(rawDelta, 0.82) * 1.8);
        setPullDistance(distance);

        // Haptic pulse when crossing threshold
        if (distance >= threshold && !reachedThresholdRef.current) {
          reachedThresholdRef.current = true;
          triggerHaptic('medium');
        } else if (distance < threshold && reachedThresholdRef.current) {
          reachedThresholdRef.current = false;
        }

        if (e.cancelable && distance > 10) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = async () => {
      if (!isPullingRef.current || refreshing) return;
      isPullingRef.current = false;

      if (pullDistance >= threshold) {
        setRefreshing(true);
        setPullDistance(50);
        triggerHaptic('success');

        try {
          // Trigger custom global event so all active pages re-fetch silently
          window.dispatchEvent(new CustomEvent('app_refresh'));
          await onRefresh();
        } catch (err) {
          console.warn('Pull-to-refresh action error:', err);
        } finally {
          setTimeout(() => {
            setRefreshing(false);
            setPullDistance(0);
            reachedThresholdRef.current = false;
          }, 450);
        }
      } else {
        setPullDistance(0);
        reachedThresholdRef.current = false;
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pullDistance, refreshing, threshold, onRefresh]);

  const rotation = Math.min(180, (pullDistance / threshold) * 180);
  const isReady = pullDistance >= threshold;

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Animated Pull-To-Refresh Floating Badge */}
      <div
        style={{
          height: `${pullDistance}px`,
          opacity: pullDistance > 8 || refreshing ? 1 : 0,
          transition: isPullingRef.current
            ? 'none'
            : 'height 0.3s cubic-bezier(0.2, 0.9, 0.3, 1.2), opacity 0.2s',
        }}
        className="flex items-center justify-center overflow-hidden pointer-events-none w-full select-none"
      >
        <div
          className={`w-9 h-9 rounded-full bg-white shadow-lg border border-slate-200/80 flex items-center justify-center transition-all ${
            isReady ? 'bg-theme-gradient text-white border-transparent scale-110' : 'text-slate-600'
          }`}
        >
          {refreshing ? (
            <Loader2 className="w-4.5 h-4.5 animate-spin text-theme-primary" />
          ) : (
            <ArrowDown
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: 'transform 0.15s ease',
              }}
              className={`w-4.5 h-4.5 ${isReady ? 'text-white' : 'text-slate-600'}`}
            />
          )}
        </div>
      </div>

      {/* Page Content with subtle elastic transform */}
      <div
        style={{
          transform:
            pullDistance > 0 && !refreshing ? `translateY(${pullDistance * 0.15}px)` : 'none',
          transition: isPullingRef.current
            ? 'none'
            : 'transform 0.3s cubic-bezier(0.2, 0.9, 0.3, 1.2)',
        }}
      >
        {children}
      </div>
    </div>
  );
}
