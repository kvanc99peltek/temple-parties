import { useState, useCallback } from 'react';

export default function useToast() {
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const show = useCallback((message: string) => {
    setToastMessage(message);
    setShowToast(true);
  }, []);

  const hide = useCallback(() => {
    setShowToast(false);
  }, []);

  return { isVisible: showToast, message: toastMessage, show, hide };
}
