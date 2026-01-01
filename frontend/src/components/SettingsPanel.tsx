import { useState, useEffect } from 'react';
import { CURRENCIES } from '../constants/currencies';
import { useAuth } from '../contexts/AuthContext';

// Get API base URL
const rawApiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api' : '/api');
const API_BASE_URL = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl;

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentCurrency: string;
  onCurrencyChange: (currency: string) => void;
  onSave: (settings: UserSettings) => void;
}

export interface UserSettings {
  currency: string;
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  theme: 'light' | 'dark' | 'auto';
  notifications: {
    lowStock: boolean;
    outOfStock: boolean;
    dailySummary: boolean;
    saleRecorded: boolean;
  };
  lowStockThreshold: number;
  dashboardWidgets: string[];
  language: string;
}

const DEFAULT_SETTINGS: UserSettings = {
  currency: 'USD',
  dateFormat: 'MM/DD/YYYY',
  theme: 'light',
  notifications: {
    lowStock: true,
    outOfStock: true,
    dailySummary: false,
    saleRecorded: false,
  },
  lowStockThreshold: 10,
  dashboardWidgets: ['revenue', 'profit', 'products', 'sales'],
  language: 'en',
};

export default function SettingsPanel({
  isOpen,
  onClose,
  currentCurrency,
  onCurrencyChange,
  onSave,
}: SettingsPanelProps) {
  const { user, isSuperAdmin } = useAuth();
  const isBusinessAdmin = user?.role === 'admin' || isSuperAdmin;
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [pinStatus, setPinStatus] = useState<{ hasPin: boolean; loading: boolean }>({ hasPin: false, loading: true });
  const [showPinForm, setShowPinForm] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState('');
  const [isSettingPin, setIsSettingPin] = useState(false);

  useEffect(() => {
    // Load settings from localStorage
    const saved = localStorage.getItem('business-record-settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch (e) {
        console.error('Error loading settings:', e);
      }
    }
  }, []);

  useEffect(() => {
    setSettings(prev => ({ ...prev, currency: currentCurrency }));
  }, [currentCurrency]);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    const savedTheme = settings.theme;
    
    if (savedTheme === 'dark') {
      root.classList.add('dark');
    } else if (savedTheme === 'light') {
      root.classList.remove('dark');
    } else if (savedTheme === 'auto') {
      // Auto mode: use system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      
      // Listen for system theme changes
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        if (e.matches) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      };
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [settings.theme]);

  // Check PIN status when panel opens and user is admin
  useEffect(() => {
    if (isOpen && isBusinessAdmin) {
      checkPinStatus();
    }
  }, [isOpen, isBusinessAdmin]);

  const checkPinStatus = async () => {
    try {
      setPinStatus({ hasPin: false, loading: true });
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/auth/pin-status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPinStatus({ hasPin: data.hasPin, loading: false });
      } else {
        setPinStatus({ hasPin: false, loading: false });
      }
    } catch (error) {
      console.error('Error checking PIN status:', error);
      setPinStatus({ hasPin: false, loading: false });
    }
  };

  const handleSetPin = async () => {
    setPinError('');
    setPinSuccess('');

    if (!pin || pin.length < 4) {
      setPinError('PIN must be at least 4 digits');
      return;
    }

    if (pin.length > 6) {
      setPinError('PIN must be at most 6 digits');
      return;
    }

    if (!/^\d+$/.test(pin)) {
      setPinError('PIN must contain only numbers');
      return;
    }

    if (pin !== confirmPin) {
      setPinError('PINs do not match');
      return;
    }

    setIsSettingPin(true);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setPinError('You must be logged in to set a PIN');
        setIsSettingPin(false);
        return;
      }

      const response = await fetch('/api/auth/set-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ pin }),
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        setPinError('Server error: Invalid response. Please ensure the server is running.');
        setIsSettingPin(false);
        return;
      }

      const data = await response.json();

      if (response.ok) {
        setPinSuccess('PIN set successfully!');
        setPin('');
        setConfirmPin('');
        setShowPinForm(false);
        await checkPinStatus();
        setTimeout(() => setPinSuccess(''), 3000);
      } else {
        setPinError(data.error || 'Failed to set PIN. Please try again.');
        console.error('PIN setting error:', data);
      }
    } catch (error) {
      console.error('PIN setting exception:', error);
      setPinError(error instanceof Error ? error.message : 'Failed to set PIN. Please check your connection and try again.');
    } finally {
      setIsSettingPin(false);
    }
  };

  const handleSave = () => {
    localStorage.setItem('business-record-settings', JSON.stringify(settings));
    onSave(settings);
    onCurrencyChange(settings.currency);
    
    // Apply theme immediately when saved
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else if (settings.theme === 'light') {
      root.classList.remove('dark');
    } else if (settings.theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
    
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Settings</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Currency */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Currency</label>
            <select
              value={settings.currency}
              onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            >
              {CURRENCIES.map(curr => (
                <option key={curr.code} value={curr.code}>
                  {curr.code} - {curr.symbol} ({curr.name})
                </option>
              ))}
            </select>
          </div>

          {/* Date Format */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Date Format</label>
            <select
              value={settings.dateFormat}
              onChange={(e) => setSettings({ ...settings, dateFormat: e.target.value as any })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            >
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>

          {/* Theme */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Theme</label>
            <select
              value={settings.theme}
              onChange={(e) => setSettings({ ...settings, theme: e.target.value as any })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="auto">Auto (System)</option>
            </select>
          </div>

          {/* Notifications */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">Notifications</label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.notifications.lowStock}
                  onChange={(e) => setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, lowStock: e.target.checked }
                  })}
                  className="mr-2"
                />
                <span className="text-sm text-slate-700">Low Stock Alerts</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.notifications.outOfStock}
                  onChange={(e) => setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, outOfStock: e.target.checked }
                  })}
                  className="mr-2"
                />
                <span className="text-sm text-slate-700">Out of Stock Alerts</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.notifications.dailySummary}
                  onChange={(e) => setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, dailySummary: e.target.checked }
                  })}
                  className="mr-2"
                />
                <span className="text-sm text-slate-700">Daily Summary</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.notifications.saleRecorded}
                  onChange={(e) => setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, saleRecorded: e.target.checked }
                  })}
                  className="mr-2"
                />
                <span className="text-sm text-slate-700">Sale Recorded Notifications</span>
              </label>
            </div>
          </div>

          {/* Low Stock Threshold */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Low Stock Threshold
            </label>
            <input
              type="number"
              value={settings.lowStockThreshold}
              onChange={(e) => setSettings({ ...settings, lowStockThreshold: parseInt(e.target.value) || 10 })}
              min="1"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
            <p className="text-xs text-slate-500 mt-1">
              Products with stock below this number will trigger low stock alerts
            </p>
          </div>

          {/* PIN Management - Only for Admins */}
          {isBusinessAdmin && (
            <div className="border-t border-slate-200 pt-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">PIN Management</h3>
              <p className="text-sm text-slate-600 mb-4">
                Set a PIN to secure sensitive operations like editing, deleting, and adding stock. You'll be prompted to enter this PIN when performing these actions.
              </p>

              {pinStatus.loading ? (
                <div className="text-sm text-slate-500">Checking PIN status...</div>
              ) : (
                <>
                  <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-700">
                          PIN Status
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {pinStatus.hasPin ? (
                            <span className="text-emerald-600 font-medium">✓ PIN is set</span>
                          ) : (
                            <span className="text-amber-600 font-medium">⚠ No PIN set</span>
                          )}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setShowPinForm(!showPinForm);
                          setPinError('');
                          setPinSuccess('');
                          setPin('');
                          setConfirmPin('');
                        }}
                        className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                      >
                        {pinStatus.hasPin ? 'Change PIN' : 'Set PIN'}
                      </button>
                    </div>
                  </div>

                  {showPinForm && (
                    <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          {pinStatus.hasPin ? 'New PIN' : 'PIN'} (minimum 4 digits)
                        </label>
                        <input
                          type="password"
                          value={pin}
                          onChange={(e) => {
                            setPin(e.target.value);
                            setPinError('');
                          }}
                          placeholder="Enter PIN"
                          maxLength={6}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-center text-lg tracking-widest font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Confirm PIN
                        </label>
                        <input
                          type="password"
                          value={confirmPin}
                          onChange={(e) => {
                            setConfirmPin(e.target.value);
                            setPinError('');
                          }}
                          placeholder="Confirm PIN"
                          maxLength={6}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-center text-lg tracking-widest font-mono"
                        />
                      </div>
                      {pinError && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                          {pinError}
                        </div>
                      )}
                      {pinSuccess && (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-sm">
                          {pinSuccess}
                        </div>
                      )}
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            setShowPinForm(false);
                            setPin('');
                            setConfirmPin('');
                            setPinError('');
                            setPinSuccess('');
                          }}
                          className="flex-1 px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSetPin}
                          disabled={isSettingPin}
                          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSettingPin ? 'Setting...' : pinStatus.hasPin ? 'Change PIN' : 'Set PIN'}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}

