import { useState } from 'react';

interface PINVerificationProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (pin: string) => void | Promise<void>;
  title?: string;
  message?: string;
  error?: string;
}

export default function PINVerification({
  isOpen,
  onClose,
  onVerify,
  title = 'Enter PIN',
  message = 'Please enter your PIN to continue',
  error: externalError,
}: PINVerificationProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 4) {
      setError('PIN must be at least 4 digits');
      return;
    }
    setIsVerifying(true);
    setError('');
    try {
      await onVerify(pin);
      setPin('');
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClose = () => {
    setPin('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
        <h2 className="text-xl font-bold text-slate-900 mb-2">{title}</h2>
        <p className="text-slate-600 mb-4">{message}</p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              PIN
            </label>
            <input
              type="password"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setError('');
              }}
              className="input-field text-center text-2xl tracking-widest font-mono"
              placeholder="••••"
              maxLength={6}
              autoFocus
              required
            />
            {(error || externalError) && (
              <p className="text-red-600 text-sm mt-1">{error || externalError}</p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={isVerifying}
            >
              {isVerifying ? 'Verifying...' : 'Verify'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

