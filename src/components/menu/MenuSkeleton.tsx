export function MenuSkeleton() {
  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="shimmer h-44 w-full sm:h-60 lg:h-72" />
      <div className="mx-auto -mt-12 max-w-5xl px-4 sm:px-6">
        <div className="shimmer size-20 rounded-2xl sm:size-24" />
        <div className="shimmer mt-4 h-7 w-2/3 rounded-lg" />
        <div className="shimmer mt-2 h-4 w-11/12 rounded-md" />
        <div className="shimmer mt-2 h-4 w-1/3 rounded-md" />
        <div className="mt-6 flex gap-2 overflow-hidden">
          {[72, 96, 84, 110, 68].map((w, i) => (
            <div key={i} className="shimmer h-9 rounded-full" style={{ width: w }} />
          ))}
        </div>
        <div className="mt-6 space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-3 rounded-3xl border border-border/70 bg-card p-3">
              <div className="shimmer size-24 rounded-2xl sm:size-28" />
              <div className="flex-1 space-y-2 py-1">
                <div className="shimmer h-3 w-20 rounded" />
                <div className="shimmer h-4 w-2/3 rounded" />
                <div className="shimmer h-3 w-full rounded" />
                <div className="shimmer h-3 w-1/2 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}