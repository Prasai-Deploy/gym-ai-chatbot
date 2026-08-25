import { useCallback, useEffect, useRef, useState } from 'react';
import QrScanner from 'qr-scanner';
import { parseCheckInCode } from './parseCheckInCode';

export type ScannerStatus =
  | 'idle'          // not started — camera is off, no permission asked yet
  | 'starting'      // permission prompt showing / camera warming up
  | 'scanning'      // live, looking for a code
  | 'denied'        // user refused camera permission
  | 'unavailable'   // no camera on this device, or getUserMedia unsupported
  | 'error';        // anything else

interface UseQrScannerOptions {
  /** Called once with a valid code. The scanner stops itself first. */
  onCode: (code: string) => void;
}

/**
 * Camera QR scanning for gym check-in.
 *
 * Deliberate behaviours, each of which exists because the naive version causes
 * a specific real problem:
 *
 *  * The camera is NEVER started on mount. `start()` must be called from a user
 *    gesture (tapping "Check In"). Browsers show the permission prompt at that
 *    moment, and a permission denied on page load is sticky — recovering means
 *    the member digging through browser site settings, which they will not do.
 *
 *  * The camera is always released on unmount and after a successful scan.
 *    A live camera left running drains battery and leaves the recording
 *    indicator lit, which users reasonably find alarming.
 *
 *  * Unrecognised QR codes are ignored silently rather than surfacing an error.
 *    A camera pointed at a room will read barcodes off equipment and posters;
 *    flashing "invalid code" at every one of them is noise, not feedback.
 */
export function useQrScanner({ onCode }: UseQrScannerOptions) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const [status, setStatus] = useState<ScannerStatus>('idle');

  const stop = useCallback(() => {
    scannerRef.current?.stop();
    scannerRef.current?.destroy();
    scannerRef.current = null;
    setStatus('idle');
  }, []);

  const start = useCallback(async () => {
    if (scannerRef.current || !videoRef.current) return;

    setStatus('starting');

    if (!(await QrScanner.hasCamera().catch(() => false))) {
      setStatus('unavailable');
      return;
    }

    try {
      const scanner = new QrScanner(
        videoRef.current,
        (result) => {
          const code = parseCheckInCode(result.data);
          // Not one of ours — keep scanning rather than nagging.
          if (!code) return;

          // Stop before handing off, so a second frame containing the same
          // code cannot fire a duplicate check-in while the request is in
          // flight. The database unique constraint would catch it, but a
          // double request is still a wasted round trip and a confusing UI.
          scanner.stop();
          scanner.destroy();
          scannerRef.current = null;
          setStatus('idle');

          onCode(code);
        },
        {
          preferredCamera: 'environment',
          highlightScanRegion: true,
          highlightCodeOutline: true,
          maxScansPerSecond: 5,
        }
      );

      scannerRef.current = scanner;
      await scanner.start();
      setStatus('scanning');
    } catch (err) {
      scannerRef.current?.destroy();
      scannerRef.current = null;

      // getUserMedia throws NotAllowedError for a refused permission and
      // NotFoundError when there is no camera. Distinguishing them matters:
      // one needs "enable camera in settings", the other needs "type the code
      // instead", and telling someone to fix a permission they never denied is
      // its own kind of broken.
      const name = (err as { name?: string } | undefined)?.name;
      if (name === 'NotAllowedError' || name === 'SecurityError') setStatus('denied');
      else if (name === 'NotFoundError' || name === 'OverconstrainedError') setStatus('unavailable');
      else setStatus('error');
    }
  }, [onCode]);

  // Release the camera if the component goes away mid-scan.
  useEffect(() => stop, [stop]);

  return { videoRef, status, start, stop };
}
