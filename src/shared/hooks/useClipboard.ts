import { useState, useCallback } from 'react';

export function useClipboard(timeout = 2000) {
  const [hasCopied, setHasCopied] = useState(false);

  const onCopy = useCallback((text: string) => {
    if (!navigator?.clipboard) {
      console.warn('Clipboard not supported');
      return false;
    }

    try {
      navigator.clipboard.writeText(text);
      setHasCopied(true);
      setTimeout(() => {
        setHasCopied(false);
      }, timeout);
      return true;
    } catch (error) {
      console.warn('Copy failed', error);
      setHasCopied(false);
      return false;
    }
  }, [timeout]);

  return { hasCopied, onCopy };
}
