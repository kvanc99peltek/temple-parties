'use client';

import { useEffect } from 'react';

interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
}

export default function Toast({ message, isVisible, onClose }: ToastProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 animate-slide-up" style={{ zIndex: 10001 }}>
      <div className="bg-zinc-900 text-white px-6 py-3 rounded-full border border-[#FA4693] flex items-center gap-2">
        <span className="text-xs font-helvetica font-normal whitespace-nowrap">{message}</span>
      </div>
    </div>
  );
}
