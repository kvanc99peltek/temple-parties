'use client';

/** Per-page hydration gate — replaces the v1 whole-SPA pulse. */
export default function PageSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-16 bg-zinc-900/50 lg:hidden" />
      <div className="max-w-xl lg:max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="h-12 bg-zinc-900/50 rounded-xl" />
        <div className="mt-6 space-y-4">
          <div className="h-40 bg-zinc-900/50 rounded-xl" />
          <div className="h-40 bg-zinc-900/50 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
