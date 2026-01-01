import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

// Get API base URL (same logic as api.ts)
// Normalize: remove trailing slash if present
const rawApiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api' : '/api');
const API_BASE_URL = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl;

export default function RegisterForm({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    fullName: '',
    businessName: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // #region agent log
      const debugData = {
        apiBaseUrl: API_BASE_URL,
        viteApiUrl: import.meta.env.VITE_API_URL,
        formData: { ...formData, password: '***' }, // Don't log password
        registerUrl: `${API_BASE_URL}/auth/register`
      };
      console.log('🔍 [DEBUG] RegisterForm submit:', debugData);
      fetch('http://127.0.0.1:7243/ingest/f872cd0a-6ab4-4d06-95aa-1c2786551c1b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RegisterForm.tsx:21',message:'Register form submit',data:debugData,timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      // Register new user and business
      const registerUrl = `${API_BASE_URL}/auth/register`;
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/f872cd0a-6ab4-4d06-95aa-1c2786551c1b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RegisterForm.tsx:28',message:'Before fetch register request',data:{registerUrl:registerUrl,hasAllFields:!!(formData.username&&formData.email&&formData.password&&formData.fullName&&formData.businessName)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      const response = await fetch(registerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      // #region agent log
      const responseDebug = {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        contentType: response.headers.get('content-type'),
        url: response.url
      };
      console.log('🔍 [DEBUG] Register response:', responseDebug);
      fetch('http://127.0.0.1:7243/ingest/f872cd0a-6ab4-4d06-95aa-1c2786551c1b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RegisterForm.tsx:40',message:'After fetch register response',data:responseDebug,timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const apiUrl = API_BASE_URL || 'backend server';
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/f872cd0a-6ab4-4d06-95aa-1c2786551c1b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RegisterForm.tsx:45',message:'Non-JSON response error',data:{contentType:contentType,apiUrl:apiUrl,status:response.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        throw new Error(`Cannot connect to API server at ${apiUrl}. Please check your VITE_API_URL environment variable and ensure the backend is running.`);
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Registration failed' }));
        // #region agent log
        const errorDebug = {
          status: response.status,
          errorData: errorData,
          errorMessage: errorData.error || 'Registration failed'
        };
        console.error('🔍 [DEBUG] Register error response:', errorDebug);
        fetch('http://127.0.0.1:7243/ingest/f872cd0a-6ab4-4d06-95aa-1c2786551c1b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RegisterForm.tsx:52',message:'Registration failed - response not OK',data:errorDebug,timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        throw new Error(errorData.error || 'Registration failed');
      }

      const data = await response.json();
      // #region agent log
      console.log('🔍 [DEBUG] Registration successful:', { hasUser: !!data.user, hasToken: !!data.token });
      fetch('http://127.0.0.1:7243/ingest/f872cd0a-6ab4-4d06-95aa-1c2786551c1b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RegisterForm.tsx:60',message:'Registration successful, attempting auto-login',data:{hasUser:!!data.user,hasToken:!!data.token},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      
      // Auto-login after successful registration
      await login({
        username: formData.username,
        password: formData.password,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      // #region agent log
      const errorDebug = {
        errorMessage: errorMessage,
        errorType: err?.constructor?.name,
        errorStack: err instanceof Error ? err.stack : undefined
      };
      console.error('🔍 [DEBUG] RegisterForm catch error:', errorDebug);
      fetch('http://127.0.0.1:7243/ingest/f872cd0a-6ab4-4d06-95aa-1c2786551c1b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RegisterForm.tsx:68',message:'RegisterForm catch block',data:errorDebug,timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
      // #endregion
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="card max-w-md w-full p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Business Record</h1>
          <p className="text-slate-600">Create Your Business Account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Business Name *
            </label>
            <input
              type="text"
              value={formData.businessName}
              onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
              className="input-field"
              required
              placeholder="Your Business Name"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="input-field"
              required
              placeholder="Your Full Name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Username *
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="input-field"
              required
              placeholder="Choose a username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input-field"
              required
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Password *
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="input-field"
              required
              placeholder="Choose a strong password"
              minLength={6}
            />
            <p className="text-xs text-slate-500 mt-1">Minimum 6 characters</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={onSwitchToLogin}
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            Already have an account? Login
          </button>
        </div>
      </div>
    </div>
  );
}

