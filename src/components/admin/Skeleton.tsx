import React from 'react';

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Primitives for Skeleton Loading
 */
export function Skeleton({ className = '', style }: SkeletonProps) {
  return (
    <div
      style={style}
      className={`skeleton-shimmer rounded-xl bg-slate-200/80 ${className}`}
    />
  );
}

export function SkeletonCircle({ className = '', size = 'w-10 h-10' }: { className?: string; size?: string }) {
  return (
    <div
      className={`skeleton-shimmer rounded-full bg-slate-200/80 shrink-0 ${size} ${className}`}
    />
  );
}

/**
 * 1. Dashboard Skeleton matching exact Dashboard layout
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6 animate-fadeIn pb-12">
      {/* 1. Header / Hero Card Skeleton */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900/90 p-5 sm:p-7 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="w-24 h-5 rounded-full bg-slate-700/60" />
              <Skeleton className="w-32 h-4 rounded-full bg-slate-700/40" />
            </div>
            <Skeleton className="w-48 sm:w-64 h-8 rounded-2xl bg-slate-700/80" />
            <Skeleton className="w-36 h-4 rounded-xl bg-slate-700/50" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="w-24 h-10 rounded-2xl bg-slate-700/60" />
            <Skeleton className="w-28 h-10 rounded-2xl bg-slate-700/60" />
          </div>
        </div>
      </div>

      {/* 2. Live Order Pipeline Stages Skeleton */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="w-3 h-3 rounded-full" />
            <Skeleton className="w-36 h-4 rounded-lg" />
          </div>
          <Skeleton className="w-24 h-4 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-3.5 sm:p-4 rounded-2xl border border-slate-100 bg-slate-50/70 space-y-2.5">
              <div className="flex items-center justify-between">
                <Skeleton className="w-16 h-3 rounded-md" />
                <Skeleton className="w-3 h-3 rounded-full" />
              </div>
              <Skeleton className="w-12 h-7 rounded-lg" />
              <Skeleton className="w-20 h-2.5 rounded-md" />
            </div>
          ))}
        </div>
      </div>

      {/* 3. 4 Operational Metric Cards Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="w-20 h-3.5 rounded-md" />
              <Skeleton className="w-8 h-8 rounded-xl" />
            </div>
            <div className="space-y-1.5 pt-1">
              <Skeleton className="w-24 h-6 rounded-lg" />
              <Skeleton className="w-28 h-3 rounded-md" />
            </div>
          </div>
        ))}
      </div>

      {/* 4. Live Short Orders Grid Skeleton */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Skeleton className="w-7 h-7 rounded-lg" />
              <Skeleton className="w-36 h-5 rounded-lg" />
            </div>
            <Skeleton className="w-56 h-3 rounded-md" />
          </div>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="w-14 h-7 rounded-xl" />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Skeleton className="w-14 h-5 rounded-md" />
                    <Skeleton className="w-16 h-4 rounded-md" />
                  </div>
                  <Skeleton className="w-28 h-3 rounded-md" />
                </div>
                <Skeleton className="w-16 h-5 rounded-full" />
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl space-y-1.5">
                <Skeleton className="w-full h-3 rounded-md" />
                <Skeleton className="w-3/4 h-3 rounded-md" />
              </div>
              <Skeleton className="w-full h-9 rounded-xl" />
            </div>
          ))}
        </div>
      </div>

      {/* 5. Hourly Peak Shift & App Shortcuts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="space-y-1">
              <Skeleton className="w-48 h-4 rounded-md" />
              <Skeleton className="w-32 h-3 rounded-md" />
            </div>
            <Skeleton className="w-24 h-6 rounded-xl" />
          </div>
          <div className="h-40 flex items-end justify-between gap-3 pt-4">
            {[40, 75, 55, 90, 60, 30, 85].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <Skeleton className={`w-full max-w-[36px] rounded-t-xl`} style={{ height: `${h}%` }} />
                <Skeleton className="w-8 h-2.5 rounded-md" />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 space-y-3">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Skeleton className="w-5 h-5 rounded-md" />
            <Skeleton className="w-36 h-4 rounded-md" />
          </div>
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <Skeleton className="w-8 h-8 rounded-xl" />
                <Skeleton className="w-20 h-3 rounded-md" />
                <Skeleton className="w-14 h-2 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 2. Table / List View Skeleton
 */
export function CrudTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs animate-fadeIn">
      {/* Table Header */}
      <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <Skeleton className="w-20 h-4 rounded-md" />
          <Skeleton className="w-28 h-4 rounded-md hidden sm:block" />
          <Skeleton className="w-24 h-4 rounded-md hidden md:block" />
        </div>
        <Skeleton className="w-16 h-4 rounded-md" />
      </div>

      {/* Table Rows */}
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-4 py-3.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
              <div className="space-y-1.5 flex-1 min-w-0">
                <Skeleton className="w-32 sm:w-44 h-4 rounded-md" />
                <Skeleton className="w-20 sm:w-28 h-3 rounded-md" />
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-4">
              <Skeleton className="w-20 h-4 rounded-md" />
              <Skeleton className="w-16 h-5 rounded-full" />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Skeleton className="w-8 h-8 rounded-lg" />
              <Skeleton className="w-8 h-8 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 3. Dining Tables Card Grid Skeleton
 */
export function DiningTableCardsSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4 animate-fadeIn">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="relative bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-4 flex flex-col justify-between shadow-2xs space-y-3"
        >
          <div>
            <div className="flex items-start justify-between gap-1 mb-2">
              <div className="flex items-center gap-2">
                <Skeleton className="w-8 h-8 rounded-xl shrink-0" />
                <div className="space-y-1">
                  <Skeleton className="w-16 h-4 rounded-md" />
                  <Skeleton className="w-12 h-2.5 rounded-md" />
                </div>
              </div>
              <Skeleton className="w-14 h-4 rounded-full" />
            </div>
            <div className="space-y-2 py-2 border-t border-b border-slate-100 my-2">
              <div className="flex justify-between items-center">
                <Skeleton className="w-10 h-3 rounded-md" />
                <Skeleton className="w-8 h-3 rounded-md" />
              </div>
              <div className="flex justify-between items-center">
                <Skeleton className="w-14 h-3 rounded-md" />
                <Skeleton className="w-12 h-3 rounded-md" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 pt-1">
            <Skeleton className="flex-1 h-8 rounded-xl" />
            <Skeleton className="w-8 h-8 rounded-xl" />
            <Skeleton className="w-8 h-8 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * 4. Orders Card Grid Skeleton
 */
export function OrderCardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-fadeIn">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3.5"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-xl" />
              <div className="space-y-1.5">
                <Skeleton className="w-20 h-5 rounded-md" />
                <Skeleton className="w-28 h-3 rounded-md" />
              </div>
            </div>
            <Skeleton className="w-20 h-6 rounded-full" />
          </div>

          <div className="bg-slate-50/80 p-3 rounded-xl space-y-2 border border-slate-100">
            <div className="flex justify-between">
              <Skeleton className="w-16 h-3 rounded-md" />
              <Skeleton className="w-24 h-3 rounded-md" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="w-14 h-3 rounded-md" />
              <Skeleton className="w-16 h-3 rounded-md" />
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-200/60">
              <Skeleton className="w-12 h-4 rounded-md" />
              <Skeleton className="w-16 h-4 rounded-md" />
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 px-1">
            <Skeleton className="w-16 h-3 rounded-md" />
            <Skeleton className="w-4 h-3 rounded-md" />
            <Skeleton className="w-16 h-3 rounded-md" />
            <Skeleton className="w-4 h-3 rounded-md" />
            <Skeleton className="w-16 h-3 rounded-md" />
          </div>

          <Skeleton className="w-full h-10 rounded-xl" />

          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <Skeleton className="flex-1 h-8 rounded-lg" />
            <Skeleton className="flex-1 h-8 rounded-lg" />
            <Skeleton className="flex-1 h-8 rounded-lg" />
            <Skeleton className="w-8 h-8 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * 5. Category Page Skeleton
 */
export function CategorySkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Top Search & Actions Bar Skeleton */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <Skeleton className="w-full sm:w-72 h-10 rounded-xl" />
        <div className="flex items-center gap-2">
          <Skeleton className="w-24 h-10 rounded-xl" />
          <Skeleton className="w-32 h-10 rounded-xl" />
        </div>
      </div>

      {/* Grid of Category Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3 flex flex-col justify-between"
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <Skeleton className="w-12 h-12 rounded-2xl" />
                <Skeleton className="w-14 h-5 rounded-full" />
              </div>
              <Skeleton className="w-28 h-5 rounded-lg" />
              <Skeleton className="w-36 h-3 rounded-md" />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <Skeleton className="w-16 h-3.5 rounded-md" />
              <div className="flex items-center gap-1.5">
                <Skeleton className="w-7 h-7 rounded-lg" />
                <Skeleton className="w-7 h-7 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 6. Menu Items Grid Skeleton
 */
export function MenuItemSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Search & Category Filter Pills */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <Skeleton className="w-full sm:w-80 h-10 rounded-xl" />
          <div className="flex items-center gap-2">
            <Skeleton className="w-28 h-10 rounded-xl" />
            <Skeleton className="w-36 h-10 rounded-xl" />
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Skeleton key={i} className="w-20 sm:w-24 h-8 rounded-xl shrink-0" />
          ))}
        </div>
      </div>

      {/* Grid of Menu Items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs flex flex-col justify-between"
          >
            {/* Image Placeholder */}
            <Skeleton className="w-full h-40 sm:h-44 rounded-none" />

            <div className="p-4 space-y-2.5 flex-1 flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Skeleton className="w-14 h-4 rounded-full" />
                  <Skeleton className="w-16 h-4 rounded-md" />
                </div>
                <Skeleton className="w-36 h-5 rounded-lg" />
                <Skeleton className="w-full h-3 rounded-md" />
                <Skeleton className="w-2/3 h-3 rounded-md" />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <Skeleton className="w-20 h-6 rounded-lg" />
                <div className="flex items-center gap-1.5">
                  <Skeleton className="w-8 h-8 rounded-lg" />
                  <Skeleton className="w-8 h-8 rounded-lg" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 7. Reports Page Skeleton
 */
export function ReportsSkeleton() {
  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Date Filter & Export Bar */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="w-16 sm:w-20 h-8 rounded-xl" />
          ))}
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Skeleton className="w-28 h-9 rounded-xl" />
          <Skeleton className="w-32 h-9 rounded-xl" />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-2xl sm:rounded-3xl p-5 border border-slate-200/80 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="w-20 h-4 rounded-md" />
              <Skeleton className="w-9 h-9 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="w-28 h-7 rounded-lg" />
              <Skeleton className="w-32 h-3 rounded-md" />
            </div>
          </div>
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="space-y-1">
              <Skeleton className="w-40 h-5 rounded-md" />
              <Skeleton className="w-28 h-3 rounded-md" />
            </div>
            <Skeleton className="w-24 h-7 rounded-xl" />
          </div>
          <div className="h-56 flex items-end justify-between gap-3 pt-6">
            {[45, 60, 85, 40, 95, 70, 50, 80].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <Skeleton className="w-full max-w-[32px] rounded-t-xl" style={{ height: `${h}%` }} />
                <Skeleton className="w-6 h-2.5 rounded-md" />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
          <div className="pb-3 border-b border-slate-100 space-y-1">
            <Skeleton className="w-36 h-5 rounded-md" />
            <Skeleton className="w-24 h-3 rounded-md" />
          </div>
          <div className="space-y-3 pt-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <Skeleton className="w-7 h-7 rounded-lg shrink-0" />
                  <div className="space-y-1 flex-1">
                    <Skeleton className="w-24 h-3.5 rounded-md" />
                    <Skeleton className="w-16 h-2.5 rounded-md" />
                  </div>
                </div>
                <Skeleton className="w-14 h-4 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 8. Settings Page Skeleton
 */
export function SettingsSkeleton() {
  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="w-28 sm:w-32 h-10 rounded-2xl shrink-0" />
        ))}
      </div>

      {/* Main Settings Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-7 shadow-2xs space-y-6">
        <div className="flex items-center gap-4 pb-5 border-b border-slate-100">
          <Skeleton className="w-16 h-16 rounded-2xl shrink-0" />
          <div className="space-y-2 flex-1">
            <Skeleton className="w-48 h-6 rounded-lg" />
            <Skeleton className="w-64 h-3.5 rounded-md" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="w-28 h-3.5 rounded-md" />
              <Skeleton className="w-full h-11 rounded-xl" />
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
          <Skeleton className="w-24 h-10 rounded-xl" />
          <Skeleton className="w-36 h-10 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/**
 * 9. Receipt / Bill Thermal Preview Skeleton
 */
export function ReceiptSkeleton() {
  return (
    <div className="w-full max-w-[320px] bg-white rounded-2xl border border-slate-200 p-5 shadow-xl space-y-3 animate-fadeIn mx-auto">
      <div className="text-center space-y-1.5 pb-2 border-b border-dashed border-slate-300">
        <Skeleton className="w-32 h-6 rounded-md mx-auto" />
        <Skeleton className="w-44 h-3 rounded-md mx-auto" />
        <Skeleton className="w-28 h-3 rounded-md mx-auto" />
      </div>

      <div className="py-2 space-y-1.5 border-b border-dashed border-slate-300">
        <div className="flex justify-between">
          <Skeleton className="w-16 h-3 rounded-md" />
          <Skeleton className="w-16 h-3 rounded-md" />
        </div>
        <div className="flex justify-between">
          <Skeleton className="w-20 h-3 rounded-md" />
          <Skeleton className="w-12 h-3 rounded-md" />
        </div>
      </div>

      <div className="py-2 space-y-2 border-b border-dashed border-slate-300">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex justify-between items-center">
            <Skeleton className="w-28 h-3 rounded-md" />
            <Skeleton className="w-12 h-3 rounded-md" />
          </div>
        ))}
      </div>

      <div className="pt-1 space-y-1.5">
        <div className="flex justify-between">
          <Skeleton className="w-16 h-3 rounded-md" />
          <Skeleton className="w-12 h-3 rounded-md" />
        </div>
        <div className="flex justify-between">
          <Skeleton className="w-20 h-4 rounded-md" />
          <Skeleton className="w-16 h-4 rounded-md" />
        </div>
      </div>
    </div>
  );
}
