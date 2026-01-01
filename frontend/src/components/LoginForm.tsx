import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginForm({ onSwitchToRegister }: { onSwitchToRegister?: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/f872cd0a-6ab4-4d06-95aa-1c2786551c1b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LoginForm.tsx:17',message:'Calling login function',data:{hasUsername:!!username},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
      // #endregion
      await login({ username, password });
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/f872cd0a-6ab4-4d06-95aa-1c2786551c1b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LoginForm.tsx:20',message:'Login succeeded',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'I'})}).catch(()=>{});
      // #endregion
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      const debugErrorData = {errorMessage:errorMessage,containsPort3002:errorMessage.includes('3002'),errorType:err?.constructor?.name};
      console.error('🔍 [DEBUG] LoginForm error:', debugErrorData);
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/f872cd0a-6ab4-4d06-95aa-1c2786551c1b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LoginForm.tsx:23',message:'LoginForm catch - setting error',data:debugErrorData,timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'J'})}).catch(()=>{});
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
          <p className="text-slate-600">Inventory Management System</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input-field"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {onSwitchToRegister && (
          <div className="mt-6 text-center">
            <button
              onClick={onSwitchToRegister}
              className="text-sm text-slate-600 hover:text-slate-900"
            >
              Don't have an account? Sign Up
            </button>
          </div>
        )}
      </div>
    </div>
  );
}



