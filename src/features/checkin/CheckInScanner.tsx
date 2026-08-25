import React, { useCallback, useState } from 'react';
import { Camera, KeyRound, X } from 'lucide-react';
import { Card } from '../../design-system/components/Card';
import { Button } from '../../design-system/components/Button';
import { cn } from '../../design-system/tokens';
import { useQrScanner } from './useQrScanner';
import { parseCheckInCode } from './parseCheckInCode';

export interface CheckInScannerProps {
  /** Fires with a validated 32-char code. The camera is already released. */
  onCode: (code: string) => void;
  /** Shown under the buttons — check-in result or error from the caller. */
  message?: string | null;
  isSubmitting?: boolean;
  className?: string;
}

/**
 * The member-facing check-in screen.
 *
 * Replaces the placeholder `design-system/attendance/QRScanner.tsx`, which was
 * a `setTimeout` returning a hardcoded `'QR-8842-VIP'`.
 *
 * The manual-entry fallback is not optional. Camera permission can be denied,
 * the device may have no camera, and a phone in a dark gym corner may simply
 * fail to focus. Without a way to type the code, any of those leaves a paying
 * member standing at the door unable to check in — and a broken streak is
 * exactly the thing this feature exists to protect.
 */
export const CheckInScanner: React.FC<CheckInScannerProps> = ({
  onCode,
  message,
  isSubmitting = false,
  className,
}) => {
  const [manualMode, setManualMode] = useState(false);
  const [manualValue, setManualValue] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);

  const { videoRef, status, start, stop } = useQrScanner({ onCode });

  const handleManualSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const code = parseCheckInCode(manualValue);
      if (!code) {
        setManualError('That code does not look right. Check the sticker and try again.');
        return;
      }
      setManualError(null);
      onCode(code);
    },
    [manualValue, onCode]
  );

  const cameraBlocked = status === 'denied' || status === 'unavailable' || status === 'error';
  const isLive = status === 'scanning' || status === 'starting';

  return (
    <Card variant="glass" className={cn('flex flex-col gap-4', className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black tracking-tight text-white">Check in</h2>
        {isLive && (
          <button
            onClick={stop}
            aria-label="Stop camera"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Viewport. Kept mounted but hidden when idle — qr-scanner needs a real
          <video> element to attach to before start() is called. */}
      <div
        className={cn(
          'relative rounded-2xl overflow-hidden bg-slate-950 border border-white/10 aspect-square',
          !isLive && 'hidden'
        )}
      >
        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
        {status === 'starting' && (
          <div className="absolute inset-0 grid place-items-center bg-slate-950/80 text-xs text-slate-400">
            Starting camera...
          </div>
        )}
      </div>

      {!isLive && !manualMode && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/30 grid place-items-center">
            <Camera className="w-7 h-7 text-brand-500" />
          </div>
          <p className="text-sm text-slate-400 max-w-xs">
            Point your camera at the QR code by the entrance to log today's visit.
          </p>
        </div>
      )}

      {cameraBlocked && (
        <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
          {status === 'denied'
            ? 'Camera access is blocked. Allow it in your browser settings, or enter the code manually below.'
            : status === 'unavailable'
              ? 'No camera available on this device. Enter the code printed under the QR instead.'
              : 'The camera could not start. Enter the code manually below.'}
        </p>
      )}

      {manualMode ? (
        <form onSubmit={handleManualSubmit} className="flex flex-col gap-2">
          <label htmlFor="checkin-code" className="text-xs font-semibold text-slate-400">
            Code printed under the QR
          </label>
          <input
            id="checkin-code"
            value={manualValue}
            onChange={(e) => {
              setManualValue(e.target.value);
              setManualError(null);
            }}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="a3f9e1c2b7d84f60..."
            className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-white text-sm font-mono placeholder:text-slate-600 focus:outline-none focus:border-brand-500/50"
          />
          {manualError && <p className="text-xs text-red-400">{manualError}</p>}
          <div className="flex gap-2">
            <Button type="submit" variant="primary" isLoading={isSubmitting} className="flex-1">
              Check in
            </Button>
            <Button type="button" variant="ghost" onClick={() => setManualMode(false)}>
              Back
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col gap-2">
          {!isLive && (
            // Camera permission is requested here, on an explicit tap — never
            // on page load. A prompt the member did not ask for gets denied,
            // and a denied permission is sticky.
            <Button
              variant="primary"
              size="lg"
              leftIcon={<Camera className="w-4 h-4" />}
              onClick={start}
              isLoading={isSubmitting}
            >
              Scan QR code
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<KeyRound className="w-3.5 h-3.5" />}
            onClick={() => {
              stop();
              setManualMode(true);
            }}
          >
            Enter code manually
          </Button>
        </div>
      )}

      {message && <p className="text-sm text-center text-slate-300">{message}</p>}
    </Card>
  );
};

CheckInScanner.displayName = 'CheckInScanner';
