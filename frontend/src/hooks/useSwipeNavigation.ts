import { useEffect, useRef } from 'react';

const VIEWS = ['home', 'map', 'rankings'] as const;
type View = typeof VIEWS[number];

export function useSwipeNavigation(
  currentView: View,
  onViewChange: (view: View) => void
) {
  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      touchStart.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now(),
      };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStart.current) return;
      const dx = e.changedTouches[0].clientX - touchStart.current.x;
      const dy = e.changedTouches[0].clientY - touchStart.current.y;
      const dt = Date.now() - touchStart.current.time;
      touchStart.current = null;

      // Require: fast (<500ms), long enough (>50px), clearly horizontal (|dx| > |dy| * 1.5)
      if (dt > 500 || Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;

      const currentIndex = VIEWS.indexOf(currentView);
      if (dx < 0 && currentIndex < VIEWS.length - 1) {
        onViewChange(VIEWS[currentIndex + 1]); // swipe left → next
      } else if (dx > 0 && currentIndex > 0) {
        onViewChange(VIEWS[currentIndex - 1]); // swipe right → prev
      }
    };

    // capture: true ensures we receive events even if Leaflet calls stopPropagation
    window.addEventListener('touchstart', handleTouchStart, { capture: true, passive: true });
    window.addEventListener('touchend', handleTouchEnd, { capture: true, passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart, { capture: true });
      window.removeEventListener('touchend', handleTouchEnd, { capture: true });
    };
  }, [currentView, onViewChange]);
}
