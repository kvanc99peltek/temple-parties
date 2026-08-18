'use client';

/** Per-page hydration gate — replaces the v1 whole-SPA pulse. */
export default function PageSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-14 bg-zinc-900/50 lg:hidden" />
      <div className="max-w-xl mx-auto px-4 py-3">
        <div className="h-11 bg-zinc-900/50 rounded-xl" />
        <div className="mt-3 h-[438px] bg-zinc-900/50 rounded-2xl" />
        <div className="mt-4 h-3 w-32 bg-zinc-900/50 rounded" />
        <div className="mt-3 space-y-3">
          <div className="h-[121px] bg-zinc-900/50 rounded-[14px]" />
          <div className="h-[121px] bg-zinc-900/50 rounded-[14px]" />
        </div>
      </div>
    </div>
  );
}
